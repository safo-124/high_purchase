import { getAccountantPayments, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { PaymentsContent } from "./payments-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    status?: string
    shopId?: string
    startDate?: string
    endDate?: string
    search?: string
  }>
}

export default async function AccountantPaymentsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)

  const filters = {
    status: searchParamsData.status as "pending" | "confirmed" | "rejected" | "all" | undefined,
    shopId: searchParamsData.shopId,
    startDate: searchParamsData.startDate ? new Date(searchParamsData.startDate) : undefined,
    endDate: searchParamsData.endDate ? new Date(searchParamsData.endDate) : undefined,
    search: searchParamsData.search,
  }

  const payments = await getAccountantPayments(businessSlug, filters)

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Payments</h1>
              <p className="text-slate-400">View and manage all payment records</p>
            </div>
          </div>
        </div>
      </div>

      <PaymentsContent
        payments={payments}
        shops={shops}
        businessSlug={businessSlug}
        canConfirmPayments={membership.canConfirmPayments}
        initialFilters={{
          status: filters.status || "all",
          shopId: filters.shopId || "",
          startDate: searchParamsData.startDate || "",
          endDate: searchParamsData.endDate || "",
          search: filters.search || "",
        }}
      />
    </div>
  )
}
