import { SuperAdminShell } from "../super-admin-shell"
import { getLoginActivity } from "../security-actions"

export default async function LoginActivityPage() {
  const { activities, total, failedToday, totalToday } = await getLoginActivity()

  return (
    <SuperAdminShell activeHref="/super-admin/login-activity">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Login Activity</h2>
        <p className="text-slate-400">Monitor login attempts, track suspicious activity, and audit access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border-blue-500/30">
          <p className="text-xs text-blue-400 mb-1">Total Records</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="glass-card p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/15 border-green-500/30">
          <p className="text-xs text-green-400 mb-1">Logins Today</p>
          <p className="text-2xl font-bold text-white">{totalToday}</p>
        </div>
        <div className="glass-card p-4 bg-gradient-to-br from-red-500/20 to-rose-500/15 border-red-500/30">
          <p className="text-xs text-red-400 mb-1">Failed Today</p>
          <p className="text-2xl font-bold text-white">{failedToday}</p>
        </div>
        <div className="glass-card p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/15 border-amber-500/30">
          <p className="text-xs text-amber-400 mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-white">
            {totalToday > 0 ? Math.round(((totalToday - failedToday) / totalToday) * 100) : 100}%
          </p>
        </div>
      </div>

      {/* Activity Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">IP Address</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Reason</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.id} className={`border-b border-white/5 hover:bg-white/5 ${!a.success ? "bg-red-500/5" : ""}`}>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {a.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{a.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{a.userName || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{a.role || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{a.ipAddress || "—"}</td>
                  <td className="px-4 py-3 text-xs text-red-400">{a.failureReason || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 text-right">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No login activity recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminShell>
  )
}
