import { requireBusinessAdmin } from "../../../lib/auth"
import { getBusinessStats, getBusinessShops } from "../actions"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { CreateShopDialog } from "./create-shop-dialog"
import { ShopActions } from "./shop-actions"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessDashboard({ params }: Props) {
  const { businessSlug } = await params
  const { user, business } = await requireBusinessAdmin(businessSlug)
  const stats = await getBusinessStats(businessSlug)
  const shops = await getBusinessShops(businessSlug)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Grid Pattern */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Header */}
      <header className="relative z-10 glass-header">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl logo-glow flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white relative z-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{business.name}</h1>
                <p className="text-xs text-slate-400">Business Admin Portal</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href={`/business-admin/${businessSlug}`} className="nav-link active text-white text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/business-admin/select-business" className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Switch Business
              </Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-300">
                  {user.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">Business Active</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Welcome back, <span className="text-gradient">{user.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-slate-400 text-lg">
            Manage your shops and view business performance.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {/* Total Shops */}
          <div className="glass-card stat-card stat-card-purple p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl icon-container flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full">Shops</span>
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-white">{stats.totalShops}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Shops</p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Your retail locations
              </div>
            </div>
          </div>

          {/* Active Shops */}
          <div className="glass-card stat-card stat-card-green p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-green-400/80 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">Active</span>
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-green-400">{stats.activeShops}</span>
            </div>
            <p className="text-slate-400 text-sm">Active Shops</p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-green-400/70">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Operational
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="glass-card stat-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-xs text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">Products</span>
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-blue-400">{stats.totalProducts}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Products</p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-blue-400/70">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4" />
                </svg>
                Across all shops
              </div>
            </div>
          </div>

          {/* Total Customers */}
          <div className="glass-card stat-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/15 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">Customers</span>
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-amber-400">{stats.totalCustomers}</span>
            </div>
            <p className="text-slate-400 text-sm">Total Customers</p>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-amber-400/70">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Across all shops
              </div>
            </div>
          </div>
        </div>

        {/* Shops Section */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Your Shops</h3>
                <p className="text-sm text-slate-400">{shops.length} shop{shops.length !== 1 ? "s" : ""} in this business</p>
              </div>
              <CreateShopDialog businessSlug={businessSlug} />
            </div>
          </div>

          {shops.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">No shops yet</h4>
              <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                Create your first shop to start selling products
              </p>
              <CreateShopDialog businessSlug={businessSlug} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Slug</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Customers</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {shops.map((shop, index) => (
                    <tr 
                      key={shop.id} 
                      className="group hover:bg-white/[0.03] transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            shop.isActive 
                              ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30'
                              : 'bg-gradient-to-br from-slate-500/20 to-slate-500/10 border border-slate-500/30'
                          }`}>
                            <span className={`text-sm font-semibold ${shop.isActive ? 'text-purple-300' : 'text-slate-400'}`}>
                              {shop.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-white group-hover:text-purple-300 transition-colors">
                            {shop.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                          {shop.shopSlug}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-white">{shop.adminName || "—"}</p>
                          <p className="text-xs text-slate-500">{shop.adminEmail || "No admin"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-300">{shop.productCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-300">{shop.customerCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          shop.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${shop.isActive ? 'bg-green-400' : 'bg-orange-400'}`} />
                          {shop.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ShopActions shop={shop} businessSlug={businessSlug} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 border-t border-white/5">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>© 2025 High Purchase • Ghana</p>
            <p>Business Admin Dashboard v1.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
