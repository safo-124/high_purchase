"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CustomerForAccountant, exportCustomerData } from "../../actions"

interface Shop {
  id: string
  name: string
  shopSlug: string
  isActive: boolean
}

interface Props {
  customers: CustomerForAccountant[]
  shops: Shop[]
  businessSlug: string
  canExportData: boolean
  initialFilters: {
    shopId: string
    status: string
    search: string
  }
}

export function CustomersContent({
  customers,
  shops,
  businessSlug,
  canExportData,
  initialFilters,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filters, setFilters] = useState(initialFilters)
  const [isExporting, setIsExporting] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (filters.shopId) params.set("shopId", filters.shopId)
    if (filters.status && filters.status !== "all") params.set("status", filters.status)
    if (filters.search) params.set("search", filters.search)

    startTransition(() => {
      router.push(`/accountant/${businessSlug}/customers?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setFilters({ shopId: "", status: "all", search: "" })
    startTransition(() => {
      router.push(`/accountant/${businessSlug}/customers`)
    })
  }

  const handleExport = async () => {
    if (!canExportData) return

    setIsExporting(true)
    try {
      const data = await exportCustomerData(businessSlug, {
        shopId: filters.shopId || undefined,
        status: filters.status as "all" | "active" | "overdue" | "completed" | undefined,
      })

      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(",")
      const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(","))
      const csv = [headers, ...rows].join("\n")

      // Download
      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert("Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: {
        label: "Active",
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      },
      overdue: {
        label: "Overdue",
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      completed: {
        label: "Completed",
        className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      },
    }

    const badge = badges[status] || { label: status, className: "bg-gray-500/20 text-gray-400 border-gray-500/30" }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  // Calculate summary stats
  const totalOutstanding = customers.reduce((sum, c) => sum + c.totalOutstanding, 0)
  const totalOverdue = customers.reduce((sum, c) => sum + c.overdueAmount, 0)
  const overdueCustomers = customers.filter(c => c.status === "overdue").length

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">Search</label>
            <input
              type="text"
              placeholder="Name, phone, or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="w-full lg:w-48">
            <label className="block text-sm text-slate-400 mb-2">Shop</label>
            <select
              value={filters.shopId}
              onChange={(e) => setFilters({ ...filters, shopId: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-40">
            <label className="block text-sm text-slate-400 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={applyFilters}
            disabled={isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            {isPending ? "Applying..." : "Apply Filters"}
          </button>
          {canExportData && (
            <button
              onClick={handleExport}
              disabled={isExporting || customers.length === 0}
              className="px-6 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Customers</p>
          <p className="text-2xl font-bold text-white">{customers.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Outstanding</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Overdue Amount</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Overdue Customers</p>
          <p className="text-2xl font-bold text-red-400">{overdueCustomers}</p>
        </div>
      </div>

      {/* Customers Table */}
      <div className="glass-card overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
            <p className="text-slate-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Shop</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Total Purchases</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Paid</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Outstanding</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Overdue</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Registered</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="text-sm font-medium text-white">{customer.firstName} {customer.lastName}</div>
                      <div className="text-xs text-slate-400">{customer.phone}</div>
                      {customer.email && (
                        <div className="text-xs text-slate-500">{customer.email}</div>
                      )}
                    </td>
                    <td className="p-4 text-slate-300">{customer.shopName}</td>
                    <td className="p-4 text-right text-slate-300">{formatCurrency(customer.totalPurchases)}</td>
                    <td className="p-4 text-right text-emerald-400">{formatCurrency(customer.totalPaid)}</td>
                    <td className="p-4 text-right text-amber-400 font-medium">
                      {formatCurrency(customer.totalOutstanding)}
                    </td>
                    <td className="p-4 text-right text-red-400 font-medium">
                      {customer.overdueAmount > 0 ? formatCurrency(customer.overdueAmount) : "-"}
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(customer.status)}</td>
                    <td className="p-4 text-slate-400 text-sm">{formatDate(customer.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
