import { requireCollectorForShop } from "@/lib/auth"
import { getCollectorDashboardV2 } from "../../actions"
import { CollectorDashboardContent } from "./dashboard-content"

interface CollectorDashboardPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorDashboardPage({ params }: CollectorDashboardPageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const dashboard = await getCollectorDashboardV2(shopSlug)

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-5xl xl:max-w-6xl mx-auto">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-0.5 sm:mb-1">Dashboard</h1>
        <p className="text-xs sm:text-sm lg:text-base text-slate-400">Welcome back, {dashboard.collectorName}</p>
      </div>

      <CollectorDashboardContent
        shopSlug={shopSlug}
        dashboard={dashboard}
      />
    </div>
  )
}
