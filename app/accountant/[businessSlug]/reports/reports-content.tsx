"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RevenueReportItem } from "../../actions"

interface Shop {
  id: string
  name: string
  shopSlug: string
  isActive: boolean
}

interface CollectorPerformance {
  id: string
  name: string
  email: string | null
  shopName: string
  totalCollected: number
  paymentCount: number
  cashCollected: number
  mobileMoneyCollected: number
  bankTransferCollected: number
}

interface Props {
  revenueReport: RevenueReportItem[]
  collectionReport: CollectorPerformance[]
  shops: Shop[]
  businessSlug: string
  canExportData: boolean
  initialFilters: {
    startDate: string
    endDate: string
    shopId: string
    groupBy: string
  }
}

export function ReportsContent({
  revenueReport,
  collectionReport,
  shops,
  businessSlug,
  canExportData,
  initialFilters,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filters, setFilters] = useState(initialFilters)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    params.set("startDate", filters.startDate)
    params.set("endDate", filters.endDate)
    params.set("groupBy", filters.groupBy)
    if (filters.shopId) params.set("shopId", filters.shopId)

    startTransition(() => {
      router.push(`/accountant/${businessSlug}/reports?${params.toString()}`)
    })
  }

  // Calculate totals
  const totalRevenue = revenueReport.reduce((sum, r) => sum + r.revenue, 0)
  const totalCollections = revenueReport.reduce((sum, r) => sum + r.collections, 0)
  const totalPayments = revenueReport.reduce((sum, r) => sum + r.paymentCount, 0)

  // Format date for display
  const formatDateLabel = (dateStr: string) => {
    if (filters.groupBy === "month") {
      const [year, month] = dateStr.split("-")
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    }
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-40">
            <label className="block text-sm text-slate-400 mb-2">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="w-full lg:w-40">
            <label className="block text-sm text-slate-400 mb-2">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="w-full lg:w-40">
            <label className="block text-sm text-slate-400 mb-2">Group By</label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>

          <div className="w-full lg:w-48">
            <label className="block text-sm text-slate-400 mb-2">Shop</label>
            <select
              value={filters.shopId}
              onChange={(e) => setFilters({ ...filters, shopId: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={applyFilters}
              disabled={isPending}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
            >
              {isPending ? "Loading..." : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Collections</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalCollections)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Payments</p>
              <p className="text-2xl font-bold text-white">{totalPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Revenue vs Collections
        </h3>

        {revenueReport.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No data for the selected period
          </div>
        ) : (
          <>
            <div className="h-64 flex items-end gap-2 overflow-x-auto pb-4">
              {revenueReport.map((item, index) => {
                const maxValue = Math.max(...revenueReport.map(r => Math.max(r.revenue, r.collections)))
                const revenueHeight = maxValue > 0 ? (item.revenue / maxValue) * 100 : 0
                const collectionsHeight = maxValue > 0 ? (item.collections / maxValue) * 100 : 0

                return (
                  <div key={index} className="flex flex-col items-center gap-2 min-w-[60px]">
                    <div className="w-full flex items-end justify-center gap-1 h-48">
                      <div
                        className="w-6 bg-gradient-to-t from-emerald-500/50 to-emerald-400/80 rounded-t transition-all hover:from-emerald-500/70 hover:to-emerald-400"
                        style={{ height: `${revenueHeight}%`, minHeight: item.revenue > 0 ? "8px" : "0" }}
                        title={`Revenue: ${formatCurrency(item.revenue)}`}
                      />
                      <div
                        className="w-6 bg-gradient-to-t from-teal-500/50 to-teal-400/80 rounded-t transition-all hover:from-teal-500/70 hover:to-teal-400"
                        style={{ height: `${collectionsHeight}%`, minHeight: item.collections > 0 ? "8px" : "0" }}
                        title={`Collections: ${formatCurrency(item.collections)}`}
                      />
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateLabel(item.date)}</span>
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
          </>
        )}
      </div>

      {/* Revenue Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Revenue Details</h3>
        </div>
        
        {revenueReport.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No data for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Revenue</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Collections</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Cash Sales</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Credit Sales</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Layaway</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Payments</th>
                </tr>
              </thead>
              <tbody>
                {revenueReport.map((item, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{formatDateLabel(item.date)}</td>
                    <td className="p-4 text-right text-emerald-400 font-medium">{formatCurrency(item.revenue)}</td>
                    <td className="p-4 text-right text-teal-400 font-medium">{formatCurrency(item.collections)}</td>
                    <td className="p-4 text-right text-slate-300">{item.cashSales}</td>
                    <td className="p-4 text-right text-slate-300">{item.creditSales}</td>
                    <td className="p-4 text-right text-slate-300">{item.layawaySales}</td>
                    <td className="p-4 text-right text-slate-300">{item.paymentCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/5">
                  <td className="p-4 font-semibold text-white">Total</td>
                  <td className="p-4 text-right font-semibold text-emerald-400">{formatCurrency(totalRevenue)}</td>
                  <td className="p-4 text-right font-semibold text-teal-400">{formatCurrency(totalCollections)}</td>
                  <td className="p-4 text-right font-medium text-slate-300">
                    {revenueReport.reduce((sum, r) => sum + r.cashSales, 0)}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-300">
                    {revenueReport.reduce((sum, r) => sum + r.creditSales, 0)}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-300">
                    {revenueReport.reduce((sum, r) => sum + r.layawaySales, 0)}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-300">{totalPayments}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Collector Performance */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Collection Performance by Staff</h3>
        </div>

        {collectionReport.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No collection data for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Collector</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Shop</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Total Collected</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Payments</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Cash</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Mobile Money</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Bank Transfer</th>
                </tr>
              </thead>
              <tbody>
                {collectionReport.map((collector) => (
                  <tr key={collector.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div className="text-white font-medium">{collector.name}</div>
                      <div className="text-xs text-slate-400">{collector.email}</div>
                    </td>
                    <td className="p-4 text-slate-300">{collector.shopName}</td>
                    <td className="p-4 text-right text-emerald-400 font-semibold">
                      {formatCurrency(collector.totalCollected)}
                    </td>
                    <td className="p-4 text-right text-slate-300">{collector.paymentCount}</td>
                    <td className="p-4 text-right text-slate-300">{formatCurrency(collector.cashCollected)}</td>
                    <td className="p-4 text-right text-slate-300">{formatCurrency(collector.mobileMoneyCollected)}</td>
                    <td className="p-4 text-right text-slate-300">{formatCurrency(collector.bankTransferCollected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
