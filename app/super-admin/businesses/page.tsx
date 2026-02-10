import { requireSuperAdmin } from "../../../lib/auth"
import { getBusinesses } from "../actions"
import Link from "next/link"
import { LogoutButton } from "../logout-button"
import { CreateBusinessDialog } from "./create-business-dialog"
import { BusinessActions } from "./business-actions"
import { AddAdminDialog } from "./add-admin-dialog"

export default async function BusinessesPage() {
  const user = await requireSuperAdmin()
  const businesses = await getBusinesses()

  const activeCount = businesses.filter(b => b.isActive).length
  const suspendedCount = businesses.length - activeCount

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
                <h1 className="text-xl font-bold text-white tracking-tight">High Purchase</h1>
                <p className="text-xs text-slate-400">Super Admin Portal</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/super-admin" className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/super-admin/businesses" className="nav-link active text-white text-sm font-medium">
                Businesses
              </Link>
              <Link href="/super-admin/users" className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Users
              </Link>
              <Link href="/super-admin/audit-logs" className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Audit Logs
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
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Businesses</h2>
              </div>
            </div>
            <p className="text-slate-400">Manage all businesses on the High Purchase platform</p>
          </div>
          <CreateBusinessDialog />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{businesses.length}</p>
              <p className="text-xs text-slate-400">Total Businesses</p>
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{activeCount}</p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{suspendedCount}</p>
              <p className="text-xs text-slate-400">Suspended</p>
            </div>
          </div>
        </div>

        {/* Businesses Table Card */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">All Businesses</h3>
                <p className="text-sm text-slate-400">{businesses.length} business{businesses.length !== 1 ? "es" : ""} registered</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search businesses..." 
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors w-64"
                  />
                </div>
              </div>
            </div>
          </div>

          {businesses.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">No businesses yet</h4>
              <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                Create your first business to start managing tenants on the High Purchase platform
              </p>
              <CreateBusinessDialog />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Business Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Slug</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shops</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {businesses.map((business, index) => (
                    <tr 
                      key={business.id} 
                      className="group hover:bg-white/[0.03] transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            business.isActive 
                              ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30'
                              : 'bg-gradient-to-br from-slate-500/20 to-slate-500/10 border border-slate-500/30'
                          }`}>
                            <span className={`text-sm font-semibold ${business.isActive ? 'text-purple-300' : 'text-slate-400'}`}>
                              {business.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-white group-hover:text-purple-300 transition-colors">
                            {business.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                          {business.businessSlug}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            {business.admins.length > 0 ? (
                              <div>
                                <p className="text-sm text-white">{business.admins[0].name || "—"}</p>
                                <p className="text-xs text-slate-500">
                                  {business.admins[0].email}
                                  {business.admins.length > 1 && (
                                    <span className="ml-1 text-purple-400">+{business.admins.length - 1} more</span>
                                  )}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No admin</p>
                            )}
                          </div>
                          <AddAdminDialog business={business} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                          </svg>
                          {business.shopCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          business.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${business.isActive ? 'bg-green-400' : 'bg-orange-400'}`} />
                          {business.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(business.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <BusinessActions business={business} />
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
            <p>Super Admin Dashboard v1.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
