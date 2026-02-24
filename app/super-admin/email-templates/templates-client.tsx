"use client"

import { useState, useTransition } from "react"
import { saveEmailTemplate, deleteEmailTemplate } from "../comms-actions"

type Template = {
  id: string; name: string; subject: string; htmlContent: string;
  variables: string | null; category: string; isActive: boolean;
  updatedBy: string | null; createdAt: Date; updatedAt: Date
}

export function EmailTemplatesList({ templates }: { templates: Template[] }) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<Template | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: "", subject: "", htmlContent: "", variables: "", category: "general",
  })

  function handleSave() {
    startTransition(async () => {
      await saveEmailTemplate({
        id: editing?.id,
        name: form.name,
        subject: form.subject,
        htmlContent: form.htmlContent,
        variables: form.variables || undefined,
        category: form.category,
      })
      setShowForm(false)
      setEditing(null)
      setForm({ name: "", subject: "", htmlContent: "", variables: "", category: "general" })
    })
  }

  function startEdit(t: Template) {
    setForm({
      name: t.name,
      subject: t.subject,
      htmlContent: t.htmlContent,
      variables: t.variables || "",
      category: t.category,
    })
    setEditing(t)
    setShowForm(true)
  }

  const categoryColors: Record<string, string> = {
    welcome: "bg-green-500/20 text-green-400",
    rejection: "bg-red-500/20 text-red-400",
    reminder: "bg-amber-500/20 text-amber-400",
    reset: "bg-blue-500/20 text-blue-400",
    notification: "bg-purple-500/20 text-purple-400",
    general: "bg-slate-500/20 text-slate-400",
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: "", subject: "", htmlContent: "", variables: "", category: "general" }) }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "+ New Template"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text" placeholder="Template Name (unique)" value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
            />
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="general">General</option>
              <option value="welcome">Welcome</option>
              <option value="rejection">Rejection</option>
              <option value="reminder">Reminder</option>
              <option value="reset">Password Reset</option>
              <option value="notification">Notification</option>
            </select>
          </div>
          <input
            type="text" placeholder="Email Subject" value={form.subject}
            onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
          <textarea
            placeholder="HTML Content (use {{variableName}} for dynamic content)" value={form.htmlContent} rows={10}
            onChange={(e) => setForm(f => ({ ...f, htmlContent: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50"
          />
          <input
            type="text" placeholder='Variables (JSON array, e.g. ["name", "amount"])' value={form.variables}
            onChange={(e) => setForm(f => ({ ...f, variables: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
          <button onClick={handleSave} disabled={isPending || !form.name || !form.subject || !form.htmlContent}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {isPending ? "Saving..." : editing ? "Update Template" : "Create Template"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-medium">{t.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[t.category] || categoryColors.general}`}>
                    {t.category}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-1">Subject: {t.subject}</p>
                <p className="text-xs text-slate-500">
                  Updated {new Date(t.updatedAt).toLocaleDateString()}
                  {t.variables && ` • Variables: ${t.variables}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(t)}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10">
                  Edit
                </button>
                <button onClick={() => { if (confirm("Delete this template?")) startTransition(async () => { await deleteEmailTemplate(t.id) }) }}
                  className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-400">No email templates yet. Create one to get started.</div>
        )}
      </div>
    </div>
  )
}
