"use client"

import { useState } from "react"
import { BusinessDeliveryData, updateBusinessDeliveryStatus, generateBusinessWaybill } from "../../actions"
import { DeliveryStatus } from "@/app/generated/prisma/client"
import { toast } from "sonner"
import { WaybillModal } from "./waybill-modal"

interface DeliveriesTableProps {
  deliveries: BusinessDeliveryData[]
  businessSlug: string
  shops: { name: string; shopSlug: string }[]
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

export function DeliveriesTable({ deliveries, businessSlug, shops }: DeliveriesTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [waybillPurchaseId, setWaybillPurchaseId] = useState<string | null>(null)
  const [filter, setFilter] = useState<DeliveryStatus | "ALL">("ALL")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter !== "ALL" && d.deliveryStatus !== filter) return false
    if (shopFilter !== "all" && d.shopSlug !== shopFilter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        d.customerName.toLowerCase().includes(searchLower) ||
        d.purchaseNumber.toLowerCase().includes(searchLower) ||
        d.customerPhone.includes(search)
      )
    }
    return true
  })

  async function handleStatusChange(purchaseId: string, newStatus: DeliveryStatus) {
    setLoadingId(purchaseId)
    try {
      const result = await updateBusinessDeliveryStatus(businessSlug, purchaseId, newStatus)
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

  async function handleGenerateWaybill(delivery: BusinessDeliveryData) {
    setLoadingId(delivery.purchaseId)
    try {
      const result = await generateBusinessWaybill(businessSlug, delivery.purchaseId, {
        recipientName: delivery.customerName,
        recipientPhone: delivery.customerPhone,
        deliveryAddress: delivery.deliveryAddress,
      })
      if (result.success) {
        toast.success("Waybill generated!")
        setWaybillPurchaseId(delivery.purchaseId)
      } else {
        toast.error(result.error || "Failed to generate waybill")
      }
    } catch {
      toast.error("Failed to generate waybill")
    } finally {
      setLoadingId(null)
    }
  }

  if (deliveries.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">No deliveries yet</p>
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or order..."
          className="w-full max-w-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all" className="bg-slate-800">All Shops</option>
          {shops.map((shop) => (
            <option key={shop.shopSlug} value={shop.shopSlug} className="bg-slate-800">
              {shop.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          {(["ALL", "PENDING", "SCHEDULED", "IN_TRANSIT", "DELIVERED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === status
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {status === "ALL" ? "All" : deliveryStatusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Order</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Shop</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Customer</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Address</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Items</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Waybill</th>
              <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredDeliveries.map((delivery) => (
              <tr key={delivery.purchaseId} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{delivery.purchaseNumber}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(delivery.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                    {delivery.shopName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">{delivery.customerName}</p>
                  <p className="text-xs text-slate-400">{delivery.customerPhone}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white truncate max-w-[200px]" title={delivery.deliveryAddress}>
                    {delivery.deliveryAddress}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {delivery.items.slice(0, 2).map((item, i) => (
                    <p key={i} className="text-sm text-white">
                      {item.quantity}x {item.productName}
                    </p>
                  ))}
                  {delivery.items.length > 2 && (
                    <p className="text-xs text-slate-500">+{delivery.items.length - 2} more</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={delivery.deliveryStatus}
                    onChange={(e) => handleStatusChange(delivery.purchaseId, e.target.value as DeliveryStatus)}
                    disabled={loadingId === delivery.purchaseId}
                    className={`text-xs px-2 py-1 rounded-lg border ${deliveryStatusColors[delivery.deliveryStatus]} bg-transparent focus:outline-none disabled:opacity-50`}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  {delivery.deliveredAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(delivery.deliveredAt).toLocaleString()}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {delivery.hasWaybill ? (
                    <button
                      onClick={() => setWaybillPurchaseId(delivery.purchaseId)}
                      className="text-xs text-green-400 hover:underline"
                    >
                      {delivery.waybillNumber}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!delivery.hasWaybill && (
                      <button
                        onClick={() => handleGenerateWaybill(delivery)}
                        disabled={loadingId === delivery.purchaseId}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 disabled:opacity-50 transition-all"
                      >
                        Generate Waybill
                      </button>
                    )}
                    {delivery.deliveryStatus !== "DELIVERED" && (
                      <button
                        onClick={() => handleStatusChange(delivery.purchaseId, "DELIVERED")}
                        disabled={loadingId === delivery.purchaseId}
                        className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 disabled:opacity-50 transition-all"
                      >
                        Delivered
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-slate-400">No deliveries match your filters</p>
        </div>
      )}

      {waybillPurchaseId && (
        <WaybillModal 
          businessSlug={businessSlug} 
          purchaseId={waybillPurchaseId} 
          onClose={() => setWaybillPurchaseId(null)} 
        />
      )}
    </>
  )
}
