"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { confirmBusinessPayment, rejectBusinessPayment, type BusinessPaymentForAdmin } from "../../actions"

interface Shop {
  name: string
  shopSlug: string
}

interface PaymentsContentProps {
  payments: BusinessPaymentForAdmin[]
  businessSlug: string
  stats: {
    pending: { count: number; total: number }
    confirmed: { count: number; total: number }
    rejected: { count: number; total: number }
  }
  shops: Shop[]
  initialTab: "pending" | "confirmed" | "rejected"
  startDate: string
  endDate: string
}

export function PaymentsContent({
  payments,
  businessSlug,
  stats,
  shops,
  initialTab,
  startDate,
  endDate,
}: PaymentsContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed" | "rejected">(initialTab)
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<BusinessPaymentForAdmin | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)
  const [searchTerm, setSearchTerm] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const handleTabChange = (tab: "pending" | "confirmed" | "rejected") => {
    setActiveTab(tab)
    const params = new URLSearchParams()
    params.set("tab", tab)
    if (dateStart) params.set("startDate", dateStart)
    if (dateEnd) params.set("endDate", dateEnd)
    router.push(`/business-admin/${businessSlug}/payments?${params.toString()}`)
  }

  const handleDateFilter = () => {
    const params = new URLSearchParams()
    params.set("tab", activeTab)
    if (dateStart) params.set("startDate", dateStart)
    if (dateEnd) params.set("endDate", dateEnd)
    router.push(`/business-admin/${businessSlug}/payments?${params.toString()}`)
  }

  const clearDateFilter = () => {
    setDateStart("")
    setDateEnd("")
    const params = new URLSearchParams()
    params.set("tab", activeTab)
    router.push(`/business-admin/${businessSlug}/payments?${params.toString()}`)
  }

  const handleConfirm = async (paymentId: string) => {
    setProcessingId(paymentId)
    startTransition(async () => {
      const result = await confirmBusinessPayment(businessSlug, paymentId)
      if (!result.success) {
        alert(result.error || "Failed to confirm payment")
      }
      setProcessingId(null)
    })
  }

  const openRejectModal = (payment: BusinessPaymentForAdmin) => {
    setSelectedPayment(payment)
    setRejectReason("")
    setRejectModalOpen(true)
  }

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason.trim()) {
      alert("Please provide a reason for rejection")
      return
    }

    setProcessingId(selectedPayment.id)
    startTransition(async () => {
      const result = await rejectBusinessPayment(businessSlug, selectedPayment.id, rejectReason)
      if (!result.success) {
        alert(result.error || "Failed to reject payment")
      }
      setRejectModalOpen(false)
      setSelectedPayment(null)
      setRejectReason("")
      setProcessingId(null)
    })
  }

  const filteredPayments = payments.filter((p) => {
    // First filter by status
    let statusMatch = false
    if (activeTab === "pending") statusMatch = !p.isConfirmed && !p.rejectedAt
    else if (activeTab === "confirmed") statusMatch = p.isConfirmed
    else if (activeTab === "rejected") statusMatch = !!p.rejectedAt
    else statusMatch = true

    if (!statusMatch) return false

    // Filter by shop
    if (shopFilter !== "all" && p.shopSlug !== shopFilter) return false

    // Then filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      const collectorMatch = p.collectorName?.toLowerCase().includes(search) || false
      const customerMatch = p.customerName.toLowerCase().includes(search)
      const shopMatch = p.shopName.toLowerCase().includes(search)
      return collectorMatch || customerMatch || shopMatch
    }

    return true
  })

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => handleTabChange("pending")}
          className={`glass-card p-5 rounded-2xl cursor-pointer transition-all ${
            activeTab === "pending" ? "ring-2 ring-amber-500/50" : "hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-400">{stats.pending.count}</p>
              <p className="text-sm text-slate-400">{formatCurrency(stats.pending.total)}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => handleTabChange("confirmed")}
          className={`glass-card p-5 rounded-2xl cursor-pointer transition-all ${
            activeTab === "confirmed" ? "ring-2 ring-green-500/50" : "hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Confirmed</p>
              <p className="text-2xl font-bold text-green-400">{stats.confirmed.count}</p>
              <p className="text-sm text-slate-400">{formatCurrency(stats.confirmed.total)}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => handleTabChange("rejected")}
          className={`glass-card p-5 rounded-2xl cursor-pointer transition-all ${
            activeTab === "rejected" ? "ring-2 ring-red-500/50" : "hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rejected</p>
              <p className="text-2xl font-bold text-red-400">{stats.rejected.count}</p>
              <p className="text-sm text-slate-400">{formatCurrency(stats.rejected.total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search collector, customer, or shop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-64"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-white/10 hidden md:block" />

          {/* Shop Filter */}
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="all">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.shopSlug} value={shop.shopSlug}>
                {shop.name}
              </option>
            ))}
          </select>

          <div className="h-6 w-px bg-white/10 hidden md:block" />

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-300">Date:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <button
            onClick={handleDateFilter}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-all"
          >
            Apply Filter
          </button>
          {(dateStart || dateEnd) && (
            <button
              onClick={clearDateFilter}
              className="px-4 py-2 rounded-xl bg-slate-500/20 text-slate-400 text-sm font-medium hover:bg-slate-500/30 transition-all"
            >
              Clear
            </button>
          )}
        </div>
        {(dateStart || dateEnd || searchTerm || shopFilter !== "all") && (
          <p className="mt-2 text-xs text-slate-400">
            {searchTerm && <span>Searching for &quot;{searchTerm}&quot;</span>}
            {searchTerm && shopFilter !== "all" && <span> • </span>}
            {shopFilter !== "all" && <span>Shop: {shops.find(s => s.shopSlug === shopFilter)?.name}</span>}
            {(searchTerm || shopFilter !== "all") && (dateStart || dateEnd) && <span> • </span>}
            {(dateStart || dateEnd) && <span>Date: {dateStart || "beginning"} to {dateEnd || "now"}</span>}
          </p>
        )}
      </div>

      {/* Tab Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${
          activeTab === "pending" ? "bg-amber-400" :
          activeTab === "confirmed" ? "bg-green-400" : "bg-red-400"
        }`} />
        <h3 className="text-lg font-semibold text-white">
          {activeTab === "pending" && "Pending Payments"}
          {activeTab === "confirmed" && "Confirmed Payments"}
          {activeTab === "rejected" && "Rejected Payments"}
        </h3>
        <span className="text-slate-400 text-sm">({filteredPayments.length})</span>
      </div>

      {/* Payments Table */}
      <div className="glass-card rounded-2xl p-6">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {activeTab === "pending" ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              )}
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">
              {activeTab === "pending" && "All Caught Up!"}
              {activeTab === "confirmed" && "No Confirmed Payments"}
              {activeTab === "rejected" && "No Rejected Payments"}
            </h3>
            <p className="text-slate-400 text-sm">
              {activeTab === "pending" && "No payments pending confirmation"}
              {activeTab === "confirmed" && "No confirmed payments in this date range"}
              {activeTab === "rejected" && "No rejected payments in this date range"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Collector</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Shop</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Purchase</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Method</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Amount</th>
                  {activeTab === "rejected" && (
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Reason</th>
                  )}
                  {activeTab === "confirmed" && (
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Confirmed At</th>
                  )}
                  {activeTab === "pending" && (
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-4 px-4 text-sm text-slate-300">
                      {formatDate(payment.paidAt || payment.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-300">{payment.collectorName || "Direct"}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-white font-medium">{payment.customerName}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {payment.shopName}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-400">
                      {payment.purchaseNumber}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">
                        {payment.paymentMethod.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`text-sm font-semibold ${
                        activeTab === "confirmed" ? "text-green-400" :
                        activeTab === "rejected" ? "text-red-400" : "text-white"
                      }`}>
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    {activeTab === "rejected" && (
                      <td className="py-4 px-4 text-sm text-red-400 max-w-[200px] truncate">
                        {payment.rejectionReason || "-"}
                      </td>
                    )}
                    {activeTab === "confirmed" && (
                      <td className="py-4 px-4 text-sm text-green-400">
                        {formatDate(payment.confirmedAt)}
                      </td>
                    )}
                    {activeTab === "pending" && (
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleConfirm(payment.id)}
                            disabled={isPending && processingId === payment.id}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {isPending && processingId === payment.id ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Confirm
                          </button>
                          <button
                            onClick={() => openRejectModal(payment)}
                            disabled={isPending && processingId === payment.id}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">Reject Payment</h3>
            <p className="text-sm text-slate-400 mb-4">
              You are about to reject a payment of{" "}
              <span className="text-white font-medium">{formatCurrency(selectedPayment.amount)}</span> collected by{" "}
              <span className="text-white">{selectedPayment.collectorName || "Unknown"}</span> from{" "}
              <span className="text-cyan-400">{selectedPayment.shopName}</span>.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                placeholder="e.g., Payment not received, incorrect amount, etc."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModalOpen(false)
                  setSelectedPayment(null)
                  setRejectReason("")
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Rejecting..." : "Reject Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
