"use client"

import { useState } from "react"

interface Purchase {
  id: string
  productName: string
  productSku: string
  customerName: string
  customerPhone: string
  shopName: string
  shopSlug: string
  totalPrice: number
  downPayment: number
  installmentAmount: number
  installmentCount: number
  paidInstallments: number
  totalPaid: number
  outstanding: number
  status: string
  dueDate: Date | null
  isOverdue: boolean
  createdAt: Date
  lastPayment: { id: string; amount: number; paidAt: Date | null; createdAt: Date } | null
}

interface Shop {
  name: string
  shopSlug: string
}

interface PurchasesContentProps {
  purchases: Purchase[]
  shops: Shop[]
}

export function PurchasesContent({ purchases, shops }: PurchasesContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "overdue" | "completed" | "defaulted">("all")
  const [sortBy, setSortBy] = useState<"recent" | "outstanding" | "nextPayment">("recent")

  // Filter purchases
  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch = 
      purchase.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.productSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.customerPhone.includes(searchQuery)
    
    const matchesShop = shopFilter === "all" || purchase.shopSlug === shopFilter
    
    let matchesStatus = true
    if (statusFilter === "active") matchesStatus = purchase.status === "ACTIVE" && !purchase.isOverdue
    else if (statusFilter === "overdue") matchesStatus = purchase.isOverdue
    else if (statusFilter === "completed") matchesStatus = purchase.status === "COMPLETED"
    else if (statusFilter === "defaulted") matchesStatus = purchase.status === "DEFAULTED"
    
    return matchesSearch && matchesShop && matchesStatus
  })

  // Sort purchases
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    switch (sortBy) {
      case "outstanding":
        return b.outstanding - a.outstanding
      case "nextPayment":
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const formatDate = (date: Date | null) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
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
              placeholder="Search by product, customer, or phone..."
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

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "active", "overdue", "completed", "defaulted"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? status === "overdue" 
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="recent">Most Recent</option>
            <option value="outstanding">Highest Outstanding</option>
            <option value="nextPayment">Next Payment Due</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
        <p className="text-sm text-slate-400">
          Showing {sortedPurchases.length} of {purchases.length} purchases
        </p>
      </div>

      {/* Purchases List */}
      {sortedPurchases.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No purchases found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {sortedPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className={`p-6 hover:bg-white/[0.02] transition-colors ${
                purchase.isOverdue ? "border-l-2 border-l-red-500" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Product & Customer Info */}
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      purchase.isOverdue
                        ? "bg-red-500/20 border border-red-500/30"
                        : purchase.status === "COMPLETED"
                        ? "bg-green-500/20 border border-green-500/30"
                        : "bg-cyan-500/20 border border-cyan-500/30"
                    }`}>
                      <svg className={`w-5 h-5 ${
                        purchase.isOverdue ? "text-red-400" : purchase.status === "COMPLETED" ? "text-green-400" : "text-cyan-400"
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{purchase.productName}</h3>
                      <p className="text-xs text-slate-500 font-mono">{purchase.productSku}</p>
                    </div>
                  </div>
                  <div className="ml-13">
                    <p className="text-sm text-slate-300">{purchase.customerName}</p>
                    <p className="text-xs text-slate-500">{purchase.customerPhone}</p>
                  </div>
                </div>

                {/* Payment Progress */}
                <div className="lg:w-1/4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-white">{purchase.paidInstallments}/{purchase.installmentCount}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            purchase.status === "COMPLETED"
                              ? "bg-green-500"
                              : purchase.isOverdue
                              ? "bg-red-500"
                              : "bg-cyan-500"
                          }`}
                          style={{ width: `${(purchase.paidInstallments / purchase.installmentCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-slate-500">₵{purchase.installmentAmount.toLocaleString()}/installment</span>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="lg:w-1/4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total</p>
                    <p className="text-sm font-semibold text-white">₵{purchase.totalPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Paid</p>
                    <p className="text-sm font-semibold text-green-400">₵{purchase.totalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Outstanding</p>
                    <p className={`text-sm font-semibold ${purchase.outstanding > 0 ? "text-amber-400" : "text-green-400"}`}>
                      ₵{purchase.outstanding.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Status & Next Payment */}
                <div className="lg:w-1/4 flex flex-col lg:items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${
                    purchase.isOverdue
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : purchase.status === "COMPLETED"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : purchase.status === "DEFAULTED"
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}>
                    {purchase.isOverdue && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {purchase.isOverdue ? "Overdue" : purchase.status}
                  </span>
                  
                  {purchase.dueDate && purchase.status === "ACTIVE" && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Due Date</p>
                      <p className={`text-sm ${purchase.isOverdue ? "text-red-400" : "text-slate-300"}`}>
                        {formatDate(purchase.dueDate)}
                      </p>
                    </div>
                  )}
                  
                  <span className="text-xs text-slate-500 px-2 py-1 bg-white/5 rounded-lg">
                    {purchase.shopName}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
