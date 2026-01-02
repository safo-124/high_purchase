"use client"

import { useState } from "react"
import { ProductData, CategoryData, deleteProduct, toggleProductStatus } from "../../actions"
import { toast } from "sonner"
import { EditProductDialog } from "./edit-product-dialog"

interface ProductsTableProps {
  products: ProductData[]
  shopSlug: string
  categories: CategoryData[]
}

export function ProductsTable({ products, shopSlug, categories }: ProductsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<ProductData | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(price)
  }

  const handleDeleteClick = (product: ProductData) => {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return

    setDeletingId(productToDelete.id)
    const result = await deleteProduct(shopSlug, productToDelete.id)
    
    if (result.success) {
      toast.success(`"${productToDelete.name}" deleted successfully`)
    } else {
      toast.error(result.error || "Failed to delete product")
    }
    
    setDeletingId(null)
    setShowDeleteModal(false)
    setProductToDelete(null)
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
              <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Price
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

                {/* Price */}
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-semibold text-white">
                    {formatPrice(product.price)}
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
                    <EditProductDialog product={product} shopSlug={shopSlug} categories={categories} />
                    <button
                      onClick={() => handleDeleteClick(product)}
                      disabled={deletingId === product.id}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all disabled:opacity-50"
                      title="Delete product"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Delete Product</h3>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to delete <span className="text-white font-medium">&quot;{productToDelete.name}&quot;</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingId === productToDelete.id}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-medium text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {deletingId === productToDelete.id ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
