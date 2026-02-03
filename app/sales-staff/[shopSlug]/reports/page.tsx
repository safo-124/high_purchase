import { requireSalesStaffForShop } from "@/lib/auth"
import { getMySalesReports, getTodaysSalesReport, getSalesStaffDailyStats } from "../../actions"
import { SalesReportsContent } from "./reports-content"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function SalesStaffReportsPage({ params }: Props) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const today = new Date().toISOString().split("T")[0]
  
  const [todaysReport, myReports, todaysStats] = await Promise.all([
    getTodaysSalesReport(shopSlug),
    getMySalesReports(shopSlug),
    getSalesStaffDailyStats(shopSlug, today),
  ])

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Daily Reports</h1>
        <p className="text-slate-400">Submit your daily sales report and view your history</p>
      </div>

      <SalesReportsContent
        shopSlug={shopSlug}
        todaysReport={todaysReport}
        myReports={myReports}
        todaysStats={todaysStats}
      />
    </div>
  )
}
