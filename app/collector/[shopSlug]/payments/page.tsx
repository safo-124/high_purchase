import Link from "next/link"
import { requireCollectorForShop } from "@/lib/auth"
import { getCollectorDashboard, getCollectorPendingPayments, getCollectorPaymentHistory } from "../../actions"

interface PaymentsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorPaymentsPage({ params }: PaymentsPageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const [dashboard, pendingPayments, paymentHistory] = await Promise.all([
    getCollectorDashboard(shopSlug),
    getCollectorPendingPayments(shopSlug),
    getCollectorPaymentHistory(shopSlug),
  ])

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  const confirmedPayments = paymentHistory.filter((p) => p.isConfirmed)
  const confirmedTotal = confirmedPayments.reduce((sum, p) => sum + p.amount, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-teal-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-white/5">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{dashboard.shopName}</h1>
              <p className="text-sm text-slate-400">Collector: {dashboard.collectorName}</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href={`/collector/${shopSlug}/dashboard`}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
            >
              Dashboard
            </Link>
            <Link
              href={`/collector/${shopSlug}/customers`}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
            >
              Customers
            </Link>
            <Link
              href={`/collector/${shopSlug}/payments`}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-medium"
            >
              Payments
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="relative z-10 w-full px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Pending Confirmation</p>
            <p className="text-2xl font-bold text-amber-400">{pendingPayments.length}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Pending Amount</p>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(pendingTotal)}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Confirmed</p>
            <p className="text-2xl font-bold text-green-400">{confirmedPayments.length}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Confirmed Amount</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(confirmedTotal)}</p>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-lg font-semibold text-white">Awaiting Shop Admin Confirmation</h2>
          </div>
          
          {pendingPayments.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-400">No payments pending confirmation</p>
              <p className="text-sm text-slate-500">All your collected payments have been processed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Purchase</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Method</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-300">{formatDate(payment.paidAt)}</td>
                      <td className="py-3 px-4">
                        <Link 
                          href={`/collector/${shopSlug}/customers/${payment.customerId}`}
                          className="text-sm text-white hover:text-emerald-400"
                        >
                          {payment.customerName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-400">{payment.purchaseNumber}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">
                          {payment.paymentMethod.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-white">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Payment History</h2>
          
          {paymentHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No payments recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Purchase</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Method</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-300">{formatDate(payment.paidAt)}</td>
                      <td className="py-3 px-4">
                        <Link 
                          href={`/collector/${shopSlug}/customers/${payment.customerId}`}
                          className="text-sm text-white hover:text-emerald-400"
                        >
                          {payment.customerName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-400">{payment.purchaseNumber}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">
                          {payment.paymentMethod.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-white">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {payment.isConfirmed ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                            Confirmed
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
