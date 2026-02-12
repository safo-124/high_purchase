import { getDailyCashSummaries, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { CashSummaryContent } from "./cash-summary-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    shopId?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AccountantCashSummaryPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)

  const filters = {
    shopId: searchParamsData.shopId,
    startDate: searchParamsData.startDate ? new Date(searchParamsData.startDate) : undefined,
    endDate: searchParamsData.endDate ? new Date(searchParamsData.endDate) : undefined,
  }

  const summaries = await getDailyCashSummaries(businessSlug, filters)

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Daily Cash Summary</h1>
              <p className="text-slate-400">End-of-day cash reconciliation reports</p>
            </div>
          </div>
        </div>
      </div>

      <CashSummaryContent 
        businessSlug={businessSlug}
        summaries={summaries}
        shops={shops}
        permissions={{
          canRecordExpenses: membership.canRecordExpenses ?? true,
          canConfirmPayments: membership.canConfirmPayments ?? true,
        }}
      />
    </div>
  )
}
