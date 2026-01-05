import { getBusinessPayments, getBusinessShops } from "../../actions"
import { PaymentsContent } from "./payments-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessPaymentsPage({ params }: Props) {
  const { businessSlug } = await params
  const [payments, shops] = await Promise.all([
    getBusinessPayments(businessSlug),
    getBusinessShops(businessSlug),
  ])

  // Calculate totals
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const todayPayments = payments.filter(p => {
    const paidAt = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt)
    const today = new Date()
    return paidAt.toDateString() === today.toDateString()
  })
  const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0)
  
  const thisWeekPayments = payments.filter(p => {
    const paidAt = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return paidAt >= weekAgo
  })
  const weekAmount = thisWeekPayments.reduce((sum, p) => sum + p.amount, 0)

  const thisMonthPayments = payments.filter(p => {
    const paidAt = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt)
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    return paidAt >= monthAgo
  })
  const monthAmount = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Payment History</h1>
        <p className="text-slate-400">Track all payments collected across your business</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-green-400">₵{totalCollected.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{payments.length} payments</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Today</p>
          <p className="text-2xl font-bold text-cyan-400">₵{todayAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{todayPayments.length} payments</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">This Week</p>
          <p className="text-2xl font-bold text-blue-400">₵{weekAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{thisWeekPayments.length} payments</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-bold text-purple-400">₵{monthAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{thisMonthPayments.length} payments</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg Payment</p>
          <p className="text-2xl font-bold text-amber-400">
            ₵{payments.length > 0 ? Math.round(totalCollected / payments.length).toLocaleString() : 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per transaction</p>
        </div>
      </div>

      {/* Payments Table */}
      <PaymentsContent 
        payments={payments} 
        shops={shops.map(s => ({ name: s.name, shopSlug: s.shopSlug }))} 
      />
    </div>
  )
}
