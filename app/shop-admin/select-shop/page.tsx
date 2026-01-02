import { redirect } from "next/navigation"
import { getSessionUser, getUserShopMemberships } from "../../../lib/auth"
import Link from "next/link"

export default async function SelectShopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getSessionUser()
  const params = await searchParams

  if (!user) {
    redirect("/login")
  }

  // Super admins should go to super-admin dashboard
  if (user.role === "SUPER_ADMIN") {
    redirect("/super-admin")
  }

  // Non-shop admins shouldn't be here
  if (user.role !== "SHOP_ADMIN") {
    redirect("/login?error=unauthorized")
  }

  // Get user's shop memberships
  const memberships = await getUserShopMemberships(user.id)

  // If only one membership, redirect directly to that shop
  if (memberships.length === 1) {
    redirect(`/shop-admin/${memberships[0].shop.shopSlug}/dashboard`)
  }

  // If no memberships, show error
  if (memberships.length === 0) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        {/* Animated Background Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        <div className="relative z-10 glass-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">No Shop Access</h1>
          <p className="text-slate-400 mb-6">
            You don&apos;t have access to any shops. Please contact your administrator.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  // Show shop selection
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

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl logo-glow flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Select Your Shop</h1>
          <p className="text-slate-400">Choose a shop to manage</p>
        </div>

        {/* Error Message */}
        {params.error && (
          <div className="glass-card p-4 mb-6 border-orange-500/30 max-w-md w-full">
            <p className="text-orange-400 text-sm text-center">
              {params.error === "shop-not-found" && "Shop not found"}
              {params.error === "shop-suspended" && "This shop has been suspended"}
              {params.error === "no-access" && "You don't have access to this shop"}
            </p>
          </div>
        )}

        {/* Shop Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
          {memberships.map((membership) => (
            <Link
              key={membership.id}
              href={`/shop-admin/${membership.shop.shopSlug}/dashboard`}
              className="group glass-card p-6 hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-xl font-bold text-purple-300">
                    {membership.shop.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {membership.shop.name}
                  </h3>
                  <p className="text-sm text-slate-400 font-mono">/{membership.shop.shopSlug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500">🇬🇭 {membership.shop.country}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Active
                    </span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500">
            Logged in as <span className="text-slate-300">{user.name || user.email}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
