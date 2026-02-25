"use client"

import { useState, useEffect } from "react"
import { getScheduledReports, createScheduledReport, toggleScheduledReport, deleteScheduledReport } from "../../upgrade-actions"

interface ReportData {
  id: string
  name: string
  reportType: string
  frequency: string
  recipients: string[]
  isActive: boolean
  lastSentAt: string | null
  nextRunAt: string | null
  createdAt: string
}

export default function ScheduledReportsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [reports, setReports] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "", reportType: "SALES_SUMMARY", frequency: "WEEKLY_REPORT", recipientEmails: "",
  })

  useEffect(() => { params.then(p => setBusinessSlug(p.businessSlug)) }, [params])
  useEffect(() => { if (businessSlug) loadReports() }, [businessSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadReports = async () => {
    setLoading(true)
    const result = await getScheduledReports(businessSlug)
    if (result.success) setReports(result.data as ReportData[])
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    const emails = formData.recipientEmails.split(",").map(e => e.trim()).filter(Boolean)
    const result = await createScheduledReport(businessSlug, {
      name: formData.name,
      reportType: formData.reportType as "SALES_SUMMARY" | "PAYMENT_COLLECTION" | "CUSTOMER_ANALYSIS" | "INVENTORY_STATUS" | "STAFF_PERFORMANCE" | "FINANCIAL_OVERVIEW",
      frequency: formData.frequency as "DAILY_REPORT" | "WEEKLY_REPORT" | "BIWEEKLY_REPORT" | "MONTHLY_REPORT" | "QUARTERLY_REPORT",
      recipients: emails,
    })
    if (result.success) {
      setShowForm(false)
      setFormData({ name: "", reportType: "SALES_SUMMARY", frequency: "WEEKLY_REPORT", recipientEmails: "" })
      await loadReports()
    }
    setSaving(false)
  }

  const handleToggle = async (id: string) => { await toggleScheduledReport(businessSlug, id); await loadReports() }
  const handleDelete = async (id: string) => { if (!confirm("Delete this scheduled report?")) return; await deleteScheduledReport(businessSlug, id); await loadReports() }

  const reportTypes: Record<string, { icon: string; label: string }> = {
    SALES_SUMMARY: { icon: "📊", label: "Sales Summary" },
    PAYMENT_COLLECTION: { icon: "💳", label: "Payment Collection" },
    CUSTOMER_ANALYSIS: { icon: "👥", label: "Customer Analysis" },
    INVENTORY_STATUS: { icon: "📦", label: "Inventory Status" },
    STAFF_PERFORMANCE: { icon: "👨‍💼", label: "Staff Performance" },
    FINANCIAL_OVERVIEW: { icon: "💰", label: "Financial Overview" },
  }

  const frequencies: Record<string, string> = {
    DAILY_REPORT: "Daily", WEEKLY_REPORT: "Weekly", BIWEEKLY_REPORT: "Bi-weekly",
    MONTHLY_REPORT: "Monthly", QUARTERLY_REPORT: "Quarterly",
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Scheduled Reports</h1>
          <p className="text-slate-400">Automate report generation and delivery</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Schedule Report
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-white/[0.03] rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Schedule New Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Report Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="e.g., Weekly Sales Report" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Report Type</label>
              <select value={formData.reportType} onChange={e => setFormData(d => ({ ...d, reportType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                {Object.entries(reportTypes).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Frequency</label>
              <select value={formData.frequency} onChange={e => setFormData(d => ({ ...d, frequency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none">
                {Object.entries(frequencies).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Recipient Emails (comma separated)</label>
              <input type="text" value={formData.recipientEmails} onChange={e => setFormData(d => ({ ...d, recipientEmails: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="admin@business.com, manager@business.com" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !formData.name || !formData.recipientEmails}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-all">
              {saving ? "Scheduling..." : "Schedule Report"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:text-white transition-all border border-white/10">Cancel</button>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
          <p className="text-4xl mb-4">📅</p>
          <h3 className="text-lg font-semibold text-white mb-1">No scheduled reports</h3>
          <p className="text-slate-400">Set up automated reports to stay informed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const typeInfo = reportTypes[report.reportType] || reportTypes.SALES_SUMMARY
            const freqLabel = frequencies[report.frequency] || report.frequency
            return (
              <div key={report.id} className={`bg-white/[0.03] rounded-xl border p-5 transition-all ${
                report.isActive ? "border-white/10 hover:bg-white/[0.05]" : "border-white/5 opacity-60"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{typeInfo.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">{report.name}</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20">{typeInfo.label}</span>
                        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 text-xs border border-violet-500/20">{freqLabel}</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-0.5">
                        <p>📧 {(report.recipients as string[]).join(", ")}</p>
                        {report.nextRunAt && <p>⏰ Next: {new Date(report.nextRunAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                        {report.lastSentAt && <p>✅ Last: {new Date(report.lastSentAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggle(report.id)}
                      className={`w-10 h-5 rounded-full transition-all relative ${report.isActive ? "bg-cyan-500" : "bg-slate-600"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${report.isActive ? "left-5" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => handleDelete(report.id)}
                      className="text-red-400/50 hover:text-red-400 transition-colors p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
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
