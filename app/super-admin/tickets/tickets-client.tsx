"use client"

import { useState, useTransition } from "react"
import { createTicket, updateTicketStatus, addTicketComment } from "../comms-actions"

type Ticket = {
  id: string; ticketNumber: string; subject: string; description: string;
  priority: string; status: string; category: string; businessId: string | null;
  createdById: string | null; assignedToId: string | null; commentCount: number;
  resolvedAt: Date | null; closedAt: Date | null; createdAt: Date
}

export function TicketsList({ tickets, openCount, urgentCount }: {
  tickets: Ticket[]; openCount: number; urgentCount: number
}) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [form, setForm] = useState({
    subject: "", description: "", priority: "MEDIUM" as const, category: "general",
  })

  function handleCreate() {
    startTransition(async () => {
      await createTicket(form)
      setShowForm(false)
      setForm({ subject: "", description: "", priority: "MEDIUM", category: "general" })
    })
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => { await updateTicketStatus(id, status as any) })
  }

  function handleAddComment(ticketId: string) {
    if (!comment.trim()) return
    startTransition(async () => {
      await addTicketComment(ticketId, comment, false)
      setComment("")
    })
  }

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-500/20 text-blue-400",
    IN_PROGRESS: "bg-amber-500/20 text-amber-400",
    WAITING: "bg-purple-500/20 text-purple-400",
    RESOLVED: "bg-green-500/20 text-green-400",
    CLOSED: "bg-slate-500/20 text-slate-400",
  }

  const priorityColors: Record<string, string> = {
    LOW: "bg-slate-500/20 text-slate-400",
    MEDIUM: "bg-blue-500/20 text-blue-400",
    HIGH: "bg-amber-500/20 text-amber-400",
    URGENT: "bg-red-500/20 text-red-400",
  }

  return (
    <div>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border-blue-500/30">
          <p className="text-sm text-blue-400">Open Tickets</p>
          <p className="text-2xl font-bold text-white">{openCount}</p>
        </div>
        <div className="glass-card p-4 bg-gradient-to-br from-red-500/20 to-rose-500/15 border-red-500/30">
          <p className="text-sm text-red-400">Urgent</p>
          <p className="text-2xl font-bold text-white">{urgentCount}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90">
          {showForm ? "Cancel" : "+ New Ticket"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6 space-y-4">
          <input type="text" placeholder="Subject" value={form.subject}
            onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
          <textarea placeholder="Description..." value={form.description} rows={4}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as any }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="account">Account</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={isPending || !form.subject || !form.description}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium disabled:opacity-50">
            {isPending ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-slate-500 font-mono">{t.ticketNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status]}`}>{t.status}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[t.priority]}`}>{t.priority}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">{t.category}</span>
                </div>
                <h4 className="text-white font-medium">{t.subject}</h4>
                <p className="text-sm text-slate-400 line-clamp-2 mt-1">{t.description}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Created {new Date(t.createdAt).toLocaleDateString()} • {t.commentCount} comments
                  {t.resolvedAt && ` • Resolved ${new Date(t.resolvedAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <select
                  value={t.status}
                  onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  disabled={isPending}
                  className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING">Waiting</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <button onClick={() => setSelectedTicket(selectedTicket === t.id ? null : t.id)}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10">
                  {selectedTicket === t.id ? "Close" : "Comment"}
                </button>
              </div>
            </div>

            {selectedTicket === t.id && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input type="text" placeholder="Add a comment..." value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment(t.id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                  <button onClick={() => handleAddComment(t.id)} disabled={isPending || !comment.trim()}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium disabled:opacity-50">
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-400">No support tickets</div>
        )}
      </div>
    </div>
  )
}
