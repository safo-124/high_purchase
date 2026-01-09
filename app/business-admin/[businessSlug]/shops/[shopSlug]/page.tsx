import { requireBusinessAdmin } from "../../../../../lib/auth"
import { getShopDetailOverview } from "../../../actions"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ businessSlug: string; shopSlug: string }>
}) {
  const { businessSlug, shopSlug } = await params
  await requireBusinessAdmin(businessSlug)

  const shop = await getShopDetailOverview(businessSlug, shopSlug)

  if (!shop) {
    notFound()
  }

  const formatCurrency = (amount: number) => `₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const collectionRate = shop.totalSales > 0 ? (shop.totalCollected / shop.totalSales) * 100 : 0

  return (
    <div className="p-6 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href={`/business-admin/${businessSlug}`} className="text-slate-400 hover:text-white transition-colors">
          Dashboard
        </Link>
        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/business-admin/${businessSlug}/shops`} className="text-slate-400 hover:text-white transition-colors">
          Shops
        </Link>
        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-white">{shop.name}</span>
      </div>

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-cyan-400">{shop.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white tracking-tight">{shop.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                shop.isActive 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {shop.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-slate-400">/{shop.shopSlug}</p>
          </div>
        </div>
        <Link
          href={`/shop-admin/${shop.shopSlug}/dashboard`}
          target="_blank"
          className="px-4 py-2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-xl text-sm font-medium hover:bg-cyan-500/20 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Shop Dashboard
        </Link>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Products */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/15 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Products</p>
              <p className="text-2xl font-bold text-white">{shop.totalProducts}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{shop.totalStockUnits} units in stock</span>
            {shop.lowStockProducts > 0 && (
              <span className="text-orange-400">{shop.lowStockProducts} low stock</span>
            )}
          </div>
        </div>

        {/* Total Sales */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total Sales</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(shop.totalSales)}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {shop.activePurchases + shop.completedPurchases + shop.overduePurchases} total purchases
          </p>
        </div>

        {/* Collected */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Collected</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(shop.totalCollected)}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">{collectionRate.toFixed(1)}% collection rate</p>
        </div>

        {/* Outstanding */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Outstanding</p>
              <p className="text-2xl font-bold text-orange-400">{formatCurrency(shop.totalOutstanding)}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">{shop.activePurchases} active purchases</p>
        </div>
      </div>

      {/* Second Row - Staff & Customers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Staff */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Staff Members</p>
              <p className="text-2xl font-bold text-white">{shop.staffCount}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">Includes admins & sales staff</p>
        </div>

        {/* Collectors */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Debt Collectors</p>
              <p className="text-2xl font-bold text-white">{shop.collectorCount}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">Active collectors</p>
        </div>

        {/* Customers */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/15 border border-pink-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Customers</p>
              <p className="text-2xl font-bold text-white">{shop.totalCustomers}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">{shop.activeCustomers} with active purchases</p>
        </div>
      </div>

      {/* Profit Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Profit Analysis
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Actual Profit */}
          <div className="glass-card p-6 rounded-2xl border border-green-500/20 bg-green-500/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-400 uppercase tracking-wide">Actual Profit (Realized)</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{formatCurrency(shop.actualProfit)}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Cost of Goods Sold</span>
                <span className="text-slate-300">{formatCurrency(shop.totalCostOfGoodsSold)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">From Completed Sales</span>
                <span className="text-slate-300">{shop.completedPurchases} orders</span>
              </div>
            </div>
          </div>

          {/* Estimated Profit from Inventory */}
          <div className="glass-card p-6 rounded-2xl">
            <p className="text-sm text-slate-400 uppercase tracking-wide mb-4">Estimated Profit (If All Stock Sold)</p>
            <div className="space-y-4">
              {/* Cash */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-sm font-bold">💵</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Cash Sales</p>
                    <p className="text-xs text-slate-500">Best price tier</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-green-400">{formatCurrency(shop.estimatedProfitCash)}</p>
              </div>

              {/* Layaway */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-sm font-bold">📦</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Layaway Sales</p>
                    <p className="text-xs text-slate-500">Pay before delivery</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-400">{formatCurrency(shop.estimatedProfitLayaway)}</p>
              </div>

              {/* Credit */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 text-sm font-bold">💳</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Credit Sales (BNPL)</p>
                    <p className="text-xs text-slate-500">Highest price tier</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-400">{formatCurrency(shop.estimatedProfitCredit)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Status Breakdown */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Purchase Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-3xl font-bold text-blue-400">{shop.activePurchases}</p>
            <p className="text-sm text-slate-400 mt-1">Active</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-3xl font-bold text-green-400">{shop.completedPurchases}</p>
            <p className="text-sm text-slate-400 mt-1">Completed</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-3xl font-bold text-orange-400">{shop.overduePurchases}</p>
            <p className="text-sm text-slate-400 mt-1">Overdue</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-3xl font-bold text-slate-400">
              {shop.activePurchases + shop.completedPurchases + shop.overduePurchases}
            </p>
            <p className="text-sm text-slate-400 mt-1">Total</p>
          </div>
        </div>
        
        {/* Collection Progress Bar */}
        {shop.totalSales > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Collection Progress</span>
              <span className="text-white font-medium">{collectionRate.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Collected: {formatCurrency(shop.totalCollected)}</span>
              <span>Outstanding: {formatCurrency(shop.totalOutstanding)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
