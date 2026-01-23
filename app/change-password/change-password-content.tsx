"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { changeFirstTimePassword } from "./actions"
import { Lock, Eye, EyeOff, Shield, AlertTriangle } from "lucide-react"

export function ChangePasswordContent() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    startTransition(async () => {
      const result = await changeFirstTimePassword(form.newPassword)

      if (result.success) {
        toast.success("Password changed successfully!")
        router.push("/business-admin/select-business")
      } else {
        toast.error(result.error || "Failed to change password")
      }
    })
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="glass-card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Change Your Password</h1>
          <p className="text-slate-400 text-sm">
            For security reasons, you must change your password before continuing.
          </p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">First-time login detected</p>
            <p className="text-xs text-amber-400/80 mt-1">
              Please create a new password that only you know. This helps keep your account secure.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => setForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter your new password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 pr-12"
                required
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
                value={form.confirmPassword}
                onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your new password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 pr-12"
                required
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

          {/* Security Tips */}
          <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-300">Tips for a strong password</p>
              <ul className="text-xs text-purple-400/80 mt-1 space-y-1">
                <li>• Use a mix of uppercase and lowercase letters</li>
                <li>• Include numbers and special characters</li>
                <li>• Don&apos;t use personal information</li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Changing Password..." : "Change Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  )
}
