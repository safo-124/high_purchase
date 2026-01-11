"use client"

import { useState, useEffect } from "react"
import { getSalesStaffDetails, type SalesStaffDetailsData } from "../../actions"

interface SalesStaffDetailsModalProps {
  staffId: string
  businessSlug: string
  onClose: () => void
}

export function SalesStaffDetailsModal({ staffId, businessSlug, onClose }: SalesStaffDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SalesStaffDetailsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "deliveries">("overview")

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const result = await getSalesStaffDetails(businessSlug, staffId)
      if (result.success && result.data) {
        setData(result.data as SalesStaffDetailsData)
      } else {
        setError(result.error || "Failed to load sales staff details")
      }
      setLoading(false)
    }
    fetchData()
  }, [staffId, businessSlug])

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

  const purchaseTypeColors: Record<string, string> = {
    CASH: "bg-green-500/10 text-green-400 border-green-500/20",
    CREDIT: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    LAYAWAY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }

  const deliveryStatusColors: Record<string, string> = {
    PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    SCHEDULED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    IN_TRANSIT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    DELIVERED: "bg-green-500/10 text-green-400 border-green-500/20",
    FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden glass-card">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sales Staff Transaction Sheet</h2>
              <p className="text-sm text-slate-400">View sales performance and activity</p>
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
              {/* Staff Info */}
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-cyan-400">
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
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                  <p className="text-xs text-slate-400 mb-1">Cash Sales</p>
                  <p className="text-2xl font-bold text-green-400">{data.stats.cashSales}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatCurrency(data.stats.cashSalesAmount)}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                  <p className="text-xs text-slate-400 mb-1">Products Sold</p>
                  <p className="text-2xl font-bold text-purple-400">{data.stats.totalProductsSold}</p>
                  <p className="text-xs text-slate-500 mt-1">{data.stats.totalSales} transactions</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <p className="text-xs text-slate-400 mb-1">Delivered Items</p>
                  <p className="text-2xl font-bold text-amber-400">{data.stats.deliveredItems}</p>
                  <p className="text-xs text-slate-500 mt-1">{data.stats.pendingDeliveries} pending</p>
                </div>
              </div>

              {/* Sales by Type */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-green-400"></span>
                    <span className="text-sm font-medium text-white">Cash Sales</span>
                  </div>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(data.stats.cashSalesAmount)}</p>
                  <p className="text-xs text-slate-500">{data.stats.cashSales} sales</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                    <span className="text-sm font-medium text-white">Credit Sales</span>
                  </div>
                  <p className="text-xl font-bold text-purple-400">{formatCurrency(data.stats.creditSalesAmount)}</p>
                  <p className="text-xs text-slate-500">{data.stats.creditSales} sales</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                    <span className="text-sm font-medium text-white">Layaway Sales</span>
                  </div>
                  <p className="text-xl font-bold text-blue-400">{formatCurrency(data.stats.layawaySalesAmount)}</p>
                  <p className="text-xs text-slate-500">{data.stats.layawaySales} sales</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-white/10 pb-2">
                {(["overview", "sales", "deliveries"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? "bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-400"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab === "overview" ? "Overview" : tab === "sales" ? "Recent Sales" : "Deliveries Made"}
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
                        <span className="text-sm text-slate-400">Cash Sale Rate</span>
                        <span className="text-sm font-medium text-white">
                          {data.stats.totalSales > 0 
                            ? Math.round((data.stats.cashSales / data.stats.totalSales) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          style={{ 
                            width: `${data.stats.totalSales > 0 
                              ? (data.stats.cashSales / data.stats.totalSales) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-center py-4 text-slate-400 text-sm">
                      <p>This sales staff has completed <span className="text-white font-semibold">{data.stats.totalSales}</span> sales</p>
                      <p>totaling <span className="text-white font-semibold">{formatCurrency(data.stats.cashSalesAmount + data.stats.creditSalesAmount + data.stats.layawaySalesAmount)}</span></p>
                      <p className="mt-2">with <span className="text-white font-semibold">{data.stats.totalProductsSold}</span> products sold and <span className="text-white font-semibold">{data.stats.deliveredItems}</span> deliveries made.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sales" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">
                    Recent Sales ({data.recentSales.length})
                  </h4>
                  {data.recentSales.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No sales recorded yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white/[0.02]">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Purchase</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Customer</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Type</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Products</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Amount</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Delivery</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.recentSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3">
                                <p className="text-sm text-white">{formatDate(sale.createdAt)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono text-slate-400">{sale.purchaseNumber}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-white text-sm">{sale.customerName}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${purchaseTypeColors[sale.purchaseType]}`}>
                                  {sale.purchaseType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm text-slate-300">{sale.productCount}</span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-400">
                                {formatCurrency(sale.totalAmount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${deliveryStatusColors[sale.deliveryStatus]}`}>
                                  {sale.deliveryStatus}
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

              {activeTab === "deliveries" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">
                    Deliveries Made ({data.deliveries.length})
                  </h4>
                  {data.deliveries.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No deliveries made yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white/[0.02]">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Delivered At</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Purchase</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Products</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.deliveries.map((delivery) => (
                            <tr key={delivery.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3">
                                <p className="text-sm text-white">
                                  {delivery.deliveredAt ? formatDateTime(delivery.deliveredAt) : "-"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono text-slate-400">{delivery.purchaseNumber}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-white text-sm">{delivery.customerName}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-400 truncate max-w-[200px]" title={delivery.productNames.join(", ")}>
                                  {delivery.productNames.join(", ")}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${deliveryStatusColors[delivery.deliveryStatus]}`}>
                                  {delivery.deliveryStatus}
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
