import { getBusinessCategories, getBusinessBrands } from "../../actions"
import { CategoriesBrandsContent } from "./categories-brands-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function CategoriesBrandsPage({ params }: Props) {
  const { businessSlug } = await params
  const [categories, brands] = await Promise.all([
    getBusinessCategories(businessSlug),
    getBusinessBrands(businessSlug),
  ])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Categories & Brands</h1>
        <p className="text-slate-400">Manage product categories and brands for your business</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Categories</p>
          <p className="text-2xl font-bold text-cyan-400">{categories.length}</p>
          <p className="text-xs text-slate-500 mt-1">{categories.filter(c => c.isActive).length} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Brands</p>
          <p className="text-2xl font-bold text-purple-400">{brands.length}</p>
          <p className="text-xs text-slate-500 mt-1">{brands.filter(b => b.isActive).length} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Categorized Products</p>
          <p className="text-2xl font-bold text-emerald-400">
            {categories.reduce((sum, c) => sum + c.productCount, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">With categories</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Branded Products</p>
          <p className="text-2xl font-bold text-amber-400">
            {brands.reduce((sum, b) => sum + b.productCount, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">With brands</p>
        </div>
      </div>

      {/* Content */}
      <CategoriesBrandsContent 
        categories={categories}
        brands={brands}
        businessSlug={businessSlug}
      />
    </div>
  )
}
