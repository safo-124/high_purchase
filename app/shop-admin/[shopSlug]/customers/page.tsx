import Link from "next/link"
import { requireShopAdminForShop } from "../../../../lib/auth"
import { getCustomersWithSummary, getDebtCollectors, getProducts } from "../../actions"
import { ShopAdminLogoutButton } from "../dashboard/logout-button"
import { CustomersTable } from "./customers-table"
import { CreateCustomerDialog } from "./create-customer-dialog"

interface CustomersPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CustomersPage({ params }: CustomersPageProps) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)
  
  const [customers, collectors, products] = await Promise.all([
    getCustomersWithSummary(shopSlug),
    getDebtCollectors(shopSlug),
    getProducts(shopSlug),
  ])
  
  const activeCollectors = collectors.filter((c: { isActive: boolean }) => c.isActive)
  const activeProducts = products.filter((p: { isActive: boolean }) => p.isActive)
  
  // Calculate stats
  const totalOwed = customers.reduce((sum, c) => sum + c.totalOwed, 0)
  const totalPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0)
  
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.isActive).length,
    withActiveLoans: customers.filter((c) => c.activePurchases > 0).length,
    totalOwed,
    totalPaid,
  }
  
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Shop Name */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl logo-glow flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {shop.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{shop.name}</h1>
                <p className="text-xs text-slate-400">Shop Admin Portal</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link href={`/shop-admin/${shopSlug}/dashboard`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Dashboard
              </Link>
              <Link href={`/shop-admin/${shopSlug}/products`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Products
              </Link>
              <Link href={`/shop-admin/${shopSlug}/customers`} className="nav-link active text-white text-sm font-medium">
                Customers
              </Link>
              <Link href={`/shop-admin/${shopSlug}/collectors`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Collectors
              </Link>
              <Link href={`/shop-admin/${shopSlug}/staff`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Staff
              </Link>
              <Link href={`/shop-admin/${shopSlug}/policy`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Policy
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
              <ShopAdminLogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">
              Customers
            </h2>
            <p className="text-slate-400">
              Manage your customers and their payment preferences.
            </p>
          </div>
          <CreateCustomerDialog shopSlug={shopSlug} collectors={activeCollectors} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {/* Total Customers */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 border border-violet-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* Active Customers */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/15 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
            </div>
          </div>

          {/* With Active Loans */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Active Loans</p>
                <p className="text-2xl font-bold text-white">{stats.withActiveLoans}</p>
              </div>
            </div>
          </div>

          {/* Total Owed */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Outstanding</p>
                <p className="text-xl font-bold text-white">GHS {stats.totalOwed.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Collected</p>
                <p className="text-xl font-bold text-white">GHS {stats.totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <CustomersTable 
            customers={customers} 
            shopSlug={shopSlug} 
            collectors={activeCollectors}
            products={activeProducts}
          />
        </div>
      </main>
    </div>
  )
}
