"use client"

import { useState } from "react"
import Link from "next/link"

interface ShopWithMetrics {
  id: string
  name: string
  shopSlug: string
  country: string
  isActive: boolean
  createdAt: Date
  productCount: number
  customerCount: number
  adminName: string | null
  adminEmail: string | null
  totalSales: number
  totalCollected: number
  totalOutstanding: number
  activePurchases: number
  overduePurchases: number
  staffCount: number
  collectorCount: number
}

interface ShopsContentProps {
  shops: ShopWithMetrics[]
  businessSlug: string
}

export function ShopsContent({ shops, businessSlug }: ShopsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all")
  const [sortBy, setSortBy] = useState<"name" | "sales" | "outstanding" | "customers">("name")

  // Filter shops
  const filteredShops = shops.filter((shop) => {
    const matchesSearch = 
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.shopSlug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.adminName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.adminEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && shop.isActive) ||
      (statusFilter === "suspended" && !shop.isActive)
    
    return matchesSearch && matchesStatus
  })

  // Sort shops
  const sortedShops = [...filteredShops].sort((a, b) => {
    switch (sortBy) {
      case "sales":
        return b.totalSales - a.totalSales
      case "outstanding":
        return b.totalOutstanding - a.totalOutstanding
      case "customers":
        return b.customerCount - a.customerCount
      default:
        return a.name.localeCompare(b.name)
    }
  })

  return (
    <div className="glass-card overflow-hidden">
      {/* Search & Filters */}
      <div className="p-6 border-b border-white/5">
        <div className="flex flex-col md:flex-row gap-4">
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
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["all", "active", "suspended"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {status === "all" ? "All" : status === "active" ? "Active" : "Suspended"}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="name">Sort by Name</option>
            <option value="sales">Sort by Sales</option>
            <option value="outstanding">Sort by Outstanding</option>
            <option value="customers">Sort by Customers</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
        <p className="text-sm text-slate-400">
          Showing {sortedShops.length} of {shops.length} shops
        </p>
      </div>

      {/* Shops Grid/Table */}
      {sortedShops.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No shops found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {sortedShops.map((shop) => (
            <div
              key={shop.id}
              className="p-6 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Shop Info */}
                <div className="flex items-center gap-4 lg:w-1/4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    shop.isActive
                      ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30"
                      : "bg-gradient-to-br from-slate-500/20 to-slate-500/10 border border-slate-500/30"
                  }`}>
                    <span className={`text-lg font-bold ${shop.isActive ? "text-cyan-300" : "text-slate-400"}`}>
                      {shop.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{shop.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        shop.isActive
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      }`}>
                        {shop.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-mono">{shop.shopSlug}</p>
                    {shop.adminName && (
                      <p className="text-xs text-slate-500 mt-1">Admin: {shop.adminName}</p>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Sales</p>
                    <p className="text-lg font-semibold text-white">₵{shop.totalSales.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Collected</p>
                    <p className="text-lg font-semibold text-green-400">₵{shop.totalCollected.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Outstanding</p>
                    <p className="text-lg font-semibold text-amber-400">₵{shop.totalOutstanding.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Purchases</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-white">{shop.activePurchases}</p>
                      {shop.overduePurchases > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                          {shop.overduePurchases} overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Team</p>
                    <p className="text-sm text-slate-300">
                      {shop.productCount} products • {shop.customerCount} customers
                    </p>
                    <p className="text-xs text-slate-500">
                      {shop.staffCount} staff • {shop.collectorCount} collectors
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 lg:w-auto">
                  <Link
                    href={`/business-admin/${businessSlug}/shops/${shop.shopSlug}`}
                    className="px-4 py-2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-xl text-sm font-medium hover:bg-cyan-500/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Shop
                  </Link>
                </div>
              </div>

              {/* Progress Bar */}
              {shop.totalSales > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Collection Progress</span>
                    <span>{Math.round((shop.totalCollected / shop.totalSales) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min((shop.totalCollected / shop.totalSales) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
