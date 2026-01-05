import Link from "next/link"
import { requireSalesStaffForShop } from "@/lib/auth"
import { getSalesStaffDashboard, getProductsForSale, getCustomersForSale } from "../../actions"
import { SalesStaffNavbar } from "../components/sales-staff-navbar"

interface SalesStaffDashboardProps {
  params: Promise<{ shopSlug: string }>
}

export default async function SalesStaffDashboard({ params }: SalesStaffDashboardProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const dashboard = await getSalesStaffDashboard(shopSlug)
  const products = await getProductsForSale(shopSlug)
  const customers = await getCustomersForSale(shopSlug)

  // Products in stock
  const inStockProducts = products.filter((p) => p.stockQuantity > 0)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[90px]" />
      </div>

      <SalesStaffNavbar
        shopSlug={shopSlug}
        shopName={dashboard.shopName}
        staffName={dashboard.staffName}
      />

      <main className="relative z-10 w-full px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Products</p>
                <p className="text-2xl font-bold text-white">{dashboard.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Customers</p>
                <p className="text-2xl font-bold text-white">{dashboard.totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Sales Today</p>
                <p className="text-2xl font-bold text-green-400">{dashboard.totalSalesToday}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/15 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">This Month</p>
                <p className="text-2xl font-bold text-purple-400">{dashboard.totalSalesThisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href={`/sales-staff/${shopSlug}/new-sale`}
              className="glass-card p-6 rounded-2xl hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">New Sale</h3>
                  <p className="text-sm text-slate-400">Create a new BNPL purchase</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/sales-staff/${shopSlug}/products`}
              className="glass-card p-6 rounded-2xl hover:bg-white/[0.03] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">View Products</h3>
                  <p className="text-sm text-slate-400">Browse available products</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* In Stock Products */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Products in Stock</h2>
              <span className="text-sm text-slate-400">{inStockProducts.length} items</span>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {inStockProducts.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No products in stock</div>
              ) : (
                inStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-purple-300">
                        {product.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{product.name}</p>
                      <p className="text-xs text-slate-400">GHS {product.price.toLocaleString()}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      product.stockQuantity <= 5 
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-green-500/10 text-green-400 border border-green-500/20"
                    }`}>
                      {product.stockQuantity} in stock
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Customers */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Customers</h2>
              <span className="text-sm text-slate-400">{customers.length} total</span>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {customers.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No customers yet</div>
              ) : (
                customers.slice(0, 5).map((customer) => (
                  <div key={customer.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-blue-300">
                        {customer.firstName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{customer.phone}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
