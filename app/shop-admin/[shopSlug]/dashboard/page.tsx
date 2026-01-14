import { requireShopAdminForShop } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Link from "next/link"

async function getShopStats(shopId: string) {
  const now = new Date()

  const [
    totalCustomers,
    activeCustomers,
    totalProducts,
    lowStockProducts,
    totalPurchases,
    activePurchases,
    overduePurchases,
    completedPurchases,
    allPayments,
    recentPurchases,
  ] = await Promise.all([
    // Total customers
    prisma.customer.count({ where: { shopId } }),
    // Active customers
    prisma.customer.count({ where: { shopId, isActive: true } }),
    // Total products
    prisma.shopProduct.count({ where: { shopId } }),
    // Low stock products (less than 5)
    prisma.shopProduct.count({ where: { shopId, stockQuantity: { lt: 5 } } }),
    // Total purchases
    prisma.purchase.count({ where: { customer: { shopId } } }),
    // Active purchases
    prisma.purchase.count({ where: { customer: { shopId }, status: "ACTIVE" } }),
    // Overdue purchases (active with passed due date)
    prisma.purchase.count({
      where: {
        customer: { shopId },
        status: "OVERDUE",
      },
    }),
    // Completed purchases
    prisma.purchase.count({ where: { customer: { shopId }, status: "COMPLETED" } }),
    // All payments for this shop
    prisma.payment.findMany({
      where: { purchase: { customer: { shopId } } },
      select: { amount: true, status: true, isConfirmed: true },
    }),
    // Recent 5 purchases
    prisma.purchase.findMany({
      where: { customer: { shopId } },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  // Calculate payment totals
  const confirmedPayments = allPayments.filter(p => p.status === "COMPLETED" && p.isConfirmed)
  const pendingPayments = allPayments.filter(p => p.status === "PENDING" || (p.status === "COMPLETED" && !p.isConfirmed))
  
  const totalCollected = confirmedPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )
  const pendingPaymentsAmount = pendingPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )

  return {
    totalCustomers,
    activeCustomers,
    totalProducts,
    lowStockProducts,
    totalPurchases,
    activePurchases,
    overduePurchases,
    completedPurchases,
    totalCollected,
    pendingPaymentsAmount,
    pendingPaymentsCount: pendingPayments.length,
    recentPurchases,
  }
}

export default async function ShopAdminDashboard({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)
  const stats = await getShopStats(shop.id)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Active
          </span>
          <span className="text-xs text-slate-500">🇬🇭 {shop.country}</span>
        </div>
        <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
          Welcome, <span className="text-gradient">{user.name?.split(' ')[0]}</span>
        </h2>
        <p className="text-slate-400 text-lg">
          Manage your shop operations and track performance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Total Customers */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xs text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">Customers</span>
          </div>
          <div className="mb-2">
            <span className="text-4xl font-bold text-white">{stats.totalCustomers}</span>
          </div>
          <p className="text-slate-400 text-sm">Total Customers</p>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              {stats.activeCustomers} active
            </div>
          </div>
        </div>

        {/* Active Purchases */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/15 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-xs text-purple-400/80 bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20">Purchases</span>
          </div>
          <div className="mb-2">
            <span className="text-4xl font-bold text-white">{stats.activePurchases}</span>
          </div>
          <p className="text-slate-400 text-sm">Active Purchases</p>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{stats.completedPurchases} completed</span>
              {stats.overduePurchases > 0 && (
                <span className="text-orange-400">{stats.overduePurchases} overdue</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Collected */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-green-400/80 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">Revenue</span>
          </div>
          <div className="mb-2">
            <span className="text-3xl font-bold text-white">{formatCurrency(stats.totalCollected)}</span>
          </div>
          <p className="text-slate-400 text-sm">Total Collected</p>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {stats.pendingPaymentsCount} pending ({formatCurrency(stats.pendingPaymentsAmount)})
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/15 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">Inventory</span>
          </div>
          <div className="mb-2">
            <span className="text-4xl font-bold text-white">{stats.totalProducts}</span>
          </div>
          <p className="text-slate-400 text-sm">Total Products</p>
          <div className="mt-4 pt-4 border-t border-white/5">
            {stats.lowStockProducts > 0 ? (
              <div className="flex items-center gap-2 text-xs text-orange-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {stats.lowStockProducts} low stock items
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Stock levels healthy
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shop Info + Recent Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Shop Info Card */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Shop Details</h3>
              <p className="text-xs text-slate-400">Your shop information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-sm text-slate-400">Shop Name</span>
              <span className="text-sm font-medium text-white">{shop.name}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-sm text-slate-400">Shop Slug</span>
              <span className="text-sm font-mono text-slate-300">/{shop.shopSlug}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-sm text-slate-400">Country</span>
              <span className="text-sm text-white">🇬🇭 {shop.country}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-sm text-slate-400">Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Recent Purchases</h3>
                <p className="text-xs text-slate-400">Latest transactions</p>
              </div>
            </div>
            <Link
              href={`/shop-admin/${shopSlug}/customers`}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              View all →
            </Link>
          </div>

          {stats.recentPurchases.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-slate-400">No purchases yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                      <span className="text-sm font-semibold text-purple-300">
                        {purchase.customer.firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{purchase.customer.firstName} {purchase.customer.lastName}</p>
                      <p className="text-xs text-slate-500">
                        {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''} • {new Date(purchase.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(Number(purchase.totalAmount))}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      purchase.status === 'COMPLETED'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : purchase.status === 'ACTIVE'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {purchase.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            <p className="text-xs text-slate-400">Common tasks for managing your shop</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/shop-admin/${shopSlug}/products`}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-violet-500/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium group-hover:text-violet-300 transition-colors">
                Manage Products
              </p>
              <p className="text-sm text-slate-500">Add and update inventory</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href={`/shop-admin/${shopSlug}/customers`}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium group-hover:text-blue-300 transition-colors">
                View Customers
              </p>
              <p className="text-sm text-slate-500">Manage customer accounts</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href={`/shop-admin/${shopSlug}/pending-payments`}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-amber-500/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/15 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium group-hover:text-amber-300 transition-colors">
                Pending Payments
              </p>
              <p className="text-sm text-slate-500">Review and confirm</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href={`/shop-admin/${shopSlug}/waybills`}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/15 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium group-hover:text-cyan-300 transition-colors">
                Waybills
              </p>
              <p className="text-sm text-slate-500">Manage delivery documents</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
