"use client"

import { useState, useTransition } from "react"
import { saveAdminPermission, deleteAdminPermission } from "../security-actions"

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  dashboard: true, businesses: false, users: false, auditLogs: false,
  messages: false, registrations: false, subscriptions: false, siteContent: false,
  analytics: false, health: false, revenue: false, announcements: false,
  tickets: false, emailTemplates: false, coupons: false, invoices: false,
  loginActivity: false, permissions: false, settings: false, export: false,
}

type Permission = {
  id: string; userId: string; userName: string | null; userEmail: string | null;
  permissions: Record<string, boolean>; grantedBy: string; createdAt: Date; updatedAt: Date
}

type AdminUser = { id: string; name: string | null; email: string }

export function PermissionsList({ permissions, adminUsers }: { permissions: Permission[]; adminUsers: AdminUser[] }) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...DEFAULT_PERMISSIONS })

  const sections = [
    { key: "dashboard", label: "Dashboard" },
    { key: "businesses", label: "Businesses" },
    { key: "users", label: "Users" },
    { key: "auditLogs", label: "Audit Logs" },
    { key: "messages", label: "Messages" },
    { key: "registrations", label: "Registrations" },
    { key: "subscriptions", label: "Subscriptions" },
    { key: "siteContent", label: "Site Content" },
    { key: "analytics", label: "Analytics" },
    { key: "health", label: "Health Monitor" },
    { key: "settings", label: "Settings" },
    { key: "announcements", label: "Announcements" },
    { key: "emailTemplates", label: "Email Templates" },
    { key: "tickets", label: "Support Tickets" },
    { key: "revenue", label: "Revenue" },
    { key: "coupons", label: "Coupons" },
    { key: "invoices", label: "Invoices" },
    { key: "loginActivity", label: "Login Activity" },
    { key: "permissions", label: "Permissions" },
    { key: "export", label: "Data Export" },
  ]

  function handleSave() {
    if (!selectedUserId) return
    startTransition(async () => {
      const result = await saveAdminPermission({ userId: selectedUserId, permissions: perms })
      if (result.success) {
        setShowForm(false)
        setSelectedUserId("")
        setPerms({ ...DEFAULT_PERMISSIONS })
      } else {
        alert(result.error)
      }
    })
  }

  function editPermission(p: Permission) {
    setSelectedUserId(p.userId)
    setPerms(p.permissions)
    setShowForm(true)
  }

  const assignedUserIds = permissions.map(p => p.userId)
  const availableUsers = adminUsers.filter(u => !assignedUserIds.includes(u.id))

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(!showForm); setSelectedUserId(""); setPerms({ ...DEFAULT_PERMISSIONS }) }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90">
          {showForm ? "Cancel" : "+ Assign Permissions"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6 space-y-4">
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
            <option value="">Select Admin User...</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
            ))}
          </select>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sections.map(s => (
              <label key={s.key} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10">
                <input type="checkbox" checked={perms[s.key] || false}
                  onChange={(e) => setPerms(prev => ({ ...prev, [s.key]: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20" />
                <span className="text-sm text-slate-300">{s.label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPerms(Object.fromEntries(sections.map(s => [s.key, true])))}
              className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs">Select All</button>
            <button onClick={() => setPerms({ ...DEFAULT_PERMISSIONS })}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs">Clear All</button>
          </div>

          <button onClick={handleSave} disabled={isPending || !selectedUserId}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium disabled:opacity-50">
            {isPending ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      )}

      {/* Permissions List */}
      <div className="space-y-3">
        {permissions.map(p => {
          const enabledCount = Object.values(p.permissions).filter(Boolean).length
          const totalSections = Object.keys(p.permissions).length
          return (
            <div key={p.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-white font-medium">{p.userName || "Unknown User"}</h4>
                  <p className="text-sm text-slate-400">{p.userEmail}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(p.permissions).filter(([, v]) => v).map(([key]) => (
                      <span key={key} className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                        {key}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {enabledCount} / {totalSections} sections enabled • Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editPermission(p)}
                    className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10">
                    Edit
                  </button>
                  <button onClick={() => { if (confirm("Remove permissions?")) startTransition(async () => { await deleteAdminPermission(p.id) }) }}
                    className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {permissions.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-400">No admin permissions configured. All super admins have full access by default.</div>
        )}
      </div>
    </div>
  )
}
