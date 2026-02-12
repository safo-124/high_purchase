import { getRevenueByCategory, getAccountantShops } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    shopId?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AccountantRevenueCategoryPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  await requireAccountant(businessSlug)
  
  const shops = await getAccountantShops(businessSlug)
  
  // Calculate date range - default to last 30 days
  const endDate = searchParamsData.endDate ? new Date(searchParamsData.endDate) : new Date()
  const startDate = searchParamsData.startDate 
    ? new Date(searchParamsData.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  const categories = await getRevenueByCategory(businessSlug, {
    shopId: searchParamsData.shopId,
    startDate,
    endDate,
  })
  
  // Compute summary stats from the array
  const totalRevenue = categories.reduce((sum, c) => sum + c.totalRevenue, 0)
  const totalUnits = categories.reduce((sum, c) => sum + c.itemsSold, 0)

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Revenue by Category</h1>
              <p className="text-slate-400">Sales breakdown by product categories</p>
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Categories</p>
          <p className="text-2xl font-bold text-white">{categories.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Units Sold</p>
          <p className="text-2xl font-bold text-white">{totalUnits.toLocaleString()}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Visual Chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Revenue Distribution</h2>
          <div className="space-y-4">
            {categories.map((category, index) => {
              const percentage = totalRevenue > 0 ? (category.totalRevenue / totalRevenue) * 100 : 0
              return (
                <div key={category.categoryId}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-white font-medium">{category.categoryName}</span>
                    </div>
                    <span className="text-slate-400 text-sm">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: category.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Table View */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Category Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-slate-400 font-medium">Category</th>
                  <th className="text-right p-3 text-slate-400 font-medium">Revenue</th>
                  <th className="text-right p-3 text-slate-400 font-medium">Units</th>
                  <th className="text-right p-3 text-slate-400 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No category data available
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.categoryId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-white">{category.categoryName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-medium">
                        {formatCurrency(category.totalRevenue)}
                      </td>
                      <td className="p-3 text-right text-slate-300">{category.itemsSold}</td>
                      <td className="p-3 text-right">
                        <span className={category.margin >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {category.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profit Analysis */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profit Analysis by Category</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-slate-400 font-medium">Category</th>
                <th className="text-right p-3 text-slate-400 font-medium">Revenue</th>
                <th className="text-right p-3 text-slate-400 font-medium">Cost</th>
                <th className="text-right p-3 text-slate-400 font-medium">Profit</th>
                <th className="text-right p-3 text-slate-400 font-medium">Margin</th>
                <th className="text-right p-3 text-slate-400 font-medium">Purchases</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No data available
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.categoryId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-white">{category.categoryName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-emerald-400 font-medium">
                      {formatCurrency(category.totalRevenue)}
                    </td>
                    <td className="p-3 text-right text-red-400">
                      {formatCurrency(category.totalCost)}
                    </td>
                    <td className="p-3 text-right">
                      <span className={category.profit >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {formatCurrency(category.profit)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={category.margin >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {category.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-300">{category.purchaseCount}</td>
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