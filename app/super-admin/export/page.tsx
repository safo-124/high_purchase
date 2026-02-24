import { SuperAdminShell } from "../super-admin-shell"
import { ExportPanel } from "./export-client"

export default async function ExportPage() {
  return (
    <SuperAdminShell activeHref="/super-admin/export">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Data Export</h2>
        <p className="text-slate-400">Export platform data in CSV or JSON format for reporting and analysis</p>
      </div>
      <ExportPanel />
    </SuperAdminShell>
  )
}
