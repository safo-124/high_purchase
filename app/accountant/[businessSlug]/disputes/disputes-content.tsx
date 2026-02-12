"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createDispute, resolveDispute } from "../../actions"

interface Dispute {
  id: string
  paymentId: string
  disputeType: string
  description: string
  disputedAmount: number
  expectedAmount: number | null
  status: string
  resolution: string | null
  resolvedAmount: number | null
  raisedByName: string | null
  assignedToName: string | null
  resolvedAt: Date | null
  createdAt: Date
}

interface Shop {
  id: string
  name: string
}

interface Props {
  businessSlug: string
  disputes: Dispute[]
  shops: Shop[]
  permissions: Record<string, boolean>
}

const DISPUTE_TYPES = [
  { value: "AMOUNT_MISMATCH", label: "Amount Mismatch" },
  { value: "DUPLICATE_PAYMENT", label: "Duplicate Payment" },
  { value: "UNAUTHORIZED", label: "Unauthorized Transaction" },
  { value: "NOT_RECEIVED", label: "Payment Not Received" },
  { value: "WRONG_ACCOUNT", label: "Wrong Account Credited" },
  { value: "OTHER", label: "Other" },
]

export function DisputesContent({ businessSlug, disputes, permissions }: Props) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showResolveForm, setShowResolveForm] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    type: "",
  })

  const [formData, setFormData] = useState({
    type: "AMOUNT_MISMATCH",
    contractId: "",
    paymentId: "",
    amount: "",
    description: "",
  })

  const [resolveData, setResolveData] = useState({
    resolution: "",
    resolvedAmount: "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/accountant/${businessSlug}/disputes?${params.toString()}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = new FormData()
      data.append("disputeType", formData.type)
      if (formData.paymentId) data.append("paymentId", formData.paymentId)
      data.append("disputedAmount", formData.amount)
      data.append("description", formData.description)
      
      const result = await createDispute(businessSlug, data)

      if (result.success) {
        setShowAddForm(false)
        setFormData({
          type: "AMOUNT_MISMATCH",
          contractId: "",
          paymentId: "",
          amount: "",
          description: "",
        })
        router.refresh()
      } else {
        setError(result.error || "Failed to create dispute")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (disputeId: string) => {
    setLoading(true)
    try {
      const result = await resolveDispute(
        businessSlug,
        disputeId,
        resolveData.resolution,
        resolveData.resolvedAmount ? parseFloat(resolveData.resolvedAmount) : undefined
      )

      if (result.success) {
        setShowResolveForm(null)
        setResolveData({ resolution: "", resolvedAmount: "" })
        router.refresh()
      }
    } catch {
      // Handle error
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

  const openDisputes = disputes.filter(d => d.status === "OPEN" || d.status === "INVESTIGATING")
  const totalDisputeAmount = disputes.reduce((sum, d) => sum + d.disputedAmount, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Disputes</p>
          <p className="text-2xl font-bold text-white">{disputes.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Open Cases</p>
          <p className="text-2xl font-bold text-amber-400">{openDisputes.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Amount</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDisputeAmount)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Resolved</p>
          <p className="text-2xl font-bold text-emerald-400">
            {disputes.filter(d => d.status === "RESOLVED").length}
          </p>
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
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Types</option>
            {DISPUTE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            + Report Dispute
          </button>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Report New Dispute</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Dispute Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  {DISPUTE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Disputed Amount (KES) *</label>
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none resize-none"
                  placeholder="Describe the dispute in detail..."
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
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Form Modal */}
      {showResolveForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Resolve Dispute</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Resolution Notes *</label>
                <textarea
                  value={resolveData.resolution}
                  onChange={(e) => setResolveData({ ...resolveData, resolution: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none resize-none"
                  placeholder="Describe how the dispute was resolved..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Resolved Amount (if applicable)</label>
                <input
                  type="number"
                  value={resolveData.resolvedAmount}
                  onChange={(e) => setResolveData({ ...resolveData, resolvedAmount: e.target.value })}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowResolveForm(null)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolve(showResolveForm)}
                  disabled={loading || !resolveData.resolution}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                >
                  {loading ? "Resolving..." : "Mark Resolved"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disputes Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                <th className="text-left p-4 text-slate-400 font-medium">Customer</th>
                <th className="text-left p-4 text-slate-400 font-medium">Type</th>
                <th className="text-right p-4 text-slate-400 font-medium">Amount</th>
                <th className="text-left p-4 text-slate-400 font-medium">Description</th>
                <th className="text-center p-4 text-slate-400 font-medium">Status</th>
                <th className="text-center p-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No disputes found
                  </td>
                </tr>
              ) : (
                disputes.map((dispute) => (
                  <tr key={dispute.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-slate-300">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">
                        {dispute.raisedByName || "N/A"}
                      </p>
                      <p className="text-slate-400 text-sm">
                        Payment: {dispute.paymentId.slice(0, 8)}...
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300">
                        {DISPUTE_TYPES.find(t => t.value === dispute.disputeType)?.label || dispute.disputeType}
                      </span>
                    </td>
                    <td className="p-4 text-right text-red-400 font-medium">
                      {formatCurrency(dispute.disputedAmount)}
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">
                      {dispute.description}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        dispute.status === "RESOLVED" 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : dispute.status === "CLOSED"
                          ? "bg-slate-500/20 text-slate-400"
                          : dispute.status === "INVESTIGATING"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {dispute.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {(dispute.status === "OPEN" || dispute.status === "INVESTIGATING") && (
                        <button
                          onClick={() => setShowResolveForm(dispute.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                        >
                          Resolve
                        </button>
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
