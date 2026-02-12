"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createDailyCashSummary } from "../../actions"

interface CashSummary {
  id: string
  summaryDate: Date
  shopId: string
  shopName: string
  openingCash: number
  openingMomo: number
  openingBank: number
  cashCollected: number
  momoCollected: number
  bankCollected: number
  cashExpenses: number
  momoExpenses: number
  bankExpenses: number
  closingCash: number
  closingMomo: number
  closingBank: number
  cashVariance: number
  varianceExplanation: string | null
  status: string
  notes: string | null
}

interface Shop {
  id: string
  name: string
}

interface Props {
  businessSlug: string
  summaries: CashSummary[]
  shops: Shop[]
  permissions: Record<string, boolean>
}

export function CashSummaryContent({ businessSlug, summaries, shops, permissions }: Props) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    shopId: "",
    startDate: "",
    endDate: "",
  })

  const [formData, setFormData] = useState({
    shopId: shops[0]?.id || "",
    openingCash: "",
    closingCash: "",
    totalCashIn: "",
    totalCashOut: "",
    actualCash: "",
    notes: "",
    summaryDate: new Date().toISOString().split("T")[0],
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/accountant/${businessSlug}/cash-summary?${params.toString()}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = new FormData()
      data.append("shopId", formData.shopId)
      data.append("summaryDate", formData.summaryDate)
      data.append("openingCash", formData.openingCash)
      data.append("cashCollected", formData.totalCashIn)
      data.append("cashExpenses", formData.totalCashOut)
      data.append("closingCash", formData.closingCash)
      if (formData.notes) data.append("notes", formData.notes)
      
      const result = await createDailyCashSummary(businessSlug, data)

      if (result.success) {
        setShowAddForm(false)
        setFormData({
          shopId: shops[0]?.id || "",
          openingCash: "",
          closingCash: "",
          totalCashIn: "",
          totalCashOut: "",
          actualCash: "",
          notes: "",
          summaryDate: new Date().toISOString().split("T")[0],
        })
        router.refresh()
      } else {
        setError(result.error || "Failed to create cash summary")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const totalVariance = summaries.reduce((sum, s) => sum + s.cashVariance, 0)
  const positiveVariances = summaries.filter(s => s.cashVariance > 0).length
  const negativeVariances = summaries.filter(s => s.cashVariance < 0).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Reports</p>
          <p className="text-2xl font-bold text-white">{summaries.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Net Variance</p>
          <p className={`text-2xl font-bold ${totalVariance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(totalVariance)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Over Reports</p>
          <p className="text-2xl font-bold text-emerald-400">{positiveVariances}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Short Reports</p>
          <p className="text-2xl font-bold text-red-400">{negativeVariances}</p>
        </div>
      </div>

      {/* Filters and Add Button */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.shopId}
            onChange={(e) => handleFilterChange("shopId", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Shops</option>
            {shops.map(shop => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <div className="flex-1" />

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            + New Summary
          </button>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">New Cash Summary</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Shop *</label>
                  <select
                    value={formData.shopId}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.summaryDate}
                    onChange={(e) => setFormData({ ...formData, summaryDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Opening Cash *</label>
                  <input
                    type="number"
                    value={formData.openingCash}
                    onChange={(e) => setFormData({ ...formData, openingCash: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Closing Cash *</label>
                  <input
                    type="number"
                    value={formData.closingCash}
                    onChange={(e) => setFormData({ ...formData, closingCash: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Total Cash In *</label>
                  <input
                    type="number"
                    value={formData.totalCashIn}
                    onChange={(e) => setFormData({ ...formData, totalCashIn: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Total Cash Out *</label>
                  <input
                    type="number"
                    value={formData.totalCashOut}
                    onChange={(e) => setFormData({ ...formData, totalCashOut: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Actual Cash Count *</label>
                <input
                  type="number"
                  value={formData.actualCash}
                  onChange={(e) => setFormData({ ...formData, actualCash: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Summary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summaries Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                <th className="text-left p-4 text-slate-400 font-medium">Shop</th>
                <th className="text-right p-4 text-slate-400 font-medium">Opening</th>
                <th className="text-right p-4 text-slate-400 font-medium">Collected</th>
                <th className="text-right p-4 text-slate-400 font-medium">Expenses</th>
                <th className="text-right p-4 text-slate-400 font-medium">Closing</th>
                <th className="text-right p-4 text-slate-400 font-medium">Variance</th>
                <th className="text-center p-4 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No cash summaries found
                  </td>
                </tr>
              ) : (
                summaries.map((summary) => {
                  const totalCollected = summary.cashCollected + summary.momoCollected + summary.bankCollected
                  const totalExpenses = summary.cashExpenses + summary.momoExpenses + summary.bankExpenses
                  return (
                    <tr key={summary.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-slate-300">
                        {new Date(summary.summaryDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-white font-medium">{summary.shopName}</td>
                      <td className="p-4 text-right text-slate-300">{formatCurrency(summary.openingCash)}</td>
                      <td className="p-4 text-right text-emerald-400">{formatCurrency(totalCollected)}</td>
                      <td className="p-4 text-right text-red-400">{formatCurrency(totalExpenses)}</td>
                      <td className="p-4 text-right text-white font-medium">{formatCurrency(summary.closingCash)}</td>
                      <td className={`p-4 text-right font-medium ${
                        summary.cashVariance > 0 ? "text-emerald-400" : summary.cashVariance < 0 ? "text-red-400" : "text-slate-300"
                      }`}>
                        {summary.cashVariance > 0 ? "+" : ""}{formatCurrency(summary.cashVariance)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          summary.status === "VERIFIED" 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : summary.status === "DISCREPANCY"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {summary.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
