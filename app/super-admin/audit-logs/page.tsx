import Link from "next/link"
import { SuperAdminShell } from "../super-admin-shell"
import { getAuditLogs } from "../actions"
import { AuditLogsContent } from "./audit-logs-content"

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; search?: string }>
}) {
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
    <SuperAdminShell activeHref="/super-admin/audit-logs">
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
    </SuperAdminShell>
  )
}
