import { requireBusinessAdmin } from "@/lib/auth"
import { AccountSettingsContent } from "./account-settings-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function AccountSettingsPage({ params }: Props) {
  const { businessSlug } = await params
  const { user } = await requireBusinessAdmin(businessSlug)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
        <p className="text-slate-400">Manage your email and password</p>
      </div>

      <AccountSettingsContent 
        businessSlug={businessSlug} 
        currentEmail={user.email} 
        userName={user.name || ""}
      />
    </div>
  )
}
