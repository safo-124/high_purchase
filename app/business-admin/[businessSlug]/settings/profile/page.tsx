import { getBusinessProfile } from "../../../actions"
import { BusinessProfileForm } from "./business-profile-form"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessProfilePage({ params }: Props) {
  const { businessSlug } = await params
  const profile = await getBusinessProfile(businessSlug)

  if (!profile) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <p className="text-slate-400">Business not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Business Profile</h1>
        <p className="text-slate-400">Customize your business name, logo, and contact information</p>
      </div>

      <div className="max-w-4xl">
        <BusinessProfileForm profile={profile} businessSlug={businessSlug} />
      </div>
    </div>
  )
}
