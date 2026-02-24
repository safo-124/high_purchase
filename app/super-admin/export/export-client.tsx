"use client"

import { useState, useTransition } from "react"
import { exportData } from "../security-actions"

const ENTITIES = [
  { key: "users", label: "Users", description: "All platform users with roles and contact info", icon: "👥" },
  { key: "businesses", label: "Businesses", description: "All businesses with shop counts and status", icon: "🏢" },
  { key: "subscriptions", label: "Subscriptions", description: "All subscription plans and their status", icon: "📋" },
  { key: "payments", label: "Payments", description: "Subscription payment history", icon: "💳" },
  { key: "login-activity", label: "Login Activity", description: "Login attempts and security events", icon: "🔐" },
  { key: "tickets", label: "Support Tickets", description: "All support tickets and their status", icon: "🎫" },
  { key: "coupons", label: "Coupons", description: "All discount coupons and usage data", icon: "🏷️" },
]

export function ExportPanel() {
  const [isPending, startTransition] = useTransition()
  const [format, setFormat] = useState<"csv" | "json">("csv")
  const [lastExport, setLastExport] = useState<string | null>(null)

  function handleExport(entity: string) {
    startTransition(async () => {
      const result = await exportData(entity, format)
      if (result.success && result.content) {
        // Trigger download
        const blob = new Blob([result.content], {
          type: format === "csv" ? "text/csv" : "application/json",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.filename || `${entity}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setLastExport(entity)
        setTimeout(() => setLastExport(null), 3000)
      }
    })
  }

  return (
    <div>
      {/* Format Selector */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-slate-400">Export format:</span>
        <div className="flex gap-2">
          <button onClick={() => setFormat("csv")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              format === "csv" ? "bg-purple-500/30 text-purple-300 border border-purple-500/40" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}>
            CSV
          </button>
          <button onClick={() => setFormat("json")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              format === "json" ? "bg-purple-500/30 text-purple-300 border border-purple-500/40" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}>
            JSON
          </button>
        </div>
      </div>

      {/* Entity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ENTITIES.map(entity => (
          <div key={entity.key} className="glass-card p-5 hover:bg-white/5 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{entity.icon}</span>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">{entity.label}</h4>
                <p className="text-xs text-slate-400 mb-3">{entity.description}</p>
                <button
                  onClick={() => handleExport(entity.key)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium hover:from-purple-500/30 hover:to-blue-500/30 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Exporting..." : lastExport === entity.key ? "✓ Downloaded!" : `Export ${format.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
