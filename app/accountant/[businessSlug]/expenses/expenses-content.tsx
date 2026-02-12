"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createExpense, approveExpense, rejectExpense } from "../../actions"

interface Expense {
  id: string
  category: string
  customCategory: string | null
  description: string
  amount: number
  vendor: string | null
  reference: string | null
  receiptUrl: string | null
  expenseDate: Date
  paymentMethod: string | null
  isRecurring: boolean
  recurringPeriod: string | null
  status: string
  notes: string | null
  shopId: string | null
  shopName: string | null
  createdAt: Date
}

interface Shop {
  id: string
  name: string
}

interface Props {
  businessSlug: string
  expenses: Expense[]
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

export function ExpensesContent({ businessSlug, expenses, shops, permissions }: Props) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    shopId: "",
    startDate: "",
    endDate: "",
  })

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "OTHER",
    vendor: "",
    reference: "",
    notes: "",
    shopId: "",
    expenseDate: new Date().toISOString().split("T")[0],
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/accountant/${businessSlug}/expenses?${params.toString()}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = new FormData()
      data.append("description", formData.description)
      data.append("amount", formData.amount)
      data.append("category", formData.category)
      if (formData.vendor) data.append("vendor", formData.vendor)
      if (formData.reference) data.append("reference", formData.reference)
      if (formData.notes) data.append("notes", formData.notes)
      if (formData.shopId) data.append("shopId", formData.shopId)
      data.append("expenseDate", formData.expenseDate)
      
      const result = await createExpense(businessSlug, data)

      if (result.success) {
        setShowAddForm(false)
        setFormData({
          description: "",
          amount: "",
          category: "OTHER",
          vendor: "",
          reference: "",
          notes: "",
          shopId: "",
          expenseDate: new Date().toISOString().split("T")[0],
        })
        router.refresh()
      } else {
        setError(result.error || "Failed to create expense")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (expenseId: string) => {
    const result = await approveExpense(businessSlug, expenseId)
    if (result.success) {
      router.refresh()
    }
  }

  const handleReject = async (expenseId: string) => {
    const reason = prompt("Enter rejection reason:")
    if (reason) {
      const result = await rejectExpense(businessSlug, expenseId, reason)
      if (result.success) {
        router.refresh()
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingExpenses = expenses.filter(e => e.status === "PENDING")
  const approvedExpenses = expenses.filter(e => e.status === "APPROVED")

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Expense Count</p>
          <p className="text-2xl font-bold text-white">{expenses.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-400">{pendingExpenses.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Approved</p>
          <p className="text-2xl font-bold text-emerald-400">{approvedExpenses.length}</p>
        </div>
      </div>

      {/* Filters and Add Button */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
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
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
            placeholder="End Date"
          />

          <div className="flex-1" />

          {permissions.canRecordExpenses && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              + Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Add Expense Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Add New Expense</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Enter expense description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Amount (KES) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Vendor name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Reference #</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                    placeholder="Invoice/Receipt number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Shop</label>
                  <select
                    value={formData.shopId}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="">Business-wide</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
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
                  {loading ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                <th className="text-left p-4 text-slate-400 font-medium">Description</th>
                <th className="text-left p-4 text-slate-400 font-medium">Category</th>
                <th className="text-left p-4 text-slate-400 font-medium">Shop</th>
                <th className="text-left p-4 text-slate-400 font-medium">Vendor</th>
                <th className="text-right p-4 text-slate-400 font-medium">Amount</th>
                <th className="text-center p-4 text-slate-400 font-medium">Status</th>
                <th className="text-center p-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No expenses found
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-slate-300">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{expense.description}</div>
                      {expense.reference && (
                        <div className="text-slate-400 text-sm">Ref: {expense.reference}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-sm">
                        {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      {expense.shopName || "Business-wide"}
                    </td>
                    <td className="p-4 text-slate-300">
                      {expense.vendor || "-"}
                    </td>
                    <td className="p-4 text-right text-white font-medium">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        expense.status === "APPROVED" 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : expense.status === "REJECTED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {expense.status === "PENDING" && permissions.canApproveExpenses && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(expense.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            title="Approve"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleReject(expense.id)}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Reject"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
