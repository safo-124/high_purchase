import Link from "next/link"
import { requireShopAdminForShop } from "@/lib/auth"
import { getPendingCollectorPayments, getPaymentConfirmationStats } from "../../actions"
import { PendingPaymentsTable } from "./pending-payments-table"
import { ShopAdminLogoutButton } from "../dashboard/logout-button"

interface PendingPaymentsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function PendingPaymentsPage({ params }: PendingPaymentsPageProps) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)

  const [pendingPayments, stats] = await Promise.all([
    getPendingCollectorPayments(shopSlug),
    getPaymentConfirmationStats(shopSlug),
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
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
              <Link href={`/shop-admin/${shopSlug}/customers`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Customers
              </Link>
              <Link href={`/shop-admin/${shopSlug}/pending-payments`} className="nav-link active text-white text-sm font-medium">
                Payments
              </Link>
              <Link href={`/shop-admin/${shopSlug}/waybills`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Waybills
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Pending Payment Confirmations</h2>
          <p className="text-slate-400 mt-1">
            Review and confirm payments collected by debt collectors
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/15 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/15 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Pending Amount</p>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.pendingTotal)}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Confirmed Today</p>
                <p className="text-2xl font-bold text-green-400">{stats.confirmedToday}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/15 border border-red-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Rejected Today</p>
                <p className="text-2xl font-bold text-red-400">{stats.rejectedToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        {stats.pendingCount > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-amber-400">Payments Awaiting Your Approval</p>
                <p className="text-sm text-slate-400 mt-1">
                  Debt collectors have recorded payments that need your confirmation before they reflect on customer accounts. 
                  Please review each payment carefully and confirm or reject.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Payments Table */}
        <div className="glass-card rounded-2xl p-6">
          <PendingPaymentsTable payments={pendingPayments} shopSlug={shopSlug} />
        </div>
      </main>
    </div>
  )
}
