import { getProfitLossStatement } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    period?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AccountantFinancialStatementsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  await requireAccountant(businessSlug)
  
  // Calculate date range based on period or custom dates
  const now = new Date()
  let startDate: Date
  let endDate: Date = now

  const period = searchParamsData.period || "month"
  
  if (searchParamsData.startDate && searchParamsData.endDate) {
    startDate = new Date(searchParamsData.startDate)
    endDate = new Date(searchParamsData.endDate)
  } else {
    switch (period) {
      case "week":
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case "quarter":
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 3)
        break
      case "year":
        startDate = new Date(now)
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }
  }
  
  const plData = await getProfitLossStatement(businessSlug, startDate, endDate)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate margins
  const grossMargin = plData.revenue.total > 0 
    ? (plData.grossProfit / plData.revenue.total) * 100 
    : 0
  const netMargin = plData.revenue.total > 0 
    ? (plData.netProfit / plData.revenue.total) * 100 
    : 0

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Financial Statements</h1>
              <p className="text-slate-400">Profit & Loss Statement and Financial Summary</p>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="glass-card p-4 mb-8">
        <form className="flex flex-wrap items-center gap-4">
          <select
            name="period"
            defaultValue={searchParamsData.period || "month"}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          <input
            type="date"
            name="startDate"
            defaultValue={searchParamsData.startDate || ""}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <input
            type="date"
            name="endDate"
            defaultValue={searchParamsData.endDate || ""}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors"
          >
            Generate
          </button>
        </form>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(plData.revenue.total)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Cost of Goods Sold</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(plData.costOfGoods)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Gross Profit</p>
          <p className={`text-2xl font-bold ${plData.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(plData.grossProfit)}
          </p>
          <p className="text-slate-500 text-xs mt-1">{grossMargin.toFixed(1)}% margin</p>
        </div>
        <div className="glass-card p-4 border-2 border-emerald-500/30">
          <p className="text-slate-400 text-sm">Net Profit</p>
          <p className={`text-2xl font-bold ${plData.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(plData.netProfit)}
          </p>
          <p className="text-slate-500 text-xs mt-1">{netMargin.toFixed(1)}% margin</p>
        </div>
      </div>

      {/* P&L Statement */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-6">Profit & Loss Statement</h2>
        <p className="text-slate-400 text-sm mb-4">
          Period: {new Date(plData.period.start).toLocaleDateString()} - {new Date(plData.period.end).toLocaleDateString()}
        </p>
        
        <div className="space-y-1">
          {/* Revenue Section */}
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <h3 className="text-emerald-400 font-semibold mb-3">REVENUE</h3>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between">
                <span className="text-slate-300">Sales Revenue</span>
                <span className="text-white">{formatCurrency(plData.revenue.sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Interest Income</span>
                <span className="text-white">{formatCurrency(plData.revenue.interest)}</span>
              </div>
              {plData.revenue.other > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-300">Other Revenue</span>
                  <span className="text-white">{formatCurrency(plData.revenue.other)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-emerald-500/20 font-semibold">
                <span className="text-emerald-400">Total Revenue</span>
                <span className="text-emerald-400">{formatCurrency(plData.revenue.total)}</span>
              </div>
            </div>
          </div>

          {/* COGS Section */}
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <h3 className="text-amber-400 font-semibold mb-3">COST OF GOODS SOLD</h3>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between pt-2 border-t border-amber-500/20 font-semibold">
                <span className="text-amber-400">Total COGS</span>
                <span className="text-amber-400">({formatCurrency(plData.costOfGoods)})</span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="p-4 rounded-lg bg-slate-700/50">
            <div className="flex justify-between font-bold text-lg">
              <span className="text-white">GROSS PROFIT</span>
              <span className={plData.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                {formatCurrency(plData.grossProfit)}
              </span>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <h3 className="text-red-400 font-semibold mb-3">OPERATING EXPENSES</h3>
            <div className="space-y-2 ml-4">
              {plData.expenses.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-slate-300">{item.category}</span>
                  <span className="text-white">({formatCurrency(item.amount)})</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-red-500/20 font-semibold">
                <span className="text-red-400">Total Operating Expenses</span>
                <span className="text-red-400">({formatCurrency(plData.totalExpenses)})</span>
              </div>
            </div>
          </div>

          {/* Operating Profit */}
          <div className="p-4 rounded-lg bg-slate-700/50">
            <div className="flex justify-between font-bold text-lg">
              <span className="text-white">OPERATING PROFIT</span>
              <span className={plData.operatingProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                {formatCurrency(plData.operatingProfit)}
              </span>
            </div>
          </div>

          {/* Taxes */}
          {plData.taxes > 0 && (
            <div className="p-4 rounded-lg bg-slate-700/30">
              <div className="flex justify-between">
                <span className="text-slate-300">Estimated Taxes</span>
                <span className="text-white">({formatCurrency(plData.taxes)})</span>
              </div>
            </div>
          )}

          {/* Net Profit */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/30">
            <div className="flex justify-between font-bold text-xl">
              <span className="text-white">NET PROFIT</span>
              <span className={plData.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                {formatCurrency(plData.netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
