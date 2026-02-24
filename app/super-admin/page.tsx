import { requireSuperAdmin } from "../../lib/auth"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { MobileNav } from "./mobile-nav"
import { ThemeToggle } from "./theme-toggle"
import {
  getSuperAdminStats,
  getRevenueChartData,
  getTopBusinesses,
  getPlatformHealth,
  getPlatformAlerts,
} from "./actions"
import { getDashboardQuickStats } from "./analytics-actions"
import {
  RevenueChart,
  PurchaseTypePieChart,
  PurchaseStatusPieChart,
  RegionBarChart,
} from "./dashboard-charts"

const NAV_SECTIONS = [
  { label: "Core", links: [
    { href: "/super-admin", label: "Dashboard" },
    { href: "/super-admin/businesses", label: "Businesses" },
    { href: "/super-admin/users", label: "Users" },
    { href: "/super-admin/audit-logs", label: "Audit Logs" },
  ]},
  { label: "Operations", links: [
    { href: "/super-admin/analytics", label: "Analytics" },
    { href: "/super-admin/health", label: "Health" },
    { href: "/super-admin/revenue", label: "Revenue" },
  ]},
  { label: "Communication", links: [
    { href: "/super-admin/messages", label: "Messages" },
    { href: "/super-admin/announcements", label: "Announcements" },
    { href: "/super-admin/tickets", label: "Tickets" },
    { href: "/super-admin/email-templates", label: "Templates" },
  ]},
  { label: "Billing", links: [
    { href: "/super-admin/subscriptions", label: "Subscriptions" },
    { href: "/super-admin/coupons", label: "Coupons" },
    { href: "/super-admin/invoices", label: "Invoices" },
  ]},
  { label: "System", links: [
    { href: "/super-admin/registrations", label: "Registrations" },
    { href: "/super-admin/settings", label: "Settings" },
    { href: "/super-admin/login-activity", label: "Login Log" },
    { href: "/super-admin/permissions", label: "Permissions" },
    { href: "/super-admin/site-content", label: "Site Content" },
    { href: "/super-admin/export", label: "Export" },
  ]},
]

const ALL_NAV_LINKS = NAV_SECTIONS.flatMap(s => s.links)

export default async function SuperAdminDashboard() {
  const user = await requireSuperAdmin()

  const [stats, chartData, topBusinesses, health, alerts, quickStats] = await Promise.all([
    getSuperAdminStats(),
    getRevenueChartData(),
    getTopBusinesses(),
    getPlatformHealth(),
    getPlatformAlerts(),
    getDashboardQuickStats(),
  ])

  const formatGHS = (n: number) =>
    `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 glass-header">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MobileNav links={ALL_NAV_LINKS} activeHref="/super-admin" sections={NAV_SECTIONS} />
              <div className="w-11 h-11 rounded-xl logo-glow flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">High Purchase</h1>
                <p className="text-xs text-slate-400">Super Admin Portal</p>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-1 flex-wrap">
              {NAV_SECTIONS.map(section => (
                <div key={section.label} className="flex items-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider px-1 hidden xl:inline">{section.label}</span>
                  {section.links.map(link => (
                    <Link key={link.href} href={link.href}
                      className={`nav-link text-xs font-medium px-2 py-1 ${
                        link.href === "/super-admin" ? "active text-white" : "text-slate-300 hover:text-white"
                      }`}>{link.label}</Link>
                  ))}
                  <div className="w-px h-4 bg-white/10 mx-1 hidden xl:block" />
                </div>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-300">{user.name?.charAt(0).toUpperCase() || "A"}</span>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full px-6 py-8">
        {/* Welcome */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">System Online</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Welcome back, <span className="text-gradient">{user.name?.split(" ")[0]}</span>
          </h2>
          <p className="text-slate-400 text-lg">Here&apos;s what&apos;s happening with your platform today.</p>
        </div>

        {/* ===== Quick Action Stats ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          <Link href="/super-admin/messages" className="glass-card p-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">✉️</span>
              {quickStats.unreadMessages > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">{quickStats.unreadMessages}</span>
              )}
            </div>
            <p className="text-xl font-bold text-white">{quickStats.unreadMessages}</p>
            <p className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Unread Messages</p>
          </Link>
          <Link href="/super-admin/registrations" className="glass-card p-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📋</span>
              {quickStats.pendingRegistrations > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">{quickStats.pendingRegistrations}</span>
              )}
            </div>
            <p className="text-xl font-bold text-white">{quickStats.pendingRegistrations}</p>
            <p className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Pending Registrations</p>
          </Link>
          <Link href="/super-admin/tickets" className="glass-card p-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">🎫</span>
              {quickStats.openTickets > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">{quickStats.openTickets}</span>
              )}
            </div>
            <p className="text-xl font-bold text-white">{quickStats.openTickets}</p>
            <p className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Open Tickets</p>
          </Link>
          <Link href="/super-admin/subscriptions" className="glass-card p-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">⏰</span>
              {quickStats.expiringSubs > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">{quickStats.expiringSubs}</span>
              )}
            </div>
            <p className="text-xl font-bold text-white">{quickStats.expiringSubs}</p>
            <p className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Expiring Subs (7d)</p>
          </Link>
          <Link href="/super-admin/revenue" className="glass-card p-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">❌</span>
            </div>
            <p className="text-xl font-bold text-white">{quickStats.failedPayments}</p>
            <p className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Failed Payments (7d)</p>
          </Link>
          <Link href="/super-admin/login-activity" className="glass-card p-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">🔐</span>
            </div>
            <p className="text-xl font-bold text-white">{quickStats.todayLogins}</p>
            <p className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Logins Today</p>
          </Link>
        </div>

        {/* ===== Financial Overview ===== */}
        <div className="mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Financial Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Revenue */}
          <div className="glass-card stat-card stat-card-purple p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl icon-container flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full">All Time</span>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-white">{formatGHS(stats.totalRevenue)}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Revenue</p>
          </div>

          {/* Total Collected */}
          <div className="glass-card stat-card stat-card-green p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-green-400/80 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                {stats.collectionRate.toFixed(0)}%
              </span>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-green-400">{formatGHS(stats.totalCollected)}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Collected</p>
          </div>

          {/* Outstanding */}
          <div className="glass-card stat-card stat-card-orange p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-orange-400/80 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">Pending</span>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-orange-400">{formatGHS(stats.totalOutstanding)}</span>
            </div>
            <p className="text-slate-400 text-sm">Outstanding Balance</p>
          </div>

          {/* This Month */}
          <div className="glass-card stat-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              {stats.revenueGrowth !== 0 && (
                <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${
                  stats.revenueGrowth > 0
                    ? "text-green-400/80 bg-green-500/10 border-green-500/20"
                    : "text-red-400/80 bg-red-500/10 border-red-500/20"
                }`}>
                  {stats.revenueGrowth > 0 ? "↑" : "↓"} {Math.abs(stats.revenueGrowth).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-cyan-400">{formatGHS(stats.thisMonthRevenue)}</span>
            </div>
            <p className="text-slate-400 text-sm">This Month&apos;s Revenue</p>
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-slate-500">Last month: {formatGHS(stats.lastMonthRevenue)}</p>
            </div>
          </div>
        </div>

        {/* ===== Platform Stats ===== */}
        <div className="mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Stats</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {[
            { label: "Businesses", value: stats.totalBusinesses, sub: `${stats.activeBusinesses} active` },
            { label: "Shops", value: stats.totalShops, sub: "Across platform" },
            { label: "Users", value: stats.totalUsers, sub: `${stats.newUsersThisMonth} this month` },
            { label: "Customers", value: stats.totalCustomers, sub: `${stats.newCustomersThisMonth} this month` },
            { label: "Active Users", value: stats.activeUsers, sub: "Last 30 days" },
            { label: "Purchases", value: stats.totalPurchases, sub: `${stats.purchasesByStatus.active} active` },
          ].map((item) => (
            <div key={item.label} className="glass-card p-4">
              <p className="text-2xl font-bold text-white mb-1">{item.value.toLocaleString()}</p>
              <p className="text-sm text-slate-300 font-medium">{item.label}</p>
              <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* ===== Revenue Chart ===== */}
        <div className="mb-10">
          <RevenueChart data={chartData} />
        </div>

        {/* ===== Purchase Breakdown + Key Metrics ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <PurchaseTypePieChart data={stats.purchasesByType} />
          <PurchaseStatusPieChart data={stats.purchasesByStatus} />

          {/* Key Metrics */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Key Metrics</h3>
            <div className="space-y-3">
              {/* Default Rate */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.defaultRate > 20 ? "bg-red-500/15" : stats.defaultRate > 10 ? "bg-orange-500/15" : "bg-green-500/15"}`}>
                    <svg className={`w-4 h-4 ${stats.defaultRate > 20 ? "text-red-400" : stats.defaultRate > 10 ? "text-orange-400" : "text-green-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">Default Rate</span>
                </div>
                <span className={`text-sm font-bold ${stats.defaultRate > 20 ? "text-red-400" : stats.defaultRate > 10 ? "text-orange-400" : "text-green-400"}`}>{stats.defaultRate.toFixed(1)}%</span>
              </div>
              {/* Collection Rate */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">Collection Rate</span>
                </div>
                <span className="text-sm font-bold text-green-400">{stats.collectionRate.toFixed(1)}%</span>
              </div>
              {/* Pending Payments */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">Pending Payments</span>
                </div>
                <span className="text-sm font-bold text-yellow-400">{stats.pendingPayments}</span>
              </div>
              {/* POS Revenue */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">POS Revenue</span>
                </div>
                <span className="text-sm font-bold text-blue-400">{formatGHS(stats.posRevenue)}</span>
              </div>
              {/* POS Transactions */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">POS Transactions</span>
                </div>
                <span className="text-sm font-bold text-purple-400">{stats.posTransactions}</span>
              </div>
              {/* Suspended */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.suspendedBusinesses > 0 ? "bg-orange-500/15" : "bg-green-500/15"}`}>
                    <svg className={`w-4 h-4 ${stats.suspendedBusinesses > 0 ? "text-orange-400" : "text-green-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">Suspended</span>
                </div>
                <span className={`text-sm font-bold ${stats.suspendedBusinesses > 0 ? "text-orange-400" : "text-green-400"}`}>{stats.suspendedBusinesses}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Top Businesses ===== */}
        <div className="glass-card p-6 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Top Businesses</h3>
              <p className="text-xs text-slate-400">Ranked by revenue</p>
            </div>
          </div>

          {topBusinesses.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No business data yet</div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {topBusinesses.map((biz, idx) => (
                  <div key={biz.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                        idx === 1 ? "bg-slate-400/20 text-slate-300" :
                        idx === 2 ? "bg-orange-700/20 text-orange-400" :
                        "bg-white/5 text-slate-500"
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{biz.name}</p>
                        <p className="text-xs text-slate-500">{biz.shopCount} shop{biz.shopCount !== 1 ? "s" : ""} • {biz.totalCustomers} customers</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-slate-500">Revenue</p>
                        <p className="text-white font-medium">{formatGHS(biz.revenue)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-slate-500">Collected</p>
                        <p className="text-emerald-400 font-medium">{formatGHS(biz.collected)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-slate-500">Active / Overdue</p>
                        <p className="text-white font-medium">{biz.activePurchases} / <span className={biz.overduePurchases > 0 ? "text-red-400" : ""}>{biz.overduePurchases}</span></p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-slate-500">Collection %</p>
                        <p className={`font-bold ${biz.collectionRate >= 80 ? "text-green-400" : biz.collectionRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>{biz.collectionRate.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Business</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Revenue</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Collected</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Customers</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Active</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Overdue</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Collection %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {topBusinesses.map((biz, idx) => (
                      <tr key={biz.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                            idx === 1 ? "bg-slate-400/20 text-slate-300" :
                            idx === 2 ? "bg-orange-700/20 text-orange-400" :
                            "bg-white/5 text-slate-500"
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">{biz.name}</p>
                          <p className="text-xs text-slate-500">{biz.shopCount} shop{biz.shopCount !== 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-white">{formatGHS(biz.revenue)}</td>
                        <td className="px-4 py-3 text-right text-sm text-emerald-400">{formatGHS(biz.collected)}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-300">{biz.totalCustomers}</td>
                        <td className="px-4 py-3 text-center text-sm text-blue-400">{biz.activePurchases}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm ${biz.overduePurchases > 0 ? "text-red-400" : "text-slate-500"}`}>{biz.overduePurchases}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-bold ${biz.collectionRate >= 80 ? "text-green-400" : biz.collectionRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>{biz.collectionRate.toFixed(0)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ===== Health + Alerts + Quick Actions ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Platform Health */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/15 border border-teal-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Platform Health</h3>
                <p className="text-xs text-slate-400">System metrics</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-300">New Businesses (Month)</span>
                <span className="text-sm font-bold text-white">{health.newBusinessesThisMonth}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-300">Emails Sent</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-400">{health.emailStats.sent}</span>
                  {health.emailStats.failed > 0 && (
                    <span className="text-xs text-red-400 ml-2">({health.emailStats.failed} failed)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-300">SMS Sent</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-400">{health.smsStats.sent}</span>
                  {health.smsStats.failed > 0 && (
                    <span className="text-xs text-red-400 ml-2">({health.smsStats.failed} failed)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-300">POS Transactions</span>
                <span className="text-sm font-bold text-white">{health.posTransactions}</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/15 border border-red-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Attention Required</h3>
                <p className="text-xs text-slate-400">Issues needing action</p>
              </div>
            </div>
            {alerts.overdueAlerts.length === 0 && alerts.inactiveBusinesses.length === 0 && alerts.inactiveStaff.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-green-400 font-medium">All Clear!</p>
                <p className="text-xs text-slate-500 mt-1">No issues require attention</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {alerts.overdueAlerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{a.name}</p>
                      <p className="text-xs text-red-400">{a.overdueCount} overdue • {formatGHS(a.overdueAmount)}</p>
                    </div>
                  </div>
                ))}
                {alerts.inactiveBusinesses.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{b.name}</p>
                      <p className="text-xs text-yellow-400">No activity in 30+ days</p>
                    </div>
                  </div>
                ))}
                {alerts.inactiveBusinesses.length > 3 && (
                  <p className="text-xs text-slate-500 text-center">+{alerts.inactiveBusinesses.length - 3} more inactive businesses</p>
                )}
                {alerts.inactiveStaff.length > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-500/5 border border-slate-500/15">
                    <div className="w-8 h-8 rounded-lg bg-slate-500/15 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{alerts.inactiveStaff.length} inactive staff</p>
                      <p className="text-xs text-slate-400">Not logged in for 30+ days</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                <p className="text-xs text-slate-400">Common tasks</p>
              </div>
            </div>
            <div className="space-y-2">
              <Link href="/super-admin/businesses" className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-purple-500/30 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="flex-1 text-sm text-white group-hover:text-purple-300 transition-colors">Manage Businesses</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/super-admin/businesses" className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-green-500/30 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="flex-1 text-sm text-white group-hover:text-green-300 transition-colors">Create New Business</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/super-admin/users" className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="flex-1 text-sm text-white group-hover:text-blue-300 transition-colors">View All Users</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/super-admin/audit-logs" className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="flex-1 text-sm text-white group-hover:text-cyan-300 transition-colors">View Audit Logs</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>

        {/* ===== Regional Distribution ===== */}
        <div className="mb-10">
          <RegionBarChart data={health.customersByRegion} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 border-t border-white/5">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>© 2025 High Purchase • Ghana</p>
            <p>Super Admin Dashboard v2.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
