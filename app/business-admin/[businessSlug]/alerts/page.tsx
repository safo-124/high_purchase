"use client"

import { useState, useEffect } from "react"
import { getAlertRules, createAlertRule, toggleAlertRule, deleteAlertRule, getBusinessAlerts, markAlertRead } from "../../upgrade-actions"

interface AlertRuleData {
  id: string
  name: string
  type: string
  field: string
  condition: string
  threshold: number | string
  isActive: boolean
  notifyEmail: boolean
  notifySms: boolean
  createdAt: string
  alerts: Array<{ id: string }>
}

interface AlertData {
  id: string
  message: string
  entityType: string | null
  entityId: string | null
  isRead: boolean
  createdAt: string
  alertRule: { name: string; type: string }
}

export default function AlertsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [rules, setRules] = useState<AlertRuleData[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [activeTab, setActiveTab] = useState<"rules" | "alerts">("alerts")
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "", type: "LOW_STOCK", field: "stockQuantity", condition: "LESS_THAN", threshold: "5",
    notifyEmail: false, notifySms: false,
  })

  useEffect(() => { params.then(p => setBusinessSlug(p.businessSlug)) }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug])

  const loadData = async () => {
    setLoading(true)
    const [rulesResult, alertsResult] = await Promise.all([
      getAlertRules(businessSlug),
      getBusinessAlerts(businessSlug),
    ])
    if (rulesResult.success) setRules(rulesResult.data as AlertRuleData[])
    if (alertsResult.success) setAlerts(alertsResult.data as AlertData[])
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    const result = await createAlertRule(businessSlug, {
      ...formData,
      threshold: parseFloat(formData.threshold),
    })
    if (result.success) {
      setShowForm(false)
      setFormData({ name: "", type: "LOW_STOCK", field: "stockQuantity", condition: "LESS_THAN", threshold: "5", notifyEmail: false, notifySms: false })
      await loadData()
    }
    setSaving(false)
  }

  const handleToggle = async (ruleId: string) => {
    await toggleAlertRule(businessSlug, ruleId)
    await loadData()
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Delete this alert rule?")) return
    await deleteAlertRule(businessSlug, ruleId)
    await loadData()
  }

  const handleMarkRead = async (alertId: string) => {
    await markAlertRead(businessSlug, alertId)
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isRead: true } : a))
  }

  const typeOptions = [
    { value: "LOW_STOCK", label: "Low Stock", icon: "📦" },
    { value: "OVERDUE_PAYMENT", label: "Overdue Payment", icon: "⏰" },
    { value: "HIGH_OUTSTANDING", label: "High Outstanding", icon: "💰" },
    { value: "LOW_COLLECTION_RATE", label: "Low Collection Rate", icon: "📉" },
    { value: "REVENUE_DROP", label: "Revenue Drop", icon: "📊" },
    { value: "CUSTOM", label: "Custom", icon: "⚙️" },
  ]

  const conditionLabels: Record<string, string> = {
    LESS_THAN: "<",
    GREATER_THAN: ">",
    EQUALS: "=",
    LESS_THAN_OR_EQUAL: "≤",
    GREATER_THAN_OR_EQUAL: "≥",
  }

  const unreadAlerts = alerts.filter(a => !a.isRead).length

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Alerts & Thresholds</h1>
          <p className="text-slate-400">Set up automated alerts for key business metrics</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setActiveTab("rules") }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white/[0.03] rounded-xl p-1 w-fit border border-white/5">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "alerts" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
          }`}
        >
          Alerts {unreadAlerts > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">{unreadAlerts}</span>}
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "rules" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
          }`}
        >
          Rules ({rules.length})
        </button>
      </div>

      {/* Create Form */}
      {showForm && activeTab === "rules" && (
        <div className="mb-6 bg-white/[0.03] rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Alert Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Rule Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="e.g., Low stock warning" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Alert Type</label>
              <select value={formData.type} onChange={e => setFormData(d => ({ ...d, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                {typeOptions.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Condition</label>
              <div className="flex gap-2">
                <input type="text" value={formData.field} onChange={e => setFormData(d => ({ ...d, field: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                  placeholder="Field name" />
                <select value={formData.condition} onChange={e => setFormData(d => ({ ...d, condition: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                  {Object.entries(conditionLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type="number" value={formData.threshold} onChange={e => setFormData(d => ({ ...d, threshold: e.target.value }))}
                  className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
              </div>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.notifyEmail} onChange={e => setFormData(d => ({ ...d, notifyEmail: e.target.checked }))}
                  className="rounded bg-white/5 border-white/20 text-cyan-500" />
                <span className="text-sm text-slate-400">Email</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.notifySms} onChange={e => setFormData(d => ({ ...d, notifySms: e.target.checked }))}
                  className="rounded bg-white/5 border-white/20 text-cyan-500" />
                <span className="text-sm text-slate-400">SMS</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !formData.name}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-all">
              {saving ? "Creating..." : "Create Rule"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:text-white transition-all border border-white/10">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : activeTab === "alerts" ? (
        /* Alerts List */
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
              <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-1">No alerts triggered</h3>
              <p className="text-slate-400">Set up rules to start receiving alerts</p>
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-xl border transition-all ${
                alert.isRead ? "border-white/5 bg-white/[0.01]" : "border-amber-500/20 bg-amber-500/5"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      alert.isRead ? "bg-white/5 text-slate-500" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-white">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{alert.alertRule.name}</span>
                        <span className="text-xs text-slate-600">{new Date(alert.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {!alert.isRead && (
                    <button onClick={() => handleMarkRead(alert.id)}
                      className="text-xs text-cyan-400 hover:text-cyan-300">Mark read</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Rules List */
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-1">No alert rules</h3>
              <p className="text-slate-400">Create rules to receive automated alerts</p>
            </div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="bg-white/[0.03] rounded-xl border border-white/5 p-4 hover:bg-white/[0.05] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeOptions.find(t => t.value === rule.type)?.icon || "⚙️"}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{rule.name}</h4>
                      <p className="text-xs text-slate-500">{rule.field} {conditionLabels[rule.condition]} {Number(rule.threshold)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rule.alerts.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">{rule.alerts.length} unread</span>
                    )}
                    <button onClick={() => handleToggle(rule.id)}
                      className={`w-10 h-5 rounded-full transition-all relative ${rule.isActive ? "bg-cyan-500" : "bg-white/10"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${rule.isActive ? "left-5" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
