"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, useCallback } from "react"

interface PlatformUser {
  id: string
  name: string | null
  email: string
  role: string
  lastSeenAt: Date | null
  createdAt: Date
  businesses: { name: string; slug: string }[]
  shops: { name: string; slug: string; role: string }[]
}

interface UsersContentProps {
  users: PlatformUser[]
  total: number
  page: number
  totalPages: number
  currentRole: string
  currentSearch: string
}

const ROLE_LABELS: Record<string, string> = {
  BUSINESS_ADMIN: "Business Admin",
  SHOP_OWNER: "Shop Owner",
  SHOP_MANAGER: "Shop Manager",
  COLLECTOR: "Collector",
  CASHIER: "Cashier",
}

const ROLE_BADGE: Record<string, string> = {
  BUSINESS_ADMIN: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  SHOP_OWNER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  SHOP_MANAGER: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  COLLECTOR: "bg-green-500/15 text-green-400 border-green-500/30",
  CASHIER: "bg-amber-500/15 text-amber-400 border-amber-500/30",
}

export function UsersContent({
  users,
  total,
  page,
  totalPages,
  currentRole,
  currentSearch,
}: UsersContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentSearch)
  const [role, setRole] = useState(currentRole)

  const buildUrl = useCallback(
    (overrides: { page?: number; role?: string; search?: string }) => {
      const p = new URLSearchParams()
      const s = overrides.search ?? search
      const r = overrides.role ?? role
      const pg = overrides.page ?? page

      if (pg > 1) p.set("page", String(pg))
      if (r) p.set("role", r)
      if (s) p.set("search", s)

      const qs = p.toString()
      return `/super-admin/users${qs ? `?${qs}` : ""}`
    },
    [search, role, page]
  )

  const handleFilter = () => {
    startTransition(() => router.push(buildUrl({ page: 1 })))
  }

  const handlePageChange = (newPage: number) => {
    startTransition(() => router.push(buildUrl({ page: newPage })))
  }

  const handleClearFilters = () => {
    setSearch("")
    setRole("")
    startTransition(() => router.push("/super-admin/users"))
  }

  const timeAgo = (date: Date | null) => {
    if (!date) return "Never"
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return d.toLocaleDateString("en-GH", { dateStyle: "medium" })
  }

  return (
    <div>
      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFilter()}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              startTransition(() =>
                router.push(buildUrl({ role: e.target.value, page: 1 }))
              )
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
          {(currentRole || currentSearch) && (
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
      {users.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No users found</p>
          <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-purple-300">{u.name?.charAt(0).toUpperCase() || "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.name || "No name"}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] || "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
                {u.businesses.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Business: {u.businesses.map((b) => b.name).join(", ")}
                  </p>
                )}
                {u.shops.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Shop: {u.shops.map((s) => `${s.name} (${s.role})`).join(", ")}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                  <span>Joined {new Date(u.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}</span>
                  <span>Seen {timeAgo(u.lastSeenAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Business / Shop</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Last Seen</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-purple-300">{u.name?.charAt(0).toUpperCase() || "?"}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{u.name || "No name"}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ROLE_BADGE[u.role] || "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 max-w-[250px]">
                          {u.businesses.map((b) => (
                            <p key={b.slug} className="text-xs text-slate-300 truncate">🏢 {b.name}</p>
                          ))}
                          {u.shops.map((s) => (
                            <p key={s.slug} className="text-xs text-slate-400 truncate">🏪 {s.name} ({s.role})</p>
                          ))}
                          {u.businesses.length === 0 && u.shops.length === 0 && (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            u.lastSeenAt && (new Date().getTime() - new Date(u.lastSeenAt).getTime()) < 86400000
                              ? "bg-green-400"
                              : u.lastSeenAt
                                ? "bg-yellow-400"
                                : "bg-slate-600"
                          }`} />
                          <span className="text-sm text-slate-300">{timeAgo(u.lastSeenAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs text-slate-300">
                          {new Date(u.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}
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
