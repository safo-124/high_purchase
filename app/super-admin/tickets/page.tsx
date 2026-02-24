import { SuperAdminShell } from "../super-admin-shell"
import { getTickets } from "../comms-actions"
import { TicketsList } from "./tickets-client"

export default async function TicketsPage() {
  const { tickets, openCount, urgentCount } = await getTickets()

  return (
    <SuperAdminShell activeHref="/super-admin/tickets">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Support Tickets</h2>
        <p className="text-slate-400">Manage support requests, track issues, and resolve problems</p>
      </div>
      <TicketsList tickets={tickets} openCount={openCount} urgentCount={urgentCount} />
    </SuperAdminShell>
  )
}
