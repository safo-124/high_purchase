import { getSupplyItems, getSuppliers, getSupplyCategories } from "../../actions"
import { SupplyItemsContent } from "./supply-items-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function SupplyItemsPage({ params }: Props) {
  const { businessSlug } = await params
  const [items, suppliers, categories] = await Promise.all([
    getSupplyItems(businessSlug),
    getSuppliers(businessSlug),
    getSupplyCategories(businessSlug),
  ])

  // Calculate stats
  const activeItems = items.filter(i => i.isActive)
  const totalValue = items.reduce((sum, i) => sum + (i.unitPrice * i.stockQuantity), 0)
  const lowStockItems = items.filter(i => i.reorderLevel && i.stockQuantity <= i.reorderLevel)
  const outOfStock = items.filter(i => i.stockQuantity === 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Supply Items</h1>
          <p className="text-slate-400">Manage your inventory of supply items</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Items</p>
          <p className="text-2xl font-bold text-white">{items.length}</p>
          <p className="text-xs text-purple-400 mt-1">{activeItems.length} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Value</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-slate-500 mt-1">In stock value</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-amber-400">{lowStockItems.length}</p>
          <p className="text-xs text-slate-500 mt-1">Need reordering</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-400">{outOfStock.length}</p>
          <p className="text-xs text-slate-500 mt-1">Zero quantity</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Suppliers</p>
          <p className="text-2xl font-bold text-cyan-400">{suppliers.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active vendors</p>
        </div>
      </div>

      {/* Items Table */}
      <SupplyItemsContent 
        items={items}
        suppliers={suppliers.map(s => ({ id: s.id, name: s.name }))}
        categories={categories.map(c => ({ id: c.id, name: c.name, color: c.color }))}
        businessSlug={businessSlug}
      />
    </div>
  )
}
