"use client"

import { useState, useMemo } from "react"
import { ProductForCollector } from "../../actions"

interface ProductsContentProps {
  products: ProductForCollector[]
}

export function ProductsContent({ products }: ProductsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Get unique categories
  const categories = useMemo(() => {
    const cats = products
      .map((p) => p.category)
      .filter((c): c is string => c !== null && c !== undefined && c.trim() !== "")
    return ["all", ...Array.from(new Set(cats))]
  }, [products])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search products by name, SKU, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Tabs */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {category === "all" ? "All Products" : category}
                <span className="ml-2 text-xs opacity-70">
                  ({category === "all" 
                    ? products.length 
                    : products.filter((p) => p.category === category).length
                  })
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        {(searchQuery || selectedCategory !== "all") && (
          <p className="text-sm text-slate-400">
            Showing {filteredProducts.length} of {products.length} products
            {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
            {selectedCategory !== "all" && <span> in {selectedCategory}</span>}
          </p>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="glass-card rounded-2xl overflow-hidden">
            {product.imageUrl ? (
              <div className="h-40 bg-slate-800">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <svg className="w-16 h-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">{product.name}</h3>
                  {product.category && (
                    <span className="text-xs text-slate-400">{product.category}</span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  product.stockQuantity > 10
                    ? "bg-green-500/20 text-green-400"
                    : product.stockQuantity > 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {product.stockQuantity} in stock
                </span>
              </div>

              {product.sku && (
                <p className="text-xs text-slate-500 mb-2">SKU: {product.sku}</p>
              )}

              {product.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{product.description}</p>
              )}

              {/* Pricing */}
              <div className="space-y-1 border-t border-white/5 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Cash:</span>
                  <span className="text-white font-medium">GHS {product.cashPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400">Layaway:</span>
                  <span className="text-white font-medium">GHS {product.layawayPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400">Credit:</span>
                  <span className="text-white font-medium">GHS {product.creditPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && products.length > 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No Products Found</h3>
          <p className="text-slate-400">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("")
              setSelectedCategory("all")
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}

      {products.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No Products Available</h3>
          <p className="text-slate-400">There are no active products in this shop.</p>
        </div>
      )}
    </div>
  )
}
