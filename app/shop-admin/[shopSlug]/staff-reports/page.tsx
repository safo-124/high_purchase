import { requireShopAdminForShop } from "@/lib/auth"
import { getShopDailyReports } from "../../actions"
import { StaffReportsContent } from "./staff-reports-content"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function ShopStaffReportsPage({ params }: Props) {
  const { shopSlug } = await params
  await requireShopAdminForShop(shopSlug)

  const reports = await getShopDailyReports(shopSlug)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Staff Daily Reports</h1>
        <p className="text-slate-400">View and review daily reports from your sales staff and debt collectors</p>
      </div>

      <StaffReportsContent shopSlug={shopSlug} reports={reports} />
    </div>
  )
}
