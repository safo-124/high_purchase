"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AgingReportItem, exportAgingReport } from "../../actions"

interface Shop {
  id: string
  name: string
  shopSlug: string
  isActive: boolean
}

interface Props {
  agingReport: AgingReportItem[]
  shops: Shop[]
  businessSlug: string
  canExportData: boolean
  initialShopId: string
}

export function AgingContent({
  agingReport,
  shops,
  businessSlug,
  canExportData,
  initialShopId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [shopId, setShopId] = useState(initialShopId)
  const [isExporting, setIsExporting] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const applyFilter = () => {
    const params = new URLSearchParams()
    if (shopId) params.set("shopId", shopId)

    startTransition(() => {
      router.push(`/accountant/${businessSlug}/aging?${params.toString()}`)
    })
  }

  const handleExport = async () => {
    if (!canExportData) return

    setIsExporting(true)
    try {
      const data = await exportAgingReport(businessSlug, shopId || undefined)
      
      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(",")
      const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(","))
      const csv = [headers, ...rows].join("\n")
      
      // Download
      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `aging-report-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert("Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  // Calculate totals
  const totals = agingReport.reduce(
    (acc, item) => ({
      totalOutstanding: acc.totalOutstanding + item.totalOutstanding,
      current: acc.current + item.current,
      days31to60: acc.days31to60 + item.days31to60,
      days61to90: acc.days61to90 + item.days61to90,
      over90Days: acc.over90Days + item.over90Days,
    }),
    { totalOutstanding: 0, current: 0, days31to60: 0, days61to90: 0, over90Days: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">Filter by Shop</label>
            <select
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={applyFilter}
            disabled={isPending}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            {isPending ? "Loading..." : "Apply Filter"}
          </button>

          {canExportData && (
            <button
              onClick={handleExport}
              disabled={isExporting || agingReport.length === 0}
              className="px-6 py-2.5 text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 mb-1">Total Outstanding</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totals.totalOutstanding)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 mb-1">Current (0-30 days)</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.current)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 mb-1">31-60 Days</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(totals.days31to60)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 mb-1">61-90 Days</p>
          <p className="text-xl font-bold text-orange-400">{formatCurrency(totals.days61to90)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 mb-1">Over 90 Days</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totals.over90Days)}</p>
        </div>
      </div>

      {/* Age Distribution Chart */}
      {totals.totalOutstanding > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Outstanding Distribution</h3>
          <div className="flex items-center h-8 rounded-lg overflow-hidden">
            {[
              { amount: totals.current, color: "bg-emerald-500", label: "Current" },
              { amount: totals.days31to60, color: "bg-amber-500", label: "31-60 days" },
              { amount: totals.days61to90, color: "bg-orange-500", label: "61-90 days" },
              { amount: totals.over90Days, color: "bg-red-500", label: "90+ days" },
            ].map((segment, index) => {
              const percentage = (segment.amount / totals.totalOutstanding) * 100
              if (percentage <= 0) return null
              return (
                <div
                  key={index}
                  className={`${segment.color} h-full transition-all hover:brightness-110`}
                  style={{ width: `${percentage}%` }}
                  title={`${segment.label}: ${formatCurrency(segment.amount)} (${percentage.toFixed(1)}%)`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {[
              { color: "bg-emerald-500", label: "Current (0-30 days)", amount: totals.current },
              { color: "bg-amber-500", label: "31-60 Days", amount: totals.days31to60 },
              { color: "bg-orange-500", label: "61-90 Days", amount: totals.days61to90 },
              { color: "bg-red-500", label: "Over 90 Days", amount: totals.over90Days },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                <span className="text-xs text-slate-400">
                  {item.label} ({((item.amount / totals.totalOutstanding) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aging Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">
            Customer Aging Details ({agingReport.length} customers)
          </h3>
        </div>

        {agingReport.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">No Outstanding Balances</h4>
            <p className="text-slate-400">All customers are up to date with their payments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Shop</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Total Outstanding</th>
                  <th className="text-right p-4 text-sm font-medium text-emerald-400">Current</th>
                  <th className="text-right p-4 text-sm font-medium text-amber-400">31-60 Days</th>
                  <th className="text-right p-4 text-sm font-medium text-orange-400">61-90 Days</th>
                  <th className="text-right p-4 text-sm font-medium text-red-400">90+ Days</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Oldest Due</th>
                </tr>
              </thead>
              <tbody>
                {agingReport.map((item) => (
                  <tr key={item.customerId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div className="text-white font-medium">{item.customerName}</div>
                      <div className="text-xs text-slate-400">{item.customerPhone}</div>
                    </td>
                    <td className="p-4 text-slate-300">{item.shopName}</td>
                    <td className="p-4 text-right font-semibold text-white">
                      {formatCurrency(item.totalOutstanding)}
                    </td>
                    <td className="p-4 text-right text-emerald-400">
                      {item.current > 0 ? formatCurrency(item.current) : "-"}
                    </td>
                    <td className="p-4 text-right text-amber-400">
                      {item.days31to60 > 0 ? formatCurrency(item.days31to60) : "-"}
                    </td>
                    <td className="p-4 text-right text-orange-400">
                      {item.days61to90 > 0 ? formatCurrency(item.days61to90) : "-"}
                    </td>
                    <td className="p-4 text-right text-red-400">
                      {item.over90Days > 0 ? formatCurrency(item.over90Days) : "-"}
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {formatDate(item.oldestDueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/5">
                  <td colSpan={2} className="p-4 font-semibold text-white">Total</td>
                  <td className="p-4 text-right font-bold text-white">{formatCurrency(totals.totalOutstanding)}</td>
                  <td className="p-4 text-right font-semibold text-emerald-400">{formatCurrency(totals.current)}</td>
                  <td className="p-4 text-right font-semibold text-amber-400">{formatCurrency(totals.days31to60)}</td>
                  <td className="p-4 text-right font-semibold text-orange-400">{formatCurrency(totals.days61to90)}</td>
                  <td className="p-4 text-right font-semibold text-red-400">{formatCurrency(totals.over90Days)}</td>
                  <td className="p-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
