import { SuperAdminShell } from "../super-admin-shell"
import { getBusinessHealthData } from "../analytics-actions"

export default async function HealthPage() {
  const { businesses, summary } = await getBusinessHealthData()

  return (
    <SuperAdminShell activeHref="/super-admin/health">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Business Health Monitor</h2>
        <p className="text-slate-400">Monitor business activity, identify issues, and track platform health</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 bg-gradient-to-br from-green-500/20 to-emerald-500/15 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-sm text-green-400 font-medium">Healthy</span>
          </div>
          <p className="text-3xl font-bold text-white">{summary.healthy}</p>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-amber-500/20 to-yellow-500/15 border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-sm text-amber-400 font-medium">Warning</span>
          </div>
          <p className="text-3xl font-bold text-white">{summary.warning}</p>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-red-500/20 to-rose-500/15 border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-sm text-red-400 font-medium">Critical</span>
          </div>
          <p className="text-3xl font-bold text-white">{summary.critical}</p>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-slate-500/20 to-gray-500/15 border-slate-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-sm text-slate-400 font-medium">Inactive</span>
          </div>
          <p className="text-3xl font-bold text-white">{summary.inactive}</p>
        </div>
      </div>

      {/* Business Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">All Businesses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Business</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Health</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Plan</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Shops</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Purchases (30d)</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Payments (30d)</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((biz) => (
                <tr key={biz.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{biz.name}</p>
                      <p className="text-xs text-slate-400">{biz.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      biz.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {biz.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      biz.status === "HEALTHY" ? "bg-green-500/20 text-green-400" :
                      biz.status === "WARNING" ? "bg-amber-500/20 text-amber-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {biz.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-300">{biz.planName}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-white">{biz.shopCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-white">{biz.recentPurchases}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-white">{biz.recentPayments}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            biz.healthScore >= 80 ? "bg-green-500" :
                            biz.healthScore >= 50 ? "bg-amber-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${biz.healthScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-white font-medium w-8 text-right">{biz.healthScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No businesses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminShell>
  )
}
