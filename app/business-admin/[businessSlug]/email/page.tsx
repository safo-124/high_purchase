import { requireBusinessAdmin } from "../../../../lib/auth"
import { getEmailSettings, getEmailLogs, getCustomersForEmail } from "../../email-actions"
import { BulkEmailForm } from "./bulk-email-form"
import { EmailLogsList } from "./email-logs-list"
import Link from "next/link"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessEmailPage({ params }: Props) {
  const { businessSlug } = await params
  await requireBusinessAdmin(businessSlug)

  const [emailSettings, { logs, total }, { customers, shops }] = await Promise.all([
    getEmailSettings(businessSlug),
    getEmailLogs(businessSlug, 1, 10),
    getCustomersForEmail(businessSlug),
  ])

  // Check if email is configured
  if (!emailSettings) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Send Emails</h1>
          <p className="text-slate-400">Send bulk emails to your customers</p>
        </div>

        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Email Not Configured</h3>
          <p className="text-slate-400 text-sm mb-6">
            You need to configure your email settings before you can send emails.
          </p>
          <Link
            href={`/business-admin/${businessSlug}/settings/email`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Email Settings
          </Link>
        </div>
      </div>
    )
  }

  // Email not verified warning
  const showVerificationWarning = !emailSettings.isVerified

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Send Emails</h1>
          <p className="text-slate-400">Send bulk emails to your customers</p>
        </div>
        <Link
          href={`/business-admin/${businessSlug}/settings/email`}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Email Settings
        </Link>
      </div>

      {/* Verification Warning */}
      {showVerificationWarning && (
        <div className="mb-6 p-4 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-orange-300 font-medium">Email not verified</p>
            <p className="text-orange-400/80 text-sm">
              Send a test email from the{" "}
              <Link href={`/business-admin/${businessSlug}/settings/email`} className="underline hover:text-orange-300">
                settings page
              </Link>{" "}
              to verify your configuration before sending bulk emails.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Email Form */}
        <div className="lg:col-span-2">
          <BulkEmailForm
            businessSlug={businessSlug}
            fromEmail={emailSettings.fromEmail}
            fromName={emailSettings.fromName}
            customers={customers}
            shops={shops}
            isEnabled={emailSettings.isEnabled}
          />
        </div>

        {/* Stats & Recent Logs */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Quick Stats
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Customers with Email</span>
                <span className="text-sm font-bold text-white">{customers.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Shops</span>
                <span className="text-sm font-bold text-white">{shops.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Emails Sent</span>
                <span className="text-sm font-bold text-white">{total}</span>
              </div>
            </div>
          </div>

          {/* Recent Email Logs */}
          <EmailLogsList logs={logs} businessSlug={businessSlug} />
        </div>
      </div>
    </div>
  )
}
