"use client"

import { useState } from "react"

interface Customer {
  id: string
  fullName: string
  phone: string
  idType: string | null
  idNumber: string | null
  createdAt: Date
  shopName: string
  shopSlug: string
  totalPurchases: number
  activePurchases: number
  totalPurchased: number
  totalPaid: number
  outstanding: number
}

interface Shop {
  name: string
  shopSlug: string
}

interface CustomersContentProps {
  customers: Customer[]
  shops: Shop[]
}

export function CustomersContent({ customers, shops }: CustomersContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cleared">("all")
  const [sortBy, setSortBy] = useState<"name" | "outstanding" | "recent">("name")

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      (customer.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone || "").includes(searchQuery) ||
      (customer.idNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesShop = shopFilter === "all" || customer.shopSlug === shopFilter
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && customer.activePurchases > 0) ||
      (statusFilter === "cleared" && customer.outstanding === 0 && customer.totalPurchases > 0)
    
    return matchesSearch && matchesShop && matchesStatus
  })

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case "outstanding":
        return b.outstanding - a.outstanding
      case "recent":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return a.fullName.localeCompare(b.fullName)
    }
  })

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
              placeholder="Search by name, phone, or ID..."
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
          <div className="flex gap-2">
            {(["all", "active", "cleared"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {status === "all" ? "All" : status === "active" ? "Active HP" : "Cleared"}
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
            <option value="outstanding">Sort by Outstanding</option>
            <option value="recent">Sort by Recent</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
        <p className="text-sm text-slate-400">
          Showing {sortedCustomers.length} of {customers.length} customers
        </p>
      </div>

      {/* Customers Table */}
      {sortedCustomers.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Purchases</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-cyan-300">
                          {(customer.fullName || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{customer.fullName || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{customer.phone || "N/A"}</p>
                        <p className="text-xs text-slate-600">{customer.idType || "ID"}: {customer.idNumber || "N/A"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                      {customer.shopName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{customer.totalPurchases}</p>
                      {customer.activePurchases > 0 && (
                        <p className="text-xs text-cyan-400">{customer.activePurchases} active</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">₵{customer.totalPurchased.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-green-400 font-medium">₵{customer.totalPaid.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`font-medium ${customer.outstanding > 0 ? "text-amber-400" : "text-green-400"}`}>
                      ₵{customer.outstanding.toLocaleString()}
                    </p>
                    {customer.totalPurchased > 0 && (
                      <div className="w-24 h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          style={{ width: `${(customer.totalPaid / customer.totalPurchased) * 100}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {customer.activePurchases > 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Active HP
                      </span>
                    ) : customer.outstanding === 0 && customer.totalPurchases > 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Cleared
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        New
                      </span>
                    )}
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
