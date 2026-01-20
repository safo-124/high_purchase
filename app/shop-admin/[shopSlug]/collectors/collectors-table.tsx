"use client"

import { useState } from "react"
import { DebtCollectorData, toggleDebtCollectorStatus, getCollectorPerformanceData, CollectorPerformanceData } from "../../actions"
import { toast } from "sonner"

interface CollectorsTableProps {
  collectors: DebtCollectorData[]
  shopSlug: string
}

export function CollectorsTable({ collectors, shopSlug }: CollectorsTableProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null)
  
  // Performance sheet modal state
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [selectedCollector, setSelectedCollector] = useState<DebtCollectorData | null>(null)
  const [performanceData, setPerformanceData] = useState<CollectorPerformanceData | null>(null)
  const [loadingPerformance, setLoadingPerformance] = useState(false)
  const [activeTab, setActiveTab] = useState<"customers" | "history">("customers")

  const handleViewPerformance = async (collector: DebtCollectorData) => {
    setSelectedCollector(collector)
    setShowPerformanceModal(true)
    setLoadingPerformance(true)
    setActiveTab("customers")
    
    const result = await getCollectorPerformanceData(shopSlug, collector.id)
    
    if (result.success && result.data) {
      setPerformanceData(result.data)
    } else {
      toast.error(result.error || "Failed to load performance data")
      setPerformanceData(null)
    }
    
    setLoadingPerformance(false)
  }

  const handleToggleStatus = async (collector: DebtCollectorData) => {
    setTogglingId(collector.id)
    const result = await toggleDebtCollectorStatus(shopSlug, collector.id)
    
    if (result.success) {
      const newStatus = (result.data as { isActive: boolean }).isActive
      toast.success(`"${collector.name}" ${newStatus ? "activated" : "deactivated"}`)
    } else {
      toast.error(result.error || "Failed to update status")
    }
    
    setTogglingId(null)
  }

  if (collectors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No debt collectors yet</h3>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Debt collectors are managed by the business admin.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Collector
              </th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Email
              </th>
              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Assigned Customers
              </th>
              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Status
              </th>
              <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {collectors.map((collector) => (
              <tr key={collector.id} className="hover:bg-white/[0.02] transition-colors">
                {/* Collector Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-orange-300">
                        {collector.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{collector.name || "Unnamed"}</p>
                      <p className="text-xs text-slate-400">
                        Joined {new Date(collector.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-300">
                    {collector.email}
                  </span>
                </td>

                {/* Assigned Customers - Clickable to view performance */}
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleViewPerformance(collector)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
                    title="View performance sheet"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {collector.assignedCustomersCount}
                  </button>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleStatus(collector)}
                    disabled={togglingId === collector.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      collector.isActive
                        ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
                    } ${togglingId === collector.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${collector.isActive ? "bg-green-400" : "bg-slate-400"}`} />
                    {collector.isActive ? "Active" : "Inactive"}
                  </button>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleViewPerformance(collector)}
                      className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all"
                      title="View performance sheet"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Sheet Modal */}
      {showPerformanceModal && selectedCollector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPerformanceModal(false)}
          />
          
          <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/15 border border-orange-500/30 flex items-center justify-center">
                    <span className="text-xl font-semibold text-orange-300">
                      {selectedCollector.name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedCollector.name}</h3>
                    <p className="text-sm text-slate-400">Performance Sheet • Debt Collector</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPerformanceModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingPerformance ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-10 h-10 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-sm text-slate-400">Loading performance data...</p>
                  </div>
                </div>
              ) : performanceData ? (
                <>
                  {/* Stats Cards */}
                  <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total Collected */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs text-slate-400">Total Collected</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">
                        GHS {performanceData.totalCollected.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{performanceData.confirmedPaymentsCount} confirmed payments</p>
                    </div>

                    {/* Total Pending */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs text-slate-400">Pending Confirmation</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-400">
                        GHS {performanceData.totalPending.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{performanceData.pendingPaymentsCount} pending payments</p>
                    </div>

                    {/* Products Sold */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <span className="text-xs text-slate-400">Products Sold</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-400">{performanceData.totalProductsSold}</p>
                      <p className="text-xs text-slate-500 mt-1">From confirmed purchases</p>
                    </div>

                    {/* Assigned Customers */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-xs text-slate-400">Assigned Customers</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">{performanceData.assignedCustomers.length}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        GHS {performanceData.assignedCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })} outstanding
                      </p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="px-6 border-b border-white/5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setActiveTab("customers")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === "customers"
                            ? "text-orange-400 border-orange-400"
                            : "text-slate-400 border-transparent hover:text-slate-300"
                        }`}
                      >
                        Assigned Customers ({performanceData.assignedCustomers.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("history")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === "history"
                            ? "text-orange-400 border-orange-400"
                            : "text-slate-400 border-transparent hover:text-slate-300"
                        }`}
                      >
                        Collection History ({performanceData.paymentHistory.length})
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6 max-h-[300px] overflow-y-auto">
                    {activeTab === "customers" ? (
                      performanceData.assignedCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="w-14 h-14 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mb-3">
                            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-400">No customers assigned yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {performanceData.assignedCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-blue-300">
                                    {customer.firstName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {customer.firstName} {customer.lastName}
                                    {!customer.isActive && (
                                      <span className="ml-2 text-xs text-slate-500">(Inactive)</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400">{customer.phone}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {customer.activePurchases > 0 && (
                                  <div className="text-right">
                                    <p className="text-xs text-slate-400">{customer.activePurchases} active</p>
                                    <p className="text-sm font-medium text-amber-400">
                                      GHS {customer.outstandingBalance.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                                <span className={`w-2 h-2 rounded-full ${customer.isActive ? "bg-green-400" : "bg-slate-400"}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      performanceData.paymentHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="w-14 h-14 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mb-3">
                            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-400">No collection history yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {performanceData.paymentHistory.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                  payment.isConfirmed
                                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30"
                                    : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                                }`}>
                                  <svg className={`w-4 h-4 ${payment.isConfirmed ? "text-green-400" : "text-amber-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {payment.isConfirmed ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    )}
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{payment.customerName}</p>
                                  <p className="text-xs text-slate-400">
                                    {payment.purchaseNumber} • {payment.paymentMethod.replace('_', ' ')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-medium ${payment.isConfirmed ? "text-green-400" : "text-amber-400"}`}>
                                  GHS {payment.amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(payment.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">Failed to load performance data</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5">
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
