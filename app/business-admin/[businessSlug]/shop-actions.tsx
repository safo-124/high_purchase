"use client"

import { useState } from "react"
import { setShopActive, deleteShop, type ActionResult } from "../actions"
import { toast } from "sonner"
import { ShopData } from "../actions"

interface ShopActionsProps {
  shop: ShopData
  businessSlug: string
}

export function ShopActions({ shop, businessSlug }: ShopActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleStatus = async () => {
    setIsLoading(true)
    const newStatus = !shop.isActive
    const result: ActionResult = await setShopActive(businessSlug, shop.id, newStatus)
    
    if (result.success) {
      toast.success(`Shop ${newStatus ? "activated" : "suspended"} successfully`)
    } else {
      toast.error(result.error || "Failed to update shop status")
    }
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${shop.name}"? This will delete all products, customers, and purchases. This cannot be undone.`)) {
      return
    }
    
    setIsLoading(true)
    const result = await deleteShop(businessSlug, shop.id)
    
    if (result.success) {
      toast.success("Shop deleted successfully")
    } else {
      toast.error(result.error || "Failed to delete shop")
    }
    setIsLoading(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Toggle Status Button */}
      <button
        onClick={handleToggleStatus}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          shop.isActive
            ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20"
            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
        }`}
        title={shop.isActive ? "Suspend Shop" : "Activate Shop"}
      >
        {shop.isActive ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Delete Shop"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
