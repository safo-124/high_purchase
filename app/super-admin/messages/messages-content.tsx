"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { markMessageRead, replyToMessage, archiveMessages, deleteMessages } from "../platform-actions"

interface Message {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: string
  repliedAt: Date | null
  replyNote: string | null
  createdAt: Date
}

interface MessagesData {
  messages: Message[]
  total: number
  unreadCount: number
  page: number
  pageSize: number
  totalPages: number
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  UNREAD: { bg: "bg-blue-500/15", text: "text-blue-300", label: "Unread" },
  READ: { bg: "bg-slate-500/15", text: "text-slate-400", label: "Read" },
  REPLIED: { bg: "bg-green-500/15", text: "text-green-300", label: "Replied" },
  ARCHIVED: { bg: "bg-slate-700/30", text: "text-slate-500", label: "Archived" },
}

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  demo: "Demo Request",
  sales: "Sales / Enterprise",
  support: "Technical Support",
  partnership: "Partnership",
  careers: "Careers",
}

export default function MessagesContent({ data }: { data: MessagesData }) {
  const router = useRouter()
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState("")
  const [loading, setLoading] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleOpen = async (msg: Message) => {
    setSelectedMsg(msg)
    setReplyText("")
    if (msg.status === "UNREAD") {
      await markMessageRead(msg.id)
    }
  }

  const handleReply = async () => {
    if (!selectedMsg || !replyText.trim()) return
    setLoading("reply")
    try {
      await replyToMessage(selectedMsg.id, replyText)
      setSelectedMsg(null)
      router.refresh()
    } finally {
      setLoading("")
    }
  }

  const handleBulkArchive = async () => {
    if (selected.size === 0) return
    setLoading("archive")
    try {
      await archiveMessages(Array.from(selected))
      setSelected(new Set())
      router.refresh()
    } finally {
      setLoading("")
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} message(s)? This cannot be undone.`)) return
    setLoading("delete")
    try {
      await deleteMessages(Array.from(selected))
      setSelected(new Set())
      router.refresh()
    } finally {
      setLoading("")
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Contact Messages</h2>
        <p className="text-sm text-slate-400">{data.unreadCount} unread · {data.total} total</p>
      </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {["all", "UNREAD", "READ", "REPLIED", "ARCHIVED"].map(status => (
            <Link
              key={status}
              href={`/super-admin/messages${status === "all" ? "" : `?status=${status}`}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                (!data.messages.length && status === "all") || false
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-white/10"
              }`}
            >
              {status === "all" ? "All" : STATUS_STYLES[status]?.label || status}
            </Link>
          ))}

          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500">{selected.size} selected</span>
              <button onClick={handleBulkArchive} disabled={loading === "archive"} className="px-3 py-1.5 text-xs font-medium bg-slate-500/15 hover:bg-slate-500/25 text-slate-300 rounded-lg transition-colors">
                {loading === "archive" ? "..." : "Archive"}
              </button>
              <button onClick={handleBulkDelete} disabled={loading === "delete"} className="px-3 py-1.5 text-xs font-medium bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg transition-colors">
                {loading === "delete" ? "..." : "Delete"}
              </button>
            </div>
          )}
        </div>

        {/* Messages List */}
        {data.messages.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <span className="text-4xl mb-4 block">📭</span>
            <h3 className="text-lg font-semibold text-white mb-2">No Messages</h3>
            <p className="text-sm text-slate-400">No contact messages to display.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.messages.map(msg => {
              const style = STATUS_STYLES[msg.status] || STATUS_STYLES.UNREAD
              const isUnread = msg.status === "UNREAD"
              return (
                <div
                  key={msg.id}
                  className={`glass-card rounded-xl transition-all hover:bg-white/[0.03] cursor-pointer ${isUnread ? "border-l-2 border-l-blue-500" : ""}`}
                >
                  <div className="flex items-start gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={selected.has(msg.id)}
                      onChange={() => toggleSelect(msg.id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-1.5 w-4 h-4 rounded bg-white/5 border-white/20 text-purple-500 focus:ring-purple-500/20"
                    />
                    <div className="flex-1 min-w-0" onClick={() => handleOpen(msg)}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-medium truncate ${isUnread ? "text-white" : "text-slate-300"}`}>
                          {msg.name}
                        </p>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        <span className="text-[10px] text-slate-600 ml-auto shrink-0">
                          {new Date(msg.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{msg.email}{msg.phone ? ` · ${msg.phone}` : ""}</p>
                      <p className={`text-xs mb-1 ${isUnread ? "text-blue-300" : "text-slate-400"}`}>
                        {SUBJECT_LABELS[msg.subject] || msg.subject}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">{msg.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/super-admin/messages?page=${p}`}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  p === data.page ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}

      {/* Message Detail Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMsg(null)} />
          <div className="relative w-full max-w-2xl glass-card rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedMsg.name}</h3>
                <p className="text-xs text-slate-400">{selectedMsg.email}{selectedMsg.phone ? ` · ${selectedMsg.phone}` : ""}</p>
              </div>
              <button onClick={() => setSelectedMsg(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Subject</p>
                <p className="text-sm font-medium text-blue-300">{SUBJECT_LABELS[selectedMsg.subject] || selectedMsg.subject}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Message</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedMsg.message}</p>
              </div>
              <p className="text-[10px] text-slate-600">
                Sent {new Date(selectedMsg.createdAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
              </p>

              {selectedMsg.replyNote && (
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Your Reply</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedMsg.replyNote}</p>
                  {selectedMsg.repliedAt && (
                    <p className="text-[10px] text-slate-600 mt-2">Replied {new Date(selectedMsg.repliedAt).toLocaleString("en-GB")}</p>
                  )}
                </div>
              )}

              {selectedMsg.status !== "REPLIED" && (
                <div className="pt-2">
                  <p className="text-xs text-slate-500 mb-2">Reply (internal note)</p>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write your reply note..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 resize-none"
                  />
                  <button
                    onClick={handleReply}
                    disabled={loading === "reply" || !replyText.trim()}
                    className="mt-3 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl transition-all disabled:opacity-50"
                  >
                    {loading === "reply" ? "Saving..." : "Mark as Replied"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
