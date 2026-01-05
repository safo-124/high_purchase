import { getBusinessStats, getBusinessShops, getBusinessPurchases, getBusinessPayments } from "../../actions"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessReportsPage({ params }: Props) {
  const { businessSlug } = await params
  const [stats, shops, purchases, payments] = await Promise.all([
    getBusinessStats(businessSlug),
    getBusinessShops(businessSlug),
    getBusinessPurchases(businessSlug),
    getBusinessPayments(businessSlug),
  ])

  // Calculate financial metrics
  const totalSalesValue = purchases.reduce((sum, p) => sum + p.totalPrice, 0)
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalOutstanding = purchases.reduce((sum, p) => sum + p.outstanding, 0)
  const collectionRate = totalSalesValue > 0 ? (totalCollected / totalSalesValue) * 100 : 0

  // Purchase status breakdown
  const activePurchases = purchases.filter(p => p.status === "ACTIVE").length
  const completedPurchases = purchases.filter(p => p.status === "COMPLETED").length
  const overduePurchases = purchases.filter(p => p.isOverdue).length
  const defaultedPurchases = purchases.filter(p => p.status === "DEFAULTED").length

  // Monthly payment trends (last 6 months)
  const monthlyPayments: { month: string; amount: number; count: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    const monthPayments = payments.filter(p => {
      const paidAt = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt)
      return paidAt.getMonth() === date.getMonth() && paidAt.getFullYear() === date.getFullYear()
    })
    monthlyPayments.push({
      month: monthName,
      amount: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      count: monthPayments.length,
    })
  }

  // Shop performance
  const shopPerformance = shops.map(shop => {
    const shopPurchases = purchases.filter(p => p.shopSlug === shop.shopSlug)
    const shopPayments = payments.filter(p => p.shopSlug === shop.shopSlug)
    const shopSales = shopPurchases.reduce((sum, p) => sum + p.totalPrice, 0)
    const shopCollected = shopPayments.reduce((sum, p) => sum + p.amount, 0)
    const shopOutstanding = shopPurchases.reduce((sum, p) => sum + p.outstanding, 0)
    
    return {
      name: shop.name,
      sales: shopSales,
      collected: shopCollected,
      outstanding: shopOutstanding,
      collectionRate: shopSales > 0 ? (shopCollected / shopSales) * 100 : 0,
      activePurchases: shopPurchases.filter(p => p.status === "ACTIVE").length,
      overdue: shopPurchases.filter(p => p.isOverdue).length,
    }
  }).sort((a, b) => b.sales - a.sales)

  const maxSales = Math.max(...shopPerformance.map(s => s.sales), 1)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Business Reports</h1>
        <p className="text-slate-400">Analytics and insights across your business</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Sales Value</p>
          <p className="text-3xl font-bold text-white">₵{totalSalesValue.toLocaleString()}</p>
          <p className="text-sm text-slate-400 mt-2">{stats.totalPurchases} agreements</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Collected</p>
          <p className="text-3xl font-bold text-green-400">₵{totalCollected.toLocaleString()}</p>
          <p className="text-sm text-green-400/70 mt-2">{payments.length} payments</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Outstanding</p>
          <p className="text-3xl font-bold text-amber-400">₵{totalOutstanding.toLocaleString()}</p>
          <p className="text-sm text-amber-400/70 mt-2">Pending collection</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Collection Rate</p>
          <p className="text-3xl font-bold text-cyan-400">{collectionRate.toFixed(1)}%</p>
          <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Purchase Status Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Purchase Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-slate-300">Active</span>
              </div>
              <span className="text-white font-medium">{activePurchases}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-300">Overdue</span>
              </div>
              <span className="text-red-400 font-medium">{overduePurchases}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-300">Completed</span>
              </div>
              <span className="text-green-400 font-medium">{completedPurchases}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-slate-300">Defaulted</span>
              </div>
              <span className="text-orange-400 font-medium">{defaultedPurchases}</span>
            </div>
          </div>
          
          {/* Visual breakdown */}
          <div className="mt-6 h-4 bg-white/5 rounded-full overflow-hidden flex">
            {stats.totalPurchases > 0 && (
              <>
                <div 
                  className="h-full bg-cyan-500"
                  style={{ width: `${(activePurchases / stats.totalPurchases) * 100}%` }}
                />
                <div 
                  className="h-full bg-red-500"
                  style={{ width: `${(overduePurchases / stats.totalPurchases) * 100}%` }}
                />
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${(completedPurchases / stats.totalPurchases) * 100}%` }}
                />
                <div 
                  className="h-full bg-orange-500"
                  style={{ width: `${(defaultedPurchases / stats.totalPurchases) * 100}%` }}
                />
              </>
            )}
          </div>
        </div>

        {/* Monthly Payment Trends */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Monthly Collections</h3>
          <div className="space-y-3">
            {monthlyPayments.map((month) => {
              const maxAmount = Math.max(...monthlyPayments.map(m => m.amount), 1)
              return (
                <div key={month.month}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-400">{month.month}</span>
                    <span className="text-white font-medium">₵{month.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${(month.amount / maxAmount) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{month.count} payments</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Shop Performance */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Shop Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Sales</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Collected</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Collection Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {shopPerformance.map((shop) => (
                <tr key={shop.name} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-cyan-300">{shop.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-white">{shop.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-white font-medium">₵{shop.sales.toLocaleString()}</p>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${(shop.sales / maxSales) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-green-400 font-medium">₵{shop.collected.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-amber-400 font-medium">₵{shop.outstanding.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{shop.collectionRate.toFixed(1)}%</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            shop.collectionRate >= 70 ? "bg-green-500" : 
                            shop.collectionRate >= 40 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(shop.collectionRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-cyan-400 font-medium">{shop.activePurchases}</span>
                  </td>
                  <td className="px-4 py-4">
                    {shop.overdue > 0 ? (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium">
                        {shop.overdue} overdue
                      </span>
                    ) : (
                      <span className="text-green-400 text-sm">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
