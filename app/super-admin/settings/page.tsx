import { SuperAdminShell } from "../super-admin-shell"
import { getSystemSettings } from "../billing-actions"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const settings = await getSystemSettings()

  return (
    <SuperAdminShell activeHref="/super-admin/settings">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">System Settings</h2>
        <p className="text-slate-400">Configure platform-wide settings for currency, security, billing, and notifications</p>
      </div>
      <SettingsForm settings={settings} />
    </SuperAdminShell>
  )
}
