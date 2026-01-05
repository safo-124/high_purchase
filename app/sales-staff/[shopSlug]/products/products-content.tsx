"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string | null
  sku: string | null
  price: number
  stockQuantity: number
  categoryName: string | null
  categoryColor: string | null
}

interface ProductsContentProps {
  products: Product[]
  shopSlug: string
}

export function ProductsContent({ products, shopSlug }: ProductsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get unique categories with counts
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { name: string; color: string | null; count: number }>()
    
    products.forEach((product) => {
      const categoryName = product.categoryName || "Uncategorized"
      const existing = categoryMap.get(categoryName)
      if (existing) {
        existing.count++
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          color: product.categoryColor,
          count: 1,
        })
      }
    })
    
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = !selectedCategory || 
        (product.categoryName || "Uncategorized") === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  // Stats for filtered products
  const totalInStock = filteredProducts.filter((p) => p.stockQuantity > 0).length
  const totalOutOfStock = filteredProducts.filter((p) => p.stockQuantity === 0).length

  return (
    <div className="p-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Products</h1>
          <p className="text-slate-400">Browse available products for sale</p>
        </div>
        <div className="flex-1" />
        {/* Search Input */}
        <div className="relative">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === null
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            All ({products.length})
          </button>
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                selectedCategory === category.name
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category.color && (
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
              )}
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">
            {selectedCategory || searchQuery ? "Showing" : "Total Products"}
          </p>
          <p className="text-2xl font-bold text-white">{filteredProducts.length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">In Stock</p>
          <p className="text-2xl font-bold text-green-400">{totalInStock}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-400">{totalOutOfStock}</p>
        </div>
      </div>

      {/* Clear Filters */}
      {(searchQuery || selectedCategory) && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-400">
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <button
            onClick={() => {
              setSearchQuery("")
              setSelectedCategory(null)
            }}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-slate-400 mb-2">No products found</p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory(null)
                }}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map((product) => (
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center mb-4">
                <span className="text-lg font-semibold text-indigo-300">
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
    </div>
  )
}
