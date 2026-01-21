import Image from "next/image"
import { requireBusinessAdmin } from "../../../lib/auth"
import { getBusinessStats, getBusinessShops } from "../actions"
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
    <div className="p-8">
      {/* Business Header */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-6">
          {/* Logo */}
          {business.logoUrl ? (
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20 shadow-lg shadow-cyan-500/10 flex-shrink-0">
              <Image
                src={business.logoUrl}
                alt={business.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <span className="text-3xl font-bold text-white">
                {business.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white truncate">{business.name}</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-medium">Active</span>
              </div>
            </div>
            {business.tagline && (
              <p className="text-slate-400 text-lg mb-2">{business.tagline}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {business.country}
              </span>
              {business.phone && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {business.phone}
                </span>
              )}
              {business.email && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {business.email}
                </span>
              )}
            </div>
          </div>
          
          {/* Edit Profile Button */}
          <a
            href={`/business-admin/${businessSlug}/settings/profile`}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </a>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Welcome back, <span className="text-gradient">{user.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-slate-400">
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
      </div>
  )
}
