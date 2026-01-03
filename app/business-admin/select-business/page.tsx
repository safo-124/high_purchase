import { redirect } from "next/navigation"
import { getSessionUser, getUserBusinessMemberships } from "../../../lib/auth"
import Link from "next/link"

export default async function SelectBusinessPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  // SUPER_ADMIN goes to super admin dashboard
  if (user.role === "SUPER_ADMIN") {
    redirect("/super-admin")
  }

  // Only BUSINESS_ADMIN can access this page
  if (user.role !== "BUSINESS_ADMIN") {
    redirect("/login?error=unauthorized")
  }

  // Get all businesses this user has access to
  const memberships = await getUserBusinessMemberships(user.id)

  // If user has exactly one business, redirect directly
  if (memberships.length === 1) {
    redirect(`/business-admin/${memberships[0].business.businessSlug}`)
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

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl logo-glow mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-9 w-9 text-white relative z-10"
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
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Select Business
            </h1>
            <p className="text-slate-400">
              Welcome back, <span className="text-purple-400">{user.name}</span>
            </p>
          </div>

          {/* Business Selection Card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Your Businesses</h2>
                <p className="text-sm text-slate-400">Choose a business to manage</p>
              </div>
            </div>

            {memberships.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-white font-medium mb-2">No businesses assigned</h3>
                <p className="text-sm text-slate-400">
                  Contact your administrator for access
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {memberships.map((membership) => (
                  <Link
                    key={membership.business.id}
                    href={`/business-admin/${membership.business.businessSlug}`}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-purple-500/30 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-lg font-semibold text-purple-300">
                        {membership.business.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium group-hover:text-purple-300 transition-colors truncate">
                        {membership.business.name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        /{membership.business.businessSlug}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Logout Link */}
            <div className="mt-6 pt-6 border-t border-white/5">
              <Link
                href="/api/auth/logout"
                className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Switch account
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 mt-8">
            © 2025 High Purchase • Ghana
          </p>
        </div>
      </div>
    </div>
  )
}
