import { getTaxReport } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    year?: string
    quarter?: string
  }>
}

export default async function AccountantTaxReportsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const searchParamsData = await searchParams
  await requireAccountant(businessSlug)
  
  const currentYear = new Date().getFullYear()
  const year = searchParamsData.year ? parseInt(searchParamsData.year) : currentYear
  const quarter = searchParamsData.quarter ? parseInt(searchParamsData.quarter) : undefined
  
  // Calculate date range based on year and quarter
  let startDate: Date
  let endDate: Date
  
  if (quarter) {
    const quarterStart = (quarter - 1) * 3
    startDate = new Date(year, quarterStart, 1)
    endDate = new Date(year, quarterStart + 3, 0, 23, 59, 59)
  } else {
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59)
  }
  
  const taxData = await getTaxReport(businessSlug, startDate, endDate)

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tax Reports</h1>
              <p className="text-slate-400">Generate tax-ready financial summaries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="glass-card p-4 mb-8">
        <form className="flex flex-wrap items-center gap-4">
          <select
            name="year"
            defaultValue={year}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            name="quarter"
            defaultValue={quarter || ""}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">Full Year</option>
            <option value="1">Q1 (Jan-Mar)</option>
            <option value="2">Q2 (Apr-Jun)</option>
            <option value="3">Q3 (Jul-Sep)</option>
            <option value="4">Q4 (Oct-Dec)</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors"
          >
            Generate Report
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(taxData.totalRevenue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Tax Collected</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(taxData.totalTaxCollected)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Report Period</p>
          <p className="text-lg font-bold text-white">
            {new Date(taxData.period.start).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
            {" - "}
            {new Date(taxData.period.end).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Tax Breakdown & Shop Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tax Breakdown</h2>
          <div className="space-y-3">
            {taxData.taxBreakdown.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No taxes configured</p>
            ) : (
              taxData.taxBreakdown.map((tax, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                  <div>
                    <span className="text-white font-medium">{tax.taxName}</span>
                    <span className="text-slate-400 text-sm ml-2">@ {tax.rate}%</span>
                  </div>
                  <span className="text-amber-400 font-medium">{formatCurrency(tax.taxAmount)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <span className="text-white font-medium">Total Tax Liability</span>
              <span className="text-amber-400 font-bold">{formatCurrency(taxData.totalTaxCollected)}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Revenue by Shop</h2>
          <div className="space-y-3">
            {taxData.shopBreakdown.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No shop revenue data</p>
            ) : (
              taxData.shopBreakdown.map((shop, index) => (
                <div key={index} className="p-3 rounded-lg bg-slate-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium">{shop.shopName}</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(shop.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Tax Collected</span>
                    <span className="text-amber-400">{formatCurrency(shop.taxCollected)}</span>
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-white font-medium">Total Revenue</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(taxData.totalRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Details Table */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Tax Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-slate-400 font-medium">Tax Name</th>
                <th className="text-right p-3 text-slate-400 font-medium">Rate</th>
                <th className="text-right p-3 text-slate-400 font-medium">Base Amount</th>
                <th className="text-right p-3 text-slate-400 font-medium">Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {taxData.taxBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No tax data available for this period
                  </td>
                </tr>
              ) : (
                taxData.taxBreakdown.map((tax, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white font-medium">{tax.taxName}</td>
                    <td className="p-3 text-right text-slate-300">{tax.rate}%</td>
                    <td className="p-3 text-right text-slate-300">{formatCurrency(tax.baseAmount)}</td>
                    <td className="p-3 text-right text-amber-400 font-medium">{formatCurrency(tax.taxAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Export Report</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>
    </div>
  )
}
