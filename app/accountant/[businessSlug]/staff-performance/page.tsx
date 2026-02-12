import { getStaffPerformance, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    shopId?: string
    role?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AccountantStaffPerformancePage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  
  // Calculate date range - default to last 30 days
  const endDate = searchParamsData.endDate ? new Date(searchParamsData.endDate) : new Date()
  const startDate = searchParamsData.startDate 
    ? new Date(searchParamsData.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  const staffList = await getStaffPerformance(businessSlug, {
    shopId: searchParamsData.shopId,
    role: searchParamsData.role,
    startDate,
    endDate,
  })

  // Compute summary stats from the array
  const totalStaff = staffList.length
  const totalSales = staffList.reduce((sum, s) => sum + s.salesAmount, 0)
  const totalCollections = staffList.reduce((sum, s) => sum + s.collectionsAmount, 0)
  const avgPerStaff = totalStaff > 0 ? totalSales / totalStaff : 0

  // Sort by total performance (sales + collections)
  const sortedStaff = [...staffList].sort((a, b) => 
    (b.salesAmount + b.collectionsAmount) - (a.salesAmount + a.collectionsAmount)
  )
  const topPerformers = sortedStaff.slice(0, 3)

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
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Staff Performance</h1>
              <p className="text-slate-400">Individual and team performance metrics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-8">
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
            name="role"
            defaultValue={searchParamsData.role || ""}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Roles</option>
            <option value="SHOP_ADMIN">Shop Admin</option>
            <option value="SALES_STAFF">Sales Staff</option>
            <option value="COLLECTOR">Collector</option>
          </select>

          <input
            type="date"
            name="startDate"
            defaultValue={searchParamsData.startDate || startDate.toISOString().split("T")[0]}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <input
            type="date"
            name="endDate"
            defaultValue={searchParamsData.endDate || endDate.toISOString().split("T")[0]}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Staff</p>
          <p className="text-2xl font-bold text-white">{totalStaff}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Sales</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalSales)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Avg Per Staff</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(avgPerStaff)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Collections</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalCollections)}</p>
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {topPerformers.map((staff, index) => (
            <div key={staff.staffId} className={`glass-card p-6 relative overflow-hidden ${
              index === 0 ? "border-2 border-amber-500/30" : ""
            }`}>
              {index === 0 && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                    Top Performer
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  index === 0 ? "bg-gradient-to-br from-amber-500 to-orange-500" :
                  index === 1 ? "bg-gradient-to-br from-slate-400 to-slate-500" :
                  "bg-gradient-to-br from-amber-700 to-amber-800"
                }`}>
                  <span className="text-white font-bold text-lg">
                    {staff.staffName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{staff.staffName}</h3>
                  <p className="text-slate-400 text-sm">{staff.shopName} - {staff.role}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-xs">Sales Amount</p>
                  <p className="text-emerald-400 font-semibold">{formatCurrency(staff.salesAmount)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Sales Count</p>
                  <p className="text-white font-semibold">{staff.salesCount}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Collections</p>
                  <p className="text-emerald-400 font-semibold">{formatCurrency(staff.collectionsAmount)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Commission Earned</p>
                  <p className="text-teal-400 font-semibold">{formatCurrency(staff.commissionEarned)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Performance Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">All Staff Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Rank</th>
                <th className="text-left p-4 text-slate-400 font-medium">Staff Member</th>
                <th className="text-left p-4 text-slate-400 font-medium">Shop</th>
                <th className="text-left p-4 text-slate-400 font-medium">Role</th>
                <th className="text-right p-4 text-slate-400 font-medium">Sales</th>
                <th className="text-right p-4 text-slate-400 font-medium">Collections</th>
                <th className="text-right p-4 text-slate-400 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {sortedStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No staff performance data available
                  </td>
                </tr>
              ) : (
                sortedStaff.map((staff, index) => (
                  <tr key={staff.staffId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                        index === 0 ? "bg-amber-500 text-white" :
                        index === 1 ? "bg-slate-400 text-white" :
                        index === 2 ? "bg-amber-700 text-white" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="p-4 text-white font-medium">{staff.staffName}</td>
                    <td className="p-4 text-slate-300">{staff.shopName}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        staff.role === "SHOP_ADMIN" ? "bg-purple-500/20 text-purple-400" :
                        staff.role === "SALES_STAFF" ? "bg-blue-500/20 text-blue-400" :
                        staff.role === "COLLECTOR" ? "bg-emerald-500/20 text-emerald-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-emerald-400 font-medium">{formatCurrency(staff.salesAmount)}</p>
                      <p className="text-xs text-slate-500">{staff.salesCount} sales</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-emerald-400 font-medium">{formatCurrency(staff.collectionsAmount)}</p>
                      <p className="text-xs text-slate-500">{staff.collectionsCount} collections</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-teal-400 font-medium">{formatCurrency(staff.commissionEarned)}</p>
                      {staff.commissionPending > 0 && (
                        <p className="text-xs text-amber-400">{formatCurrency(staff.commissionPending)} pending</p>
                      )}
                    </td>
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