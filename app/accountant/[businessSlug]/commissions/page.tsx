import { getCommissions, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { CommissionsContent } from "./commissions-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    status?: string
    shopId?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AccountantCommissionsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  const { commissions } = await getCommissions(businessSlug, {
    status: searchParamsData.status as "PENDING" | "APPROVED" | "PAID" | undefined,
    shopId: searchParamsData.shopId,
    startDate: searchParamsData.startDate ? new Date(searchParamsData.startDate) : undefined,
    endDate: searchParamsData.endDate ? new Date(searchParamsData.endDate) : undefined,
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Staff Commissions</h1>
              <p className="text-slate-400">Calculate and track staff commission payouts</p>
            </div>
          </div>
        </div>
      </div>

      <CommissionsContent 
        businessSlug={businessSlug}
        commissions={commissions}
        shops={shops}
        permissions={{
          canApproveCommissions: membership.canConfirmPayments ?? true,
          canPayCommissions: membership.canConfirmPayments ?? true,
        }}
      />
    </div>
  )
}
