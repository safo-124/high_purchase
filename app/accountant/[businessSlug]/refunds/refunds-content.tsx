"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRefund, approveRefund, processRefund } from "../../actions"

interface Refund {
  id: string
  purchaseId: string
  purchaseNumber: string
  customerId: string
  customerName: string
  reason: string
  customReason: string | null
  amount: number
  refundMethod: string
  status: string
  reference: string | null
  processedAt: Date | null
  notes: string | null
  createdAt: Date
}

interface Shop {
  id: string
  name: string
}

interface Props {
  businessSlug: string
  refunds: Refund[]
  shops: Shop[]
  permissions: Record<string, boolean>
}

const REFUND_REASONS = [
  { value: "PRODUCT_DEFECT", label: "Product Defect" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "DUPLICATE_PAYMENT", label: "Duplicate Payment" },
  { value: "CONTRACT_CANCELLED", label: "Contract Cancelled" },
  { value: "CUSTOMER_REQUEST", label: "Customer Request" },
  { value: "OVERCHARGE", label: "Overcharge" },
  { value: "OTHER", label: "Other" },
]

export function RefundsContent({ businessSlug, refunds, permissions }: Props) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    reason: "",
  })

  const [formData, setFormData] = useState({
    purchaseId: "",
    customerId: "",
    reason: "CUSTOMER_REQUEST",
    amount: "",
    notes: "",
    refundMethod: "CASH",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/accountant/${businessSlug}/refunds?${params.toString()}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = new FormData()
      data.append("purchaseId", formData.purchaseId)
      data.append("customerId", formData.customerId)
      data.append("reason", formData.reason)
      data.append("amount", formData.amount)
      data.append("refundMethod", formData.refundMethod)
      if (formData.notes) data.append("notes", formData.notes)
      
      const result = await createRefund(businessSlug, data)

      if (result.success) {
        setShowAddForm(false)
        setFormData({
          purchaseId: "",
          customerId: "",
          reason: "CUSTOMER_REQUEST",
          amount: "",
          notes: "",
          refundMethod: "CASH",
        })
        router.refresh()
      } else {
        setError(result.error || "Failed to create refund request")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (refundId: string) => {
    const result = await approveRefund(businessSlug, refundId)
    if (result.success) {
      router.refresh()
    }
  }

  const handleProcess = async (refundId: string) => {
    const reference = prompt("Enter transaction reference (e.g., M-PESA code or bank reference):")
    
    if (reference) {
      const result = await processRefund(businessSlug, refundId, reference)
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

  const pendingRefunds = refunds.filter(r => r.status === "PENDING")
  const approvedRefunds = refunds.filter(r => r.status === "APPROVED")
  const totalRefunded = refunds
    .filter(r => r.status === "PROCESSED")
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Requests</p>
          <p className="text-2xl font-bold text-white">{refunds.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-400">{pendingRefunds.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Awaiting Processing</p>
          <p className="text-2xl font-bold text-blue-400">{approvedRefunds.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Refunded</p>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalRefunded)}</p>
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
            <option value="PROCESSED">Processed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={filters.reason}
            onChange={(e) => handleFilterChange("reason", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Reasons</option>
            {REFUND_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            + Request Refund
          </button>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Request New Refund</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Purchase ID *</label>
                <input
                  type="text"
                  value={formData.purchaseId}
                  onChange={(e) => setFormData({ ...formData, purchaseId: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Enter purchase ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Customer ID *</label>
                <input
                  type="text"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Enter customer ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reason *</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  {REFUND_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Refund Amount (KES) *</label>
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none resize-none"
                  placeholder="Additional notes about the refund..."
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
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refunds Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                <th className="text-left p-4 text-slate-400 font-medium">Customer</th>
                <th className="text-left p-4 text-slate-400 font-medium">Reason</th>
                <th className="text-right p-4 text-slate-400 font-medium">Amount</th>
                <th className="text-center p-4 text-slate-400 font-medium">Status</th>
                <th className="text-center p-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No refund requests found
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => (
                  <tr key={refund.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-slate-300">
                      {new Date(refund.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">{refund.customerName}</p>
                      <p className="text-slate-400 text-sm">Purchase #{refund.purchaseNumber}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300">
                        {REFUND_REASONS.find(r => r.value === refund.reason)?.label || refund.reason}
                      </span>
                      {refund.customReason && (
                        <p className="text-slate-500 text-xs mt-1">{refund.customReason}</p>
                      )}
                    </td>
                    <td className="p-4 text-right text-purple-400 font-medium">
                      {formatCurrency(refund.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        refund.status === "PROCESSED" 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : refund.status === "APPROVED"
                          ? "bg-blue-500/20 text-blue-400"
                          : refund.status === "REJECTED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {refund.status === "PENDING" && permissions.canConfirmPayments && (
                          <button
                            onClick={() => handleApprove(refund.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                          >
                            Approve
                          </button>
                        )}
                        {refund.status === "APPROVED" && permissions.canConfirmPayments && (
                          <button
                            onClick={() => handleProcess(refund.id)}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm font-medium"
                          >
                            Process
                          </button>
                        )}
                      </div>
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
