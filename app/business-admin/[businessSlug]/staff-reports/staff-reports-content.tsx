"use client"

import { useState, useMemo } from "react"
import { 
  reviewDailyReportAsBusinessAdmin, 
  BusinessStaffDailyReportData,
  DayActivitySummary 
} from "../../actions"

interface Shop {
  id: string
  name: string
  shopSlug: string
}

interface Props {
  businessSlug: string
  reports: BusinessStaffDailyReportData[]
  shops: Shop[]
  dailyActivities?: Record<string, DayActivitySummary>
  monthSummary?: {
    totalSales: number
    totalCollections: number
    totalStaff: number
    activeDays: number
  }
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function BusinessStaffReportsContent({ 
  businessSlug, 
  reports, 
  shops,
  dailyActivities = {},
  monthSummary
}: Props) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [selectedReport, setSelectedReport] = useState<BusinessStaffDailyReportData | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
    const startingDayOfWeek = firstDayOfMonth.getDay()
    const totalDaysInMonth = lastDayOfMonth.getDate()

    const days: { date: Date; isCurrentMonth: boolean; dateKey: string }[] = []

    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
      days.push({
        date,
        isCurrentMonth: false,
        dateKey: formatDateKey(date)
      })
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i)
      days.push({
        date,
        isCurrentMonth: true,
        dateKey: formatDateKey(date)
      })
    }

    // Next month days to fill remaining slots
    const remainingDays = 42 - days.length // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        dateKey: formatDateKey(date)
      })
    }

    return days
  }, [currentMonth, currentYear])

  // Get reports for selected date
  const selectedDateReports = useMemo(() => {
    if (!selectedDate) return []
    return reports.filter(r => {
      const reportDate = new Date(r.reportDate)
      const reportDateKey = formatDateKey(reportDate)
      if (reportDateKey !== selectedDate) return false
      if (shopFilter !== "all" && r.shopSlug !== shopFilter) return false
      return true
    })
  }, [selectedDate, reports, shopFilter])

  // Get activity summary for a date
  const getDateActivity = (dateKey: string) => {
    const dayReports = reports.filter(r => {
      const reportDate = new Date(r.reportDate)
      return formatDateKey(reportDate) === dateKey
    })
    if (dayReports.length === 0) return null
    
    return {
      sales: dayReports.filter(r => r.reportType === "SALES").reduce((sum, r) => sum + (r.totalSalesAmount || 0), 0),
      collections: dayReports.filter(r => r.reportType === "COLLECTION").reduce((sum, r) => sum + (r.totalCollected || 0), 0),
      walletDeposits: dayReports.filter(r => r.reportType === "WALLET").reduce((sum, r) => sum + (r.totalWalletDeposits || 0), 0),
      count: dayReports.length,
      hasPending: dayReports.some(r => r.status === "SUBMITTED")
    }
  }

  // Statistics
  const stats = useMemo(() => {
    const pendingCount = reports.filter(r => r.status === "SUBMITTED").length
    const totalSales = reports.filter(r => r.reportType === "SALES").reduce((sum, r) => sum + (r.totalSalesAmount || 0), 0)
    const totalCollected = reports.filter(r => r.reportType === "COLLECTION").reduce((sum, r) => sum + (r.totalCollected || 0), 0)
    const totalWalletDeposits = reports.filter(r => r.reportType === "WALLET").reduce((sum, r) => sum + (r.totalWalletDeposits || 0), 0)
    const uniqueStaff = new Set(reports.map(r => r.staffName)).size
    return { pendingCount, totalSales, totalCollected, totalWalletDeposits, uniqueStaff }
  }, [reports])

  const handleReview = async () => {
    if (!selectedReport) return
    setIsReviewing(true)
    const result = await reviewDailyReportAsBusinessAdmin(businessSlug, selectedReport.id, reviewNotes || undefined)
    setIsReviewing(false)
    if (result.success) {
      setSelectedReport(null)
      setReviewNotes("")
    }
  }

  const navigateMonth = (direction: number) => {
    if (direction === -1) {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(formatDateKey(today))
  }

  const isToday = (dateKey: string) => {
    return dateKey === formatDateKey(today)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SALES_STAFF":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Sales Staff
          </span>
        )
      case "DEBT_COLLECTOR":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Collector
          </span>
        )
      case "WALLET":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Wallet
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Pending
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Reports</p>
              <p className="text-2xl font-bold text-white">{reports.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-bold text-amber-400">{stats.pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Sales</p>
              <p className="text-2xl font-bold text-green-400">₵{stats.totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-purple-400">₵{stats.totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Wallet Deposits</p>
              <p className="text-2xl font-bold text-cyan-400">₵{stats.totalWalletDeposits.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "calendar" 
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "list" 
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Shop:</span>
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="all">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.shopSlug}>{shop.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
            {/* Calendar Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white">{MONTHS[currentMonth]} {currentYear}</h3>
                  <button
                    onClick={goToToday}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Go to Today
                  </button>
                </div>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-white/10">
              {DAYS.map((day) => (
                <div key={day} className="py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const activity = getDateActivity(day.dateKey)
                const isSelected = selectedDate === day.dateKey
                const isTodayDate = isToday(day.dateKey)
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day.dateKey)}
                    className={`relative min-h-[80px] p-2 border-b border-r border-white/5 transition-all ${
                      !day.isCurrentMonth ? "opacity-40" : ""
                    } ${isSelected ? "bg-indigo-500/20 ring-2 ring-indigo-500/50 ring-inset" : "hover:bg-white/5"}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isTodayDate 
                        ? "w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center mx-auto" 
                        : day.isCurrentMonth ? "text-white" : "text-slate-600"
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    {activity && (
                      <div className="space-y-1">
                        {activity.sales > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 truncate">
                            ₵{activity.sales.toLocaleString()}
                          </div>
                        )}
                        {activity.collections > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 truncate">
                            ₵{activity.collections.toLocaleString()}
                          </div>
                        )}
                        {activity.walletDeposits > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 truncate">
                            ₵{activity.walletDeposits.toLocaleString()}
                          </div>
                        )}
                        {activity.hasPending && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-white/10 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                <span className="text-xs text-slate-400">Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
                <span className="text-xs text-slate-400">Collections</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500/30" />
                <span className="text-xs text-slate-400">Wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-400">Pending Review</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <h3 className="font-bold text-white">
                {selectedDate 
                  ? new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
                  : "Select a Day"
                }
              </h3>
              <p className="text-xs text-slate-400">
                {selectedDate ? `${selectedDateReports.length} report(s)` : "Click on a date to view reports"}
              </p>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              {!selectedDate ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm">Select a day from the calendar</p>
                </div>
              ) : selectedDateReports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm">No reports for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report)
                        setReviewNotes("")
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                        report.reportType === "SALES"
                          ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
                          : report.reportType === "WALLET"
                          ? "bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40"
                          : "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-white">{report.staffName}</p>
                          <p className="text-xs text-slate-400">{report.shopName}</p>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {getRoleBadge(report.staffRole)}
                        <span className={`text-lg font-bold ${
                          report.reportType === "SALES" ? "text-green-400" 
                            : report.reportType === "WALLET" ? "text-cyan-400" 
                            : "text-purple-400"
                        }`}>
                          ₵{(report.reportType === "SALES" 
                            ? report.totalSalesAmount 
                            : report.reportType === "WALLET"
                            ? report.totalWalletDeposits
                            : report.totalCollected
                          )?.toLocaleString() || 0}
                        </span>
                      </div>

                      {report.reportType === "SALES" ? (
                        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-slate-500">Customers</p>
                            <p className="text-sm font-medium text-white">{report.newCustomersCount || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Purchases</p>
                            <p className="text-sm font-medium text-white">{report.newPurchasesCount || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Items</p>
                            <p className="text-sm font-medium text-white">{report.itemsSoldCount || 0}</p>
                          </div>
                        </div>
                      ) : report.reportType === "WALLET" ? (
                        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
                          <div>
                            <p className="text-xs text-slate-500">Deposits</p>
                            <p className="text-sm font-medium text-white">{report.walletDepositsCount || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="text-sm font-medium text-cyan-400">₵{(report.totalWalletDeposits || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
                          <div>
                            <p className="text-xs text-slate-500">Visited</p>
                            <p className="text-sm font-medium text-white">{report.customersVisited || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Payments</p>
                            <p className="text-sm font-medium text-white">{report.paymentsCollected || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl overflow-hidden">
          {reports.length === 0 ? (
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
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Shop</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Staff</th>
                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Role</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Amount</th>
                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports
                    .filter(r => shopFilter === "all" || r.shopSlug === shopFilter)
                    .map((report) => (
                    <tr key={report.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4 px-6 text-white">
                        {new Date(report.reportDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-slate-300">
                          {report.shopName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-white font-medium">{report.staffName}</td>
                      <td className="py-4 px-6 text-center">{getRoleBadge(report.staffRole)}</td>
                      <td className="py-4 px-6 text-right">
                        {report.reportType === "SALES" ? (
                          <span className="text-green-400 font-medium">₵{report.totalSalesAmount?.toLocaleString() || 0}</span>
                        ) : report.reportType === "WALLET" ? (
                          <span className="text-cyan-400 font-medium">₵{report.totalWalletDeposits?.toLocaleString() || 0}</span>
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
      )}

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Daily Report Details</h3>
                  <p className="text-xs text-slate-400">
                    {new Date(selectedReport.reportDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
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
              {/* Staff Info */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedReport.staffName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{selectedReport.staffName}</p>
                  <p className="text-xs text-slate-400">{selectedReport.shopName}</p>
                </div>
                {getRoleBadge(selectedReport.staffRole)}
              </div>

              {/* Report Data */}
              {selectedReport.reportType === "SALES" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <p className="text-xs text-green-400/70 mb-1">Total Sales</p>
                    <p className="text-2xl font-bold text-green-400">₵{selectedReport.totalSalesAmount?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">New Customers</p>
                    <p className="text-2xl font-bold text-white">{selectedReport.newCustomersCount || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Purchases Made</p>
                    <p className="text-2xl font-bold text-white">{selectedReport.newPurchasesCount || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Items Sold</p>
                    <p className="text-2xl font-bold text-white">{selectedReport.itemsSoldCount || 0}</p>
                  </div>
                </div>
              ) : selectedReport.reportType === "WALLET" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <p className="text-xs text-cyan-400/70 mb-1">Total Wallet Deposits</p>
                    <p className="text-2xl font-bold text-cyan-400">₵{selectedReport.totalWalletDeposits?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Deposit Count</p>
                    <p className="text-2xl font-bold text-white">{selectedReport.walletDepositsCount || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Customers Visited</p>
                    <p className="text-2xl font-bold text-white">{selectedReport.customersVisited || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Payments</p>
                    <p className="text-2xl font-bold text-white">{selectedReport.paymentsCollected || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <p className="text-xs text-purple-400/70 mb-1">Total Collected</p>
                    <p className="text-2xl font-bold text-purple-400">₵{selectedReport.totalCollected?.toLocaleString() || 0}</p>
                  </div>
                </div>
              )}

              {/* Staff Notes */}
              {selectedReport.notes && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Staff Notes</p>
                  <p className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm">
                    {selectedReport.notes}
                  </p>
                </div>
              )}

              {/* Review Section */}
              {selectedReport.status === "REVIEWED" ? (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-400 font-medium">Reviewed by {selectedReport.reviewedByName}</p>
                  </div>
                  <p className="text-slate-400 text-xs mb-2">
                    {selectedReport.reviewedAt && new Date(selectedReport.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {selectedReport.reviewNotes && (
                    <p className="text-slate-300 text-sm italic">&quot;{selectedReport.reviewNotes}&quot;</p>
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
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isReviewing ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Marking as Reviewed...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Mark as Reviewed
                      </>
                    )}
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
