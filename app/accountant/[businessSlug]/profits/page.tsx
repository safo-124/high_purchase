import { requireAccountant } from "../../../../lib/auth"
import { getProfitMarginReport } from "../../actions"
import { ProfitsContent } from "./profits-content"

export default async function ProfitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{ shopId?: string; from?: string; to?: string }>
}) {
  const { businessSlug } = await params
  const filters = await searchParams
  const { membership } = await requireAccountant(businessSlug)

  if (!membership.canViewProfitMargins) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">You don&apos;t have permission to view profit margins.</p>
        </div>
      </div>
    )
  }

  const { data, shops } = await getProfitMarginReport(businessSlug, {
    shopId: filters.shopId,
    from: filters.from,
    to: filters.to,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Profit Analysis</h1>
        <p className="text-slate-400">Revenue, costs, and profit margins by shop</p>
      </div>

      <ProfitsContent
        data={data}
        shops={shops}
        businessSlug={businessSlug}
        initialFilters={{
          shopId: filters.shopId || "",
          from: filters.from || "",
          to: filters.to || "",
        }}
      />
    </div>
  )
}
