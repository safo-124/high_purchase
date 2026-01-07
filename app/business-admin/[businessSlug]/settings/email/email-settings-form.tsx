"use client"

import { useState, useTransition } from "react"
import { updateEmailSettings, sendTestEmailAction, type EmailSettingsData } from "../../../email-actions"

interface EmailSettingsFormProps {
  businessSlug: string
  existingSettings: EmailSettingsData | null
}

export function EmailSettingsForm({ businessSlug, existingSettings }: EmailSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [showTestModal, setShowTestModal] = useState(false)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateEmailSettings(businessSlug, formData)
      if (result.success) {
        setMessage({ type: "success", text: "Email settings saved successfully!" })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save settings" })
      }
    })
  }

  async function handleTestEmail() {
    if (!testEmail) return
    
    setIsTesting(true)
    setMessage(null)
    
    try {
      const result = await sendTestEmailAction(businessSlug, testEmail)
      if (result.success) {
        setMessage({ type: "success", text: "Test email sent successfully! Check your inbox." })
        setShowTestModal(false)
        setTestEmail("")
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send test email" })
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <>
      <form action={handleSubmit} className="glass-card p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email Configuration
        </h3>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {message.text}
          </div>
        )}

        {/* Sender Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Sender Information</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fromName" className="block text-sm text-slate-400 mb-2">
                From Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="fromName"
                name="fromName"
                defaultValue={existingSettings?.fromName || ""}
                placeholder="Your Business Name"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
            
            <div>
              <label htmlFor="fromEmail" className="block text-sm text-slate-400 mb-2">
                From Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                id="fromEmail"
                name="fromEmail"
                defaultValue={existingSettings?.fromEmail || ""}
                placeholder="noreply@yourbusiness.com"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="replyToEmail" className="block text-sm text-slate-400 mb-2">
              Reply-To Email <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="email"
              id="replyToEmail"
              name="replyToEmail"
              defaultValue={existingSettings?.replyToEmail || ""}
              placeholder="support@yourbusiness.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            />
          </div>
        </div>

        {/* SMTP Settings */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">SMTP Settings</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="smtpHost" className="block text-sm text-slate-400 mb-2">
                SMTP Host <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="smtpHost"
                name="smtpHost"
                defaultValue={existingSettings?.smtpHost || ""}
                placeholder="smtp.gmail.com"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
            
            <div>
              <label htmlFor="smtpPort" className="block text-sm text-slate-400 mb-2">
                SMTP Port <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="smtpPort"
                name="smtpPort"
                defaultValue={existingSettings?.smtpPort || 587}
                placeholder="587"
                required
                min={1}
                max={65535}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="smtpUser" className="block text-sm text-slate-400 mb-2">
                SMTP Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="smtpUser"
                name="smtpUser"
                defaultValue={existingSettings?.smtpUser || ""}
                placeholder="your-email@gmail.com"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
            
            <div>
              <label htmlFor="smtpPassword" className="block text-sm text-slate-400 mb-2">
                SMTP Password {existingSettings ? "(leave blank to keep current)" : <span className="text-red-400">*</span>}
              </label>
              <input
                type="password"
                id="smtpPassword"
                name="smtpPassword"
                placeholder={existingSettings ? "••••••••" : "Your app password"}
                required={!existingSettings}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="smtpSecure"
                value="true"
                defaultChecked={existingSettings?.smtpSecure || false}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
              />
              <span className="text-sm text-slate-300">Use SSL (port 465)</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isEnabled"
                value="true"
                defaultChecked={existingSettings?.isEnabled ?? true}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
              />
              <span className="text-sm text-slate-300">Enable email sending</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving..." : "Save Settings"}
          </button>
          
          {existingSettings && (
            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
            >
              Send Test Email
            </button>
          )}
        </div>
      </form>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Send Test Email</h3>
            
            <p className="text-slate-400 text-sm mb-4">
              Enter an email address to send a test email and verify your SMTP configuration.
            </p>
            
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all mb-4"
            />
            
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTestEmail}
                disabled={isTesting || !testEmail}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
