import Link from "next/link"
import { notFound } from "next/navigation"
import { requireCollectorForShop } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getCustomerPurchasesForCollector } from "../../../actions"
import { CollectorPurchasesSection } from "./collector-purchases-section"

interface CollectorCustomerDetailPageProps {
  params: Promise<{ shopSlug: string; customerId: string }>
}

async function getCustomerForCollector(shopSlug: string, customerId: string, collectorMemberId: string | null) {
  const { shop } = await requireCollectorForShop(shopSlug)
  
  // If super admin (no membership), can see all customers
  const whereClause = collectorMemberId
    ? { id: customerId, shopId: shop.id, assignedCollectorId: collectorMemberId }
    : { id: customerId, shopId: shop.id }
  
  const customer = await prisma.customer.findFirst({
    where: whereClause,
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
    city: customer.city,
    region: customer.region,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
  }
}

export default async function CollectorCustomerDetailPage({ params }: CollectorCustomerDetailPageProps) {
  const { shopSlug, customerId } = await params
  const { membership } = await requireCollectorForShop(shopSlug)
  
  const customer = await getCustomerForCollector(shopSlug, customerId, membership?.id || null)
  
  if (!customer) {
    notFound()
  }

  const purchases = await getCustomerPurchasesForCollector(shopSlug, customerId)

  // Calculate stats
  const activePurchases = purchases.filter((p) => p.status === "ACTIVE" || p.status === "PENDING" || p.status === "OVERDUE")
  const totalOwed = activePurchases.reduce((sum, p) => sum + p.outstandingBalance, 0)
  const totalPaid = purchases.reduce((sum, p) => sum + p.amountPaid, 0)

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header - Stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={`/collector/${shopSlug}/customers`}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-sm text-slate-400">{customer.phone}</p>
          </div>
        </div>
        {totalOwed > 0 && (
          <div className="text-left sm:text-right ml-11 sm:ml-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">To Collect</p>
            <p className="text-lg sm:text-xl font-bold text-orange-400">GHS {totalOwed.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Purchases</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{purchases.length}</p>
          </div>
          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Loans</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-400">{activePurchases.length}</p>
          </div>
          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Outstanding</p>
            <p className="text-lg sm:text-xl font-bold text-orange-400">GHS {totalOwed.toLocaleString()}</p>
          </div>
          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-400">GHS {totalPaid.toLocaleString()}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Customer Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm sm:text-base text-white">{customer.phone}</p>
            </div>
            {customer.email && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm sm:text-base text-white truncate">{customer.email}</p>
              </div>
            )}
            {customer.address && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Address</p>
                <p className="text-sm sm:text-base text-white">{customer.address}</p>
              </div>
            )}
            {customer.city && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">City</p>
                <p className="text-sm sm:text-base text-white">{customer.city}</p>
              </div>
            )}
            {customer.region && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Region</p>
                <p className="text-sm sm:text-base text-white">{customer.region}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Customer Since</p>
              <p className="text-sm sm:text-base text-white">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Purchases Section */}
        <CollectorPurchasesSection 
          purchases={purchases} 
          shopSlug={shopSlug} 
          customerId={customer.id}
          customerName={`${customer.firstName} ${customer.lastName}`}
        />
    </div>
  )
}
