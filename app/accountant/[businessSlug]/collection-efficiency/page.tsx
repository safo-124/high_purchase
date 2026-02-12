import { getCollectionEfficiency, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    shopId?: string
    period?: string
  }>
}

export default async function AccountantCollectionEfficiencyPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  
  // Calculate date range based on period
  const period = parseInt(searchParamsData.period || "30")
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - period * 24 * 60 * 60 * 1000)
  
  const collectors = await getCollectionEfficiency(businessSlug, {
    shopId: searchParamsData.shopId,
    startDate,
    endDate,
  })
  
  // Calculate aggregate stats from collectors
  const totalCollected = collectors.reduce((sum, c) => sum + c.totalCollected, 0)
  const totalAssigned = collectors.reduce((sum, c) => sum + c.totalAssigned, 0)
  const collectionRate = totalAssigned > 0 ? (totalCollected / totalAssigned) * 100 : 0
  const totalPayments = collectors.reduce((sum, c) => sum + c.paymentsCount, 0)
  const onTimePayments = collectors.reduce((sum, c) => sum + c.onTimePayments, 0)
  const onTimeRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-linear-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Collection Efficiency</h1>
              <p className="text-slate-400">Track payment collection performance by collector</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <form className="flex flex-wrap items-center gap-4">
            <select
              name="shopId"
              defaultValue={searchParamsData.shopId || ""}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">All Shops</option>
              {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>

            <select
              name="period"
              defaultValue={searchParamsData.period || "30"}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors"
            >
              Apply Filters
            </button>
          </form>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Collection Rate</p>
          <p className={`text-2xl font-bold ${
            collectionRate >= 80 ? "text-emerald-400" :
            collectionRate >= 60 ? "text-amber-400" : "text-red-400"
          }`}>
            {collectionRate.toFixed(1)}%
          </p>
          <p className="text-slate-500 text-xs mt-1">Collected vs assigned</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalCollected)}</p>
          <p className="text-slate-500 text-xs mt-1">In selected period</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Outstanding</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalAssigned)}</p>
          <p className="text-slate-500 text-xs mt-1">Assigned to collectors</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">On-Time Rate</p>
          <p className={`text-2xl font-bold ${
            onTimeRate >= 70 ? "text-emerald-400" : "text-amber-400"
          }`}>
            {onTimeRate.toFixed(1)}%
          </p>
          <p className="text-slate-500 text-xs mt-1">Paid on or before due</p>
        </div>
      </div>

      {/* Collector Performance Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Collector Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Collector</th>
                <th className="text-left p-4 text-slate-400 font-medium">Shop</th>
                <th className="text-center p-4 text-slate-400 font-medium">Customers</th>
                <th className="text-right p-4 text-slate-400 font-medium">Assigned</th>
                <th className="text-right p-4 text-slate-400 font-medium">Collected</th>
                <th className="text-center p-4 text-slate-400 font-medium">Rate</th>
                <th className="text-center p-4 text-slate-400 font-medium">Payments</th>
              </tr>
            </thead>
            <tbody>
              {collectors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No collectors found
                  </td>
                </tr>
              ) : (
                collectors.map((collector) => (
                  <tr key={collector.collectorId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{collector.collectorName}</td>
                    <td className="p-4 text-slate-300">{collector.shopName}</td>
                    <td className="p-4 text-center text-white">
                      {collector.assignedCustomers}
                      {collector.overdueCustomers > 0 && (
                        <span className="text-red-400 text-xs ml-1">({collector.overdueCustomers} overdue)</span>
                      )}
                    </td>
                    <td className="p-4 text-right text-slate-300">{formatCurrency(collector.totalAssigned)}</td>
                    <td className="p-4 text-right text-emerald-400 font-medium">{formatCurrency(collector.totalCollected)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        collector.collectionRate >= 80 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : collector.collectionRate >= 60
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {collector.collectionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-center text-white">{collector.paymentsCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
