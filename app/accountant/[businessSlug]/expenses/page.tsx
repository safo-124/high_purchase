import { getAccountantExpenses, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { ExpensesContent } from "./expenses-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    status?: string
    category?: string
    shopId?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AccountantExpensesPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)

  const filters = {
    status: searchParamsData.status as "PENDING" | "APPROVED" | "REJECTED" | undefined,
    category: searchParamsData.category,
    shopId: searchParamsData.shopId,
    startDate: searchParamsData.startDate ? new Date(searchParamsData.startDate) : undefined,
    endDate: searchParamsData.endDate ? new Date(searchParamsData.endDate) : undefined,
  }

  const { expenses } = await getAccountantExpenses(businessSlug, filters)

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Expense Tracking</h1>
              <p className="text-slate-400">Record and manage business expenses</p>
            </div>
          </div>
        </div>
      </div>

      <ExpensesContent 
        businessSlug={businessSlug}
        expenses={expenses}
        shops={shops}
        permissions={{
          canRecordExpenses: membership.canRecordExpenses ?? true,
          canConfirmPayments: membership.canConfirmPayments ?? true,
        }}
      />
    </div>
  )
}
