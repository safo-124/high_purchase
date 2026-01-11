import { getBusinessCustomers, getBusinessShops, getBusinessStaff } from "../../actions"
import { CustomersContent } from "./customers-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCustomersPage({ params }: Props) {
  const { businessSlug } = await params
  const [customers, shops, staff] = await Promise.all([
    getBusinessCustomers(businessSlug),
    getBusinessShops(businessSlug),
    getBusinessStaff(businessSlug),
  ])

  // Filter to get only active debt collectors
  const collectors = staff
    .filter(s => s.role === "DEBT_COLLECTOR" && s.isActive)
    .map(s => ({ id: s.id, name: s.userName || "Unknown", shopSlug: s.shopSlug, shopName: s.shopName }))

  // Calculate totals
  const totalCustomers = customers.length
  const totalPurchased = customers.reduce((sum, c) => sum + c.totalPurchased, 0)
  const totalPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0)
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0)
  const activeCustomers = customers.filter(c => c.activePurchases > 0).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">All Customers</h1>
        <p className="text-slate-400">View and manage customers across all shops</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-white">{totalCustomers}</p>
          <p className="text-xs text-cyan-400 mt-1">{activeCustomers} with active HP</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Purchased</p>
          <p className="text-2xl font-bold text-cyan-400">₵{totalPurchased.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Across all shops</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-400">₵{totalPaid.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{totalPurchased > 0 ? Math.round((totalPaid / totalPurchased) * 100) : 0}% collected</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-400">₵{totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Pending</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Shops</p>
          <p className="text-2xl font-bold text-blue-400">{shops.length}</p>
          <p className="text-xs text-slate-500 mt-1">Locations</p>
        </div>
      </div>

      {/* Customers Table */}
      <CustomersContent 
        customers={customers} 
        shops={shops.map(s => ({ name: s.name, shopSlug: s.shopSlug }))} 
        collectors={collectors}
        businessSlug={businessSlug}
      />
    </div>
  )
}
