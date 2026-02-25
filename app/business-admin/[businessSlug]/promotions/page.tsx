"use client"

import { useState, useEffect } from "react"
import { getPromotions, createPromotion, togglePromotion, deletePromotion } from "../../upgrade-actions"

interface PromotionData {
  id: string
  name: string
  description: string | null
  type: string
  value: number | string
  minPurchase: number | string | null
  maxDiscount: number | string | null
  usageLimit: number
  usedCount: number
  validFrom: string
  validUntil: string
  isActive: boolean
  createdAt: string
}

export default function PromotionsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [promotions, setPromotions] = useState<PromotionData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "", description: "", type: "PERCENTAGE_DISCOUNT",
    value: "", minPurchaseAmount: "", maxUsageCount: "",
    startDate: new Date().toISOString().split("T")[0], endDate: "",
  })

  useEffect(() => { params.then(p => setBusinessSlug(p.businessSlug)) }, [params])
  useEffect(() => { if (businessSlug) loadPromotions() }, [businessSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPromotions = async () => {
    setLoading(true)
    const result = await getPromotions(businessSlug)
    if (result.success) setPromotions(result.data as PromotionData[])
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    const result = await createPromotion(businessSlug, {
      name: formData.name,
      description: formData.description || undefined,
      type: formData.type as "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "BUY_X_GET_Y" | "FREE_DELIVERY",
      value: parseFloat(formData.value),
      minPurchase: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : undefined,
      validFrom: formData.startDate,
      validUntil: formData.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      usageLimit: formData.maxUsageCount ? parseInt(formData.maxUsageCount) : 0,
    })
    if (result.success) {
      setShowForm(false)
      setFormData({ name: "", description: "", type: "PERCENTAGE_DISCOUNT", value: "", minPurchaseAmount: "", maxUsageCount: "", startDate: new Date().toISOString().split("T")[0], endDate: "" })
      await loadPromotions()
    }
    setSaving(false)
  }

  const handleToggle = async (id: string) => {
    await togglePromotion(businessSlug, id)
    await loadPromotions()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion?")) return
    await deletePromotion(businessSlug, id)
    await loadPromotions()
  }

  const typeInfo: Record<string, { icon: string; label: string; color: string }> = {
    PERCENTAGE_DISCOUNT: { icon: "%", label: "Percentage Off", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    FIXED_DISCOUNT: { icon: "💰", label: "Fixed Discount", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    BUY_X_GET_Y: { icon: "🎁", label: "Buy X Get Y", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    FREE_DELIVERY: { icon: "🚚", label: "Free Delivery", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  }

  const types = Object.keys(typeInfo)
  const fmt = (n: number | string) => Number(n).toFixed(2)

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Promotions & Discounts</h1>
          <p className="text-slate-400">Create and manage promotional offers</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Promotion
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Promotions", value: promotions.length, icon: "🏷️" },
          { label: "Active", value: promotions.filter(p => p.isActive).length, icon: "✅" },
          { label: "Total Usage", value: promotions.reduce((a, p) => a + p.usedCount, 0), icon: "📊" },
          { label: "Expired", value: promotions.filter(p => new Date(p.validUntil) < new Date()).length, icon: "⏰" },
        ].map(c => (
          <div key={c.label} className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{c.icon}</span>
              <span className="text-xs text-slate-400">{c.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-white/[0.03] rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Promotion</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Promotion Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="e.g., Holiday Sale 2025" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Description (Optional)</label>
              <textarea value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" rows={2} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                {types.map(t => <option key={t} value={t}>{typeInfo[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                {formData.type === "PERCENTAGE_DISCOUNT" ? "Discount (%)" : "Value (GHS)"}
              </label>
              <input type="number" value={formData.value} onChange={e => setFormData(d => ({ ...d, value: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Min Purchase (GHS) — Optional</label>
              <input type="number" value={formData.minPurchaseAmount} onChange={e => setFormData(d => ({ ...d, minPurchaseAmount: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Max Usage — Optional</label>
              <input type="number" value={formData.maxUsageCount} onChange={e => setFormData(d => ({ ...d, maxUsageCount: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Start Date</label>
              <input type="date" value={formData.startDate} onChange={e => setFormData(d => ({ ...d, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">End Date — Optional</label>
              <input type="date" value={formData.endDate} onChange={e => setFormData(d => ({ ...d, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !formData.name || !formData.value}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-all">
              {saving ? "Creating..." : "Create Promotion"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:text-white transition-all border border-white/10">Cancel</button>
          </div>
        </div>
      )}

      {/* Promotions Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
          <p className="text-4xl mb-4">🏷️</p>
          <h3 className="text-lg font-semibold text-white mb-1">No promotions yet</h3>
          <p className="text-slate-400">Create your first promotion to attract more customers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map(promo => {
            const info = typeInfo[promo.type] || typeInfo.PERCENTAGE_DISCOUNT
            const expired = new Date(promo.validUntil) < new Date()
            const usageFull = promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit
            return (
              <div key={promo.id} className={`bg-white/[0.03] rounded-xl border p-5 transition-all ${
                promo.isActive && !expired ? "border-white/10 hover:bg-white/[0.05]" : "border-white/5 opacity-60"
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg border ${info.color}`}>
                      {info.icon}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{promo.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${info.color}`}>{info.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(promo.id)}
                      className={`w-10 h-5 rounded-full transition-all relative ${promo.isActive ? "bg-cyan-500" : "bg-slate-600"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${promo.isActive ? "left-5" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => handleDelete(promo.id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                {promo.description && <p className="text-xs text-slate-400 mb-3">{promo.description}</p>}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Value</span>
                    <p className="text-white font-semibold">
                      {promo.type === "PERCENTAGE_DISCOUNT" ? `${Number(promo.value)}%` : `GHS ${fmt(promo.value)}`}
                    </p>
                  </div>
                  {promo.minPurchase && (
                    <div>
                      <span className="text-slate-500">Min Purchase</span>
                      <p className="text-white">GHS {fmt(promo.minPurchase)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Usage</span>
                    <p className="text-white">{promo.usedCount}{promo.usageLimit > 0 ? ` / ${promo.usageLimit}` : ""}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Period</span>
                    <p className="text-white">
                      {new Date(promo.validFrom).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      {` — ${new Date(promo.validUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`}
                    </p>
                  </div>
                </div>
                {(expired || usageFull) && (
                  <div className="mt-3 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400">{expired ? "⏰ Expired" : "🚫 Usage limit reached"}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
