"use client"

import { useState, useEffect } from "react"
import { getBusinessNotifications, markNotificationRead, markAllNotificationsRead } from "../../upgrade-actions"

interface Notification {
  id: string
  title: string
  body: string
  type: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => setBusinessSlug(p.businessSlug))
  }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadNotifications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug])

  const loadNotifications = async () => {
    setLoading(true)
    const result = await getBusinessNotifications(businessSlug)
    if (result.success && result.data) {
      const d = result.data as { notifications: Notification[]; unreadCount: number }
      setNotifications(d.notifications)
      setUnreadCount(d.unreadCount)
    }
    setLoading(false)
  }

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(businessSlug, id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(businessSlug)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      case "warning": return <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
      case "error": return <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      case "alert": return <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
      default: return <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
  }

  const getTypeBg = (type: string) => {
    switch (type) {
      case "success": return "border-emerald-500/20 bg-emerald-500/5"
      case "warning": return "border-amber-500/20 bg-amber-500/5"
      case "error": return "border-red-500/20 bg-red-500/5"
      case "alert": return "border-cyan-500/20 bg-cyan-500/5"
      default: return "border-blue-500/20 bg-blue-500/5"
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const displayed = showUnreadOnly ? notifications.filter(n => !n.isRead) : notifications

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              showUnreadOnly ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            Unread only
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-slate-400 hover:text-white transition-all border border-white/10"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400">Loading notifications...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-1">No notifications</h3>
            <p className="text-slate-400">You&apos;re all caught up!</p>
          </div>
        ) : (
          displayed.map(notification => (
            <div
              key={notification.id}
              className={`relative rounded-xl border p-4 transition-all cursor-pointer hover:bg-white/[0.03] ${
                notification.isRead ? "border-white/5 bg-white/[0.01]" : getTypeBg(notification.type)
              }`}
              onClick={() => !notification.isRead && handleMarkRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${notification.isRead ? "text-slate-300" : "text-white"}`}>
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${notification.isRead ? "text-slate-500" : "text-slate-300"}`}>
                    {notification.body}
                  </p>
                  <span className="text-xs text-slate-600 mt-2 block">{formatDate(notification.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
