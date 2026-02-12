import { getRefunds, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { RefundsContent } from "./refunds-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    status?: string
    reason?: string
  }>
}

export default async function AccountantRefundsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  const refunds = await getRefunds(businessSlug, {
    status: searchParamsData.status as "PENDING" | "APPROVED" | "PROCESSED" | "REJECTED" | undefined,
    reason: searchParamsData.reason,
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Refund Management</h1>
              <p className="text-slate-400">Process and track customer refunds</p>
            </div>
          </div>
        </div>
      </div>

      <RefundsContent 
        businessSlug={businessSlug}
        refunds={refunds}
        shops={shops}
        permissions={{
          canConfirmPayments: membership.canConfirmPayments ?? true,
          canExportData: membership.canExportData ?? true,
        }}
      />
    </div>
  )
}
