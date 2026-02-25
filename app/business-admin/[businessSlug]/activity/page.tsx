"use client"

import { useState, useEffect } from "react"
import { getBusinessActivities } from "../../upgrade-actions"

interface Activity {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entityType: string | null
  entityId: string | null
  description: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export default function ActivityFeedPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const [businessSlug, setBusinessSlug] = useState("")
  const [activities, setActivities] = useState<Activity[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => setBusinessSlug(p.businessSlug))
  }, [params])

  useEffect(() => {
    if (!businessSlug) return
    loadActivities()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSlug, page, filter])

  const loadActivities = async () => {
    setLoading(true)
    const result = await getBusinessActivities(businessSlug, page, 30, filter || undefined)
    if (result.success && result.data) {
      const d = result.data as { activities: Activity[]; total: number }
      setActivities(d.activities)
      setTotal(d.total)
    }
    setLoading(false)
  }

  const entityTypes = ["Purchase", "Payment", "Customer", "Product", "Staff", "Settings"]

  const getActionIcon = (action: string) => {
    if (action.includes("payment") || action.includes("collect")) return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    )
    if (action.includes("sale") || action.includes("purchase")) return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    )
    if (action.includes("customer")) return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )
    if (action.includes("product") || action.includes("stock")) return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    )
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )
  }

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("remove")) return "text-red-400 bg-red-500/10 border-red-500/20"
    if (action.includes("create") || action.includes("add")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    if (action.includes("update") || action.includes("edit")) return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    if (action.includes("confirm") || action.includes("approve")) return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    return "text-slate-400 bg-slate-500/10 border-slate-500/20"
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

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Activity Feed</h1>
        <p className="text-slate-400">Track all actions and changes across your business</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            !filter ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          All
        </button>
        {entityTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === type ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-1">No activities yet</h3>
            <p className="text-slate-400">Activities will appear here as actions are performed</p>
          </div>
        ) : (
          activities.map((activity, idx) => (
            <div key={activity.id} className="flex gap-4 items-start group">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${getActionColor(activity.action)}`}>
                  {getActionIcon(activity.action)}
                </div>
                {idx < activities.length - 1 && (
                  <div className="w-px h-full min-h-[24px] bg-white/5 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4 hover:bg-white/[0.05] transition-all">
                  <p className="text-sm text-white">{activity.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {activity.userName && (
                      <span className="text-xs text-slate-500">by {activity.userName}</span>
                    )}
                    {activity.entityType && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{activity.entityType}</span>
                    )}
                    <span className="text-xs text-slate-600">{formatDate(activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-50 transition-all border border-white/10"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {Math.ceil(total / 30)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-50 transition-all border border-white/10"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
