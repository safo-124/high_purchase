import { getBadDebtAnalysis } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function AccountantBadDebtsPage({ params }: Props) {
  const { businessSlug } = await params
  await requireAccountant(businessSlug)
  
  const badDebtData = await getBadDebtAnalysis(businessSlug)
  const { items, summary } = badDebtData
  
  // Compute statistics from items
  const avgDaysOverdue = items.length > 0 
    ? Math.round(items.reduce((sum, i) => sum + i.daysOverdue, 0) / items.length)
    : 0
  
  // Compute risk distribution
  const riskDistribution = [
    { 
      label: "High Risk (70-100)", 
      count: summary.highRiskCount,
      amount: items.filter(i => i.riskScore >= 70).reduce((sum, i) => sum + i.outstanding, 0),
      percentage: items.length > 0 ? (summary.highRiskCount / items.length) * 100 : 0,
      severity: "high" as const
    },
    { 
      label: "Medium Risk (40-70)", 
      count: summary.mediumRiskCount,
      amount: items.filter(i => i.riskScore >= 40 && i.riskScore < 70).reduce((sum, i) => sum + i.outstanding, 0),
      percentage: items.length > 0 ? (summary.mediumRiskCount / items.length) * 100 : 0,
      severity: "medium" as const
    },
    { 
      label: "Low Risk (< 40)", 
      count: summary.lowRiskCount,
      amount: items.filter(i => i.riskScore < 40).reduce((sum, i) => sum + i.outstanding, 0),
      percentage: items.length > 0 ? (summary.lowRiskCount / items.length) * 100 : 0,
      severity: "low" as const
    },
  ]
  
  // Compute action items
  const writeOffCandidates = items.filter(i => i.riskScore >= 80 && i.daysOverdue > 180).length
  const escalationRequired = items.filter(i => i.riskScore >= 50 && i.daysOverdue > 60).length
  const paymentPlanEligible = items.filter(i => i.riskScore < 70 && i.paymentCount > 0).length

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
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-linear-to-br from-red-500/10 to-orange-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Bad Debt Analysis</h1>
              <p className="text-slate-400">Accounts overdue requiring attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 border-l-4 border-red-500">
          <p className="text-slate-400 text-sm">Total At Risk</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalAtRisk)}</p>
          <p className="text-slate-500 text-xs mt-1">Outstanding amount</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">At Risk Accounts</p>
          <p className="text-2xl font-bold text-white">{items.length}</p>
          <p className="text-slate-500 text-xs mt-1">Customers affected</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Avg Days Overdue</p>
          <p className="text-2xl font-bold text-amber-400">{avgDaysOverdue}</p>
          <p className="text-slate-500 text-xs mt-1">For at-risk accounts</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Write-off Suggested</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.writeOffSuggested)}</p>
          <p className="text-slate-500 text-xs mt-1">180+ days, high risk</p>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Risk Distribution</h2>
          <div className="space-y-4">
            {riskDistribution.map((category, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{category.label}</span>
                  <span className="text-white">{formatCurrency(category.amount)}</span>
                </div>
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full ${
                      category.severity === "high" ? "bg-red-500" :
                      category.severity === "medium" ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">{category.count} accounts</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Action Required</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 font-medium">Write-off Candidates</p>
              <p className="text-slate-400 text-sm mt-1">
                {writeOffCandidates} accounts with no payment activity for 180+ days
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 font-medium">Collection Escalation</p>
              <p className="text-slate-400 text-sm mt-1">
                {escalationRequired} accounts need follow-up calls
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-blue-400 font-medium">Payment Plans</p>
              <p className="text-slate-400 text-sm mt-1">
                {paymentPlanEligible} accounts eligible for restructuring
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* At-Risk Accounts Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">At-Risk Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Customer</th>
                <th className="text-left p-4 text-slate-400 font-medium">Shop</th>
                <th className="text-right p-4 text-slate-400 font-medium">Outstanding</th>
                <th className="text-center p-4 text-slate-400 font-medium">Days Overdue</th>
                <th className="text-left p-4 text-slate-400 font-medium">Last Payment</th>
                <th className="text-center p-4 text-slate-400 font-medium">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No accounts currently at risk. Great job!
                  </td>
                </tr>
              ) : (
                items.map((account) => (
                  <tr key={account.purchaseId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <p className="text-white font-medium">{account.customerName}</p>
                      <p className="text-slate-400 text-sm">{account.customerPhone}</p>
                    </td>
                    <td className="p-4 text-slate-300">{account.shopName}</td>
                    <td className="p-4 text-right text-red-400 font-medium">
                      {formatCurrency(account.outstanding)}
                    </td>
                    <td className="p-4 text-center text-white">{account.daysOverdue}</td>
                    <td className="p-4 text-slate-300">
                      {account.lastPaymentDate 
                        ? new Date(account.lastPaymentDate).toLocaleDateString()
                        : "No payments"
                      }
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.riskScore >= 70 
                          ? "bg-red-500/20 text-red-400"
                          : account.riskScore >= 40
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {account.riskScore}%
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
  )
}
