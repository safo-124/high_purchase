import { getSiteContent } from "../platform-actions"
import { SiteContentEditor } from "./site-content-editor"
import { SuperAdminShell } from "../super-admin-shell"

export default async function SiteContentPage() {
  const content = await getSiteContent()
  return (
    <SuperAdminShell activeHref="/super-admin/site-content">
      <SiteContentEditor initialContent={content} />
    </SuperAdminShell>
  )
}
