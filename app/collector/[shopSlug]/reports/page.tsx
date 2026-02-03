import { requireCollectorForShop } from "@/lib/auth"
import { getMyCollectorReports, getTodaysCollectorReport, getCollectorDailyStats } from "../../actions"
import { CollectorReportsContent } from "./reports-content"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorReportsPage({ params }: Props) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const today = new Date().toISOString().split("T")[0]
  
  const [todaysReport, myReports, todaysStats] = await Promise.all([
    getTodaysCollectorReport(shopSlug),
    getMyCollectorReports(shopSlug),
    getCollectorDailyStats(shopSlug, today),
  ])

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Daily Reports</h1>
        <p className="text-slate-400">Submit your daily collection report and view your history</p>
      </div>

      <CollectorReportsContent
        shopSlug={shopSlug}
        todaysReport={todaysReport}
        myReports={myReports}
        todaysStats={todaysStats}
      />
    </div>
  )
}
