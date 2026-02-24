import { SuperAdminShell } from "../super-admin-shell"
import { getAnnouncements } from "../comms-actions"
import { AnnouncementsList } from "./announcements-client"

export default async function AnnouncementsPage() {
  const { announcements } = await getAnnouncements()

  return (
    <SuperAdminShell activeHref="/super-admin/announcements">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Announcements</h2>
        <p className="text-slate-400">Broadcast messages to your platform users</p>
      </div>
      <AnnouncementsList announcements={announcements} />
    </SuperAdminShell>
  )
}
