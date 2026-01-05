import { notFound } from "next/navigation"
import Link from "next/link"
import { requireShopAdminForShop } from "@/lib/auth"
import { getCustomerPurchases, PurchaseData } from "../../../actions"
import prisma from "@/lib/prisma"
import { PurchasesSection } from "./purchases-section"

interface CustomerDetailPageProps {
  params: Promise<{ shopSlug: string; customerId: string }>
}

async function getCustomerDetails(shopSlug: string, customerId: string) {
  const { shop } = await requireShopAdminForShop(shopSlug)
  
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      shopId: shop.id,
    },
    include: {
      assignedCollector: {
        include: { user: true },
      },
    },
  })

  if (!customer) {
    return null
  }

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    idType: customer.idType,
    idNumber: customer.idNumber,
    preferredPayment: customer.preferredPayment,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    assignedCollectorName: customer.assignedCollector?.user.name || null,
  }
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { shopSlug, customerId } = await params
  
  const customer = await getCustomerDetails(shopSlug, customerId)
  
  if (!customer) {
    notFound()
  }

  const purchases: PurchaseData[] = await getCustomerPurchases(shopSlug, customerId)

  // Calculate summary stats
  const activePurchases = purchases.filter((p) => p.status === "ACTIVE" || p.status === "PENDING")
  const totalOwed = purchases.reduce((sum, p) => sum + p.outstandingBalance, 0)
  const totalPaid = purchases.reduce((sum, p) => sum + p.amountPaid, 0)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[90px]" />
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-white/5">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/shop-admin/${shopSlug}/customers`}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {customer.firstName} {customer.lastName}
              </h1>
              <p className="text-sm text-slate-400">Customer Details</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
            customer.isActive
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}>
            {customer.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </header>

      <main className="relative z-10 w-full px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Purchases</p>
            <p className="text-2xl font-bold text-white">{purchases.length}</p>
          </div>
          <div className="glass-card p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Loans</p>
            <p className="text-2xl font-bold text-orange-400">{activePurchases.length}</p>
          </div>
          <div className="glass-card p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-orange-400">GHS {totalOwed.toLocaleString()}</p>
          </div>
          <div className="glass-card p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-400">GHS {totalPaid.toLocaleString()}</p>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-white">{customer.phone}</p>
            </div>
            {customer.email && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-white">{customer.email}</p>
              </div>
            )}
            {customer.address && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Address</p>
                <p className="text-white">{customer.address}</p>
              </div>
            )}
            {customer.idNumber && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{customer.idType}</p>
                <p className="text-white">{customer.idNumber}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Payment Preference</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                customer.preferredPayment === "ONLINE" 
                  ? "bg-blue-500/20 text-blue-400"
                  : customer.preferredPayment === "DEBT_COLLECTOR"
                  ? "bg-orange-500/20 text-orange-400"
                  : "bg-fuchsia-500/20 text-fuchsia-400"
              }`}>
                {customer.preferredPayment === "ONLINE" ? "Online" : customer.preferredPayment === "DEBT_COLLECTOR" ? "Collector" : "Both"}
              </span>
            </div>
            {customer.assignedCollectorName && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Assigned Collector</p>
                <p className="text-white">{customer.assignedCollectorName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Customer Since</p>
              <p className="text-white">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Purchases Section */}
        <PurchasesSection 
          purchases={purchases} 
          shopSlug={shopSlug} 
          customerId={customer.id}
        />
      </main>
    </div>
  )
}
