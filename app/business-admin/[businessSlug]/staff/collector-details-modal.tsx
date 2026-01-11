"use client"

import { useState, useEffect } from "react"
import { getCollectorDetails, type CollectorDetailsData } from "../../actions"

interface CollectorDetailsModalProps {
  collectorId: string
  businessSlug: string
  onClose: () => void
}

export function CollectorDetailsModal({ collectorId, businessSlug, onClose }: CollectorDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CollectorDetailsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "customers" | "payments">("overview")

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const result = await getCollectorDetails(businessSlug, collectorId)
      if (result.success && result.data) {
        setData(result.data as CollectorDetailsData)
      } else {
        setError(result.error || "Failed to load collector details")
      }
      setLoading(false)
    }
    fetchData()
  }, [collectorId, businessSlug])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden glass-card">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Collector Transaction Sheet</h2>
              <p className="text-sm text-slate-400">View performance and collection history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          ) : data ? (
            <div className="p-6 space-y-6">
              {/* Collector Info */}
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-amber-400">
                    {data.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{data.name}</h3>
                  <p className="text-sm text-slate-400">{data.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-slate-300">
                      {data.shopName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${data.isActive ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                      {data.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-slate-500">
                      Joined {formatDate(data.joinedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                  <p className="text-xs text-slate-400 mb-1">Customers Signed Up</p>
                  <p className="text-2xl font-bold text-cyan-400">{data.stats.totalCustomersSignedUp}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                  <p className="text-xs text-slate-400 mb-1">Assigned Customers</p>
                  <p className="text-2xl font-bold text-purple-400">{data.stats.assignedCustomers}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                  <p className="text-xs text-slate-400 mb-1">Total Collected</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(data.stats.totalAmountCollected)}</p>
                  <p className="text-xs text-slate-500 mt-1">{data.stats.totalPaymentsCollected} payments</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <p className="text-xs text-slate-400 mb-1">Pending Confirmation</p>
                  <p className="text-2xl font-bold text-amber-400">{formatCurrency(data.stats.pendingAmount)}</p>
                  <p className="text-xs text-slate-500 mt-1">{data.stats.pendingPayments} payments</p>
                </div>
              </div>

              {/* Confirmed vs Pending */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-white">Confirmed Payments</span>
                  </div>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(data.stats.confirmedAmount)}</p>
                  <p className="text-xs text-slate-500">{data.stats.confirmedPayments} payments confirmed</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-white">Pending Confirmation</span>
                  </div>
                  <p className="text-xl font-bold text-amber-400">{formatCurrency(data.stats.pendingAmount)}</p>
                  <p className="text-xs text-slate-500">{data.stats.pendingPayments} payments awaiting</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-white/10 pb-2">
                {(["overview", "customers", "payments"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? "bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-400"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab === "overview" ? "Overview" : tab === "customers" ? "Assigned Customers" : "Payment History"}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">Performance Summary</h4>
                  <div className="grid gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Collection Rate</span>
                        <span className="text-sm font-medium text-white">
                          {data.stats.totalPaymentsCollected > 0 
                            ? Math.round((data.stats.confirmedPayments / data.stats.totalPaymentsCollected) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          style={{ 
                            width: `${data.stats.totalPaymentsCollected > 0 
                              ? (data.stats.confirmedPayments / data.stats.totalPaymentsCollected) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-center py-4 text-slate-400 text-sm">
                      <p>This collector has collected a total of <span className="text-white font-semibold">{formatCurrency(data.stats.totalAmountCollected)}</span></p>
                      <p>from <span className="text-white font-semibold">{data.stats.totalPaymentsCollected}</span> payments across <span className="text-white font-semibold">{data.stats.assignedCustomers}</span> assigned customers.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "customers" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">
                    Assigned Customers ({data.assignedCustomers.length})
                  </h4>
                  {data.assignedCustomers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No customers assigned to this collector
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white/[0.02]">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Phone</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Active Purchases</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Outstanding</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.assignedCustomers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3">
                                <p className="font-medium text-white">{customer.fullName}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400">{customer.phone}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  customer.activePurchases > 0 
                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                    : "bg-white/5 text-slate-400 border border-white/10"
                                }`}>
                                  {customer.activePurchases}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={customer.outstandingBalance > 0 ? "text-amber-400" : "text-green-400"}>
                                  {formatCurrency(customer.outstandingBalance)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "payments" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">
                    Payment Collection History (Last 50)
                  </h4>
                  {data.paymentHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No payments collected yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white/[0.02]">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Purchase</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Amount</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.paymentHistory.map((payment) => (
                            <tr key={payment.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3">
                                <p className="text-sm text-white">{formatDateTime(payment.createdAt)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-white text-sm">{payment.customerName}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-slate-400">{payment.purchaseNumber}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-300">
                                  {payment.paymentMethod.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-400">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {payment.isConfirmed ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-xs">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Confirmed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pending
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
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
