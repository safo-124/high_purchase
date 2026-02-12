import { getRevenueReport, getAccountantShops, getCollectionPerformanceReport } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { ReportsContent } from "./reports-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    shopId?: string
    groupBy?: string
  }>
}

export default async function AccountantReportsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)

  // Default to last 30 days
  const defaultEndDate = new Date()
  const defaultStartDate = new Date()
  defaultStartDate.setDate(defaultStartDate.getDate() - 30)

  const startDate = searchParamsData.startDate 
    ? new Date(searchParamsData.startDate) 
    : defaultStartDate
  const endDate = searchParamsData.endDate 
    ? new Date(searchParamsData.endDate) 
    : defaultEndDate
  const groupBy = (searchParamsData.groupBy as "day" | "week" | "month") || "day"
  const shopId = searchParamsData.shopId

  const [revenueReport, collectionReport] = await Promise.all([
    getRevenueReport(businessSlug, startDate, endDate, groupBy, shopId),
    getCollectionPerformanceReport(businessSlug, startDate, endDate),
  ])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Reports</h1>
              <p className="text-slate-400">Revenue and collection analytics</p>
            </div>
          </div>
        </div>
      </div>

      <ReportsContent
        revenueReport={revenueReport}
        collectionReport={collectionReport}
        shops={shops}
        businessSlug={businessSlug}
        canExportData={membership.canExportData}
        initialFilters={{
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          shopId: shopId || "",
          groupBy,
        }}
      />
    </div>
  )
}
