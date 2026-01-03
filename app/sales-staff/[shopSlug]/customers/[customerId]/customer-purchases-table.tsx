"use client"

import { useState } from "react"
import { CustomerPurchaseData, updateDeliveryStatus, generateWaybill } from "../../../actions"
import { DeliveryStatus } from "@/app/generated/prisma/client"
import { toast } from "sonner"
import { WaybillModal } from "../../deliveries/waybill-modal"

interface CustomerPurchasesTableProps {
  purchases: CustomerPurchaseData[]
  shopSlug: string
  customerName: string
  customerPhone: string
  customerAddress: string
}

const deliveryStatusColors: Record<DeliveryStatus, string> = {
  PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  SCHEDULED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_TRANSIT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DELIVERED: "bg-green-500/10 text-green-400 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
}

const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
}

export function CustomerPurchasesTable({ 
  purchases, 
  shopSlug,
  customerName,
  customerPhone,
  customerAddress 
}: CustomerPurchasesTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [waybillPurchaseId, setWaybillPurchaseId] = useState<string | null>(null)

  async function handleStatusChange(purchaseId: string, newStatus: DeliveryStatus) {
    setLoadingId(purchaseId)
    try {
      const result = await updateDeliveryStatus(shopSlug, purchaseId, newStatus)
      if (result.success) {
        toast.success(`Status updated to ${deliveryStatusLabels[newStatus]}`)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setLoadingId(null)
    }
  }

  async function handleGenerateWaybill(purchaseId: string) {
    setLoadingId(purchaseId)
    try {
      const result = await generateWaybill(shopSlug, purchaseId, {
        recipientName: customerName,
        recipientPhone: customerPhone,
        deliveryAddress: customerAddress,
      })
      if (result.success) {
        toast.success("Waybill generated!")
        setWaybillPurchaseId(purchaseId)
      } else {
        toast.error(result.error || "Failed to generate waybill")
      }
    } catch {
      toast.error("Failed to generate waybill")
    } finally {
      setLoadingId(null)
    }
  }

  if (purchases.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">No purchases yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Purchase</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Items</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Amount</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Payment</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Delivery</th>
              <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {purchases.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{purchase.purchaseNumber}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {purchase.items.map((item, i) => (
                    <p key={i} className="text-sm text-white">
                      {item.quantity}x {item.productName}
                    </p>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-white">
                    GHS {purchase.totalAmount.toLocaleString()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                    purchase.status === "COMPLETED"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : purchase.status === "ACTIVE"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : purchase.status === "OVERDUE"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  }`}>
                    {purchase.status}
                  </span>
                  {purchase.outstandingBalance > 0 && (
                    <p className="text-xs text-amber-400 mt-1">
                      GHS {purchase.outstandingBalance.toLocaleString()} owed
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={purchase.deliveryStatus}
                    onChange={(e) => handleStatusChange(purchase.id, e.target.value as DeliveryStatus)}
                    disabled={loadingId === purchase.id}
                    className={`text-xs px-2 py-1 rounded-lg border ${deliveryStatusColors[purchase.deliveryStatus]} bg-transparent focus:outline-none disabled:opacity-50`}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {purchase.hasWaybill ? (
                      <button
                        onClick={() => setWaybillPurchaseId(purchase.id)}
                        className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all"
                      >
                        View Waybill
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerateWaybill(purchase.id)}
                        disabled={loadingId === purchase.id}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/30 disabled:opacity-50 transition-all"
                      >
                        Generate Waybill
                      </button>
                    )}
                    {purchase.deliveryStatus !== "DELIVERED" && (
                      <button
                        onClick={() => handleStatusChange(purchase.id, "DELIVERED")}
                        disabled={loadingId === purchase.id}
                        className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 disabled:opacity-50 transition-all"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {waybillPurchaseId && (
        <WaybillModal 
          shopSlug={shopSlug} 
          purchaseId={waybillPurchaseId} 
          onClose={() => setWaybillPurchaseId(null)} 
        />
      )}
    </>
  )
}
