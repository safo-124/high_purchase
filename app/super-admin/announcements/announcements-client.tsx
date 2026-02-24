"use client"

import { useState, useTransition } from "react"
import { createAnnouncement, toggleAnnouncement, deleteAnnouncement } from "../comms-actions"

type Announcement = {
  id: string; title: string; content: string; type: string; targetAudience: string;
  targetValue: string | null; priority: string; isActive: boolean;
  scheduledAt: Date | null; sentAt: Date | null; sentById: string; createdAt: Date
}

export function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: "", content: "", type: "IN_APP" as const, targetAudience: "ALL" as const,
    priority: "NORMAL" as const,
  })

  function handleCreate() {
    startTransition(async () => {
      await createAnnouncement(form)
      setShowForm(false)
      setForm({ title: "", content: "", type: "IN_APP", targetAudience: "ALL", priority: "NORMAL" })
    })
  }

  const priorityColors: Record<string, string> = {
    LOW: "bg-slate-500/20 text-slate-400",
    NORMAL: "bg-blue-500/20 text-blue-400",
    HIGH: "bg-amber-500/20 text-amber-400",
    URGENT: "bg-red-500/20 text-red-400",
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "+ New Announcement"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6 space-y-4">
          <input
            type="text" placeholder="Announcement Title" value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
          <textarea
            placeholder="Announcement content..." value={form.content} rows={4}
            onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as any }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="IN_APP">In-App</option>
              <option value="EMAIL">Email</option>
              <option value="BOTH">Both</option>
            </select>
            <select value={form.targetAudience} onChange={(e) => setForm(f => ({ ...f, targetAudience: e.target.value as any }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="ALL">All Users</option>
              <option value="BUSINESS_ADMINS">Business Admins</option>
              <option value="SHOP_ADMINS">Shop Admins</option>
              <option value="COLLECTORS">Collectors</option>
              <option value="CUSTOMERS">Customers</option>
            </select>
            <select value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as any }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <button
            onClick={handleCreate} disabled={isPending || !form.title || !form.content}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Sending..." : "Send Announcement"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map(a => (
          <div key={a.id} className={`glass-card p-5 ${!a.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-white font-medium">{a.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[a.priority]}`}>{a.priority}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">{a.type}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">{a.targetAudience}</span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{a.content}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {a.sentAt ? `Sent ${new Date(a.sentAt).toLocaleDateString()}` : "Scheduled"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startTransition(async () => { await toggleAnnouncement(a.id) })}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10">
                  {a.isActive ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => { if (confirm("Delete this announcement?")) startTransition(async () => { await deleteAnnouncement(a.id) }) }}
                  className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-400">No announcements yet</div>
        )}
      </div>
    </div>
  )
}
