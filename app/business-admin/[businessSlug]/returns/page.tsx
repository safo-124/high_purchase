"use client"

import { useState, useEffect } from "react"
import { getReturnRequests, createReturnRequest, processReturnRequest } from "../../upgrade-actions"

interface ReturnData {
  id: string
  returnNumber: string
  purchaseId: string
  customerId: string
  reason: string
  status: string
  refundAmount: string | number | null
  refundMethod: string | null
  items: Array<{ productName: string; quantity: number; unitPrice: number }> | null
  adminNotes: string | null
  processedAt: string | null
  createdAt: string
  purchase: { purchaseNumber: string; totalAmount: string | number } | null
  customer: { firstName: string; lastName: string; phone: string } | null
}

export default function ReturnsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [returns, setReturns] = useState<ReturnData[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [processingId, setProcessingId] = useState("")
  const [formData, setFormData] = useState({
    purchaseId: "", customerId: "", reason: "", refundAmount: "",
    items: [{ productName: "", quantity: 1, unitPrice: 0 }],
  })

  useEffect(() => { params.then(p => setBusinessSlug(p.businessSlug)) }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadReturns()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug, statusFilter])

  const loadReturns = async () => {
    setLoading(true)
    const result = await getReturnRequests(businessSlug, statusFilter || undefined)
    if (result.success) setReturns(result.data as ReturnData[])
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    const result = await createReturnRequest(businessSlug, {
      purchaseId: formData.purchaseId,
      customerId: formData.customerId,
      reason: formData.reason,
      items: formData.items.filter(i => i.productName),
      refundAmount: parseFloat(formData.refundAmount),
    })
    if (result.success) {
      setShowForm(false)
      setFormData({ purchaseId: "", customerId: "", reason: "", refundAmount: "", items: [{ productName: "", quantity: 1, unitPrice: 0 }] })
      await loadReturns()
    }
    setSaving(false)
  }

  const handleProcess = async (returnId: string, action: "approve" | "reject") => {
    setProcessingId(returnId)
    await processReturnRequest(businessSlug, returnId, action, undefined, action === "approve" ? "wallet" : undefined)
    await loadReturns()
    setProcessingId("")
  }

  const statusColors: Record<string, string> = {
    PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    APPROVED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    REJECTED: "text-red-400 bg-red-500/10 border-red-500/20",
    REFUNDED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    PARTIALLY_REFUNDED: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  }

  const statuses = ["PENDING", "APPROVED", "REJECTED", "REFUNDED", "PARTIALLY_REFUNDED"]
  const fmt = (n: number | string) => Number(n).toFixed(2)

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Returns & Refunds</h1>
          <p className="text-slate-400">Manage return requests and process refunds</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Return
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
            !statusFilter ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-white/5 text-slate-400 border-white/10"
          }`}>All</button>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              statusFilter === s ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-white/5 text-slate-400 border-white/10"
            }`}>{s.replace("_", " ")}</button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-white/[0.03] rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Return Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Purchase ID</label>
              <input type="text" value={formData.purchaseId} onChange={e => setFormData(d => ({ ...d, purchaseId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Customer ID</label>
              <input type="text" value={formData.customerId} onChange={e => setFormData(d => ({ ...d, customerId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Reason</label>
              <textarea value={formData.reason} onChange={e => setFormData(d => ({ ...d, reason: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                rows={2} placeholder="Reason for return..." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Refund Amount (GHS)</label>
              <input type="number" value={formData.refundAmount} onChange={e => setFormData(d => ({ ...d, refundAmount: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !formData.purchaseId || !formData.reason}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-all">
              {saving ? "Creating..." : "Submit Return"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:text-white transition-all border border-white/10">Cancel</button>
          </div>
        </div>
      )}

      {/* Returns List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : returns.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
          <p className="text-4xl mb-4">↩️</p>
          <h3 className="text-lg font-semibold text-white mb-1">No return requests</h3>
          <p className="text-slate-400">Return requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map(ret => (
            <div key={ret.id} className="bg-white/[0.03] rounded-xl border border-white/5 p-5 hover:bg-white/[0.05] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-sm font-semibold text-white">{ret.returnNumber}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[ret.status]}`}>
                      {ret.status.replace("_", " ")}
                    </span>
                  </div>
                  {ret.customer && (
                    <p className="text-xs text-slate-400">{ret.customer.firstName} {ret.customer.lastName} • {ret.customer.phone}</p>
                  )}
                  {ret.purchase && (
                    <p className="text-xs text-slate-500">Purchase: {ret.purchase.purchaseNumber} (GHS {fmt(ret.purchase.totalAmount)})</p>
                  )}
                </div>
                <div className="text-right">
                  {ret.refundAmount && (
                    <p className="text-lg font-bold text-white">GHS {fmt(ret.refundAmount)}</p>
                  )}
                  <p className="text-xs text-slate-600">{new Date(ret.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3">{ret.reason}</p>
              {ret.status === "PENDING" && (
                <div className="flex gap-2">
                  <button onClick={() => handleProcess(ret.id, "approve")} disabled={!!processingId}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50">
                    {processingId === ret.id ? "..." : "Approve & Refund"}
                  </button>
                  <button onClick={() => handleProcess(ret.id, "reject")} disabled={!!processingId}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
