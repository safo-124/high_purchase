import { requireBusinessAdmin } from "../../../../../lib/auth"
import { getEmailSettings } from "../../../email-actions"
import { EmailSettingsForm } from "./email-settings-form"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function EmailSettingsPage({ params }: Props) {
  const { businessSlug } = await params
  await requireBusinessAdmin(businessSlug)

  const emailSettings = await getEmailSettings(businessSlug)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Email Settings</h1>
        <p className="text-slate-400">Configure SMTP settings for sending emails from your business</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Configuration Form */}
        <div className="lg:col-span-2">
          <EmailSettingsForm 
            businessSlug={businessSlug} 
            existingSettings={emailSettings} 
          />
        </div>

        {/* Help Section */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Configuration</span>
                <span className={`text-sm font-medium ${emailSettings ? "text-green-400" : "text-orange-400"}`}>
                  {emailSettings ? "Configured" : "Not Set"}
                </span>
              </div>
              
              {emailSettings && (
                <>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm text-slate-400">Verified</span>
                    <span className={`text-sm font-medium ${emailSettings.isVerified ? "text-green-400" : "text-orange-400"}`}>
                      {emailSettings.isVerified ? "Yes" : "Not Tested"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm text-slate-400">Sending</span>
                    <span className={`text-sm font-medium ${emailSettings.isEnabled ? "text-green-400" : "text-slate-500"}`}>
                      {emailSettings.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Help Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              SMTP Help
            </h3>
            
            <div className="space-y-4 text-sm text-slate-400">
              <p>
                Configure your SMTP settings to send emails from your business. Common providers:
              </p>
              
              <div className="space-y-2">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-white font-medium mb-1">Gmail</p>
                  <p className="text-xs">Host: smtp.gmail.com</p>
                  <p className="text-xs">Port: 587 (TLS) or 465 (SSL)</p>
                </div>
                
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-white font-medium mb-1">Outlook/Office 365</p>
                  <p className="text-xs">Host: smtp.office365.com</p>
                  <p className="text-xs">Port: 587 (TLS)</p>
                </div>
                
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-white font-medium mb-1">SendGrid</p>
                  <p className="text-xs">Host: smtp.sendgrid.net</p>
                  <p className="text-xs">Port: 587 (TLS)</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500">
                Note: For Gmail, you may need to use an App Password instead of your regular password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
