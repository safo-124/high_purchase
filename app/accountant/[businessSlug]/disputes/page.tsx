import { getPaymentDisputes, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { DisputesContent } from "./disputes-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    status?: string
    type?: string
  }>
}

export default async function AccountantDisputesPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  const disputes = await getPaymentDisputes(businessSlug, {
    status: searchParamsData.status as "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED" | undefined,
    type: searchParamsData.type,
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Payment Disputes</h1>
              <p className="text-slate-400">Handle payment discrepancies and customer complaints</p>
            </div>
          </div>
        </div>
      </div>

      <DisputesContent 
        businessSlug={businessSlug}
        disputes={disputes}
        shops={shops}
        permissions={{
          canConfirmPayments: membership.canConfirmPayments ?? false,
          canRecordExpenses: membership.canRecordExpenses ?? false,
        }}
      />
    </div>
  )
}
