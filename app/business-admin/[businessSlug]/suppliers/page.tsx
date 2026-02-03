import { getSuppliers } from "../../actions"
import { SuppliersContent } from "./suppliers-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function SuppliersPage({ params }: Props) {
  const { businessSlug } = await params
  const suppliers = await getSuppliers(businessSlug)

  // Calculate stats
  const activeSuppliers = suppliers.filter(s => s.isActive)
  const totalItems = suppliers.reduce((sum, s) => sum + s.itemCount, 0)
  const avgRating = suppliers.filter(s => s.rating).length > 0
    ? suppliers.filter(s => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.filter(s => s.rating).length
    : 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Suppliers</h1>
          <p className="text-slate-400">Manage your supply chain vendors and partners</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Suppliers</p>
          <p className="text-2xl font-bold text-white">{suppliers.length}</p>
          <p className="text-xs text-purple-400 mt-1">{activeSuppliers.length} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Supply Items</p>
          <p className="text-2xl font-bold text-purple-400">{totalItems}</p>
          <p className="text-xs text-slate-500 mt-1">Across all suppliers</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg. Rating</p>
          <p className="text-2xl font-bold text-amber-400">{avgRating > 0 ? avgRating.toFixed(1) : "N/A"}</p>
          <p className="text-xs text-slate-500 mt-1">Supplier performance</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-400">{suppliers.length - activeSuppliers.length}</p>
          <p className="text-xs text-slate-500 mt-1">Deactivated suppliers</p>
        </div>
      </div>

      {/* Suppliers Table */}
      <SuppliersContent 
        suppliers={suppliers}
        businessSlug={businessSlug}
      />
    </div>
  )
}
