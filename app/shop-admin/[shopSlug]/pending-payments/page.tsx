import Link from "next/link"
import { requireShopAdminForShop } from "@/lib/auth"
import { getAllShopPayments, getPaymentStats } from "../../actions"
import { PaymentsContent } from "./payments-content"
import { ShopAdminLogoutButton } from "../dashboard/logout-button"

interface PaymentsPageProps {
  params: Promise<{ shopSlug: string }>
  searchParams: Promise<{ tab?: string; startDate?: string; endDate?: string }>
}

export default async function PaymentsPage({ params, searchParams }: PaymentsPageProps) {
  const { shopSlug } = await params
  const { tab, startDate, endDate } = await searchParams
  const { user, shop } = await requireShopAdminForShop(shopSlug)

  // Parse dates
  const parsedStartDate = startDate ? new Date(startDate) : undefined
  const parsedEndDate = endDate ? new Date(endDate) : undefined

  // Determine active tab
  const activeTab = (tab === "confirmed" || tab === "rejected" || tab === "pending") ? tab : "pending"

  // Fetch payments and stats
  const [payments, stats] = await Promise.all([
    getAllShopPayments(shopSlug, {
      status: activeTab,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    }),
    getPaymentStats(shopSlug, parsedStartDate, parsedEndDate),
  ])

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
              <Link href={`/shop-admin/${shopSlug}/messages`} className="nav-link text-slate-300 hover:text-white text-sm font-medium">
                Messages
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
      <main className="relative z-10 w-full px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Payment Management</h2>
          <p className="text-slate-400 mt-1">
            View and manage all payments collected by debt collectors
          </p>
        </div>

        {/* Payments Content */}
        <PaymentsContent
          payments={payments}
          shopSlug={shopSlug}
          stats={stats}
          initialTab={activeTab}
          startDate={startDate || ""}
          endDate={endDate || ""}
        />
      </main>
    </div>
  )
}
