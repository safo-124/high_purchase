import { getSupplyCategories } from "../../actions"
import { SupplyCategoriesContent } from "./supply-categories-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function SupplyCategoriesPage({ params }: Props) {
  const { businessSlug } = await params
  const categories = await getSupplyCategories(businessSlug)

  // Calculate stats
  const activeCategories = categories.filter(c => c.isActive)
  const totalItems = categories.reduce((sum, c) => sum + c.itemCount, 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Supply Categories</h1>
          <p className="text-slate-400">Organize your supply items into categories</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Categories</p>
          <p className="text-2xl font-bold text-white">{categories.length}</p>
          <p className="text-xs text-purple-400 mt-1">{activeCategories.length} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Supply Items</p>
          <p className="text-2xl font-bold text-purple-400">{totalItems}</p>
          <p className="text-xs text-slate-500 mt-1">Across all categories</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg. Items/Cat</p>
          <p className="text-2xl font-bold text-cyan-400">
            {categories.length > 0 ? (totalItems / categories.length).toFixed(1) : "0"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Distribution</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-400">{categories.length - activeCategories.length}</p>
          <p className="text-xs text-slate-500 mt-1">Hidden categories</p>
        </div>
      </div>

      {/* Categories Grid */}
      <SupplyCategoriesContent 
        categories={categories}
        businessSlug={businessSlug}
      />
    </div>
  )
}
