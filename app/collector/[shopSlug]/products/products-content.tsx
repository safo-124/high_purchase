"use client"

import { useState } from "react"
import { ProductForCollector } from "../../actions"
import { Package, Search, Tag, Boxes } from "lucide-react"

interface ProductsContentProps {
  products: ProductForCollector[]
  shopSlug: string
}

export function ProductsContent({ products, shopSlug }: ProductsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))] as string[]

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === "" || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = categoryFilter === null || p.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  // Stats
  const totalProducts = products.length
  const inStock = products.filter(p => p.stockQuantity > 0).length
  const lowStock = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length
  const outOfStock = products.filter(p => p.stockQuantity === 0).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
          Products
        </h1>
        <p className="text-slate-400 mt-1">View available products and stock levels</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalProducts}</p>
              <p className="text-xs text-slate-400">Total Products</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{inStock}</p>
              <p className="text-xs text-slate-400">In Stock</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{lowStock}</p>
              <p className="text-xs text-slate-400">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{outOfStock}</p>
              <p className="text-xs text-slate-400">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
            />
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                categoryFilter === null
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full glass-card rounded-xl p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-400">No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="glass-card rounded-xl p-4 hover:bg-white/[0.03] transition-all"
            >
              {/* Product Image or Placeholder */}
              <div className="w-full aspect-square rounded-lg bg-white/5 mb-3 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-12 h-12 text-slate-500" />
                )}
              </div>

              {/* Product Info */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-white text-sm line-clamp-2">{product.name}</h3>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                    product.stockQuantity === 0
                      ? "bg-red-500/20 text-red-400"
                      : product.stockQuantity <= 10
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {product.stockQuantity} in stock
                  </span>
                </div>

                {product.category && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                    <Tag className="w-3 h-3" />
                    {product.category}
                  </div>
                )}

                {/* Prices */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cash</span>
                    <span className="text-emerald-400 font-medium">GH₵{product.cashPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Layaway</span>
                    <span className="text-amber-400 font-medium">GH₵{product.layawayPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Credit</span>
                    <span className="text-violet-400 font-medium">GH₵{product.creditPrice.toLocaleString()}</span>
                  </div>
                </div>

                {product.sku && (
                  <p className="text-xs text-slate-500 mt-2">SKU: {product.sku}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
