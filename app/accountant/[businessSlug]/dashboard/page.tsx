import { getAccountantDashboardStats } from "../../actions"
import { requireAccountant } from "../../../../lib/auth"
import { AccountantDashboardContent } from "./dashboard-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function AccountantDashboard({ params }: Props) {
  const { businessSlug } = await params
  const { user, business, membership } = await requireAccountant(businessSlug)
  const stats = await getAccountantDashboardStats(businessSlug)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-br from-teal-500/10 to-cyan-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Financial Dashboard</h1>
              <p className="text-slate-400">{business.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Welcome back, <span className="text-emerald-400">{user.name?.split(' ')[0]}</span> 👋
        </h2>
        <p className="text-slate-400">
          Here&apos;s the financial overview for {business.name}.
        </p>
      </div>

      {/* Dashboard Content */}
      <AccountantDashboardContent 
        stats={stats}
        businessSlug={businessSlug}
        canConfirmPayments={membership.canConfirmPayments}
      />
    </div>
  )
}
