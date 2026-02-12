import { getCustomersForAccountant, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { CustomersContent } from "./customers-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    shopId?: string
    status?: string
    search?: string
  }>
}

export default async function AccountantCustomersPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  const { membership } = await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  const customers = await getCustomersForAccountant(businessSlug, {
    shopId: searchParamsData.shopId,
    status: searchParamsData.status as "all" | "active" | "overdue" | "completed" | undefined,
    search: searchParamsData.search,
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Customers</h1>
              <p className="text-slate-400">Customer financial status overview</p>
            </div>
          </div>
        </div>
      </div>

      <CustomersContent
        customers={customers}
        shops={shops}
        businessSlug={businessSlug}
        canExportData={membership.canExportData}
        initialFilters={{
          shopId: searchParamsData.shopId || "",
          status: searchParamsData.status || "all",
          search: searchParamsData.search || "",
        }}
      />
    </div>
  )
}
