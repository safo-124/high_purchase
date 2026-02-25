"use client"

import { useState, useEffect } from "react"
import { getCustomerSegments, createCustomerSegment, deleteCustomerSegment } from "../../upgrade-actions"

interface Segment {
  id: string
  name: string
  description: string | null
  color: string
  criteria: Array<{ field: string; operator: string; value: string | number }>
  autoAssign: boolean
  customerCount: number
  createdAt: string
}

export default function SegmentsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "", color: "#06b6d4", autoAssign: false })
  const [criteria, setCriteria] = useState<Array<{ field: string; operator: string; value: string }>>([
    { field: "totalPurchases", operator: "greater_than", value: "0" },
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    params.then(p => setBusinessSlug(p.businessSlug))
  }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadSegments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug])

  const loadSegments = async () => {
    setLoading(true)
    const result = await getCustomerSegments(businessSlug)
    if (result.success && result.data) {
      setSegments(result.data as Segment[])
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    const result = await createCustomerSegment(businessSlug, {
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      criteria: criteria.map(c => ({ field: c.field, operator: c.operator, value: c.value })),
      autoAssign: formData.autoAssign,
    })
    if (result.success) {
      setShowForm(false)
      setFormData({ name: "", description: "", color: "#06b6d4", autoAssign: false })
      setCriteria([{ field: "totalPurchases", operator: "greater_than", value: "0" }])
      await loadSegments()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this segment?")) return
    await deleteCustomerSegment(businessSlug, id)
    await loadSegments()
  }

  const fieldOptions = [
    { value: "totalPurchases", label: "Total Purchases" },
    { value: "totalSpent", label: "Total Spent (GHS)" },
    { value: "activePurchases", label: "Active Purchases" },
    { value: "daysSinceCreation", label: "Days Since Created" },
  ]

  const operatorOptions = [
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "equals", label: "Equals" },
    { value: "greater_than_or_equal", label: "≥" },
    { value: "less_than_or_equal", label: "≤" },
  ]

  const colorOptions = ["#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#ec4899", "#f97316"]

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Customer Segments</h1>
          <p className="text-slate-400">Group customers by behavior and characteristics</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Segment
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-8 bg-white/[0.03] rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Segment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="e.g., High Value Customers"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Color</label>
            <div className="flex gap-2">
              {colorOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setFormData(d => ({ ...d, color: c }))}
                  className={`w-8 h-8 rounded-lg transition-all ${formData.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Criteria */}
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Criteria</label>
            {criteria.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <select
                  value={rule.field}
                  onChange={e => setCriteria(prev => prev.map((r, i) => i === idx ? { ...r, field: e.target.value } : r))}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                >
                  {fieldOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select
                  value={rule.operator}
                  onChange={e => setCriteria(prev => prev.map((r, i) => i === idx ? { ...r, operator: e.target.value } : r))}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                >
                  {operatorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input
                  type="number"
                  value={rule.value}
                  onChange={e => setCriteria(prev => prev.map((r, i) => i === idx ? { ...r, value: e.target.value } : r))}
                  className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                />
                {criteria.length > 1 && (
                  <button
                    onClick={() => setCriteria(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 text-red-400 hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setCriteria(prev => [...prev, { field: "totalPurchases", operator: "greater_than", value: "0" }])}
              className="text-sm text-cyan-400 hover:text-cyan-300 mt-1"
            >
              + Add condition
            </button>
          </div>

          {/* Auto-assign */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={formData.autoAssign}
              onChange={e => setFormData(d => ({ ...d, autoAssign: e.target.checked }))}
              className="rounded bg-white/5 border-white/20 text-cyan-500"
            />
            <label className="text-sm text-slate-400">Auto-assign matching customers</label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={saving || !formData.name}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-all"
            >
              {saving ? "Creating..." : "Create Segment"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:text-white transition-all border border-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Segments Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : segments.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-1">No segments created</h3>
          <p className="text-slate-400">Create segments to group customers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map(segment => (
            <div key={segment.id} className="bg-white/[0.03] rounded-2xl border border-white/5 p-5 hover:bg-white/[0.05] transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: segment.color }} />
                  <h3 className="text-base font-semibold text-white">{segment.name}</h3>
                </div>
                <button
                  onClick={() => handleDelete(segment.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              {segment.description && (
                <p className="text-sm text-slate-400 mb-3">{segment.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-sm font-medium text-white">{segment.customerCount}</span>
                  <span className="text-xs text-slate-500">customers</span>
                </div>
                {segment.autoAssign && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Auto</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
