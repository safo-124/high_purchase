"use client"

import { useState, useEffect } from "react"
import { getAdvancedReportData, exportBusinessData } from "../../upgrade-actions"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ReportData {
  summary: { totalRevenue: number; totalCollected: number; totalOutstanding: number; collectionRate: number; totalPurchases: number; totalCustomers: number }
  purchaseTypes: { cash: { count: number; value: number }; layaway: { count: number; value: number }; credit: { count: number; value: number } }
  monthlyTrends: Array<{ month: string; revenue: number; collected: number; purchases: number; customers: number }>
  methodBreakdown: Record<string, number>
  shopPerformance: Array<{ name: string; revenue: number; collected: number; outstanding: number; purchases: number; customers: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  lowStockProducts: Array<{ name: string; stock: number; threshold: number }>
  statusBreakdown: Record<string, number>
}

const COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"]

export default function AdvancedReportsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])
  const [exporting, setExporting] = useState("")

  useEffect(() => { params.then(p => setBusinessSlug(p.businessSlug)) }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadReport()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug, dateFrom, dateTo])

  const loadReport = async () => {
    setLoading(true)
    const result = await getAdvancedReportData(businessSlug, dateFrom, dateTo)
    if (result.success) setData(result.data as ReportData)
    setLoading(false)
  }

  const handleExport = async (type: "customers" | "purchases" | "payments" | "products" | "staff") => {
    setExporting(type)
    const result = await exportBusinessData(businessSlug, type)
    if (result.success && result.data) {
      const d = result.data as { csv: string; filename: string }
      const blob = new Blob([d.csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = d.filename
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting("")
  }

  const fmt = (n: number) => new Intl.NumberFormat("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const quickRanges = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "1y", days: 365 },
  ]

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Loading report data...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const pieData = [
    { name: "Cash", value: data.purchaseTypes.cash.value },
    { name: "Layaway", value: data.purchaseTypes.layaway.value },
    { name: "Credit", value: data.purchaseTypes.credit.value },
  ].filter(d => d.value > 0)

  const methodData = Object.entries(data.methodBreakdown).map(([method, value]) => ({
    name: method.replace("_", " "),
    value,
  }))

  const statusData = Object.entries(data.statusBreakdown)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({ name: status, value: count }))

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Advanced Reports</h1>
          <p className="text-slate-400">Interactive charts & comprehensive business analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickRanges.map(r => (
            <button key={r.label} onClick={() => {
              setDateFrom(new Date(Date.now() - r.days * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
              setDateTo(new Date().toISOString().split("T")[0])
            }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:text-white border border-white/10 transition-all">
              {r.label}
            </button>
          ))}
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-cyan-500/50 focus:outline-none" />
          <span className="text-slate-600">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-cyan-500/50 focus:outline-none" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: `GHS ${fmt(data.summary.totalRevenue)}`, color: "cyan" },
          { label: "Total Collected", value: `GHS ${fmt(data.summary.totalCollected)}`, color: "emerald" },
          { label: "Outstanding", value: `GHS ${fmt(data.summary.totalOutstanding)}`, color: "amber" },
          { label: "Collection Rate", value: `${data.summary.collectionRate.toFixed(1)}%`, color: "blue" },
        ].map(card => (
          <div key={card.label} className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-xl lg:text-2xl font-bold text-${card.color}-400`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-white mb-4">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrends}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#06b6d4" fill="url(#revGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" fill="url(#colGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Purchase Type Breakdown */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-white mb-4">Sales by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                <Legend formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Methods */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-white mb-4">Payment Methods</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
                <Bar dataKey="value" name="Amount" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Purchase Status */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-white mb-4">Purchase Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {statusData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shop Performance Table */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5 mb-6">
        <h3 className="text-base font-semibold text-white mb-4">Shop Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Shop</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Revenue</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Collected</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Outstanding</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Purchases</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Customers</th>
              </tr>
            </thead>
            <tbody>
              {data.shopPerformance.map((shop, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-white font-medium">{shop.name}</td>
                  <td className="py-3 px-4 text-right text-cyan-400">GHS {fmt(shop.revenue)}</td>
                  <td className="py-3 px-4 text-right text-emerald-400">GHS {fmt(shop.collected)}</td>
                  <td className="py-3 px-4 text-right text-amber-400">GHS {fmt(shop.outstanding)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{shop.purchases}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{shop.customers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-white mb-4">Top Products</h3>
          <div className="space-y-2">
            {data.topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs text-slate-500">{idx + 1}</span>
                  <span className="text-sm text-white">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-cyan-400">GHS {fmt(product.revenue)}</p>
                  <p className="text-xs text-slate-500">{product.quantity} units</p>
                </div>
              </div>
            ))}
            {data.topProducts.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No product data</p>}
          </div>
        </div>

        <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-white mb-4">Low Stock Alert</h3>
          <div className="space-y-2">
            {data.lowStockProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{product.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${product.stock === 0 ? "text-red-400" : "text-amber-400"}`}>
                    {product.stock}
                  </span>
                  <span className="text-xs text-slate-600">/ {product.threshold}</span>
                </div>
              </div>
            ))}
            {data.lowStockProducts.length === 0 && <p className="text-sm text-emerald-400 text-center py-4">All stock levels healthy!</p>}
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5">
        <h3 className="text-base font-semibold text-white mb-4">Export Data</h3>
        <div className="flex flex-wrap gap-3">
          {(["customers", "purchases", "payments", "products", "staff"] as const).map(type => (
            <button key={type} onClick={() => handleExport(type)} disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50">
              {exporting === type ? (
                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              )}
              {type.charAt(0).toUpperCase() + type.slice(1)} CSV
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
