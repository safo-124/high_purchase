"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBudget } from "../../actions"

interface Budget {
  id: string
  name: string
  category: string | null
  customCategory: string | null
  amount: number
  spent: number
  variance: number
  variancePercent: number
  period: string
  startDate: Date
  endDate: Date
  isActive: boolean
}

interface Shop {
  id: string
  name: string
}

interface Props {
  businessSlug: string
  budgets: Budget[]
  shops: Shop[]
  permissions: Record<string, boolean>
}

const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SALARIES", label: "Salaries" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "TAXES", label: "Taxes" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "OTHER", label: "Other" },
]

export function BudgetsContent({ businessSlug, budgets, shops, permissions }: Props) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    period: "",
    category: "",
  })

  const [formData, setFormData] = useState({
    name: "",
    category: "OTHER",
    period: "MONTHLY",
    allocatedAmount: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    shopId: "",
    notes: "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/accountant/${businessSlug}/budgets?${params.toString()}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = new FormData()
      data.append("name", formData.name)
      data.append("category", formData.category)
      data.append("period", formData.period)
      data.append("amount", formData.allocatedAmount)
      data.append("startDate", formData.startDate)
      data.append("endDate", formData.endDate)
      if (formData.shopId) data.append("shopId", formData.shopId)
      if (formData.notes) data.append("notes", formData.notes)
      
      const result = await createBudget(businessSlug, data)

      if (result.success) {
        setShowAddForm(false)
        setFormData({
          name: "",
          category: "OTHER",
          period: "MONTHLY",
          allocatedAmount: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          shopId: "",
          notes: "",
        })
        router.refresh()
      } else {
        setError(result.error || "Failed to create budget")
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

  const totalAllocated = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = budgets.reduce((sum, b) => sum + b.variance, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Budgets</p>
          <p className="text-2xl font-bold text-white">{budgets.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Allocated</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalAllocated)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Spent</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Remaining</p>
          <p className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      {/* Filters and Add Button */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.period}
            onChange={(e) => handleFilterChange("period", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Periods</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            + New Budget
          </button>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Create New Budget</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Budget Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  placeholder="e.g., Q1 Marketing Budget"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Period *</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Allocated Amount (KES) *</label>
                <input
                  type="number"
                  value={formData.allocatedAmount}
                  onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Shop (Optional)</label>
                <select
                  value={formData.shopId}
                  onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="">Business-wide Budget</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none resize-none"
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
                  {loading ? "Creating..." : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.length === 0 ? (
          <div className="col-span-full glass-card p-8 text-center text-slate-400">
            No budgets found. Create your first budget to get started.
          </div>
        ) : (
          budgets.map((budget) => {
            const percentUsed = budget.amount > 0 
              ? (budget.spent / budget.amount) * 100 
              : 0
            const isOverBudget = budget.spent > budget.amount
            
            return (
              <div key={budget.id} className="glass-card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-medium">{budget.name}</h3>
                    <p className="text-slate-400 text-sm">
                      {EXPENSE_CATEGORIES.find(c => c.value === budget.category)?.label || budget.category || "General"}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    budget.period === "MONTHLY" 
                      ? "bg-blue-500/20 text-blue-400" 
                      : budget.period === "QUARTERLY"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {budget.period}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Allocated</span>
                    <span className="text-white">{formatCurrency(budget.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Spent</span>
                    <span className={isOverBudget ? "text-red-400" : "text-amber-400"}>
                      {formatCurrency(budget.spent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Remaining</span>
                    <span className={budget.variance >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {formatCurrency(budget.variance)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                      isOverBudget ? "bg-red-500" : percentUsed > 80 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-slate-400 text-xs mt-2 text-right">
                  {percentUsed.toFixed(1)}% used
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
