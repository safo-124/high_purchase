import { requireShopAdminForShop } from "../../../../lib/auth"
import { getShopPolicy } from "../../actions"
import Link from "next/link"
import { PolicyForm } from "./policy-form"

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)

  // Get current policy
  const policy = await getShopPolicy(shopSlug)

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
              <Link href={`/shop-admin/${shopSlug}/pending-payments`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
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
              <Link href={`/shop-admin/${shopSlug}/messages`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Messages
              </Link>
              <Link href={`/shop-admin/${shopSlug}/policy`} className="nav-link active text-white text-sm font-medium">
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href={`/shop-admin/${shopSlug}/dashboard`} className="text-slate-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-white">Policy Configuration</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">BNPL Policy</h2>
              <p className="text-slate-400">Configure your Buy Now Pay Later terms</p>
            </div>
          </div>
        </div>

        {/* Policy Form Card */}
        <div className="glass-card p-6">
          <PolicyForm shopSlug={shopSlug} initialPolicy={policy} />
        </div>

        {/* Help Section */}
        <div className="mt-8 glass-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Policy Guide</h3>
              <div className="space-y-3 text-sm text-slate-400">
                <p>
                  <strong className="text-slate-300">Interest Type:</strong> Choose between a one-time flat rate applied to the total, or monthly compounding interest.
                </p>
                <p>
                  <strong className="text-slate-300">Grace Period:</strong> Number of days before interest or late fees start applying after the due date.
                </p>
                <p>
                  <strong className="text-slate-300">Max Tenor:</strong> Maximum number of days a customer can take to repay their purchase.
                </p>
                <p>
                  <strong className="text-slate-300">Late Fees:</strong> Optional fees applied when payments are overdue. Can be a fixed amount, a percentage, or both.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>© 2025 High Purchase • {shop.name}</p>
            <p>Shop Admin Dashboard v1.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
