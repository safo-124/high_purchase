"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, useCallback } from "react"

interface AuditLog {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  actor: { id: string; name: string | null; email: string; role: string } | null
}

interface AuditLogsContentProps {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
  actionTypes: string[]
  currentAction: string
  currentSearch: string
}

export function AuditLogsContent({
  logs,
  total,
  page,
  totalPages,
  actionTypes,
  currentAction,
  currentSearch,
}: AuditLogsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [action, setAction] = useState(currentAction)

  const buildUrl = useCallback(
    (overrides: { page?: number; action?: string; search?: string }) => {
      const p = new URLSearchParams()
      const s = overrides.search ?? search
      const a = overrides.action ?? action
      const pg = overrides.page ?? page

      if (pg > 1) p.set("page", String(pg))
      if (a) p.set("action", a)
      if (s) p.set("search", s)

      const qs = p.toString()
      return `/super-admin/audit-logs${qs ? `?${qs}` : ""}`
    },
    [search, action, page]
  )

  const handleFilter = () => {
    startTransition(() => router.push(buildUrl({ page: 1 })))
  }

  const handlePageChange = (newPage: number) => {
    startTransition(() => router.push(buildUrl({ page: newPage })))
  }

  const handleClearFilters = () => {
    setSearch("")
    setAction("")
    startTransition(() => router.push("/super-admin/audit-logs"))
  }

  const getActionBadgeClasses = (act: string) => {
    if (act.includes("CREATE") || act.includes("ADDED")) return "bg-green-500/15 text-green-400 border-green-500/30"
    if (act.includes("DELETE") || act.includes("REMOVE")) return "bg-red-500/15 text-red-400 border-red-500/30"
    if (act.includes("SUSPEND") || act.includes("OVERDUE")) return "bg-orange-500/15 text-orange-400 border-orange-500/30"
    if (act === "LOGIN") return "bg-blue-500/15 text-blue-400 border-blue-500/30"
    if (act.includes("ACTIVATE") || act.includes("COMPLETE")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    if (act.includes("PAYMENT") || act.includes("WALLET")) return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
    return "bg-purple-500/15 text-purple-400 border-purple-500/30"
  }

  return (
    <div>
      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by user, action, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFilter()}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              startTransition(() =>
                router.push(buildUrl({ action: e.target.value, page: 1 }))
              )
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            <option value="">All Actions</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            onClick={handleFilter}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Loading..." : "Search"}
          </button>
          {(currentAction || currentSearch) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {logs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No audit logs found</p>
          <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getActionBadgeClasses(log.action)}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-sm text-white font-medium">{log.actor?.name || "System"}</p>
                <p className="text-xs text-slate-500">{log.actor?.email || ""}</p>
                {log.entityType && (
                  <p className="text-xs text-slate-500 mt-1">
                    {log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}...` : ""}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(log.createdAt).toLocaleString("en-GH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getActionBadgeClasses(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{log.actor?.name || "System"}</p>
                        <p className="text-xs text-slate-500">{log.actor?.email || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        {log.entityType ? (
                          <div>
                            <p className="text-xs text-slate-300">{log.entityType}</p>
                            {log.entityId && (
                              <p className="text-xs text-slate-500 font-mono">{log.entityId.slice(0, 12)}...</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <p className="text-xs text-slate-400 max-w-[200px] truncate">
                            {Object.entries(log.metadata)
                              .slice(0, 3)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs text-slate-300">
                          {new Date(log.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleTimeString("en-GH", { timeStyle: "short" })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 25 + 1} – {Math.min(page * 25, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isPending}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const pg = start + i
              if (pg > totalPages) return null
              return (
                <button
                  key={pg}
                  onClick={() => handlePageChange(pg)}
                  disabled={isPending}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    pg === page
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {pg}
                </button>
              )
            })}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isPending}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
