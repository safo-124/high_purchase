import { requireBusinessAdmin } from "@/lib/auth"
import { getBusinessDailyReports, getBusinessShops, getBusinessStaff, getBusinessProfile } from "../../actions"
import { BusinessStaffReportsContent } from "./staff-reports-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessStaffReportsPage({ params }: Props) {
  const { businessSlug } = await params
  await requireBusinessAdmin(businessSlug)

  const [reports, shops, allStaff, businessProfile] = await Promise.all([
    getBusinessDailyReports(businessSlug),
    getBusinessShops(businessSlug),
    getBusinessStaff(businessSlug),
    getBusinessProfile(businessSlug),
  ])

  const businessName = businessProfile?.name || businessSlug

  // Extract unique active staff for filters and missing report detection
  const staffMembers = allStaff
    .filter(s => s.isActive)
    .map(s => ({
      id: s.id,
      name: s.userName || "Unknown",
      role: s.role as string,
      shopName: s.shopName,
      shopSlug: s.shopSlug,
    }))

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Staff Daily Reports</h1>
        <p className="text-slate-400">View and review daily reports from all shops</p>
      </div>

      <BusinessStaffReportsContent 
        businessSlug={businessSlug}
        businessName={businessName}
        reports={reports} 
        shops={shops}
        staffMembers={staffMembers}
      />
    </div>
  )
}
