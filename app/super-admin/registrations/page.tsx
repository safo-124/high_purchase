import { getRegistrations } from "../platform-actions"
import { RegistrationsContent } from "./registrations-content"
import { SuperAdminShell } from "../super-admin-shell"

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const status = params.status || "PENDING"
  const search = params.search || ""
  const page = parseInt(params.page || "1")

  const data = await getRegistrations({ status, search, page, pageSize: 20 })

  return (
    <SuperAdminShell activeHref="/super-admin/registrations">
      <RegistrationsContent data={data} currentStatus={status} currentSearch={search} currentPage={page} />
    </SuperAdminShell>
  )
}
