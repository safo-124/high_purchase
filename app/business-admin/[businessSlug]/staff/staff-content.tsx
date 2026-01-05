"use client"

import { useState } from "react"

interface StaffMember {
  id: string
  userId: string
  userName: string | null
  userEmail: string
  role: string
  isActive: boolean
  shopName: string
  shopSlug: string
  createdAt: Date
}

interface Shop {
  name: string
  shopSlug: string
}

interface StaffContentProps {
  staff: StaffMember[]
  shops: Shop[]
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  SHOP_ADMIN: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  SALES_STAFF: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  DEBT_COLLECTOR: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
}

const roleLabels: Record<string, string> = {
  SHOP_ADMIN: "Shop Admin",
  SALES_STAFF: "Sales Staff",
  DEBT_COLLECTOR: "Collector",
}

export function StaffContent({ staff, shops }: StaffContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<"all" | "SHOP_ADMIN" | "SALES_STAFF" | "DEBT_COLLECTOR">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = 
      member.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesShop = shopFilter === "all" || member.shopSlug === shopFilter
    const matchesRole = roleFilter === "all" || member.role === roleFilter
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && member.isActive) ||
      (statusFilter === "inactive" && !member.isActive)
    
    return matchesSearch && matchesShop && matchesRole && matchesStatus
  })

  // Group by shop for display
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    // First by shop
    const shopCompare = a.shopName.localeCompare(b.shopName)
    if (shopCompare !== 0) return shopCompare
    // Then by role (admins first)
    const roleOrder = { SHOP_ADMIN: 0, SALES_STAFF: 1, DEBT_COLLECTOR: 2 }
    return (roleOrder[a.role as keyof typeof roleOrder] || 9) - (roleOrder[b.role as keyof typeof roleOrder] || 9)
  })

  const formatDate = (date: Date) => {
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
              placeholder="Search by name or email..."
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

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Roles</option>
            <option value="SHOP_ADMIN">Shop Admins</option>
            <option value="SALES_STAFF">Sales Staff</option>
            <option value="DEBT_COLLECTOR">Collectors</option>
          </select>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
        <p className="text-sm text-slate-400">
          Showing {sortedStaff.length} of {staff.length} staff members
        </p>
      </div>

      {/* Staff List */}
      {sortedStaff.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No staff found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedStaff.map((member) => {
                const colors = roleColors[member.role] || roleColors.SALES_STAFF
                return (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                          <span className={`text-sm font-semibold ${colors.text}`}>
                            {(member.userName || member.userEmail).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{member.userName || "No Name"}</p>
                          <p className="text-xs text-slate-500">{member.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                        {member.shopName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        member.isActive
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? "bg-green-400" : "bg-red-400"}`} />
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-400">{formatDate(member.createdAt)}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
