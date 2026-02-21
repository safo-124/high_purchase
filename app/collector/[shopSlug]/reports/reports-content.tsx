"use client"

import { useState, useMemo, useCallback } from "react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  submitCollectorDailyReport,
  getCollectorPDFReportData,
  type CollectorReportDashboardData,
} from "../../actions"

interface Props {
  shopSlug: string
  dashboard: CollectorReportDashboardData
}

export function CollectorReportsContent({ shopSlug, dashboard }: Props) {
  const {
    todaysStats,
    customerChecklist,
    paymentLog,
    streakStats,
    todaysReport,
    reportHistory,
  } = dashboard

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [notes, setNotes] = useState(todaysReport?.notes ?? "")
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"today" | "history" | "performance">("today")
  const [checklistSearch, setChecklistSearch] = useState("")
  const [checklistFilter, setChecklistFilter] = useState<"all" | "visited" | "not-visited">("all")

  // PDF states
  const [pdfStartDate, setPdfStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [pdfEndDate, setPdfEndDate] = useState(() => new Date().toISOString().split("T")[0])
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const isReviewed = todaysReport?.status === "REVIEWED"
  const isSubmitted = todaysReport?.status === "SUBMITTED"

  // Filtered checklist
  const filteredChecklist = useMemo(() => {
    let list = customerChecklist
    if (checklistSearch) {
      const q = checklistSearch.toLowerCase()
      list = list.filter(c => c.customerName.toLowerCase().includes(q) || c.phone.includes(q))
    }
    if (checklistFilter === "visited") list = list.filter(c => c.visitedToday)
    if (checklistFilter === "not-visited") list = list.filter(c => !c.visitedToday)
    return list
  }, [customerChecklist, checklistSearch, checklistFilter])

  // Auto-submit handler
  const handleSubmitReport = async () => {
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    const result = await submitCollectorDailyReport(shopSlug, {
      reportDate: new Date().toISOString().split("T")[0],
      customersVisited: todaysStats.customersVisited,
      paymentsCollected: todaysStats.paymentsCollected,
      totalCollected: todaysStats.totalCollected,
      notes: notes || undefined,
    })

    setIsSubmitting(false)
    if (result.success) {
      setSuccess("Daily report submitted successfully!")
    } else {
      setError(result.error || "Failed to submit report")
    }
  }

  // PDF Export
  const handleExportPDF = useCallback(async () => {
    setIsGeneratingPDF(true)
    try {
      const data = await getCollectorPDFReportData(shopSlug, pdfStartDate, pdfEndDate)

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const primaryColor: [number, number, number] = [99, 102, 241]
      const textColor: [number, number, number] = [30, 41, 59]
      const lightGray: [number, number, number] = [148, 163, 184]

      let yPos = 18

      // Business name
      doc.setFontSize(22)
      doc.setTextColor(...primaryColor)
      doc.text(data.businessName.toUpperCase(), 14, yPos)
      yPos += 8

      // Branch
      doc.setFontSize(11)
      doc.setTextColor(...textColor)
      doc.text(`Branch: ${data.shopName}`, 14, yPos)
      yPos += 7

      // Collector name
      doc.text(`Collector: ${data.collectorName}`, 14, yPos)
      yPos += 10

      // Title
      doc.setFontSize(16)
      doc.setTextColor(...primaryColor)
      doc.text("Collection Report", 14, yPos)

      // Date range
      const fmtStart = new Date(data.dateRange.start).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      const fmtEnd = new Date(data.dateRange.end).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      const durationDays = Math.ceil((new Date(data.dateRange.end).getTime() - new Date(data.dateRange.start).getTime()) / 86400000) + 1
      doc.setFontSize(10)
      doc.setTextColor(...lightGray)
      doc.text(`${fmtStart}  -  ${fmtEnd}  (${durationDays} days)`, 14, yPos + 7)

      doc.setFontSize(8)
      doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, pageWidth - 14, 18, { align: "right" })

      yPos += 20

      // Summary box
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(14, yPos, pageWidth - 28, 22, 3, 3, "F")
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      const summaryItems = [
        `Days Worked: ${data.totalDaysWorked}`,
        `Collections: GHS ${data.totalCollected.toLocaleString()}`,
        `Wallet: GHS ${data.totalWalletDeposits.toLocaleString()}`,
        `Customers: ${data.totalCustomersVisited}`,
      ]
      const colW = (pageWidth - 28) / summaryItems.length
      summaryItems.forEach((item, idx) => {
        doc.text(item, 14 + colW * idx + colW / 2, yPos + 13, { align: "center" })
      })
      yPos += 30

      // Reports table
      if (data.reports.length > 0) {
        doc.setFontSize(12)
        doc.setTextColor(...primaryColor)
        doc.text("Daily Reports", 14, yPos)
        yPos += 6

        autoTable(doc, {
          startY: yPos,
          head: [["Date", "Customers", "Payments", "Collected (GHS)", "Wallet (GHS)", "Status"]],
          body: data.reports.map(r => [
            r.date,
            String(r.customersVisited),
            String(r.paymentsCollected),
            r.totalCollected.toLocaleString(),
            r.walletDeposits.toLocaleString(),
            r.status,
          ]),
          theme: "striped",
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
          bodyStyles: { fontSize: 8, textColor },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 3: { halign: "right", fontStyle: "bold" }, 4: { halign: "right" }, 5: { halign: "center" } },
          margin: { left: 14, right: 14 },
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable?.finalY + 12 || yPos + 40
      }

      // Wallet Summary
      if (yPos > 240) { doc.addPage(); yPos = 18 }
      doc.setFontSize(12)
      doc.setTextColor(...primaryColor)
      doc.text("Wallet Deposit Summary", 14, yPos)
      yPos += 6

      autoTable(doc, {
        startY: yPos,
        body: [
          ["Confirmed Deposits", `${data.walletSummary.confirmedCount} transactions`, `GHS ${data.walletSummary.totalConfirmed.toLocaleString()}`],
          ["Pending Deposits", `${data.walletSummary.pendingCount} transactions`, `GHS ${data.walletSummary.totalPending.toLocaleString()}`],
          ["Rejected", "", `GHS ${data.walletSummary.totalRejected.toLocaleString()}`],
        ],
        theme: "plain",
        bodyStyles: { fontSize: 10, textColor },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 2: { halign: "right", fontStyle: "bold" } },
        margin: { left: 14, right: 14 },
      })

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        const pageHeight = doc.internal.pageSize.getHeight()
        doc.setFontSize(7)
        doc.setTextColor(...lightGray)
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" })
      }

      doc.save(`collection-report-${pdfStartDate}-to-${pdfEndDate}.pdf`)
    } catch (err) {
      console.error("PDF generation error:", err)
    } finally {
      setIsGeneratingPDF(false)
    }
  }, [shopSlug, pdfStartDate, pdfEndDate])

  // Bar chart helper for weekly trend
  const maxTrend = Math.max(...streakStats.weeklyTrend.map(t => t.amount), 1)

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="glass-card p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Assigned</p>
              <p className="text-xl font-bold text-indigo-400">{todaysStats.customersAssigned}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Visited</p>
              <p className="text-xl font-bold text-emerald-400">{todaysStats.customersVisited}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Collections</p>
              <p className="text-xl font-bold text-green-400">{"\u20B5"}{todaysStats.totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Wallet</p>
              <p className="text-xl font-bold text-cyan-400">{"\u20B5"}{todaysStats.walletDeposits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
              <p className="text-xl font-bold text-amber-400">{todaysStats.pendingWallets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-1">
        {([
          { id: "today" as const, label: "Today", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { id: "history" as const, label: "History", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
          { id: "performance" as const, label: "Performance", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === tab.id
                ? "bg-indigo-500/20 text-indigo-300 border-b-2 border-indigo-400"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === "today" && (
        <div className="space-y-6">
          {/* Submit Report Card */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Today&apos;s Report — {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h2>
                <p className="text-sm text-slate-400 mt-1">Auto-generated from your transactions. Add notes and submit.</p>
              </div>
              {todaysReport && (
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  isReviewed ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                  isSubmitted ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                }`}>
                  {isReviewed ? "Reviewed" : isSubmitted ? "Pending Review" : "Draft"}
                </span>
              )}
            </div>

            {isReviewed && todaysReport?.reviewNotes && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
                <p className="text-xs text-slate-500 mb-1">Review Notes from Admin:</p>
                <p className="text-sm text-green-400">{todaysReport.reviewNotes}</p>
              </div>
            )}

            {/* Auto-stats summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-slate-500 mb-1">Customers Visited</p>
                <p className="text-xl font-bold text-white">{todaysStats.customersVisited}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-slate-500 mb-1">Payments Collected</p>
                <p className="text-xl font-bold text-white">{todaysStats.paymentsCollected}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-slate-500 mb-1">Total Collected</p>
                <p className="text-xl font-bold text-green-400">{"\u20B5"}{todaysStats.totalCollected.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-slate-500 mb-1">Wallet Deposits</p>
                <p className="text-xl font-bold text-cyan-400">{"\u20B5"}{todaysStats.walletDeposits.toLocaleString()}</p>
              </div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{error}</div>}
            {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-4">{success}</div>}

            {!isReviewed && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Challenges encountered, customers needing follow-up, observations..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <button
                  onClick={handleSubmitReport}
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isSubmitted ? "Update Report" : "Submit Report"}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Customer Collection Checklist */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Customer Checklist
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({customerChecklist.filter(c => c.visitedToday).length}/{customerChecklist.length} visited)
                </span>
              </h2>
              {/* Progress bar */}
              <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                  style={{ width: `${customerChecklist.length > 0 ? (customerChecklist.filter(c => c.visitedToday).length / customerChecklist.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={checklistSearch}
                  onChange={(e) => setChecklistSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "visited", "not-visited"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setChecklistFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      checklistFilter === f
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {f === "all" ? "All" : f === "visited" ? "Visited" : "Not Visited"}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist */}
            {filteredChecklist.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {customerChecklist.length === 0
                  ? "No customers assigned to you"
                  : "No customers match your filter"}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredChecklist.map(c => (
                  <div
                    key={c.customerId}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      c.visitedToday
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    {/* Check icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      c.visitedToday ? "bg-emerald-500/20" : "bg-white/10"
                    }`}>
                      {c.visitedToday ? (
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Customer info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{c.customerName}</p>
                        <span className="text-xs text-slate-500">{c.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.totalOwed > 0 && (
                          <span className="text-xs text-red-400">Owes {"\u20B5"}{c.totalOwed.toLocaleString()}</span>
                        )}
                        {c.lastPaymentDate && (
                          <span className="text-xs text-slate-500">
                            Last: {new Date(c.lastPaymentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Today amounts */}
                    <div className="text-right shrink-0">
                      {c.collectedToday > 0 && (
                        <p className="text-sm font-medium text-green-400">{"\u20B5"}{c.collectedToday.toLocaleString()}</p>
                      )}
                      {c.walletDepositToday > 0 && (
                        <p className="text-xs text-cyan-400">Wallet: {"\u20B5"}{c.walletDepositToday.toLocaleString()}</p>
                      )}
                      {!c.visitedToday && c.totalOwed > 0 && (
                        <p className="text-xs text-amber-400">Pending</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Payment Log */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">
              Today&apos;s Transaction Log
              <span className="ml-2 text-sm font-normal text-slate-400">({paymentLog.length} transactions)</span>
            </h2>
            {paymentLog.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No transactions recorded today</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase">Time</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentLog.map(entry => (
                      <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-3 text-sm text-slate-300">{entry.time}</td>
                        <td className="py-3 px-3 text-sm text-white">{entry.customerName}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            entry.type === "collection"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-cyan-500/10 text-cyan-400"
                          }`}>
                            {entry.type === "collection" ? "Collection" : "Wallet"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-medium text-white">{"\u20B5"}{entry.amount.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            entry.status === "Confirmed" ? "bg-green-500/10 text-green-400" :
                            entry.status === "Rejected" ? "bg-red-500/10 text-red-400" :
                            "bg-amber-500/10 text-amber-400"
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 truncate max-w-[120px]">{entry.reference || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* PDF Export Section */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Export Report</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">From:</span>
                  <input
                    type="date"
                    value={pdfStartDate}
                    onChange={(e) => setPdfStartDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">To:</span>
                  <input
                    type="date"
                    value={pdfEndDate}
                    onChange={(e) => setPdfEndDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <button
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/20 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Report History Cards */}
          <div className="space-y-3">
            {reportHistory.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-400">No reports submitted yet</p>
              </div>
            ) : (
              reportHistory.map(report => {
                const isExpanded = expandedReport === report.id
                return (
                  <div key={report.id} className="glass-card rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          report.status === "REVIEWED" ? "bg-green-500/20" :
                          report.status === "SUBMITTED" ? "bg-amber-500/20" :
                          "bg-slate-500/20"
                        }`}>
                          <svg className={`w-5 h-5 ${
                            report.status === "REVIEWED" ? "text-green-400" :
                            report.status === "SUBMITTED" ? "text-amber-400" :
                            "text-slate-400"
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {report.status === "REVIEWED"
                              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            }
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">
                            {new Date(report.reportDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">{report.customersVisited || 0} customers</span>
                            <span className="text-xs text-slate-500">{report.paymentsCollected || 0} payments</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-green-400">{"\u20B5"}{(report.totalCollected || 0).toLocaleString()}</p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          report.status === "REVIEWED" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          report.status === "SUBMITTED" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}>
                          {report.status === "REVIEWED" ? "Reviewed" : report.status === "SUBMITTED" ? "Pending" : "Draft"}
                        </span>
                        <svg className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/10">
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          <div className="p-3 rounded-xl bg-white/5 text-center">
                            <p className="text-xs text-slate-500">Customers</p>
                            <p className="text-lg font-bold text-white">{report.customersVisited || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 text-center">
                            <p className="text-xs text-slate-500">Payments</p>
                            <p className="text-lg font-bold text-white">{report.paymentsCollected || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 text-center">
                            <p className="text-xs text-slate-500">Collected</p>
                            <p className="text-lg font-bold text-green-400">{"\u20B5"}{(report.totalCollected || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        {report.notes && (
                          <div className="mt-3 p-3 rounded-xl bg-white/5">
                            <p className="text-xs text-slate-500 mb-1">Notes</p>
                            <p className="text-sm text-slate-300">{report.notes}</p>
                          </div>
                        )}
                        {report.reviewNotes && (
                          <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                            <p className="text-xs text-slate-500 mb-1">Admin Review Notes</p>
                            <p className="text-sm text-green-400">{report.reviewNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {/* Streak & Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">{"\uD83D\uDD25"}</span>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Streak</p>
              <p className="text-3xl font-bold text-orange-400">{streakStats.currentStreak}</p>
              <p className="text-xs text-slate-500">consecutive days</p>
            </div>
            <div className="glass-card p-5 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">{"\uD83C\uDFC6"}</span>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Longest Streak</p>
              <p className="text-3xl font-bold text-purple-400">{streakStats.longestStreak}</p>
              <p className="text-xs text-slate-500">best record</p>
            </div>
            <div className="glass-card p-5 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">This Month</p>
              <p className="text-3xl font-bold text-green-400">{"\u20B5"}{streakStats.totalCollectedThisMonth.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{streakStats.totalReportsThisMonth} reports</p>
            </div>
            <div className="glass-card p-5 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg / Day</p>
              <p className="text-3xl font-bold text-cyan-400">{"\u20B5"}{Math.round(streakStats.avgDailyCollection).toLocaleString()}</p>
              <p className="text-xs text-slate-500">this month</p>
            </div>
          </div>

          {/* Weekly Collection Trend */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Weekly Collection Trend</h2>
            <div className="flex items-end gap-2 h-40">
              {streakStats.weeklyTrend.map((day, idx) => {
                const height = maxTrend > 0 ? (day.amount / maxTrend) * 100 : 0
                const dayLabel = new Date(day.date).toLocaleDateString("en-GB", { weekday: "short" })
                const isToday = day.date === new Date().toISOString().split("T")[0]
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-400">{day.amount > 0 ? `${"\u20B5"}${day.amount.toLocaleString()}` : ""}</span>
                    <div className="w-full flex justify-center">
                      <div
                        className={`w-8 rounded-t-lg transition-all ${
                          isToday ? "bg-indigo-500" : day.amount > 0 ? "bg-indigo-500/50" : "bg-white/10"
                        }`}
                        style={{ height: `${Math.max(height, 4)}px` }}
                      />
                    </div>
                    <span className={`text-xs ${isToday ? "text-indigo-400 font-medium" : "text-slate-500"}`}>{dayLabel}</span>
                  </div>
                )
              })}
            </div>

            {/* This week total */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm text-slate-400">This Week Total</span>
              <span className="text-lg font-bold text-white">{"\u20B5"}{streakStats.totalCollectedThisWeek.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
