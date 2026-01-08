"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updateBusinessProduct,
  deleteBusinessProduct,
  toggleBusinessProductStatus,
} from "../../actions"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  category: string | null
  cashPrice: number
  hpPrice: number
  stockQuantity: number
  lowStockThreshold: number
  isActive: boolean
  shopName: string
  shopSlug: string
  purchaseCount: number
  createdAt: Date
}

interface Shop {
  id: string
  name: string
  shopSlug: string
}

interface ProductsContentProps {
  products: Product[]
  shops: Shop[]
  categories: string[]
  businessSlug: string
}

type ModalMode = "edit" | "delete" | "stock" | null

export function ProductsContent({ products, shops, categories, businessSlug }: ProductsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "lowStock" | "outOfStock">("all")
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "sales">("name")

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Edit form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    cashPrice: "0",
    layawayPrice: "0",
    creditPrice: "0",
    stockQuantity: "0",
    lowStockThreshold: "5",
    isActive: true,
  })

  // Stock adjustment
  const [stockAdjustmentType, setStockAdjustmentType] = useState<"set" | "add" | "subtract">("set")
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState("")

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesShop = shopFilter === "all" || product.shopSlug === shopFilter
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    
    let matchesStock = true
    if (stockFilter === "inStock") matchesStock = product.stockQuantity > product.lowStockThreshold
    else if (stockFilter === "lowStock") matchesStock = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold
    else if (stockFilter === "outOfStock") matchesStock = product.stockQuantity === 0
    
    return matchesSearch && matchesShop && matchesCategory && matchesStock
  })

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return b.hpPrice - a.hpPrice
      case "stock":
        return b.stockQuantity - a.stockQuantity
      case "sales":
        return b.purchaseCount - a.purchaseCount
      default:
        return a.name.localeCompare(b.name)
    }
  })

  const openEditModal = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      cashPrice: product.cashPrice.toString(),
      layawayPrice: product.hpPrice.toString(),
      creditPrice: product.hpPrice.toString(),
      stockQuantity: product.stockQuantity.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      isActive: product.isActive,
    })
    setFormError(null)
    setModalMode("edit")
  }

  const openStockModal = (product: Product) => {
    setSelectedProduct(product)
    setStockAdjustmentType("set")
    setStockAdjustmentAmount(product.stockQuantity.toString())
    setFormError(null)
    setModalMode("stock")
  }

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product)
    setFormError(null)
    setModalMode("delete")
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedProduct(null)
    setFormError(null)
  }

  const calculateNewStock = () => {
    if (!selectedProduct) return 0
    const amount = parseInt(stockAdjustmentAmount) || 0
    if (stockAdjustmentType === "set") return amount
    if (stockAdjustmentType === "add") return selectedProduct.stockQuantity + amount
    return Math.max(0, selectedProduct.stockQuantity - amount)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    setFormError(null)

    startTransition(async () => {
      const result = await updateBusinessProduct(businessSlug, selectedProduct.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim() || null,
        cashPrice: parseFloat(formData.cashPrice) || 0,
        layawayPrice: parseFloat(formData.layawayPrice) || 0,
        creditPrice: parseFloat(formData.creditPrice) || 0,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
        isActive: formData.isActive,
      })

      if (result.success) {
        toast.success(`Product "${formData.name}" updated successfully`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to update product")
      }
    })
  }

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    setFormError(null)

    const newStock = calculateNewStock()

    startTransition(async () => {
      const result = await updateBusinessProduct(businessSlug, selectedProduct.id, {
        stockQuantity: newStock,
      })

      if (result.success) {
        toast.success(`Stock updated to ${newStock} units`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to update stock")
      }
    })
  }

  const handleDelete = async () => {
    if (!selectedProduct) return
    setFormError(null)

    startTransition(async () => {
      const result = await deleteBusinessProduct(businessSlug, selectedProduct.id)

      if (result.success) {
        toast.success(`Product "${selectedProduct.name}" deleted`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to delete product")
      }
    })
  }

  const handleToggleStatus = async (product: Product) => {
    startTransition(async () => {
      const result = await toggleBusinessProductStatus(businessSlug, product.id)

      if (result.success) {
        const newStatus = (result.data as { isActive: boolean }).isActive
        toast.success(`"${product.name}" ${newStatus ? "activated" : "deactivated"}`)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Search & Filters */}
        <div className="p-6 border-b border-white/5">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            {/* Shop Filter */}
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.shopSlug} value={shop.shopSlug}>
                  {shop.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Stock</option>
              <option value="inStock">In Stock</option>
              <option value="lowStock">Low Stock</option>
              <option value="outOfStock">Out of Stock</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="stock">Sort by Stock</option>
              <option value="sales">Sort by Sales</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
          <p className="text-sm text-slate-400">
            Showing {sortedProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products List */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
            <p className="text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Cash Price</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">HP Price</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          product.isActive
                            ? "bg-cyan-500/20 border border-cyan-500/30"
                            : "bg-slate-500/20 border border-slate-500/30"
                        }`}>
                          <svg className={`w-5 h-5 ${product.isActive ? "text-cyan-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-white">{product.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{product.sku || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.category ? (
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                        {product.shopName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">₵{product.cashPrice.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-cyan-400">₵{product.hpPrice.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openStockModal(product)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          product.stockQuantity === 0
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : product.stockQuantity <= product.lowStockThreshold
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-green-500/10 text-green-400 border border-green-500/20"
                        }`}
                      >
                        {product.stockQuantity} units
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          product.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-green-400" : "bg-slate-400"}`} />
                        {product.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit product"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(product)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
        )}
      </div>

      {/* Edit Modal */}
      {modalMode === "edit" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg glass-card p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Edit Product</h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Cash Price (₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cashPrice}
                    onChange={(e) => setFormData({ ...formData, cashPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Layaway Price (₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.layawayPrice}
                    onChange={(e) => setFormData({ ...formData, layawayPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Credit Price (₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditPrice}
                    onChange={(e) => setFormData({ ...formData, creditPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-sm text-amber-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  className="w-full px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500/50"
                />
                <p className="text-xs text-slate-500 mt-1">Alert when stock falls to or below this level</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">
                  Product is active and available for sale
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {modalMode === "stock" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-2">Update Stock</h3>
            <p className="text-slate-400 mb-6">{selectedProduct.name}</p>

            {/* Current Stock */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-slate-400 mb-1">Current Stock</p>
              <p className={`text-2xl font-bold ${
                selectedProduct.stockQuantity === 0
                  ? "text-red-400"
                  : selectedProduct.stockQuantity <= selectedProduct.lowStockThreshold
                  ? "text-amber-400"
                  : "text-green-400"
              }`}>
                {selectedProduct.stockQuantity} units
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleStockSubmit} className="space-y-4">
              {/* Adjustment Type */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "set", label: "Set To", icon: "=" },
                  { value: "add", label: "Add", icon: "+" },
                  { value: "subtract", label: "Subtract", icon: "−" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setStockAdjustmentType(type.value as typeof stockAdjustmentType)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      stockAdjustmentType === type.value
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  {stockAdjustmentType === "set" ? "New Stock Quantity" : "Amount"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockAdjustmentAmount}
                  onChange={(e) => setStockAdjustmentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-medium text-center focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              {/* Preview */}
              {stockAdjustmentType !== "set" && stockAdjustmentAmount && (
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-sm text-slate-400 mb-1">New Stock Will Be</p>
                  <p className="text-xl font-bold text-cyan-400">{calculateNewStock()} units</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Updating..." : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === "delete" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md glass-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Product</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{selectedProduct.name}</strong> from <strong className="text-white">{selectedProduct.shopName}</strong>?
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
