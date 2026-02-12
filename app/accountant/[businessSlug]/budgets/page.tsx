import { getBudgets, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { BudgetsContent } from "./budgets-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    period?: string
    category?: string
  }>
}

export default async function AccountantBudgetsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  const budgets = await getBudgets(businessSlug, {
    period: searchParamsData.period as "MONTHLY" | "QUARTERLY" | "YEARLY" | undefined,
    category: searchParamsData.category,
  })

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Budget Management</h1>
              <p className="text-slate-400">Track budget allocations vs actual spending</p>
            </div>
          </div>
        </div>
      </div>

      <BudgetsContent 
        businessSlug={businessSlug}
        budgets={budgets}
        shops={shops}
        permissions={{
          canRecordExpenses: membership.canRecordExpenses ?? true,
          canViewProfitMargins: membership.canViewProfitMargins ?? true,
        }}
      />
    </div>
  )
}
