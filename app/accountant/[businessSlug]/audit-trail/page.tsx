import { getAuditTrail } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    entityType?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AccountantAuditTrailPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  await requireAccountant(businessSlug)
  
  const auditLogs = await getAuditTrail(businessSlug, {
    entityType: searchParamsData.entityType,
    startDate: searchParamsData.startDate ? new Date(searchParamsData.startDate) : undefined,
    endDate: searchParamsData.endDate ? new Date(searchParamsData.endDate) : undefined,
  })

  const getActionBadgeStyle = (action: string) => {
    if (action.includes("CREATE")) {
      return "bg-emerald-500/20 text-emerald-400"
    } else if (action.includes("UPDATE") || action.includes("APPROVE")) {
      return "bg-blue-500/20 text-blue-400"
    } else if (action.includes("DELETE") || action.includes("REJECT")) {
      return "bg-red-500/20 text-red-400"
    }
    return "bg-slate-500/20 text-slate-400"
  }

  // Calculate stats from the logs
  const stats = {
    creates: auditLogs.filter(l => l.action.includes("CREATE")).length,
    updates: auditLogs.filter(l => l.action.includes("UPDATE") || l.action.includes("APPROVE")).length,
    deletes: auditLogs.filter(l => l.action.includes("DELETE") || l.action.includes("REJECT")).length,
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
              <p className="text-slate-400">Complete history of all financial transactions and changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-8">
        <form className="flex flex-wrap items-center gap-4">
          <select
            name="entityType"
            defaultValue={searchParamsData.entityType || ""}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Types</option>
            <option value="Payment">Payments</option>
            <option value="Purchase">Purchases</option>
            <option value="Expense">Expenses</option>
            <option value="Refund">Refunds</option>
            <option value="PaymentDispute">Disputes</option>
            <option value="Customer">Customers</option>
          </select>

          <input
            type="date"
            name="startDate"
            defaultValue={searchParamsData.startDate || ""}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <input
            type="date"
            name="endDate"
            defaultValue={searchParamsData.endDate || ""}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Records</p>
          <p className="text-2xl font-bold text-white">{auditLogs.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Creates</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.creates}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Updates</p>
          <p className="text-2xl font-bold text-blue-400">{stats.updates}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Deletes/Rejections</p>
          <p className="text-2xl font-bold text-red-400">{stats.deletes}</p>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Timestamp</th>
                <th className="text-left p-4 text-slate-400 font-medium">User</th>
                <th className="text-left p-4 text-slate-400 font-medium">Action</th>
                <th className="text-left p-4 text-slate-400 font-medium">Entity Type</th>
                <th className="text-left p-4 text-slate-400 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No audit records found
                  </td>
                </tr>
              ) : (
                auditLogs.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-slate-300">
                      <p>{new Date(record.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(record.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">{record.actorName || "System"}</p>
                      <p className="text-slate-400 text-xs">{record.actorEmail || "-"}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeStyle(record.action)}`}>
                        {record.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{record.entityType || "-"}</td>
                    <td className="p-4">
                      {record.entityId && (
                        <p className="text-slate-400 text-xs">ID: {record.entityId}</p>
                      )}
                      {record.metadata && (
                        <p className="text-slate-400 text-xs max-w-xs truncate">
                          {JSON.stringify(record.metadata)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
