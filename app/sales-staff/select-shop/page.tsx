import { redirect } from "next/navigation"
import { getSessionUser, getSalesStaffShopMemberships } from "@/lib/auth"
import Link from "next/link"

export default async function SalesStaffSelectShopPage() {
  const user = await getSessionUser()
  
  if (!user) {
    redirect("/login")
  }

  const memberships = await getSalesStaffShopMemberships(user.id)

  // If only one shop, redirect directly
  if (memberships.length === 1) {
    redirect(`/sales-staff/${memberships[0].shop.shopSlug}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales Staff Portal</h1>
          <p className="text-slate-400">Welcome back, {user.name}</p>
        </div>

        {memberships.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500/20 to-slate-600/15 border border-slate-500/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Shops Assigned</h3>
            <p className="text-slate-400 text-sm mb-6">
              You are not assigned as sales staff to any shop. Please contact your shop administrator.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider px-2">Select a Shop</h2>
            <div className="grid gap-4">
              {memberships.map((m) => (
                <Link
                  key={m.id}
                  href={`/sales-staff/${m.shop.shopSlug}/dashboard`}
                  className="glass-card rounded-2xl p-6 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl group-hover:scale-105 transition-transform">
                      {m.shop.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {m.shop.name}
                      </h3>
                      <p className="text-sm text-slate-400">/{m.shop.shopSlug}</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
