"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  CustomerNotification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "@/app/customer/actions"
import { 
  Bell, 
  CheckCheck,
  Mail,
  CreditCard,
  AlertTriangle,
  Info,
  Check,
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"

interface NotificationsContentProps {
  notifications: CustomerNotification[]
}

export function NotificationsContent({ notifications }: NotificationsContentProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [processing, setProcessing] = useState(false)

  const formatDate = (date: Date) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(notifDate)
  }

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      PAYMENT: <CreditCard className="w-5 h-5" />,
      REMINDER: <AlertTriangle className="w-5 h-5" />,
      MESSAGE: <Mail className="w-5 h-5" />,
      INFO: <Info className="w-5 h-5" />,
    }
    return icons[type] || <Bell className="w-5 h-5" />
  }

  const getNotificationStyle = (type: string, isRead: boolean) => {
    if (isRead) {
      return "bg-slate-800/20 border-slate-700/30"
    }
    
    const styles: Record<string, string> = {
      PAYMENT: "bg-green-500/10 border-green-500/30",
      REMINDER: "bg-amber-500/10 border-amber-500/30",
      MESSAGE: "bg-indigo-500/10 border-indigo-500/30",
      INFO: "bg-blue-500/10 border-blue-500/30",
    }
    return styles[type] || "bg-slate-800/30 border-slate-700/50"
  }

  const getIconColor = (type: string) => {
    const colors: Record<string, string> = {
      PAYMENT: "text-green-400",
      REMINDER: "text-amber-400",
      MESSAGE: "text-indigo-400",
      INFO: "text-blue-400",
    }
    return colors[type] || "text-slate-400"
  }

  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id)
    if (result.success) {
      router.refresh()
    }
  }

  const handleMarkAllAsRead = async () => {
    setProcessing(true)
    const result = await markAllNotificationsAsRead()
    if (result.success) {
      toast.success("All notifications marked as read")
      router.refresh()
    } else {
      toast.error("Failed to mark notifications as read")
    }
    setProcessing(false)
  }

  const filteredNotifications = filter === "unread"
    ? notifications.filter(n => !n.isRead)
    : notifications

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 mt-1">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "all" 
                  ? "bg-indigo-500 text-white" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "unread" 
                  ? "bg-indigo-500 text-white" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Unread
            </button>
          </div>

          {/* Mark All as Read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={processing}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-slate-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div 
              key={notification.id}
              className={`glass-card rounded-xl p-4 border transition-all ${getNotificationStyle(notification.type, notification.isRead)}`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  notification.isRead ? 'bg-slate-700/50' : 'bg-slate-800/50'
                }`}>
                  <span className={getIconColor(notification.type)}>
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-medium ${notification.isRead ? 'text-slate-400' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      <p className={`text-sm mt-1 ${notification.isRead ? 'text-slate-500' : 'text-slate-400'}`}>
                        {notification.body}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors flex-shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
                    {notification.link && (
                      <a
                        href={notification.link}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        View details
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center">
          <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Notifications</h2>
          <p className="text-slate-400">
            {filter === "unread" 
              ? "You've read all your notifications."
              : "You don't have any notifications yet."
            }
          </p>
        </div>
      )}
    </div>
  )
}
