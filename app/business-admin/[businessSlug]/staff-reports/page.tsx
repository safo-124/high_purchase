import { requireBusinessAdmin } from "@/lib/auth"
import { getBusinessDailyReports, getBusinessShops } from "../../actions"
import { BusinessStaffReportsContent } from "./staff-reports-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessStaffReportsPage({ params }: Props) {
  const { businessSlug } = await params
  await requireBusinessAdmin(businessSlug)

  const [reports, shops] = await Promise.all([
    getBusinessDailyReports(businessSlug),
    getBusinessShops(businessSlug),
  ])

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Staff Daily Reports</h1>
        <p className="text-slate-400">View and review daily reports from all shops</p>
      </div>

      <BusinessStaffReportsContent 
        businessSlug={businessSlug} 
        reports={reports} 
        shops={shops}
      />
    </div>
  )
}
