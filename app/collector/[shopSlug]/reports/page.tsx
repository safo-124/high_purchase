import { requireCollectorForShop } from "@/lib/auth"
import { getCollectorReportDashboard } from "../../actions"
import { CollectorReportsContent } from "./reports-content"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorReportsPage({ params }: Props) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const dashboard = await getCollectorReportDashboard(shopSlug)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Daily Reports</h1>
        <p className="text-slate-400">
          {dashboard.collectorName} — {dashboard.shopName}
        </p>
      </div>

      <CollectorReportsContent
        shopSlug={shopSlug}
        dashboard={dashboard}
      />
    </div>
  )
}
