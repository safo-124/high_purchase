import { requireSuperAdmin } from "../../../lib/auth"
import Link from "next/link"
import { LogoutButton } from "../logout-button"
import { getAuditLogs } from "../actions"
import { AuditLogsContent } from "./audit-logs-content"

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; search?: string }>
}) {
  const user = await requireSuperAdmin()
  const params = await searchParams

  const page = parseInt(params.page || "1", 10)
  const action = params.action || ""
  const search = params.search || ""

  const data = await getAuditLogs({
    page,
    pageSize: 25,
    action: action || undefined,
    search: search || undefined,
  })

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
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/super-admin" className="nav-link text-slate-300 hover:text-white text-sm font-medium">Dashboard</Link>
              <Link href="/super-admin/businesses" className="nav-link text-slate-300 hover:text-white text-sm font-medium">Businesses</Link>
              <Link href="/super-admin/users" className="nav-link text-slate-300 hover:text-white text-sm font-medium">Users</Link>
              <Link href="/super-admin/audit-logs" className="nav-link active text-white text-sm font-medium">Audit Logs</Link>
            </nav>
            <div className="flex items-center gap-4">
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
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/super-admin" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className="text-3xl font-bold text-white tracking-tight">Audit Logs</h2>
          </div>
          <p className="text-slate-400">
            {data.total.toLocaleString()} total entries • Page {data.page} of {data.totalPages}
          </p>
        </div>

        <AuditLogsContent
          logs={data.logs}
          total={data.total}
          page={data.page}
          totalPages={data.totalPages}
          actionTypes={data.actionTypes}
          currentAction={action}
          currentSearch={search}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 border-t border-white/5">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>© 2025 High Purchase • Ghana</p>
            <p>Super Admin Portal</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
