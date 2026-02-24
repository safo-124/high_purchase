import { SuperAdminShell } from "../super-admin-shell"
import { getEmailTemplates } from "../comms-actions"
import { EmailTemplatesList } from "./templates-client"

export default async function EmailTemplatesPage() {
  const templates = await getEmailTemplates()

  return (
    <SuperAdminShell activeHref="/super-admin/email-templates">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Email Templates</h2>
        <p className="text-slate-400">Manage and customize email templates for automated communications</p>
      </div>
      <EmailTemplatesList templates={templates} />
    </SuperAdminShell>
  )
}
