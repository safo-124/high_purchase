"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { changeBusinessAdminEmail, changeBusinessAdminPassword } from "@/app/business-admin/actions"
import { Mail, Lock, Eye, EyeOff, Shield, AlertTriangle } from "lucide-react"

interface AccountSettingsContentProps {
  businessSlug: string
  currentEmail: string
  userName: string
}

export function AccountSettingsContent({ businessSlug, currentEmail, userName }: AccountSettingsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Email change form
  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    confirmEmail: "",
    currentPassword: "",
  })
  const [showEmailPassword, setShowEmailPassword] = useState(false)

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailForm.newEmail.trim()) {
      toast.error("Please enter a new email address")
      return
    }

    if (emailForm.newEmail !== emailForm.confirmEmail) {
      toast.error("Email addresses do not match")
      return
    }

    if (!emailForm.currentPassword) {
      toast.error("Please enter your current password to confirm")
      return
    }

    startTransition(async () => {
      const result = await changeBusinessAdminEmail(
        businessSlug,
        emailForm.newEmail,
        emailForm.currentPassword
      )

      if (result.success) {
        toast.success("Email changed successfully")
        setEmailForm({ newEmail: "", confirmEmail: "", currentPassword: "" })
        router.refresh()
      } else {
        toast.error(result.error || "Failed to change email")
      }
    })
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordForm.currentPassword) {
      toast.error("Please enter your current password")
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    startTransition(async () => {
      const result = await changeBusinessAdminPassword(
        businessSlug,
        passwordForm.currentPassword,
        passwordForm.newPassword
      )

      if (result.success) {
        toast.success("Password changed successfully")
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        toast.error(result.error || "Failed to change password")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Current Account Info */}
      <div className="lg:col-span-2">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Current Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Name</label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                {userName || "—"}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Current Email</label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                {currentEmail}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Email */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Mail className="w-5 h-5 text-orange-400" />
          Change Email Address
        </h3>

        <form onSubmit={handleEmailChange} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Email Address</label>
            <input
              type="email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
              placeholder="newemail@example.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Confirm New Email</label>
            <input
              type="email"
              value={emailForm.confirmEmail}
              onChange={(e) => setEmailForm(prev => ({ ...prev, confirmEmail: e.target.value }))}
              placeholder="newemail@example.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showEmailPassword ? "text" : "password"}
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowEmailPassword(!showEmailPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showEmailPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300">
              Changing your email will update your login credentials. Make sure you have access to the new email address.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Updating..." : "Change Email"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-400" />
          Change Password
        </h3>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-300">
              Choose a strong password with a mix of letters, numbers, and special characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Security Tips */}
      <div className="lg:col-span-2">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Security Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-green-400" />
              </div>
              <h4 className="text-white font-medium mb-1">Use Strong Passwords</h4>
              <p className="text-xs text-slate-400">
                Combine uppercase, lowercase, numbers, and symbols for maximum security.
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-medium mb-1">Verify Your Email</h4>
              <p className="text-xs text-slate-400">
                Ensure your email is correct for password recovery and notifications.
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-white font-medium mb-1">Regular Updates</h4>
              <p className="text-xs text-slate-400">
                Change your password periodically to maintain account security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
