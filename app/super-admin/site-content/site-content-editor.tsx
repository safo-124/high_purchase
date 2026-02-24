"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateSiteContent, updateSiteContentBatch } from "../platform-actions"

type ContentItem = {
  id: string
  key: string
  value: string
  type: string
  label: string | null
  group: string
  updatedAt: string | Date
}

type Props = {
  initialContent: ContentItem[]
}

const GROUPS = [
  { key: "general", label: "General" },
  { key: "hero", label: "Hero Section" },
  { key: "social", label: "Social Links" },
  { key: "contact", label: "Contact Info" },
  { key: "testimonials", label: "Testimonials" },
]

const DEFAULT_CONTENT: { key: string; label: string; group: string; type: string; defaultValue: string }[] = [
  // Hero
  { key: "hero_badge", label: "Hero Badge Text", group: "hero", type: "text", defaultValue: "Built for Ghanaian Businesses" },
  { key: "hero_title", label: "Hero Title", group: "hero", type: "text", defaultValue: "Manage Hire Purchase The Smart Way" },
  { key: "hero_subtitle", label: "Hero Subtitle", group: "hero", type: "text", defaultValue: "The complete platform to manage hire purchase sales, track payments, handle accounting, and grow your business." },
  // General
  { key: "platform_name", label: "Platform Name", group: "general", type: "text", defaultValue: "High Purchase" },
  { key: "platform_tagline", label: "Tagline", group: "general", type: "text", defaultValue: "The #1 Buy Now, Pay Later platform built specifically for Ghanaian businesses." },
  { key: "cta_text", label: "CTA Button Text", group: "general", type: "text", defaultValue: "Get Started Free" },
  // Social
  { key: "social_twitter", label: "Twitter/X URL", group: "social", type: "text", defaultValue: "https://x.com/highpurchasegh" },
  { key: "social_facebook", label: "Facebook URL", group: "social", type: "text", defaultValue: "https://facebook.com/highpurchasegh" },
  { key: "social_instagram", label: "Instagram URL", group: "social", type: "text", defaultValue: "https://instagram.com/highpurchasegh" },
  { key: "social_whatsapp", label: "WhatsApp URL", group: "social", type: "text", defaultValue: "https://wa.me/233301234567" },
  // Contact
  { key: "contact_email", label: "Contact Email", group: "contact", type: "text", defaultValue: "hello@highpurchase.com" },
  { key: "contact_phone", label: "Contact Phone", group: "contact", type: "text", defaultValue: "+233 30 123 4567" },
  { key: "contact_address", label: "Address", group: "contact", type: "text", defaultValue: "Accra, Ghana" },
]

export function SiteContentEditor({ initialContent }: Props) {
  const router = useRouter()
  const [activeGroup, setActiveGroup] = useState("hero")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [seedingDefaults, setSeedingDefaults] = useState(false)

  // Merge DB content with defaults
  const contentMap: Record<string, string> = {}
  initialContent.forEach(c => { contentMap[c.key] = c.value })

  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    DEFAULT_CONTENT.forEach(d => {
      map[d.key] = contentMap[d.key] ?? d.defaultValue
    })
    // Also include any DB items not in defaults
    initialContent.forEach(c => {
      if (!map[c.key]) map[c.key] = c.value
    })
    return map
  })

  const handleChange = (key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = Object.entries(edits).map(([key, value]) => {
        const def = DEFAULT_CONTENT.find(d => d.key === key)
        return { key, value, type: def?.type, label: def?.label, group: def?.group }
      })
      await updateSiteContentBatch(items)
      setSaved(true)
      router.refresh()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleSeedDefaults = async () => {
    setSeedingDefaults(true)
    try {
      const items = DEFAULT_CONTENT.map(d => ({
        key: d.key,
        value: d.defaultValue,
        type: d.type,
        label: d.label,
        group: d.group,
      }))
      await updateSiteContentBatch(items)
      setEdits(() => {
        const map: Record<string, string> = {}
        DEFAULT_CONTENT.forEach(d => { map[d.key] = d.defaultValue })
        return map
      })
      router.refresh()
    } catch {
      // silent
    } finally {
      setSeedingDefaults(false)
    }
  }

  const groupItems = DEFAULT_CONTENT.filter(d => d.group === activeGroup)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Site Content</h2>
          <p className="text-sm text-slate-400 mt-1">Manage landing page text, links, and contact information.</p>
        </div>
        <div className="flex gap-3">
          {initialContent.length === 0 && (
            <button onClick={handleSeedDefaults} disabled={seedingDefaults}
              className="px-4 py-2 text-sm font-medium text-slate-300 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all disabled:opacity-50">
              {seedingDefaults ? "Seeding..." : "Seed Defaults"}
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50">
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save All Changes"}
          </button>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex flex-wrap gap-2">
        {GROUPS.map(g => (
          <button key={g.key} onClick={() => setActiveGroup(g.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeGroup === g.key
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "text-slate-400 hover:text-white border border-white/10 hover:border-white/20"
            }`}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="space-y-6">
          {groupItems.length === 0 ? (
            <p className="text-sm text-slate-500">No content items in this group yet.</p>
          ) : (
            groupItems.map(item => (
              <div key={item.key}>
                <label className="block text-sm text-slate-400 mb-2">
                  {item.label}
                  <span className="text-xs text-slate-600 ml-2">({item.key})</span>
                </label>
                {item.type === "text" && item.defaultValue.length > 100 ? (
                  <textarea
                    value={edits[item.key] || ""}
                    onChange={e => handleChange(item.key, e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/30 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={edits[item.key] || ""}
                    onChange={e => handleChange(item.key, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/30"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Extra DB items not in defaults */}
      {initialContent.filter(c => !DEFAULT_CONTENT.find(d => d.key === c.key)).length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Other Content Items</h3>
          <div className="space-y-4">
            {initialContent
              .filter(c => !DEFAULT_CONTENT.find(d => d.key === c.key))
              .map(c => (
                <div key={c.key}>
                  <label className="block text-sm text-slate-400 mb-2">
                    {c.label || c.key}
                    <span className="text-xs text-slate-600 ml-2">({c.group})</span>
                  </label>
                  <input
                    type="text"
                    value={edits[c.key] || ""}
                    onChange={e => handleChange(c.key, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/30"
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
