import Link from "next/link"
import { SuperAdminShell } from "../super-admin-shell"
import { getPlatformUsers } from "../actions"
import { UsersContent } from "./users-content"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; role?: string; search?: string }>
}) {
  const params = await searchParams

  const page = parseInt(params.page || "1", 10)
  const role = params.role || ""
  const search = params.search || ""

  const data = await getPlatformUsers({
    page,
    pageSize: 25,
    role: role || undefined,
    search: search || undefined,
  })

  return (
    <SuperAdminShell activeHref="/super-admin/users">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/super-admin" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className="text-3xl font-bold text-white tracking-tight">Platform Users</h2>
          </div>
          <p className="text-slate-400">
            {data.total.toLocaleString()} total users • Page {data.page} of {data.totalPages}
          </p>
        </div>

        <UsersContent
          users={data.users}
          total={data.total}
          page={data.page}
          totalPages={data.totalPages}
          currentRole={role}
          currentSearch={search}
        />
    </SuperAdminShell>
  )
}
