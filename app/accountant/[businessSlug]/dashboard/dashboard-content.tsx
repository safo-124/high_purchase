"use client"

import Link from "next/link"
import { AccountantDashboardStats } from "../../actions"

interface Props {
  stats: AccountantDashboardStats
  businessSlug: string
  canConfirmPayments: boolean
}

export function AccountantDashboardContent({ stats, businessSlug, canConfirmPayments }: Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-GH").format(num)
  }

  return (
    <div className="space-y-8">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-slate-500 mt-2">{formatNumber(stats.totalPurchases)} purchases</p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-teal-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Total Collected</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalCollected)}</p>
            <p className="text-xs text-slate-500 mt-2">
              {stats.totalRevenue > 0 
                ? `${((stats.totalCollected / stats.totalRevenue) * 100).toFixed(1)}% of revenue`
                : "0% of revenue"
              }
            </p>
          </div>
        </div>

        {/* Outstanding */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalOutstanding)}</p>
            <p className="text-xs text-slate-500 mt-2">{formatNumber(stats.activePurchases)} active purchases</p>
          </div>
        </div>

        {/* Overdue */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-red-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Overdue Amount</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalOverdueAmount)}</p>
            <p className="text-xs text-slate-500 mt-2">{formatNumber(stats.overduePurchases)} overdue purchases</p>
          </div>
        </div>
      </div>

      {/* Time-based Collections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Today</p>
              <p className="text-xl font-bold text-white">{formatCurrency(stats.todayCollections)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{stats.todayPaymentCount} payments received</p>
        </div>

        {/* This Week */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">This Week</p>
              <p className="text-xl font-bold text-white">{formatCurrency(stats.weekCollections)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{stats.weekPaymentCount} payments received</p>
        </div>

        {/* This Month */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">This Month</p>
              <p className="text-xl font-bold text-white">{formatCurrency(stats.monthCollections)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{stats.monthPaymentCount} payments received</p>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Revenue & Collections (Last 6 Months)
        </h3>
        
        <div className="h-64 flex items-end gap-4">
          {stats.monthlyData.map((month, index) => {
            const maxValue = Math.max(...stats.monthlyData.map(m => Math.max(m.revenue, m.collections)))
            const revenueHeight = maxValue > 0 ? (month.revenue / maxValue) * 100 : 0
            const collectionsHeight = maxValue > 0 ? (month.collections / maxValue) * 100 : 0

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center gap-1 h-48">
                  {/* Revenue Bar */}
                  <div 
                    className="w-5 bg-gradient-to-t from-emerald-500/50 to-emerald-400/80 rounded-t transition-all duration-500 hover:from-emerald-500/70 hover:to-emerald-400"
                    style={{ height: `${revenueHeight}%`, minHeight: month.revenue > 0 ? "8px" : "0" }}
                    title={`Revenue: ${formatCurrency(month.revenue)}`}
                  />
                  {/* Collections Bar */}
                  <div 
                    className="w-5 bg-gradient-to-t from-teal-500/50 to-teal-400/80 rounded-t transition-all duration-500 hover:from-teal-500/70 hover:to-teal-400"
                    style={{ height: `${collectionsHeight}%`, minHeight: month.collections > 0 ? "8px" : "0" }}
                    title={`Collections: ${formatCurrency(month.collections)}`}
                  />
                </div>
                <span className="text-xs text-slate-400">{month.month}</span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-xs text-slate-400">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-teal-500" />
            <span className="text-xs text-slate-400">Collections</span>
          </div>
        </div>
      </div>

      {/* Payment Methods & Purchase Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Collections by Payment Method
          </h3>
          
          <div className="space-y-4">
            {[
              { label: "Cash", amount: stats.cashCollections, color: "emerald" },
              { label: "Mobile Money", amount: stats.mobileMoneyCollections, color: "amber" },
              { label: "Bank Transfer", amount: stats.bankTransferCollections, color: "blue" },
              { label: "Wallet", amount: stats.walletCollections, color: "purple" },
            ].map((method) => {
              const percentage = stats.totalCollected > 0 
                ? (method.amount / stats.totalCollected) * 100 
                : 0

              return (
                <div key={method.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{method.label}</span>
                    <span className="text-white font-medium">{formatCurrency(method.amount)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r from-${method.color}-500 to-${method.color}-400 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{percentage.toFixed(1)}% of total</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Purchase Types Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Purchase Types Distribution
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Cash Sales", count: stats.cashSalesCount, icon: "💵", color: "emerald" },
              { label: "Credit Sales", count: stats.creditSalesCount, icon: "💳", color: "blue" },
              { label: "Layaway", count: stats.layawaySalesCount, icon: "📦", color: "purple" },
            ].map((type) => {
              const percentage = stats.totalPurchases > 0 
                ? (type.count / stats.totalPurchases) * 100 
                : 0

              return (
                <div key={type.label} className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <p className="text-2xl font-bold text-white">{formatNumber(type.count)}</p>
                  <p className="text-xs text-slate-400 mt-1">{type.label}</p>
                  <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Shop Performance */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Shop Performance
          </h3>
          <p className="text-sm text-slate-400">{stats.shopCount} shops in this business</p>
        </div>

        {stats.shops.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No shops found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Shop Name</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Customers</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Collected</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Outstanding</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.shops.map((shop) => {
                  const total = shop.totalCollected + shop.totalOutstanding
                  const collectionRate = total > 0 ? (shop.totalCollected / total) * 100 : 0

                  return (
                    <tr key={shop.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className="font-medium text-white">{shop.name}</span>
                      </td>
                      <td className="p-4 text-right text-slate-300">
                        {formatNumber(shop.customerCount)}
                      </td>
                      <td className="p-4 text-right text-emerald-400 font-medium">
                        {formatCurrency(shop.totalCollected)}
                      </td>
                      <td className="p-4 text-right text-amber-400 font-medium">
                        {formatCurrency(shop.totalOutstanding)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${collectionRate}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-400 w-12 text-right">
                            {collectionRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href={`/accountant/${businessSlug}/payments`}
          className="glass-card p-6 group hover:border-emerald-500/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">View All Payments</h4>
              <p className="text-sm text-slate-400">Browse and filter payment records</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/accountant/${businessSlug}/aging`}
          className="glass-card p-6 group hover:border-amber-500/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white group-hover:text-amber-400 transition-colors">Aging Report</h4>
              <p className="text-sm text-slate-400">View outstanding balances by age</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/accountant/${businessSlug}/reports`}
          className="glass-card p-6 group hover:border-teal-500/30 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white group-hover:text-teal-400 transition-colors">Revenue Reports</h4>
              <p className="text-sm text-slate-400">Detailed revenue analytics</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
