import { getContactMessages } from "../platform-actions"
import MessagesContent from "./messages-content"
import { SuperAdminShell } from "../super-admin-shell"

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const data = await getContactMessages({
    status: params.status,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
  })

  return (
    <SuperAdminShell activeHref="/super-admin/messages">
      <MessagesContent data={data} />
    </SuperAdminShell>
  )
}
