import Link from "next/link"
import { notFound } from "next/navigation"
import { requireSalesStaffForShop } from "@/lib/auth"
import { getCustomerPurchases, getFullCustomers, getSalesStaffDashboard, getDebtCollectorsForAssignment } from "../../../actions"
import prisma from "@/lib/prisma"
import { CustomerPurchasesTable } from "./customer-purchases-table"

interface CustomerDetailPageProps {
  params: Promise<{ shopSlug: string; customerId: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { shopSlug, customerId } = await params
  const { shop } = await requireSalesStaffForShop(shopSlug)

  const [dashboard, collectors] = await Promise.all([
    getSalesStaffDashboard(shopSlug),
    getDebtCollectorsForAssignment(shopSlug),
  ])

  // Get customer details
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId: shop.id },
    include: {
      assignedCollector: {
        include: { user: true },
      },
    },
  })

  if (!customer) {
    notFound()
  }

  const purchases = await getCustomerPurchases(shopSlug, customerId)

  const totalPurchases = purchases.length
  const activePurchases = purchases.filter((p) => p.status === "ACTIVE" || p.status === "PENDING").length
  const totalOutstanding = purchases.reduce((sum, p) => sum + p.outstandingBalance, 0)
  const pendingDeliveries = purchases.filter((p) => p.deliveryStatus !== "DELIVERED").length

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-white/5">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/sales-staff/${shopSlug}/customers`}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">{customer.firstName} {customer.lastName}</h1>
              <p className="text-sm text-slate-400">{dashboard.shopName}</p>
            </div>
          </div>
          <Link
            href={`/sales-staff/${shopSlug}/new-sale?customer=${customer.id}`}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
          >
            New Sale
          </Link>
        </div>
      </header>

      <main className="relative z-10 w-full px-6 py-8">
        {/* Customer Info Card */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Contact Info */}
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Contact</h3>
              <p className="text-white font-medium">{customer.phone}</p>
              {customer.email && <p className="text-sm text-slate-400">{customer.email}</p>}
            </div>

            {/* Address */}
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Address</h3>
              {customer.address ? (
                <>
                  <p className="text-white">{customer.address}</p>
                  <p className="text-sm text-slate-400">
                    {[customer.city, customer.region].filter(Boolean).join(", ")}
                  </p>
                </>
              ) : (
                <p className="text-slate-500">No address</p>
              )}
            </div>

            {/* ID */}
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Identification</h3>
              {customer.idType ? (
                <>
                  <p className="text-sm text-slate-400">{customer.idType}</p>
                  <p className="text-white">{customer.idNumber}</p>
                </>
              ) : (
                <p className="text-slate-500">No ID on file</p>
              )}
            </div>

            {/* Collector */}
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Assigned Collector</h3>
              {customer.assignedCollector ? (
                <p className="text-white">{customer.assignedCollector.user.name}</p>
              ) : (
                <p className="text-slate-500">No collector assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Total Purchases</p>
            <p className="text-2xl font-bold text-white">{totalPurchases}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-400">{activePurchases}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Pending Delivery</p>
            <p className="text-2xl font-bold text-amber-400">{pendingDeliveries}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-red-400">
              GHS {totalOutstanding.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">Purchase History</h2>
          </div>
          <CustomerPurchasesTable 
            purchases={purchases} 
            shopSlug={shopSlug}
            customerName={`${customer.firstName} ${customer.lastName}`}
            customerPhone={customer.phone}
            customerAddress={customer.address || ""}
          />
        </div>
      </main>
    </div>
  )
}
