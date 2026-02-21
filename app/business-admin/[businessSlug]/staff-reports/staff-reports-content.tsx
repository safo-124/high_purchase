"use client"

import { useState, useMemo, useCallback } from "react"
import { 
  reviewDailyReportAsBusinessAdmin, 
  getBusinessDailyReportDetails,
  BusinessStaffDailyReportData,
  DayActivitySummary,
  ReportCustomerDetail 
} from "../../actions"

interface Shop {
  id: string
  name: string
  shopSlug: string
}

interface StaffMember {
  id: string
  name: string
  role: string
  shopName: string
  shopSlug: string
}

interface Props {
  businessSlug: string
  reports: BusinessStaffDailyReportData[]
  shops: Shop[]
  staffMembers?: StaffMember[]
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
  staffMembers = [],
  dailyActivities = {},
  monthSummary
}: Props) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [staffFilter, setStaffFilter] = useState<string>("all")
  const [selectedReport, setSelectedReport] = useState<BusinessStaffDailyReportData | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "leaderboard" | "compare">("calendar")
  const [reportDetails, setReportDetails] = useState<ReportCustomerDetail[] | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Filtered reports based on shop and staff
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (shopFilter !== "all" && r.shopSlug !== shopFilter) return false
      if (staffFilter !== "all" && r.staffName !== staffFilter) return false
      return true
    })
  }, [reports, shopFilter, staffFilter])

  // Unique staff names from reports for filter dropdown
  const uniqueStaffNames = useMemo(() => {
    const names = new Set(reports.map(r => r.staffName))
    return Array.from(names).sort()
  }, [reports])

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
      days.push({ date, isCurrentMonth: false, dateKey: formatDateKey(date) })
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i)
      days.push({ date, isCurrentMonth: true, dateKey: formatDateKey(date) })
    }

    // Next month days to fill remaining slots
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i)
      days.push({ date, isCurrentMonth: false, dateKey: formatDateKey(date) })
    }

    return days
  }, [currentMonth, currentYear])

  // Get reports for selected date (respects filters)
  const selectedDateReports = useMemo(() => {
    if (!selectedDate) return []
    return filteredReports.filter(r => {
      const reportDate = new Date(r.reportDate)
      return formatDateKey(reportDate) === selectedDate
    })
  }, [selectedDate, filteredReports])

  // Get activity for a date (respects filters)
  const getDateActivity = useCallback((dateKey: string) => {
    const dayReports = filteredReports.filter(r => {
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
  }, [filteredReports])

  // Missing reports for a date: staff who should have reported but didn't
  const getMissingStaff = useCallback((dateKey: string) => {
    const dateObj = new Date(dateKey + "T12:00:00")
    const dayOfWeek = dateObj.getDay()
    if (dayOfWeek === 0) return [] // Skip Sundays
    if (dateObj > today) return [] // Skip future dates

    const staffWhoReported = new Set(
      reports
        .filter(r => formatDateKey(new Date(r.reportDate)) === dateKey)
        .map(r => r.staffName)
    )

    const relevantStaff = staffMembers.filter(s => {
      if (shopFilter !== "all" && s.shopSlug !== shopFilter) return false
      if (staffFilter !== "all" && s.name !== staffFilter) return false
      return s.role === "SALES_STAFF" || s.role === "DEBT_COLLECTOR"
    })

    return relevantStaff.filter(s => !staffWhoReported.has(s.name))
  }, [reports, staffMembers, shopFilter, staffFilter, today])

  // Statistics (respects filters)
  const stats = useMemo(() => {
    const pendingCount = filteredReports.filter(r => r.status === "SUBMITTED").length
    const totalSales = filteredReports.filter(r => r.reportType === "SALES").reduce((sum, r) => sum + (r.totalSalesAmount || 0), 0)
    const totalCollected = filteredReports.filter(r => r.reportType === "COLLECTION").reduce((sum, r) => sum + (r.totalCollected || 0), 0)
    const totalWalletDeposits = filteredReports.filter(r => r.reportType === "WALLET").reduce((sum, r) => sum + (r.totalWalletDeposits || 0), 0)
    const uniqueStaff = new Set(filteredReports.map(r => r.staffName)).size
    return { pendingCount, totalSales, totalCollected, totalWalletDeposits, uniqueStaff }
  }, [filteredReports])

  // Leaderboard data
  const leaderboard = useMemo(() => {
    const staffMap = new Map<string, {
      name: string; role: string; shopName: string
      totalSales: number; totalCollected: number; totalWalletDeposits: number
      reportCount: number; daysWorked: Set<string>
    }>()

    for (const r of filteredReports) {
      const existing = staffMap.get(r.staffName)
      if (existing) {
        if (r.reportType === "SALES") existing.totalSales += r.totalSalesAmount || 0
        if (r.reportType === "COLLECTION") existing.totalCollected += r.totalCollected || 0
        if (r.reportType === "WALLET") existing.totalWalletDeposits += r.totalWalletDeposits || 0
        existing.reportCount++
        existing.daysWorked.add(formatDateKey(new Date(r.reportDate)))
      } else {
        staffMap.set(r.staffName, {
          name: r.staffName, role: r.staffRole, shopName: r.shopName,
          totalSales: r.reportType === "SALES" ? (r.totalSalesAmount || 0) : 0,
          totalCollected: r.reportType === "COLLECTION" ? (r.totalCollected || 0) : 0,
          totalWalletDeposits: r.reportType === "WALLET" ? (r.totalWalletDeposits || 0) : 0,
          reportCount: 1,
          daysWorked: new Set([formatDateKey(new Date(r.reportDate))]),
        })
      }
    }

    return Array.from(staffMap.values())
      .map(s => ({ ...s, daysWorked: s.daysWorked.size, totalRevenue: s.totalSales + s.totalCollected + s.totalWalletDeposits }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [filteredReports])

  // Staff comparison data
  const comparisonData = useMemo(() => {
    const staffMap = new Map<string, {
      name: string; role: string; shopName: string
      salesCount: number; totalSales: number; collectionCount: number; totalCollected: number
      walletCount: number; totalWalletDeposits: number; totalReports: number; avgDaily: number
      daysWorked: Set<string>
    }>()

    for (const r of filteredReports) {
      const existing = staffMap.get(r.staffName)
      if (existing) {
        if (r.reportType === "SALES") { existing.salesCount++; existing.totalSales += r.totalSalesAmount || 0 }
        if (r.reportType === "COLLECTION") { existing.collectionCount++; existing.totalCollected += r.totalCollected || 0 }
        if (r.reportType === "WALLET") { existing.walletCount++; existing.totalWalletDeposits += r.totalWalletDeposits || 0 }
        existing.totalReports++
        existing.daysWorked.add(formatDateKey(new Date(r.reportDate)))
      } else {
        staffMap.set(r.staffName, {
          name: r.staffName, role: r.staffRole, shopName: r.shopName,
          salesCount: r.reportType === "SALES" ? 1 : 0,
          totalSales: r.reportType === "SALES" ? (r.totalSalesAmount || 0) : 0,
          collectionCount: r.reportType === "COLLECTION" ? 1 : 0,
          totalCollected: r.reportType === "COLLECTION" ? (r.totalCollected || 0) : 0,
          walletCount: r.reportType === "WALLET" ? 1 : 0,
          totalWalletDeposits: r.reportType === "WALLET" ? (r.totalWalletDeposits || 0) : 0,
          totalReports: 1, avgDaily: 0,
          daysWorked: new Set([formatDateKey(new Date(r.reportDate))]),
        })
      }
    }

    return Array.from(staffMap.values()).map(s => {
      const days = s.daysWorked.size
      const total = s.totalSales + s.totalCollected + s.totalWalletDeposits
      return { ...s, daysWorked: days, avgDaily: days > 0 ? total / days : 0 }
    }).sort((a, b) => (b.totalSales + b.totalCollected + b.totalWalletDeposits) - (a.totalSales + a.totalCollected + a.totalWalletDeposits))
  }, [filteredReports])

  // Daily trends for charts
  const dailyTrends = useMemo(() => {
    const dateMap = new Map<string, { sales: number; collections: number; walletDeposits: number }>()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    
    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(new Date(currentYear, currentMonth, d))
      dateMap.set(key, { sales: 0, collections: 0, walletDeposits: 0 })
    }

    for (const r of filteredReports) {
      const key = formatDateKey(new Date(r.reportDate))
      const existing = dateMap.get(key)
      if (existing) {
        if (r.reportType === "SALES") existing.sales += r.totalSalesAmount || 0
        if (r.reportType === "COLLECTION") existing.collections += r.totalCollected || 0
        if (r.reportType === "WALLET") existing.walletDeposits += r.totalWalletDeposits || 0
      }
    }

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, day: parseInt(date.split("-")[2]), ...data }))
  }, [filteredReports, currentMonth, currentYear])

  const maxTrendValue = useMemo(() => {
    return Math.max(1, ...dailyTrends.map(d => Math.max(d.sales, d.collections, d.walletDeposits)))
  }, [dailyTrends])

  const handleReview = async () => {
    if (!selectedReport) return
    setIsReviewing(true)
    const result = await reviewDailyReportAsBusinessAdmin(businessSlug, selectedReport.id, reviewNotes || undefined)
    setIsReviewing(false)
    if (result.success) {
      setSelectedReport(null)
      setReviewNotes("")
      setReportDetails(null)
    }
  }

  const handleSelectReport = async (report: BusinessStaffDailyReportData) => {
    setSelectedReport(report)
    setReviewNotes("")
    setReportDetails(null)
    setIsLoadingDetails(true)
    try {
      const result = await getBusinessDailyReportDetails(businessSlug, report.id)
      if (result.success && result.customers) {
        setReportDetails(result.customers)
      }
    } catch (err) {
      console.error("Failed to load report details:", err)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleCloseReport = () => {
    setSelectedReport(null)
    setReviewNotes("")
    setReportDetails(null)
  }

  const navigateMonth = (direction: number) => {
    if (direction === -1) {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
      else { setCurrentMonth(currentMonth - 1) }
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
      else { setCurrentMonth(currentMonth + 1) }
    }
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(formatDateKey(today))
  }

  const isToday = (dateKey: string) => dateKey === formatDateKey(today)

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ["Date", "Shop", "Staff", "Role", "Type", "Sales Amount", "Collected", "Wallet Deposits", "Status", "Notes"]
    ]
    for (const r of filteredReports) {
      rows.push([
        new Date(r.reportDate).toLocaleDateString("en-GB"),
        r.shopName, r.staffName, r.staffRole, r.reportType,
        String(r.totalSalesAmount || 0), String(r.totalCollected || 0),
        String(r.totalWalletDeposits || 0), r.status,
        (r.notes || "").replace(/,/g, ";"),
      ])
    }
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `staff-reports-${MONTHS[currentMonth]}-${currentYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
              <p className="text-2xl font-bold text-white">{filteredReports.length}</p>
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
          {[
            { id: "calendar" as const, label: "Calendar", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
            { id: "list" as const, label: "List", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
            { id: "leaderboard" as const, label: "Leaderboard", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
            { id: "compare" as const, label: "Compare", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === tab.id 
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Staff Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Staff:</span>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 max-w-[160px]"
            >
              <option value="all">All Staff</option>
              {uniqueStaffNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Shop Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Shop:</span>
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 max-w-[160px]"
            >
              <option value="all">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.shopSlug}>{shop.name}</option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 text-sm font-medium transition-all flex items-center gap-1.5"
            title="Export to CSV"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ============ CALENDAR VIEW ============ */}
      {viewMode === "calendar" && (
        <>
          {/* Mini Trend Chart */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Daily Activity — {MONTHS[currentMonth]} {currentYear}</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /><span className="text-slate-400">Sales</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500" /><span className="text-slate-400">Collections</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" /><span className="text-slate-400">Wallet</span></div>
              </div>
            </div>
            <div className="flex items-end gap-[3px] h-24">
              {dailyTrends.map((d) => {
                const total = d.sales + d.collections + d.walletDeposits
                const salesH = total > 0 ? (d.sales / maxTrendValue) * 100 : 0
                const collectH = total > 0 ? (d.collections / maxTrendValue) * 100 : 0
                const walletH = total > 0 ? (d.walletDeposits / maxTrendValue) * 100 : 0
                const isTodayBar = isToday(d.date)
                return (
                  <div
                    key={d.date}
                    className={`flex-1 flex flex-col justify-end gap-px rounded-t-sm cursor-pointer group relative ${isTodayBar ? "ring-1 ring-indigo-500/50 ring-offset-1 ring-offset-transparent rounded-sm" : ""}`}
                    onClick={() => { setSelectedDate(d.date) }}
                    title={`Day ${d.day}: ₵${total.toLocaleString()}`}
                  >
                    {walletH > 0 && <div className="bg-cyan-500/80 rounded-t-sm transition-all group-hover:bg-cyan-400" style={{ height: `${Math.max(walletH, 2)}%` }} />}
                    {collectH > 0 && <div className="bg-purple-500/80 transition-all group-hover:bg-purple-400" style={{ height: `${Math.max(collectH, 2)}%` }} />}
                    {salesH > 0 && <div className="bg-green-500/80 transition-all group-hover:bg-green-400 rounded-b-sm" style={{ height: `${Math.max(salesH, 2)}%` }} />}
                    {total === 0 && <div className="bg-white/5 rounded-sm" style={{ height: "3%" }} />}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] text-slate-600">
              <span>1</span>
              <span>{Math.ceil(dailyTrends.length / 2)}</span>
              <span>{dailyTrends.length}</span>
            </div>
          </div>

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
                const missing = getMissingStaff(day.dateKey)
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

                    {/* Missing reports indicator */}
                    {day.isCurrentMonth && missing.length > 0 && (
                      <div className="absolute bottom-1 right-1" title={`${missing.length} staff didn't report`}>
                        <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-red-400">{missing.length}</span>
                        </div>
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
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center"><span className="text-[7px] text-red-400">!</span></div>
                <span className="text-xs text-slate-400">Missing Reports</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <h3 className="font-bold text-white">
                {selectedDate 
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
                  : "Select a Day"
                }
              </h3>
              <p className="text-xs text-slate-400">
                {selectedDate ? `${selectedDateReports.length} report(s)` : "Click on a date to view reports"}
              </p>
            </div>

            <div className="p-4 max-h-[600px] overflow-y-auto">
              {!selectedDate ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm">Select a day from the calendar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Missing staff warning */}
                  {(() => {
                    const missing = getMissingStaff(selectedDate)
                    if (missing.length === 0) return null
                    return (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          {missing.length} staff didn&apos;t submit reports
                        </p>
                        <div className="space-y-1">
                          {missing.map(s => (
                            <div key={s.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">{s.name}</span>
                              <span className="text-slate-500">{s.shopName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {selectedDateReports.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-slate-400 text-sm">No reports for this day</p>
                    </div>
                  ) : (
                    selectedDateReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
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
                  ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* ============ LIST VIEW ============ */}
      {viewMode === "list" && (
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
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Shop</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Staff</th>
                    <th className="text-center py-4 px-6 text-sm font-medium text-slate-400">Role</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">Amount</th>
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
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-slate-300">{report.shopName}</span>
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
                          onClick={() => handleSelectReport(report)}
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

      {/* ============ LEADERBOARD VIEW ============ */}
      {viewMode === "leaderboard" && (
        <div className="space-y-6">
          {leaderboard.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-slate-400">No data available for the leaderboard</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 0, 2].map(pos => {
                    const staff = leaderboard[pos]
                    if (!staff) return <div key={pos} />
                    const rank = pos + 1
                    const colors = [
                      "",
                      "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
                      "from-slate-400/20 to-slate-500/10 border-slate-400/30",
                      "from-orange-600/20 to-orange-700/10 border-orange-600/30"
                    ]
                    const medals = ["", "🥇", "🥈", "🥉"]
                    const textColor = ["", "text-yellow-400", "text-slate-300", "text-orange-400"]
                    
                    return (
                      <div key={pos} className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${colors[rank]} border ${rank === 1 ? "md:order-2 md:-mt-4" : rank === 2 ? "md:order-1" : "md:order-3"}`}>
                        <div className="text-center">
                          <div className="text-3xl mb-2">{medals[rank]}</div>
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                            {staff.name.charAt(0)}
                          </div>
                          <h4 className="font-bold text-white text-lg">{staff.name}</h4>
                          <p className="text-xs text-slate-400 mb-3">{staff.shopName}</p>
                          <p className={`text-2xl font-bold ${textColor[rank]}`}>
                            ₵{staff.totalRevenue.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{staff.daysWorked} days  •  {staff.reportCount} reports</p>
                          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-1 text-center">
                            <div><p className="text-[10px] text-slate-500">Sales</p><p className="text-xs font-medium text-green-400">₵{staff.totalSales.toLocaleString()}</p></div>
                            <div><p className="text-[10px] text-slate-500">Collected</p><p className="text-xs font-medium text-purple-400">₵{staff.totalCollected.toLocaleString()}</p></div>
                            <div><p className="text-[10px] text-slate-500">Wallet</p><p className="text-xs font-medium text-cyan-400">₵{staff.totalWalletDeposits.toLocaleString()}</p></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Rest of the leaderboard */}
              {leaderboard.length > 3 && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {leaderboard.slice(3).map((staff, idx) => {
                      const maxRevenue = leaderboard[0]?.totalRevenue || 1
                      const barWidth = (staff.totalRevenue / maxRevenue) * 100
                      return (
                        <div key={staff.name} className="p-4 hover:bg-white/[0.02] relative">
                          <div className="absolute inset-y-0 left-0 bg-indigo-500/5 transition-all" style={{ width: `${barWidth}%` }} />
                          <div className="relative flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 font-bold text-sm flex-shrink-0">
                              {idx + 4}
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center text-indigo-300 font-semibold text-sm flex-shrink-0">
                              {staff.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{staff.name}</p>
                              <p className="text-xs text-slate-500">{staff.shopName}  •  {staff.daysWorked} days</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              {staff.totalSales > 0 && <span className="text-green-400">₵{staff.totalSales.toLocaleString()}</span>}
                              {staff.totalCollected > 0 && <span className="text-purple-400">₵{staff.totalCollected.toLocaleString()}</span>}
                              {staff.totalWalletDeposits > 0 && <span className="text-cyan-400">₵{staff.totalWalletDeposits.toLocaleString()}</span>}
                              <span className="font-bold text-white min-w-[80px] text-right">₵{staff.totalRevenue.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============ COMPARE VIEW ============ */}
      {viewMode === "compare" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          {comparisonData.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400">No data available for comparison</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400 sticky left-0 bg-[#0f172a] z-10">Staff</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-slate-400">Shop</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-slate-400">Days</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-slate-400">Reports</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-green-400">Sales</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-purple-400">Collected</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-cyan-400">Wallet</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-white">Total</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-400">Avg/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((staff) => {
                    const total = staff.totalSales + staff.totalCollected + staff.totalWalletDeposits
                    const maxTotal = comparisonData[0] ? comparisonData[0].totalSales + comparisonData[0].totalCollected + comparisonData[0].totalWalletDeposits : 1
                    return (
                      <tr key={staff.name} className="border-b border-white/5 hover:bg-white/5 relative">
                        <td className="py-4 px-6 sticky left-0 bg-[#0f172a] z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center text-indigo-300 font-semibold text-xs flex-shrink-0">
                              {staff.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{staff.name}</p>
                              <p className="text-xs text-slate-500">{staff.role === "SALES_STAFF" ? "Sales" : staff.role === "DEBT_COLLECTOR" ? "Collector" : staff.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-xs text-slate-400">{staff.shopName}</span>
                        </td>
                        <td className="py-4 px-4 text-center text-white font-medium">{staff.daysWorked}</td>
                        <td className="py-4 px-4 text-center text-slate-400">{staff.totalReports}</td>
                        <td className="py-4 px-4 text-right">
                          <div>
                            <span className="text-green-400 font-medium">₵{staff.totalSales.toLocaleString()}</span>
                            <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${maxTotal > 0 ? (staff.totalSales / maxTotal) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div>
                            <span className="text-purple-400 font-medium">₵{staff.totalCollected.toLocaleString()}</span>
                            <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${maxTotal > 0 ? (staff.totalCollected / maxTotal) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div>
                            <span className="text-cyan-400 font-medium">₵{staff.totalWalletDeposits.toLocaleString()}</span>
                            <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${maxTotal > 0 ? (staff.totalWalletDeposits / maxTotal) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-white">₵{total.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right text-slate-400">₵{Math.round(staff.avgDaily).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-white/5">
                    <td className="py-4 px-6 font-bold text-white sticky left-0 bg-[#0f172a] z-10" colSpan={4}>Totals</td>
                    <td className="py-4 px-4 text-right font-bold text-green-400">
                      ₵{comparisonData.reduce((s, d) => s + d.totalSales, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-purple-400">
                      ₵{comparisonData.reduce((s, d) => s + d.totalCollected, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-cyan-400">
                      ₵{comparisonData.reduce((s, d) => s + d.totalWalletDeposits, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-white">
                      ₵{comparisonData.reduce((s, d) => s + d.totalSales + d.totalCollected + d.totalWalletDeposits, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ REVIEW MODAL ============ */}
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
                  onClick={handleCloseReport}
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

              {/* Customer Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Customer Breakdown</p>
                  {reportDetails && (
                    <span className="text-xs text-slate-400">{reportDetails.length} customer{reportDetails.length !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-6 h-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="ml-2 text-sm text-slate-400">Loading customer details...</span>
                  </div>
                ) : reportDetails && reportDetails.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {reportDetails.map((customer) => (
                      <div
                        key={customer.customerId}
                        className={`p-3 rounded-xl border ${
                          selectedReport.reportType === "SALES"
                            ? "bg-green-500/5 border-green-500/15"
                            : selectedReport.reportType === "WALLET"
                            ? "bg-cyan-500/5 border-cyan-500/15"
                            : "bg-purple-500/5 border-purple-500/15"
                        }`}
                      >
                        {/* Customer header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              selectedReport.reportType === "SALES"
                                ? "bg-green-500/20 text-green-400"
                                : selectedReport.reportType === "WALLET"
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-purple-500/20 text-purple-400"
                            }`}>
                              {customer.customerName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{customer.customerName}</p>
                              <p className="text-[10px] text-slate-500">{customer.phone}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold ${
                            selectedReport.reportType === "SALES" ? "text-green-400"
                              : selectedReport.reportType === "WALLET" ? "text-cyan-400"
                              : "text-purple-400"
                          }`}>
                            ₵{customer.total.toLocaleString()}
                          </span>
                        </div>

                        {/* Transaction items */}
                        <div className="space-y-1.5 ml-10">
                          {customer.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-slate-500 flex-shrink-0">{item.time}</span>
                                <span className="text-slate-300 truncate">{item.description}</span>
                              </div>
                              <span className="text-slate-300 flex-shrink-0 ml-2">₵{item.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reportDetails && reportDetails.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-sm text-slate-400">No individual transactions found</p>
                  </div>
                ) : null}
              </div>

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
