"use client"

import { useState } from "react"
import { WaybillForAdmin } from "../../actions"

interface WaybillsTableProps {
  waybills: WaybillForAdmin[]
  shopSlug: string
}

export function WaybillsTable({ waybills, shopSlug }: WaybillsTableProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "transit" | "delivered">("all")
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillForAdmin | null>(null)

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Delivered
          </span>
        )
      case "IN_TRANSIT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            In Transit
          </span>
        )
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Scheduled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending
          </span>
        )
    }
  }

  const filteredWaybills = waybills.filter((w) => {
    if (filter === "all") return true
    if (filter === "pending") return w.deliveryStatus === "PENDING" || w.deliveryStatus === "SCHEDULED"
    if (filter === "transit") return w.deliveryStatus === "IN_TRANSIT"
    if (filter === "delivered") return w.deliveryStatus === "DELIVERED"
    return true
  })

  if (waybills.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Waybills Yet</h3>
        <p className="text-slate-400">Waybills will be automatically generated when purchases are fully paid</p>
      </div>
    )
  }

  return (
    <>
      {/* Filter Tabs */}
      <div className="px-4 py-3 border-b border-white/5 flex gap-2">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "transit", label: "In Transit" },
          { key: "delivered", label: "Delivered" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.key
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Waybill</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Order</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Customer</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Items</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Amount</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Generated</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWaybills.map((waybill) => (
              <tr key={waybill.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {waybill.waybillNumber}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{waybill.purchaseNumber}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{waybill.customerName}</div>
                  <div className="text-xs text-slate-400">{waybill.customerPhone}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[180px]">{waybill.deliveryAddress}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-300">
                    {waybill.items.slice(0, 2).map((item, i) => (
                      <div key={i}>{item.quantity}x {item.productName}</div>
                    ))}
                    {waybill.items.length > 2 && (
                      <div className="text-slate-500">+{waybill.items.length - 2} more</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-green-400">{formatCurrency(waybill.totalAmount)}</div>
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(waybill.deliveryStatus)}
                </td>
                <td className="px-4 py-4 text-sm text-slate-400">
                  {formatDate(waybill.generatedAt)}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => setSelectedWaybill(waybill)}
                    className="px-3 py-1.5 text-xs font-medium bg-white/5 text-white border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedWaybill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Waybill Details</h3>
              <button
                onClick={() => setSelectedWaybill(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-slate-400">Waybill Number</span>
                <span className="font-bold text-purple-400">{selectedWaybill.waybillNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">Order</p>
                  <p className="text-white font-medium">{selectedWaybill.purchaseNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">Amount</p>
                  <p className="text-green-400 font-medium">{formatCurrency(selectedWaybill.totalAmount)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Customer</p>
                <p className="text-white font-medium">{selectedWaybill.customerName}</p>
                <p className="text-slate-400 text-sm">{selectedWaybill.customerPhone}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Delivery Address</p>
                <p className="text-white">{selectedWaybill.deliveryAddress}</p>
                {(selectedWaybill.deliveryCity || selectedWaybill.deliveryRegion) && (
                  <p className="text-slate-400 text-sm">
                    {[selectedWaybill.deliveryCity, selectedWaybill.deliveryRegion].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase mb-1">Items</p>
                <div className="space-y-1">
                  {selectedWaybill.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-white">{item.productName}</span>
                      <span className="text-slate-400">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedWaybill.specialInstructions && (
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">Special Instructions</p>
                  <p className="text-slate-300 text-sm">{selectedWaybill.specialInstructions}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  {getStatusBadge(selectedWaybill.deliveryStatus)}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Generated</p>
                  <p className="text-sm text-slate-300">{formatDate(selectedWaybill.generatedAt)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedWaybill(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
