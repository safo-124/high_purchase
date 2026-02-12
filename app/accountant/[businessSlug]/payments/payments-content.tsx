"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PaymentForAccountant, accountantConfirmPayment } from "../../actions"

interface Shop {
  id: string
  name: string
  shopSlug: string
  isActive: boolean
}

interface Props {
  payments: PaymentForAccountant[]
  shops: Shop[]
  businessSlug: string
  canConfirmPayments: boolean
  initialFilters: {
    status: string
    shopId: string
    startDate: string
    endDate: string
    search: string
  }
}

export function PaymentsContent({
  payments,
  shops,
  businessSlug,
  canConfirmPayments,
  initialFilters,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filters, setFilters] = useState(initialFilters)
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null)

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

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (filters.status && filters.status !== "all") params.set("status", filters.status)
    if (filters.shopId) params.set("shopId", filters.shopId)
    if (filters.startDate) params.set("startDate", filters.startDate)
    if (filters.endDate) params.set("endDate", filters.endDate)
    if (filters.search) params.set("search", filters.search)

    startTransition(() => {
      router.push(`/accountant/${businessSlug}/payments?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setFilters({
      status: "all",
      shopId: "",
      startDate: "",
      endDate: "",
      search: "",
    })
    startTransition(() => {
      router.push(`/accountant/${businessSlug}/payments`)
    })
  }

  const handleConfirmPayment = async (paymentId: string) => {
    if (!canConfirmPayments) return

    setConfirmingPaymentId(paymentId)
    try {
      const result = await accountantConfirmPayment(businessSlug, paymentId)
      if (result.success) {
        startTransition(() => {
          router.refresh()
        })
      } else {
        alert(result.error || "Failed to confirm payment")
      }
    } catch {
      alert("An error occurred while confirming payment")
    } finally {
      setConfirmingPaymentId(null)
    }
  }

  const getStatusBadge = (payment: PaymentForAccountant) => {
    if (payment.isConfirmed) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Confirmed
        </span>
      )
    }
    if (payment.rejectedAt) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
          Rejected
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
        Pending
      </span>
    )
  }

  const getPaymentMethodBadge = (method: string) => {
    const methods: Record<string, { label: string; color: string }> = {
      CASH: { label: "Cash", color: "emerald" },
      MOBILE_MONEY: { label: "Mobile Money", color: "amber" },
      BANK_TRANSFER: { label: "Bank Transfer", color: "blue" },
      WALLET: { label: "Wallet", color: "purple" },
    }

    const methodInfo = methods[method] || { label: method, color: "gray" }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${methodInfo.color}-500/20 text-${methodInfo.color}-400 border border-${methodInfo.color}-500/30`}>
        {methodInfo.label}
      </span>
    )
  }

  // Calculate summary stats
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const confirmedCount = payments.filter(p => p.isConfirmed).length
  const pendingCount = payments.filter(p => !p.isConfirmed && !p.rejectedAt).length

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">Search</label>
            <input
              type="text"
              placeholder="Customer name, phone, reference..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-40">
            <label className="block text-sm text-slate-400 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Shop Filter */}
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

          {/* Date Range */}
          <div className="w-full lg:w-40">
            <label className="block text-sm text-slate-400 mb-2">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="w-full lg:w-40">
            <label className="block text-sm text-slate-400 mb-2">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
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
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Payments</p>
          <p className="text-2xl font-bold text-white">{payments.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Amount</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Confirmed</p>
          <p className="text-2xl font-bold text-white">{confirmedCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass-card overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No payments found</h3>
            <p className="text-slate-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Shop</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-400">Method</th>
                  <th className="text-center p-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Collector</th>
                  {canConfirmPayments && (
                    <th className="text-center p-4 text-sm font-medium text-slate-400">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="text-sm text-white">{formatDate(payment.createdAt)}</div>
                      <div className="text-xs text-slate-500">{formatTime(payment.createdAt)}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-white">{payment.customerName}</div>
                      <div className="text-xs text-slate-400">{payment.customerPhone}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-300">{payment.shopName}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {getPaymentMethodBadge(payment.paymentMethod)}
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(payment)}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-400">
                        {payment.collectorName || "System"}
                      </span>
                    </td>
                    {canConfirmPayments && (
                      <td className="p-4 text-center">
                        {!payment.isConfirmed && !payment.rejectedAt && (
                          <button
                            onClick={() => handleConfirmPayment(payment.id)}
                            disabled={confirmingPaymentId === payment.id}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            {confirmingPaymentId === payment.id ? "..." : "Confirm"}
                          </button>
                        )}
                      </td>
                    )}
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
