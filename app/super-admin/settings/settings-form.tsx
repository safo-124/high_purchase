"use client"

import { useState, useTransition } from "react"
import { saveSystemSetting, initializeDefaultSettings } from "../billing-actions"

export function SettingsForm({ settings }: { settings: Array<{
  id: string; key: string; value: string; type: string; label: string | null; group: string; updatedAt: Date
}> }) {
  const [isPending, startTransition] = useTransition()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map(s => [s.key, s.value]))
  )
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const groups = Array.from(new Set(settings.map(s => s.group)))

  function handleSave(setting: typeof settings[0]) {
    startTransition(async () => {
      await saveSystemSetting({
        key: setting.key,
        value: values[setting.key],
        type: setting.type,
        label: setting.label || undefined,
        group: setting.group,
      })
      setSaved(prev => ({ ...prev, [setting.key]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [setting.key]: false })), 2000)
    })
  }

  function handleInitDefaults() {
    startTransition(async () => {
      await initializeDefaultSettings()
      window.location.reload()
    })
  }

  const groupLabels: Record<string, string> = {
    general: "General",
    maintenance: "Maintenance",
    security: "Security",
    billing: "Billing",
    notifications: "Notifications",
  }

  const groupIcons: Record<string, string> = {
    general: "⚙️",
    maintenance: "🔧",
    security: "🔒",
    billing: "💰",
    notifications: "🔔",
  }

  return (
    <div className="space-y-6">
      {settings.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-400 mb-4">No settings configured yet.</p>
          <button onClick={handleInitDefaults} disabled={isPending} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {isPending ? "Initializing..." : "Initialize Default Settings"}
          </button>
        </div>
      )}

      {groups.map(group => {
        const groupSettings = settings.filter(s => s.group === group)
        return (
          <div key={group} className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <span className="text-xl">{groupIcons[group] || "📋"}</span>
              <h3 className="text-lg font-semibold text-white">{groupLabels[group] || group}</h3>
            </div>
            <div className="p-4 space-y-4">
              {groupSettings.map(setting => (
                <div key={setting.key} className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-300 block mb-1">{setting.label || setting.key}</label>
                    {setting.type === "boolean" ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const newVal = values[setting.key] === "true" ? "false" : "true"
                            setValues(prev => ({ ...prev, [setting.key]: newVal }))
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            values[setting.key] === "true" ? "bg-green-500" : "bg-slate-600"
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            values[setting.key] === "true" ? "translate-x-7" : "translate-x-1"
                          }`} />
                        </button>
                        <span className="text-sm text-slate-400">
                          {values[setting.key] === "true" ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    ) : (
                      <input
                        type={setting.type === "number" ? "number" : "text"}
                        value={values[setting.key] || ""}
                        onChange={(e) => setValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => handleSave(setting)}
                    disabled={isPending}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50 mt-auto"
                  >
                    {saved[setting.key] ? "✓ Saved" : "Save"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {settings.length > 0 && (
        <button onClick={handleInitDefaults} disabled={isPending} className="text-sm text-slate-400 hover:text-white transition-colors">
          Reset to defaults
        </button>
      )}
    </div>
  )
}
