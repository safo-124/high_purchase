import Link from "next/link"
import { requireSalesStaffForShop } from "@/lib/auth"
import { getProductsForSale, getSalesStaffDashboard } from "../../actions"
import { SalesStaffNavbar } from "../components/sales-staff-navbar"

interface ProductsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function SalesStaffProductsPage({ params }: ProductsPageProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const [dashboard, products] = await Promise.all([
    getSalesStaffDashboard(shopSlug),
    getProductsForSale(shopSlug),
  ])

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
      </div>

      <SalesStaffNavbar
        shopSlug={shopSlug}
        shopName={dashboard.shopName}
        staffName={dashboard.staffName}
      />

      <main className="relative z-10 w-full px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Total Products</p>
            <p className="text-2xl font-bold text-white">{products.length}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">In Stock</p>
            <p className="text-2xl font-bold text-green-400">
              {products.filter((p) => p.stockQuantity > 0).length}
            </p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Out of Stock</p>
            <p className="text-2xl font-bold text-red-400">
              {products.filter((p) => p.stockQuantity === 0).length}
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-8 text-center">
              <p className="text-slate-400">No products available</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="glass-card rounded-2xl p-5 relative overflow-hidden">
                {/* Stock Badge */}
                <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium ${
                  product.stockQuantity === 0
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : product.stockQuantity <= 5
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                }`}>
                  {product.stockQuantity === 0 ? "Out of Stock" : `${product.stockQuantity} in stock`}
                </div>

                {/* Product Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center mb-4">
                  <span className="text-lg font-semibold text-purple-300">
                    {product.name.charAt(0)}
                  </span>
                </div>

                {/* Product Info */}
                <h3 className="text-lg font-semibold text-white mb-1">{product.name}</h3>
                {product.categoryName && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mb-2"
                    style={{ 
                      backgroundColor: `${product.categoryColor}15`,
                      borderColor: `${product.categoryColor}40`,
                      color: product.categoryColor || '#6366f1'
                    }}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: product.categoryColor || '#6366f1' }} 
                    />
                    {product.categoryName}
                  </span>
                )}
                {product.description && (
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">{product.description}</p>
                )}

                {/* Price */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-2xl font-bold text-white">
                    GHS {product.price.toLocaleString()}
                  </span>
                  {product.stockQuantity > 0 && (
                    <Link
                      href={`/sales-staff/${shopSlug}/new-sale?product=${product.id}`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-all"
                    >
                      Sell
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
