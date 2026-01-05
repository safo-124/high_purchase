"use client"

import { useState } from "react"

interface Payment {
  id: string
  amount: number
  paidAt: Date | null
  paymentMethod: string
  notes: string | null
  productName: string
  customerName: string
  customerPhone: string
  shopName: string
  shopSlug: string
  collectorName: string
  collectorEmail: string | null
  createdAt: Date
}

interface Shop {
  name: string
  shopSlug: string
}

interface PaymentsContentProps {
  payments: Payment[]
  shops: Shop[]
}

export function PaymentsContent({ payments, shops }: PaymentsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all")
  const [sortBy, setSortBy] = useState<"recent" | "amount">("recent")

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      (payment.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.customerPhone || "").includes(searchQuery) ||
      (payment.productName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.collectorName || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesShop = shopFilter === "all" || payment.shopSlug === shopFilter
    
    let matchesDate = true
    const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.createdAt)
    const today = new Date()
    
    if (dateFilter === "today") {
      matchesDate = paidAt.toDateString() === today.toDateString()
    } else if (dateFilter === "week") {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      matchesDate = paidAt >= weekAgo
    } else if (dateFilter === "month") {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      matchesDate = paidAt >= monthAgo
    }
    
    return matchesSearch && matchesShop && matchesDate
  })

  // Sort payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    switch (sortBy) {
      case "amount":
        return b.amount - a.amount
      default:
        const dateA = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.createdAt).getTime()
        const dateB = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.createdAt).getTime()
        return dateB - dateA
    }
  })

  // Calculate filtered totals
  const filteredTotal = sortedPayments.reduce((sum, p) => sum + p.amount, 0)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
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
              placeholder="Search by customer, product, or collector..."
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

          {/* Date Filter */}
          <div className="flex gap-2">
            {(["all", "today", "week", "month"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  dateFilter === period
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {period === "all" ? "All Time" : period === "today" ? "Today" : period === "week" ? "This Week" : "This Month"}
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
            <option value="amount">Highest Amount</option>
          </select>
        </div>
      </div>

      {/* Results Count & Total */}
      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing {sortedPayments.length} of {payments.length} payments
        </p>
        <p className="text-sm font-medium text-green-400">
          Total: ₵{filteredTotal.toLocaleString()}
        </p>
      </div>

      {/* Payments List */}
      {sortedPayments.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No payments found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Collector</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-white font-medium">{formatDate(payment.paidAt || payment.createdAt)}</p>
                      <p className="text-xs text-slate-500">{formatTime(payment.paidAt || payment.createdAt)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-white">{payment.customerName}</p>
                      <p className="text-xs text-slate-500">{payment.customerPhone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300">{payment.productName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400">
                      {payment.shopName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300">{payment.collectorName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      payment.paymentMethod === "CASH"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : payment.paymentMethod === "MOBILE_MONEY"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {payment.paymentMethod.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-lg font-semibold text-green-400">₵{payment.amount.toLocaleString()}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
