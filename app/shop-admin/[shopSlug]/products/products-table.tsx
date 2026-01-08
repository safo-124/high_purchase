"use client"

import { useState } from "react"
import { ProductData, CategoryData, toggleProductStatus } from "../../actions"
import { toast } from "sonner"
import { UpdateStockDialog } from "./update-stock-dialog"

interface ProductsTableProps {
  products: ProductData[]
  shopSlug: string
  categories: CategoryData[]
}

export function ProductsTable({ products, shopSlug, categories }: ProductsTableProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(price)
  }

  const handleToggleStatus = async (product: ProductData) => {
    setTogglingId(product.id)
    const result = await toggleProductStatus(shopSlug, product.id)
    
    if (result.success) {
      const newStatus = (result.data as { isActive: boolean }).isActive
      toast.success(`"${product.name}" ${newStatus ? "activated" : "deactivated"}`)
    } else {
      toast.error(result.error || "Failed to update status")
    }
    
    setTogglingId(null)
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500/20 to-slate-600/15 border border-slate-500/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No products yet</h3>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Add your first product to start offering BNPL financing to your customers.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Product
              </th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Category
              </th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                SKU
              </th>
              <th className="text-right text-xs font-medium text-rose-400 uppercase tracking-wider px-6 py-4">
                Cost
              </th>
              <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                <span className="text-green-400">Cash</span> / <span className="text-blue-400">Layaway</span> / <span className="text-amber-400">Credit</span>
              </th>
              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Stock
              </th>
              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Status
              </th>
              <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                {/* Product Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {/* Product Image/Placeholder */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-purple-300">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-slate-400 truncate max-w-xs">{product.description}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-6 py-4">
                  {product.categoryName ? (
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{ 
                        backgroundColor: `${product.categoryColor}15`,
                        borderColor: `${product.categoryColor}40`,
                        color: product.categoryColor || '#6366f1'
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: product.categoryColor || '#6366f1' }} 
                      />
                      {product.categoryName}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">—</span>
                  )}
                </td>

                {/* SKU */}
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-300 font-mono">
                    {product.sku || "—"}
                  </span>
                </td>

                {/* Cost Price */}
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-medium text-rose-400">₵{(product.costPrice || 0).toLocaleString()}</span>
                </td>

                {/* Selling Prices */}
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end gap-0.5 text-xs">
                    <span className="text-green-400 font-medium">₵{(product.cashPrice || 0).toLocaleString()}</span>
                    <span className="text-blue-400 font-medium">₵{(product.layawayPrice || 0).toLocaleString()}</span>
                    <span className="text-amber-400 font-medium">₵{(product.creditPrice || 0).toLocaleString()}</span>
                  </div>
                </td>

                {/* Stock */}
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    product.stockQuantity === 0
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : product.stockQuantity <= product.lowStockThreshold
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-green-500/10 text-green-400 border-green-500/20"
                  }`}>
                    {product.stockQuantity === 0 ? (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Out of Stock
                      </>
                    ) : (
                      `${product.stockQuantity} units`
                    )}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleStatus(product)}
                    disabled={togglingId === product.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      product.isActive
                        ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
                    } ${togglingId === product.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-green-400" : "bg-slate-400"}`} />
                    {product.isActive ? "Active" : "Inactive"}
                  </button>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <UpdateStockDialog product={product} shopSlug={shopSlug} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
