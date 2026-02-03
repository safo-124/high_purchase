"use client"

import { useState } from "react"
import { reviewDailyReport, StaffDailyReportData } from "../../actions"

interface Props {
  shopSlug: string
  reports: StaffDailyReportData[]
}

export function StaffReportsContent({ shopSlug, reports }: Props) {
  const [filter, setFilter] = useState<"all" | "SALES" | "COLLECTION">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "SUBMITTED" | "REVIEWED">("all")
  const [selectedReport, setSelectedReport] = useState<StaffDailyReportData | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)

  const filteredReports = reports.filter((r) => {
    if (filter !== "all" && r.reportType !== filter) return false
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    return true
  })

  const pendingCount = reports.filter((r) => r.status === "SUBMITTED").length

  const handleReview = async () => {
    if (!selectedReport) return
    setIsReviewing(true)
    
    const result = await reviewDailyReport(shopSlug, selectedReport.id, reviewNotes || undefined)
    
    setIsReviewing(false)
    if (result.success) {
      setSelectedReport(null)
      setReviewNotes("")
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
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SALES_STAFF":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Sales
          </span>
        )
      case "DEBT_COLLECTOR":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Collector
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {role}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Reports</p>
          <p className="text-2xl font-bold text-white">{reports.length}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sales Reports</p>
          <p className="text-2xl font-bold text-blue-400">{reports.filter((r) => r.reportType === "SALES").length}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Collection Reports</p>
          <p className="text-2xl font-bold text-purple-400">{reports.filter((r) => r.reportType === "COLLECTION").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Type:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "SALES" | "COLLECTION")}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="all">All Reports</option>
            <option value="SALES">Sales Only</option>
            <option value="COLLECTION">Collections Only</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "SUBMITTED" | "REVIEWED")}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="all">All Status</option>
            <option value="SUBMITTED">Pending Review</option>
            <option value="REVIEWED">Reviewed</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400">No reports found</p>
            <p className="text-slate-500 text-sm">Staff reports will appear here once submitted</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Staff</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Role</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Key Metric</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-4 px-6 text-white">
                      {new Date(report.reportDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </td>
                    <td className="py-4 px-6 text-white font-medium">{report.staffName}</td>
                    <td className="py-4 px-6 text-center">{getRoleBadge(report.staffRole)}</td>
                    <td className="py-4 px-6 text-right">
                      {report.reportType === "SALES" ? (
                        <span className="text-green-400 font-medium">₵{report.totalSalesAmount?.toLocaleString() || 0}</span>
                      ) : (
                        <span className="text-purple-400 font-medium">₵{report.totalCollected?.toLocaleString() || 0}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(report.status)}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          setSelectedReport(report)
                          setReviewNotes("")
                        }}
                        className="px-3 py-1.5 text-sm rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                      >
                        {report.status === "REVIEWED" ? "View" : "Review"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Daily Report Details</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Staff Member</p>
                  <p className="text-white font-medium">{selectedReport.staffName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Report Date</p>
                  <p className="text-white">{new Date(selectedReport.reportDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Role</p>
                  {getRoleBadge(selectedReport.staffRole)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  {getStatusBadge(selectedReport.status)}
                </div>
              </div>

              {/* Report Data */}
              {selectedReport.reportType === "SALES" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Total Sales</p>
                    <p className="text-xl font-bold text-green-400">₵{selectedReport.totalSalesAmount?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">New Customers</p>
                    <p className="text-xl font-bold text-white">{selectedReport.newCustomersCount || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Purchases Made</p>
                    <p className="text-xl font-bold text-white">{selectedReport.newPurchasesCount || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Items Sold</p>
                    <p className="text-xl font-bold text-white">{selectedReport.itemsSoldCount || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Customers Visited</p>
                    <p className="text-xl font-bold text-white">{selectedReport.customersVisited || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Payments</p>
                    <p className="text-xl font-bold text-white">{selectedReport.paymentsCollected || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Total Collected</p>
                    <p className="text-xl font-bold text-purple-400">₵{selectedReport.totalCollected?.toLocaleString() || 0}</p>
                  </div>
                </div>
              )}

              {/* Staff Notes */}
              {selectedReport.notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Staff Notes</p>
                  <p className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm">
                    {selectedReport.notes}
                  </p>
                </div>
              )}

              {/* Review Section */}
              {selectedReport.status === "REVIEWED" ? (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-green-400 text-sm font-medium mb-1">Reviewed by {selectedReport.reviewedByName}</p>
                  <p className="text-slate-400 text-xs mb-2">
                    {selectedReport.reviewedAt && new Date(selectedReport.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {selectedReport.reviewNotes && (
                    <p className="text-slate-300 text-sm">{selectedReport.reviewNotes}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Review Notes (Optional)</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      placeholder="Add any feedback or notes for the staff member..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <button
                    onClick={handleReview}
                    disabled={isReviewing}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReviewing ? "Marking as Reviewed..." : "Mark as Reviewed"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
