import { redirect } from "next/navigation"
import { getSessionUser } from "../../../lib/auth"
import { getAccountantBusinesses } from "../actions"
import Link from "next/link"

export default async function AccountantSelectBusinessPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  // Super admins can access any business
  if (user.role === "SUPER_ADMIN") {
    redirect("/super-admin")
  }

  const memberships = await getAccountantBusinesses(user.id)

  // If only one business, redirect directly
  if (memberships.length === 1) {
    redirect(`/accountant/${memberships[0].business.businessSlug}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(20, 184, 166, 0.2) 50%, transparent 70%)",
            animationDuration: "8s"
          }}
        />
        <div 
          className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, rgba(16, 185, 129, 0.2) 50%, transparent 70%)",
            animationDuration: "10s",
            animationDelay: "2s"
          }}
        />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Accountant Portal</h1>
          <p className="text-slate-400">Select a business to continue</p>
        </div>

        {/* Business List */}
        <div className="glass-card p-6">
          {memberships.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Business Access</h3>
              <p className="text-slate-400 mb-6">
                You don&apos;t have accountant access to any business yet.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map((membership) => (
                <Link
                  key={membership.id}
                  href={`/accountant/${membership.business.businessSlug}/dashboard`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/10 transition-all group"
                >
                  {/* Business Logo/Initial */}
                  {membership.business.logoUrl ? (
                    <img
                      src={membership.business.logoUrl}
                      alt={membership.business.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">
                        {membership.business.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Business Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {membership.business.name}
                    </h3>
                    <p className="text-sm text-slate-400 truncate">
                      {membership.business.country}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {membership.role === "BUSINESS_ADMIN" ? "Admin" : "Accountant"}
                    </span>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign out
          </Link>
        </div>
      </div>
    </div>
  )
}
