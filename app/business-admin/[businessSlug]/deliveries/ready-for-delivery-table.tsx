"use client"

import { useState, useTransition } from "react"
import { BusinessReadyForDeliveryData, updateBusinessDeliveryStatus } from "../../actions"
import { WaybillModal } from "./waybill-modal"

interface ReadyForDeliveryTableProps {
  deliveries: BusinessReadyForDeliveryData[]
  businessSlug: string
}

export function ReadyForDeliveryTable({ deliveries, businessSlug }: ReadyForDeliveryTableProps) {
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedWaybillPurchaseId, setSelectedWaybillPurchaseId] = useState<string | null>(null)

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

  const handleMarkDelivered = async (purchaseId: string) => {
    setProcessingId(purchaseId)
    startTransition(async () => {
      const result = await updateBusinessDeliveryStatus(businessSlug, purchaseId, "DELIVERED")
      if (!result.success) {
        alert(result.error || "Failed to mark as delivered")
      }
      setProcessingId(null)
    })
  }

  const handleStartDelivery = async (purchaseId: string) => {
    setProcessingId(purchaseId)
    startTransition(async () => {
      const result = await updateBusinessDeliveryStatus(businessSlug, purchaseId, "IN_TRANSIT")
      if (!result.success) {
        alert(result.error || "Failed to start delivery")
      }
      setProcessingId(null)
    })
  }

  if (deliveries.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
        <p className="text-slate-400">No fully paid purchases waiting for delivery</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Order</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Shop</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Customer</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Items</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Amount</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Waybill</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.purchaseId} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{delivery.purchaseNumber}</div>
                  <div className="text-xs text-slate-400">{formatDate(delivery.paymentCompletedAt)}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                    {delivery.shopName}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{delivery.customerName}</div>
                  <div className="text-xs text-slate-400">{delivery.customerPhone}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[200px]">{delivery.deliveryAddress}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-300">
                    {delivery.items.slice(0, 2).map((item, i) => (
                      <div key={i}>{item.quantity}x {item.productName}</div>
                    ))}
                    {delivery.items.length > 2 && (
                      <div className="text-slate-500">+{delivery.items.length - 2} more</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-green-400">{formatCurrency(delivery.totalAmount)}</div>
                  <div className="text-xs text-green-500/80">Fully Paid ✓</div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => setSelectedWaybillPurchaseId(delivery.purchaseId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {delivery.waybillNumber}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    delivery.deliveryStatus === "IN_TRANSIT"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }`}>
                    {delivery.deliveryStatus === "IN_TRANSIT" ? (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        In Transit
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ready
                      </>
                    )}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {delivery.deliveryStatus !== "IN_TRANSIT" && (
                      <button
                        onClick={() => handleStartDelivery(delivery.purchaseId)}
                        disabled={isPending && processingId === delivery.purchaseId}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                      >
                        {isPending && processingId === delivery.purchaseId ? "..." : "Start Delivery"}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkDelivered(delivery.purchaseId)}
                      disabled={isPending && processingId === delivery.purchaseId}
                      className="px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      {isPending && processingId === delivery.purchaseId ? "..." : "Mark Delivered"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Waybill Modal */}
      {selectedWaybillPurchaseId && (
        <WaybillModal
          businessSlug={businessSlug}
          purchaseId={selectedWaybillPurchaseId}
          onClose={() => setSelectedWaybillPurchaseId(null)}
        />
      )}
    </>
  )
}
