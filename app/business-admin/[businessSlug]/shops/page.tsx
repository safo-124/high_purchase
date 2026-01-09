import { getBusinessShopsWithMetrics } from "../../actions"
import { ShopsContent } from "./shops-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessShopsPage({ params }: Props) {
  const { businessSlug } = await params
  const shops = await getBusinessShopsWithMetrics(businessSlug)

  // Calculate totals
  const totalSales = shops.reduce((sum, s) => sum + s.totalSales, 0)
  const totalCollected = shops.reduce((sum, s) => sum + s.totalCollected, 0)
  const totalOutstanding = shops.reduce((sum, s) => sum + s.totalOutstanding, 0)
  const totalProducts = shops.reduce((sum, s) => sum + s.productCount, 0)
  const totalCustomers = shops.reduce((sum, s) => sum + s.customerCount, 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Shops Overview</h1>
        <p className="text-slate-400">Manage and monitor all your retail locations</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Shops</p>
          <p className="text-2xl font-bold text-white">{shops.length}</p>
          <p className="text-xs text-green-400 mt-1">{shops.filter(s => s.isActive).length} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-cyan-400">₵{totalSales.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">All time</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Collected</p>
          <p className="text-2xl font-bold text-green-400">₵{totalCollected.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{totalSales > 0 ? Math.round((totalCollected / totalSales) * 100) : 0}% of sales</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-400">₵{totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Pending collection</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Inventory</p>
          <p className="text-2xl font-bold text-blue-400">{totalProducts}</p>
          <p className="text-xs text-slate-500 mt-1">{totalCustomers} customers</p>
        </div>
      </div>

      {/* Shops Table with Search/Filter */}
      <ShopsContent shops={shops} businessSlug={businessSlug} />
    </div>
  )
}
