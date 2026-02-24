import { SuperAdminShell } from "../super-admin-shell"
import { getPlatformAnalytics } from "../analytics-actions"

export default async function AnalyticsPage() {
  const analytics = await getPlatformAnalytics()

  return (
    <SuperAdminShell activeHref="/super-admin/analytics">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Platform Analytics</h2>
        <p className="text-slate-400">Comprehensive platform usage and growth metrics</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Users", value: analytics.overview.totalUsers, icon: "👥", color: "from-blue-500/20 to-cyan-500/15 border-blue-500/30" },
          { label: "New This Month", value: analytics.overview.newUsersThisMonth, icon: "📈", color: "from-green-500/20 to-emerald-500/15 border-green-500/30" },
          { label: "New This Week", value: analytics.overview.newUsersThisWeek, icon: "🔥", color: "from-orange-500/20 to-amber-500/15 border-orange-500/30" },
          { label: "Active Today", value: analytics.overview.activeUsersToday, icon: "🟢", color: "from-emerald-500/20 to-teal-500/15 border-emerald-500/30" },
          { label: "Businesses", value: analytics.overview.totalBusinesses, icon: "🏢", color: "from-purple-500/20 to-violet-500/15 border-purple-500/30" },
        ].map((stat) => (
          <div key={stat.label} className={`glass-card p-5 bg-gradient-to-br ${stat.color}`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Businesses", value: analytics.overview.activeBusinesses },
          { label: "Total Shops", value: analytics.overview.totalShops },
          { label: "Total Purchases", value: analytics.overview.totalPurchases },
          { label: "Total Payments", value: analytics.overview.totalPayments },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <p className="text-xl font-bold text-white">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Users by Role */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Users by Role</h3>
          <div className="space-y-3">
            {analytics.usersByRole.map((role) => {
              const total = analytics.overview.totalUsers || 1
              const pct = Math.round((role.count / total) * 100)
              const roleColors: Record<string, string> = {
                SUPER_ADMIN: "bg-red-500",
                BUSINESS_ADMIN: "bg-purple-500",
                ACCOUNTANT: "bg-indigo-500",
                SHOP_ADMIN: "bg-blue-500",
                SALES_STAFF: "bg-cyan-500",
                DEBT_COLLECTOR: "bg-amber-500",
                CUSTOMER: "bg-green-500",
              }
              return (
                <div key={role.role}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{role.role.replace(/_/g, " ")}</span>
                    <span className="text-white font-medium">{role.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${roleColors[role.role] || "bg-slate-500"} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Registration Trend */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Registrations (12 months)</h3>
          <div className="space-y-2">
            {analytics.registrationsByMonth.map((m) => {
              const maxCount = Math.max(...analytics.registrationsByMonth.map(r => r.count), 1)
              const pct = Math.round((m.count / maxCount) * 100)
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-16 shrink-0">{m.month}</span>
                  <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-white font-medium w-8 text-right">{m.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Purchase Trend */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Purchase Activity (12 months)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm text-slate-400 mb-3">Purchase Count</h4>
            <div className="space-y-2">
              {analytics.purchasesByMonth.map((m) => {
                const maxCount = Math.max(...analytics.purchasesByMonth.map(r => r.count), 1)
                const pct = Math.round((m.count / maxCount) * 100)
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white font-medium w-8 text-right">{m.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm text-slate-400 mb-3">Revenue (GHS)</h4>
            <div className="space-y-2">
              {analytics.purchasesByMonth.map((m) => {
                const maxTotal = Math.max(...analytics.purchasesByMonth.map(r => r.total), 1)
                const pct = Math.round((m.total / maxTotal) * 100)
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white font-medium w-20 text-right">
                      {m.total.toLocaleString("en-GH", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  )
}
