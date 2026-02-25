"use client"

import { useState, useEffect } from "react"
import { getStockMovements, createStockAdjustment } from "../../upgrade-actions"

interface Movement {
  id: string
  productId: string
  shopId: string | null
  type: string
  quantity: number
  previousQty: number
  newQty: number
  reason: string | null
  reference: string | null
  userName: string | null
  createdAt: string
}

export default function InventoryLogPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [movements, setMovements] = useState<Movement[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    productId: "", shopId: "", type: "ADJUSTMENT", quantity: "", reason: "",
  })

  useEffect(() => { params.then(p => setBusinessSlug(p.businessSlug)) }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadMovements()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug, page])

  const loadMovements = async () => {
    setLoading(true)
    const result = await getStockMovements(businessSlug, undefined, page, 30)
    if (result.success && result.data) {
      const d = result.data as { movements: Movement[]; total: number }
      setMovements(d.movements)
      setTotal(d.total)
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    const result = await createStockAdjustment(businessSlug, {
      productId: formData.productId,
      shopId: formData.shopId || undefined,
      type: formData.type,
      quantity: parseInt(formData.quantity),
      reason: formData.reason,
    })
    if (result.success) {
      setShowForm(false)
      setFormData({ productId: "", shopId: "", type: "ADJUSTMENT", quantity: "", reason: "" })
      await loadMovements()
    }
    setSaving(false)
  }

  const typeColors: Record<string, string> = {
    SALE: "text-blue-400 bg-blue-500/10",
    RETURN: "text-emerald-400 bg-emerald-500/10",
    ADJUSTMENT: "text-amber-400 bg-amber-500/10",
    TRANSFER: "text-purple-400 bg-purple-500/10",
    RESTOCK: "text-cyan-400 bg-cyan-500/10",
    DAMAGE: "text-red-400 bg-red-500/10",
  }

  const typeIcons: Record<string, string> = {
    SALE: "📤", RETURN: "📥", ADJUSTMENT: "🔧", TRANSFER: "🔄", RESTOCK: "📦", DAMAGE: "⚠️",
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Inventory Log</h1>
          <p className="text-slate-400">Track all stock movements and adjustments</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Adjust Stock
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(typeIcons).map(([type, icon]) => {
          const count = movements.filter(m => m.type === type).length
          return (
            <div key={type} className="bg-white/[0.03] rounded-xl border border-white/5 p-3 text-center">
              <span className="text-lg">{icon}</span>
              <p className="text-lg font-bold text-white mt-1">{count}</p>
              <p className="text-[10px] text-slate-500">{type}</p>
            </div>
          )
        })}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-white/[0.03] rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Stock Adjustment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Product ID</label>
              <input type="text" value={formData.productId} onChange={e => setFormData(d => ({ ...d, productId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="Enter product ID" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="RESTOCK">Restock</option>
                <option value="DAMAGE">Damage</option>
                <option value="TRANSFER">Transfer</option>
                <option value="RETURN">Return</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Quantity</label>
              <input type="number" value={formData.quantity} onChange={e => setFormData(d => ({ ...d, quantity: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Reason</label>
              <input type="text" value={formData.reason} onChange={e => setFormData(d => ({ ...d, reason: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="Reason for adjustment" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !formData.productId || !formData.quantity}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-all">
              {saving ? "Saving..." : "Save Adjustment"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:text-white transition-all border border-white/10">Cancel</button>
          </div>
        </div>
      )}

      {/* Movement List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : movements.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
          <p className="text-4xl mb-4">📦</p>
          <h3 className="text-lg font-semibold text-white mb-1">No stock movements</h3>
          <p className="text-slate-400">Movements will be tracked automatically</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Product ID</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Qty</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Before</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">After</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Reason</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">By</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[m.type] || "text-slate-400 bg-white/5"}`}>
                      {typeIcons[m.type]} {m.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono text-xs">{m.productId.slice(0, 8)}...</td>
                  <td className="py-3 px-4 text-right font-medium text-white">{m.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-400">{m.previousQty}</td>
                  <td className="py-3 px-4 text-right text-white font-medium">{m.newQty}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{m.reason || "-"}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{m.userName || "-"}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-50 transition-all border border-white/10">Previous</button>
          <span className="text-sm text-slate-400">Page {page} of {Math.ceil(total / 30)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 30)}
            className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-50 transition-all border border-white/10">Next</button>
        </div>
      )}
    </div>
  )
}
