import { getBusinessProducts, getBusinessShops, getBusinessCategories, getBusinessBrands } from "../../actions"
import { ProductsContent } from "./products-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessProductsPage({ params }: Props) {
  const { businessSlug } = await params
  const [products, shops, categoriesData, brandsData] = await Promise.all([
    getBusinessProducts(businessSlug),
    getBusinessShops(businessSlug),
    getBusinessCategories(businessSlug),
    getBusinessBrands(businessSlug),
  ])

  // Calculate totals
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.isActive).length
  const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0)
  const lowStock = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length
  const outOfStock = products.filter(p => p.stockQuantity === 0).length
  
  // Get unique category names for filter (from products)
  const categoryNames = [...new Set(products.map(p => p.category).filter(Boolean))]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">All Products</h1>
        <p className="text-slate-400">View products across all your shops</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Products</p>
          <p className="text-2xl font-bold text-white">{totalProducts}</p>
          <p className="text-xs text-green-400 mt-1">{activeProducts} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Stock</p>
          <p className="text-2xl font-bold text-cyan-400">{totalStock}</p>
          <p className="text-xs text-slate-500 mt-1">Units available</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-amber-400">{lowStock}</p>
          <p className="text-xs text-amber-400/70 mt-1">Need restock</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-400">{outOfStock}</p>
          <p className="text-xs text-red-400/70 mt-1">Unavailable</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Categories</p>
          <p className="text-2xl font-bold text-purple-400">{categoriesData.length}</p>
          <p className="text-xs text-slate-500 mt-1">Product types</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Shops</p>
          <p className="text-2xl font-bold text-blue-400">{shops.length}</p>
          <p className="text-xs text-slate-500 mt-1">Locations</p>
        </div>
      </div>

      {/* Products Table */}
      <ProductsContent 
        products={products} 
        shops={shops.map(s => ({ id: s.id, name: s.name, shopSlug: s.shopSlug }))}
        categories={categoriesData.filter(c => c.isActive).map(c => ({ id: c.id, name: c.name }))}
        brands={brandsData.filter(b => b.isActive).map(b => ({ id: b.id, name: b.name }))}
        categoryNames={categoryNames as string[]}
        businessSlug={businessSlug}
      />
    </div>
  )
}
