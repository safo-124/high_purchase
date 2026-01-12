import Link from "next/link"
import { requireCollectorForShop } from "@/lib/auth"
import { getCollectorDashboard, getAssignedCustomers } from "../../actions"

interface CollectorDashboardPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorDashboardPage({ params }: CollectorDashboardPageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const dashboard = await getCollectorDashboard(shopSlug)
  const customers = await getAssignedCustomers(shopSlug)

  // Customers with active loans (outstanding > 0)
  const customersWithLoans = customers.filter((c) => c.totalOwed > 0)

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-400">Welcome back, {dashboard.collectorName}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">Assigned</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{dashboard.assignedCustomers}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{dashboard.activeLoans}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">To Collect</p>
                <p className="text-lg sm:text-xl font-bold text-orange-400">GHS {dashboard.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">Collected</p>
                <p className="text-lg sm:text-xl font-bold text-green-400">GHS {dashboard.totalCollected.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Customers with Outstanding */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-white">Pending Collections</h2>
              <span className="text-xs sm:text-sm text-slate-400">{customersWithLoans.length} customer{customersWithLoans.length !== 1 ? 's' : ''}</span>
            </div>
            {customersWithLoans.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">All caught up! No pending collections.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {customersWithLoans.slice(0, 5).map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/collector/${shopSlug}/customers/${customer.id}`}
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm flex-shrink-0">
                      {customer.firstName[0]}{customer.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{customer.phone}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-orange-400">GHS {customer.totalOwed.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{customer.activePurchases} loan{customer.activePurchases !== 1 ? 's' : ''}</p>
                    </div>
                  </Link>
                ))}
                {customersWithLoans.length > 5 && (
                  <Link
                    href={`/collector/${shopSlug}/customers`}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 text-sm text-emerald-400 hover:text-emerald-300 active:text-emerald-500 transition-colors"
                  >
                    View all {customersWithLoans.length} customers
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-white/5">
              <h2 className="text-base sm:text-lg font-semibold text-white">Recent Collections</h2>
            </div>
            {dashboard.recentPayments.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-slate-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 sm:w-6 h-5 sm:h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">No payments collected yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {dashboard.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{payment.customerName}</p>
                      <p className="text-xs text-slate-400 truncate">{payment.purchaseNumber}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-400">+GHS {payment.amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
