"use client"

import { useState, useEffect } from "react"
import { getSalesGoals, createSalesGoal, deleteSalesGoal } from "../../upgrade-actions"

interface Goal {
  id: string
  name: string
  type: string
  targetAmount: string | number
  currentAmount: string | number
  period: string
  startDate: string
  endDate: string
  shopId: string | null
  staffId: string | null
  isActive: boolean
  createdAt: string
}

export default function GoalsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "", type: "REVENUE", targetAmount: "", period: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  useEffect(() => { params.then(p => setBusinessSlug(p.businessSlug)) }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadGoals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug])

  const loadGoals = async () => {
    setLoading(true)
    const result = await getSalesGoals(businessSlug)
    if (result.success) setGoals(result.data as Goal[])
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    const result = await createSalesGoal(businessSlug, {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
    })
    if (result.success) {
      setShowForm(false)
      setFormData({ name: "", type: "REVENUE", targetAmount: "", period: "MONTHLY", startDate: new Date().toISOString().split("T")[0], endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] })
      await loadGoals()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal?")) return
    await deleteSalesGoal(businessSlug, id)
    await loadGoals()
  }

  const getProgress = (goal: Goal) => {
    const current = Number(goal.currentAmount)
    const target = Number(goal.targetAmount)
    if (target <= 0) return 0
    return Math.min(100, (current / target) * 100)
  }

  const isExpired = (goal: Goal) => new Date(goal.endDate) < new Date()

  const getTypeColor = (type: string) => {
    switch (type) {
      case "REVENUE": return "from-cyan-500 to-blue-500"
      case "COLLECTIONS": return "from-emerald-500 to-green-500"
      case "NEW_CUSTOMERS": return "from-purple-500 to-violet-500"
      case "NEW_SALES": return "from-amber-500 to-orange-500"
      case "UNITS_SOLD": return "from-pink-500 to-rose-500"
      default: return "from-slate-500 to-gray-500"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "REVENUE": return "💰"
      case "COLLECTIONS": return "💵"
      case "NEW_CUSTOMERS": return "👥"
      case "NEW_SALES": return "🛒"
      case "UNITS_SOLD": return "📦"
      default: return "🎯"
    }
  }

  const typeOptions = [
    { value: "REVENUE", label: "Revenue" },
    { value: "COLLECTIONS", label: "Collections" },
    { value: "NEW_CUSTOMERS", label: "New Customers" },
    { value: "NEW_SALES", label: "New Sales" },
    { value: "UNITS_SOLD", label: "Units Sold" },
  ]

  const periodOptions = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "QUARTERLY", label: "Quarterly" },
    { value: "YEARLY", label: "Yearly" },
  ]

  const fmt = (n: number | string) => {
    const num = Number(n)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(num % 1 === 0 ? 0 : 2)
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Goals & Targets</h1>
          <p className="text-slate-400">Set and track business performance targets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Goal
        </button>
      </div>

      {/* Summary Cards */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
            <p className="text-xs text-slate-500 mb-1">Active Goals</p>
            <p className="text-2xl font-bold text-white">{goals.filter(g => g.isActive && !isExpired(g)).length}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
            <p className="text-xs text-slate-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-400">{goals.filter(g => getProgress(g) >= 100).length}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
            <p className="text-xs text-slate-500 mb-1">On Track</p>
            <p className="text-2xl font-bold text-cyan-400">{goals.filter(g => getProgress(g) >= 50 && getProgress(g) < 100).length}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
            <p className="text-xs text-slate-500 mb-1">Behind</p>
            <p className="text-2xl font-bold text-amber-400">{goals.filter(g => getProgress(g) < 50 && !isExpired(g)).length}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-8 bg-white/[0.03] rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Goal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Goal Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="e.g., Monthly Revenue Target" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Target Amount</label>
              <input type="number" value={formData.targetAmount} onChange={e => setFormData(d => ({ ...d, targetAmount: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="e.g., 50000" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Period</label>
              <select value={formData.period} onChange={e => setFormData(d => ({ ...d, period: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                {periodOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Start Date</label>
              <input type="date" value={formData.startDate} onChange={e => setFormData(d => ({ ...d, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">End Date</label>
              <input type="date" value={formData.endDate} onChange={e => setFormData(d => ({ ...d, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !formData.name || !formData.targetAmount}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-all">
              {saving ? "Creating..." : "Create Goal"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:text-white transition-all border border-white/10">Cancel</button>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
          <p className="text-4xl mb-4">🎯</p>
          <h3 className="text-lg font-semibold text-white mb-1">No goals set</h3>
          <p className="text-slate-400">Create goals to track your business performance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const progress = getProgress(goal)
            const expired = isExpired(goal)
            return (
              <div key={goal.id} className="bg-white/[0.03] rounded-2xl border border-white/5 p-5 hover:bg-white/[0.05] transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getTypeIcon(goal.type)}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{goal.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{goal.type.replace("_", " ")}</span>
                        <span className="text-xs text-slate-600">•</span>
                        <span className="text-xs text-slate-500">{goal.period}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {expired && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Expired</span>}
                    {progress >= 100 && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Complete</span>}
                    <button onClick={() => handleDelete(goal.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-2xl font-bold text-white">{fmt(goal.currentAmount)}</span>
                    <span className="text-sm text-slate-500">/ {fmt(goal.targetAmount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${getTypeColor(goal.type)} transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-medium" style={{ color: progress >= 100 ? "#10b981" : progress >= 50 ? "#06b6d4" : "#f59e0b" }}>
                      {progress.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-600">
                      {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
