import { SuperAdminShell } from "../super-admin-shell"
import { getRevenueDashboard } from "../analytics-actions"

export default async function RevenuePage() {
  const revenue = await getRevenueDashboard()

  const formatGHS = (n: number) =>
    `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <SuperAdminShell activeHref="/super-admin/revenue">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Revenue Dashboard</h2>
        <p className="text-slate-400">Track subscription revenue, MRR, and payment analytics</p>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-5 bg-gradient-to-br from-green-500/20 to-emerald-500/15 border-green-500/30">
          <p className="text-xs text-green-400 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-white">{formatGHS(revenue.overview.totalRevenue)}</p>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border-blue-500/30">
          <p className="text-xs text-blue-400 mb-1">Monthly (MRR)</p>
          <p className="text-xl font-bold text-white">{formatGHS(revenue.overview.mrr)}</p>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-purple-500/20 to-violet-500/15 border-purple-500/30">
          <p className="text-xs text-purple-400 mb-1">Annual (ARR)</p>
          <p className="text-xl font-bold text-white">{formatGHS(revenue.overview.arr)}</p>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-amber-500/20 to-orange-500/15 border-amber-500/30">
          <p className="text-xs text-amber-400 mb-1">MRR Growth</p>
          <p className={`text-xl font-bold ${revenue.overview.mrrGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>
            {revenue.overview.mrrGrowth >= 0 ? "+" : ""}{revenue.overview.mrrGrowth}%
          </p>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-cyan-500/20 to-teal-500/15 border-cyan-500/30">
          <p className="text-xs text-cyan-400 mb-1">Active Subs</p>
          <p className="text-xl font-bold text-white">{revenue.overview.activeSubscriptions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Plan */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Plan</h3>
          <div className="space-y-3">
            {revenue.revenueByPlan.map(plan => {
              const maxTotal = Math.max(...revenue.revenueByPlan.map(p => p.total), 1)
              const pct = Math.round((plan.total / maxTotal) * 100)
              return (
                <div key={plan.planName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{plan.planName}</span>
                    <span className="text-white font-medium">{formatGHS(plan.total)} ({plan.count} payments)</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {revenue.revenueByPlan.length === 0 && <p className="text-sm text-slate-400">No revenue data yet</p>}
          </div>
        </div>

        {/* Payments by Status */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Payments by Status</h3>
          <div className="space-y-3">
            {revenue.paymentsByStatus.map(p => {
              const statusColors: Record<string, string> = {
                COMPLETED: "bg-green-500",
                PENDING: "bg-amber-500",
                FAILED: "bg-red-500",
                REFUNDED: "bg-purple-500",
              }
              return (
                <div key={p.status} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${statusColors[p.status] || "bg-slate-500"}`} />
                    <span className="text-sm text-slate-300">{p.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{formatGHS(p.total)}</p>
                    <p className="text-xs text-slate-400">{p.count} payments</p>
                  </div>
                </div>
              )
            })}
            {revenue.paymentsByStatus.length === 0 && <p className="text-sm text-slate-400">No payment data yet</p>}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue (12 months)</h3>
        <div className="space-y-2">
          {revenue.monthlyRevenue.map(m => {
            const maxRev = Math.max(...revenue.monthlyRevenue.map(r => r.revenue), 1)
            const pct = Math.round((m.revenue / maxRev) * 100)
            return (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16 shrink-0">{m.month}</span>
                <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-white font-medium w-28 text-right">{formatGHS(m.revenue)}</span>
              </div>
            )
          })}
          {revenue.monthlyRevenue.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No revenue data yet</p>}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Recent Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Business</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Plan</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Method</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {revenue.recentPayments.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-white">{p.businessName}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{p.planName}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                      p.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                      p.status === "FAILED" ? "bg-red-500/20 text-red-400" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right">{formatGHS(p.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 text-right">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {revenue.recentPayments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminShell>
  )
}
