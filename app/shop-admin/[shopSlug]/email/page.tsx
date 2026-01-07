import { requireShopAdminForShop } from "../../../../lib/auth"
import { getShopEmailSettings, getShopEmailLogs, getShopCustomersForEmail } from "../../email-actions"
import { ShopBulkEmailForm } from "./shop-bulk-email-form"
import { ShopEmailLogsList } from "./shop-email-logs-list"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function ShopEmailPage({ params }: Props) {
  const { shopSlug } = await params
  await requireShopAdminForShop(shopSlug)

  const [emailSettings, { logs, total }, customers] = await Promise.all([
    getShopEmailSettings(shopSlug),
    getShopEmailLogs(shopSlug, 1, 10),
    getShopCustomersForEmail(shopSlug),
  ])

  // Check if email is configured at business level
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
          <p className="text-slate-400 text-sm mb-4">
            Email settings have not been configured by the business admin.
          </p>
          <p className="text-slate-500 text-sm">
            Please contact your business administrator to set up email settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Send Emails</h1>
        <p className="text-slate-400">Send bulk emails to your customers</p>
      </div>

      {/* Warning if not verified */}
      {!emailSettings.isVerified && (
        <div className="mb-6 p-4 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-orange-300 font-medium">Email not verified</p>
            <p className="text-orange-400/80 text-sm">
              The email configuration has not been verified yet. Contact your business admin to verify the settings.
            </p>
          </div>
        </div>
      )}

      {/* Disabled warning */}
      {!emailSettings.isEnabled && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div>
            <p className="text-red-300 font-medium">Email sending disabled</p>
            <p className="text-red-400/80 text-sm">
              Email sending has been disabled by the business admin.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Email Form */}
        <div className="lg:col-span-2">
          <ShopBulkEmailForm
            shopSlug={shopSlug}
            fromEmail={emailSettings.fromEmail}
            fromName={emailSettings.fromName}
            customers={customers}
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
                <span className="text-sm text-slate-400">Emails Sent</span>
                <span className="text-sm font-bold text-white">{total}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Sending Status</span>
                <span className={`text-sm font-medium ${emailSettings.isEnabled ? "text-green-400" : "text-red-400"}`}>
                  {emailSettings.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Email Logs */}
          <ShopEmailLogsList logs={logs} />
        </div>
      </div>
    </div>
  )
}
