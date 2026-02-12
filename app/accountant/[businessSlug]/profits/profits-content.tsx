"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ProfitMarginItem } from "../../actions"

interface Shop {
  id: string
  name: string
  shopSlug: string
  isActive: boolean
}

interface Props {
  data: ProfitMarginItem[]
  shops: Shop[]
  businessSlug: string
  initialFilters: {
    shopId: string
    from: string
    to: string
  }
}

export function ProfitsContent({ data, shops, businessSlug, initialFilters }: Props) {
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
    if (filters.shopId) params.set("shopId", filters.shopId)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)

    startTransition(() => {
      router.push(`/accountant/${businessSlug}/profits?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setFilters({ shopId: "", from: "", to: "" })
    startTransition(() => {
      router.push(`/accountant/${businessSlug}/profits`)
    })
  }

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      cost: acc.cost + item.cost,
      profit: acc.profit + item.profit,
      itemsSold: acc.itemsSold + item.itemsSold,
    }),
    { revenue: 0, cost: 0, profit: 0, itemsSold: 0 }
  )
  const avgMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-emerald-400"
    if (margin >= 15) return "text-amber-400"
    return "text-red-400"
  }

  const getMarginBarColor = (margin: number) => {
    if (margin >= 30) return "bg-emerald-500"
    if (margin >= 15) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
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

          <div className="w-full lg:w-44">
            <label className="block text-sm text-slate-400 mb-2">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="w-full lg:w-44">
            <label className="block text-sm text-slate-400 mb-2">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={applyFilters}
            disabled={isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            {isPending ? "Applying..." : "Apply Filters"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Revenue</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.revenue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Cost</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totals.cost)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Gross Profit</p>
          <p className={`text-2xl font-bold ${totals.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(totals.profit)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Avg Margin</p>
          <p className={`text-2xl font-bold ${getMarginColor(avgMargin)}`}>
            {avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Items Sold</p>
          <p className="text-2xl font-bold text-white">{totals.itemsSold}</p>
        </div>
      </div>

      {/* Shop Performance */}
      {data.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No data found</h3>
          <p className="text-slate-400">
            No purchases with cost data found for the selected filters.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">Profit by Shop</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Shop</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Items Sold</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Revenue</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Cost</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Profit</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Margin</th>
                  <th className="p-4 text-sm font-medium text-slate-400 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.shopId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-medium">{item.shopName}</td>
                    <td className="p-4 text-right text-slate-300">{item.itemsSold}</td>
                    <td className="p-4 text-right text-slate-300">{formatCurrency(item.revenue)}</td>
                    <td className="p-4 text-right text-red-400/80">{formatCurrency(item.cost)}</td>
                    <td className={`p-4 text-right font-medium ${item.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(item.profit)}
                    </td>
                    <td className={`p-4 text-right font-medium ${getMarginColor(item.margin)}`}>
                      {item.margin.toFixed(1)}%
                    </td>
                    <td className="p-4">
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getMarginBarColor(item.margin)} transition-all`}
                          style={{ width: `${Math.min(100, Math.max(0, item.margin))}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/5">
                  <td className="p-4 text-white font-bold">Total</td>
                  <td className="p-4 text-right text-white font-bold">{totals.itemsSold}</td>
                  <td className="p-4 text-right text-white font-bold">{formatCurrency(totals.revenue)}</td>
                  <td className="p-4 text-right text-red-400 font-bold">{formatCurrency(totals.cost)}</td>
                  <td className={`p-4 text-right font-bold ${totals.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(totals.profit)}
                  </td>
                  <td className={`p-4 text-right font-bold ${getMarginColor(avgMargin)}`}>
                    {avgMargin.toFixed(1)}%
                  </td>
                  <td className="p-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Margin Legend */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-6 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-slate-300">Healthy (≥30%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-slate-300">Moderate (15-30%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-300">Low (&lt;15%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
