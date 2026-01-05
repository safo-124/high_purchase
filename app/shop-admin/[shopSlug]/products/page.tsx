import { requireShopAdminForShop } from "../../../../lib/auth"
import { getProducts, getShopCategories } from "../../actions"
import { ProductsTable } from "./products-table"
import { CreateProductDialog } from "./create-product-dialog"
import { CategoriesSection } from "./categories-section"

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)
  const products = await getProducts(shopSlug)
  const categories = await getShopCategories(shopSlug)

  // Format price for Ghana Cedis
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(price)
  }

  // Stats
  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.isActive).length
  const totalValue = products.reduce((sum, p) => sum + p.price, 0)

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">
            Products
          </h2>
          <p className="text-slate-400">
            Manage your shop&apos;s product catalog for BNPL financing.
          </p>
        </div>
        <CreateProductDialog shopSlug={shopSlug} categories={categories} />
      </div>

      {/* Categories Section */}
      <CategoriesSection categories={categories} shopSlug={shopSlug} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Products */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Products</p>
              <p className="text-2xl font-bold text-white">{totalProducts}</p>
            </div>
          </div>
        </div>

        {/* Active Products */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-white">{activeProducts}</p>
            </div>
          </div>
        </div>

        {/* Total Value */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/15 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Catalog Value</p>
              <p className="text-2xl font-bold text-white">{formatPrice(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <ProductsTable products={products} shopSlug={shopSlug} categories={categories} />
      </div>
    </div>
  )
}
