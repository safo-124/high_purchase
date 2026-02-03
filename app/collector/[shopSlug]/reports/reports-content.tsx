"use client"

import { useState } from "react"
import { submitCollectorDailyReport, CollectorDailyReportData } from "../../actions"

interface Props {
  shopSlug: string
  todaysReport: CollectorDailyReportData | null
  myReports: CollectorDailyReportData[]
  todaysStats: {
    customersVisited: number
    paymentsCollected: number
    totalCollected: number
  }
}

export function CollectorReportsContent({ shopSlug, todaysReport, myReports, todaysStats }: Props) {
  const today = new Date().toISOString().split("T")[0]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const [formData, setFormData] = useState({
    reportDate: today,
    customersVisited: todaysReport?.customersVisited ?? todaysStats.customersVisited,
    paymentsCollected: todaysReport?.paymentsCollected ?? todaysStats.paymentsCollected,
    totalCollected: todaysReport?.totalCollected ?? todaysStats.totalCollected,
    notes: todaysReport?.notes ?? "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    const result = await submitCollectorDailyReport(shopSlug, {
      reportDate: formData.reportDate,
      customersVisited: formData.customersVisited,
      paymentsCollected: formData.paymentsCollected,
      totalCollected: formData.totalCollected,
      notes: formData.notes || undefined,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSuccess("Daily report submitted successfully!")
    } else {
      setError(result.error || "Failed to submit report")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Pending Review
          </span>
        )
      case "REVIEWED":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            Reviewed
          </span>
        )
      case "DRAFT":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Draft
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Today's Report Form */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Today&apos;s Report - {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>
          {todaysReport && getStatusBadge(todaysReport.status)}
        </div>

        {todaysReport?.status === "REVIEWED" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-green-400 text-sm">
                This report has been reviewed and cannot be modified.
              </p>
              {todaysReport.reviewNotes && (
                <p className="text-slate-400 text-sm mt-2">
                  <span className="text-slate-500">Review Notes:</span> {todaysReport.reviewNotes}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-slate-500 mb-1">Customers Visited</p>
                <p className="text-xl font-bold text-white">{todaysReport.customersVisited || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-slate-500 mb-1">Payments Collected</p>
                <p className="text-xl font-bold text-white">{todaysReport.paymentsCollected || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-slate-500 mb-1">Total Collected</p>
                <p className="text-xl font-bold text-green-400">₵{todaysReport.totalCollected?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {success}
              </div>
            )}

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-indigo-400 text-sm">
                The values below have been auto-calculated from today&apos;s collections. You can adjust them if needed before submitting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Customers Visited</label>
                <input
                  type="number"
                  min="0"
                  value={formData.customersVisited}
                  onChange={(e) => setFormData({ ...formData, customersVisited: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payments Collected</label>
                <input
                  type="number"
                  min="0"
                  value={formData.paymentsCollected}
                  onChange={(e) => setFormData({ ...formData, paymentsCollected: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Total Amount Collected</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalCollected}
                    onChange={(e) => setFormData({ ...formData, totalCollected: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any additional notes, challenges encountered, or customers who need follow-up..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : todaysReport ? "Update Report" : "Submit Report"}
            </button>
          </form>
        )}
      </div>

      {/* Report History */}
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-lg font-semibold text-white mb-6">Report History</h2>
        
        {myReports.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400">No reports submitted yet</p>
            <p className="text-slate-500 text-sm">Submit your first daily report above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Customers</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Payments</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Collected</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {myReports.map((report) => (
                  <tr key={report.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-4 px-4 text-white">
                      {new Date(report.reportDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-300">{report.customersVisited || 0}</td>
                    <td className="py-4 px-4 text-right text-slate-300">{report.paymentsCollected || 0}</td>
                    <td className="py-4 px-4 text-right text-green-400 font-medium">
                      ₵{report.totalCollected?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 px-4 text-center">{getStatusBadge(report.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
