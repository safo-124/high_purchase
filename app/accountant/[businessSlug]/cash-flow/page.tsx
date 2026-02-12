import { getCashFlowProjections } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function AccountantCashFlowPage({ params }: Props) {
  const { businessSlug } = await params
  await requireAccountant(businessSlug)
  
  const cashFlow = await getCashFlowProjections(businessSlug)
  const { projections, summary } = cashFlow
  
  // Calculate net cash flow
  const netCashFlow = summary.totalExpectedInflow - summary.totalExpectedOutflow
  
  // Group projections into weeks
  const weeklyData: { week: number; startDate: string; endDate: string; expectedInflow: number; expectedOutflow: number; daysWithPayments: number }[] = []
  for (let i = 0; i < projections.length; i += 7) {
    const weekProjections = projections.slice(i, Math.min(i + 7, projections.length))
    if (weekProjections.length > 0) {
      weeklyData.push({
        week: Math.floor(i / 7) + 1,
        startDate: weekProjections[0].date,
        endDate: weekProjections[weekProjections.length - 1].date,
        expectedInflow: weekProjections.reduce((sum, p) => sum + p.expectedInflow, 0),
        expectedOutflow: weekProjections.reduce((sum, p) => sum + p.expectedOutflow, 0),
        daysWithPayments: weekProjections.filter(p => p.expectedInflow > 0).length,
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-KE", { month: "short", day: "numeric" })
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cash Flow Projections</h1>
              <p className="text-slate-400">30-day forecast based on expected payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Expected Inflows</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.totalExpectedInflow)}</p>
          <p className="text-slate-500 text-xs mt-1">Next 30 days</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Expected Outflows</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalExpectedOutflow)}</p>
          <p className="text-slate-500 text-xs mt-1">Recurring expenses</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Net Cash Flow</p>
          <p className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(netCashFlow)}
          </p>
          <p className="text-slate-500 text-xs mt-1">Projected balance change</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Projected Balance</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(summary.projectedBalance)}</p>
          <p className="text-slate-500 text-xs mt-1">End of period</p>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Weekly Breakdown</h2>
        <div className="space-y-4">
          {weeklyData.length === 0 ? (
            <p className="text-center text-slate-400 py-4">No projections available</p>
          ) : (
            weeklyData.map((week) => (
              <div key={week.week} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-white/5">
                <div>
                  <p className="text-white font-medium">Week {week.week}</p>
                  <p className="text-slate-400 text-sm">{formatDate(week.startDate)} - {formatDate(week.endDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-medium">+{formatCurrency(week.expectedInflow)}</p>
                  {week.expectedOutflow > 0 && (
                    <p className="text-red-400 text-sm">-{formatCurrency(week.expectedOutflow)}</p>
                  )}
                  <p className="text-slate-400 text-xs">{week.daysWithPayments} days with expected payments</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Daily Projections Chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Daily Cash Flow</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex items-end gap-1 h-48 mb-4">
              {projections.slice(0, 30).map((day, index) => {
                const maxInflow = Math.max(...projections.map(p => p.expectedInflow), 1)
                const height = (day.expectedInflow / maxInflow) * 100
                return (
                  <div
                    key={index}
                    className="flex-1 bg-emerald-500/60 hover:bg-emerald-500/80 rounded-t transition-all cursor-pointer group relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${formatDate(day.date)}: ${formatCurrency(day.expectedInflow)}`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {formatDate(day.date)}: {formatCurrency(day.expectedInflow)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Day 1</span>
              <span>Day 15</span>
              <span>Day 30</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
