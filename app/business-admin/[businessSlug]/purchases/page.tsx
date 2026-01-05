import { getBusinessPurchases, getBusinessShops } from "../../actions"
import { PurchasesContent } from "./purchases-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessPurchasesPage({ params }: Props) {
  const { businessSlug } = await params
  const [purchases, shops] = await Promise.all([
    getBusinessPurchases(businessSlug),
    getBusinessShops(businessSlug),
  ])

  // Calculate totals
  const totalValue = purchases.reduce((sum, p) => sum + p.totalPrice, 0)
  const totalCollected = purchases.reduce((sum, p) => sum + p.totalPaid, 0)
  const totalOutstanding = purchases.reduce((sum, p) => sum + p.outstanding, 0)
  const activePurchases = purchases.filter(p => p.status === "ACTIVE").length
  const overduePurchases = purchases.filter(p => p.isOverdue).length
  const completedPurchases = purchases.filter(p => p.status === "COMPLETED").length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">All Purchases</h1>
        <p className="text-slate-400">Track HP agreements across all shops</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total HP</p>
          <p className="text-2xl font-bold text-white">{purchases.length}</p>
          <p className="text-xs text-slate-500 mt-1">Agreements</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-cyan-400">{activePurchases}</p>
          <p className="text-xs text-slate-500 mt-1">In progress</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-400">{overduePurchases}</p>
          <p className="text-xs text-red-400/70 mt-1">Need attention</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-400">{completedPurchases}</p>
          <p className="text-xs text-slate-500 mt-1">Fully paid</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Value</p>
          <p className="text-2xl font-bold text-blue-400">₵{totalValue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">₵{totalCollected.toLocaleString()} collected</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-400">₵{totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Pending</p>
        </div>
      </div>

      {/* Purchases Table */}
      <PurchasesContent 
        purchases={purchases} 
        shops={shops.map(s => ({ name: s.name, shopSlug: s.shopSlug }))} 
      />
    </div>
  )
}
