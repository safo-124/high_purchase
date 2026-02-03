"use client"

import { useState } from "react"
import { setBusinessActive, deleteBusiness, toggleBusinessPOS, toggleBusinessSupplyCatalog, type ActionResult } from "../actions"
import { toast } from "sonner"
import { BusinessData } from "../actions"

interface BusinessActionsProps {
  business: BusinessData
}

export function BusinessActions({ business }: BusinessActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleStatus = async () => {
    setIsLoading(true)
    const newStatus = !business.isActive
    const result: ActionResult = await setBusinessActive(business.id, newStatus)
    
    if (result.success) {
      toast.success(`Business ${newStatus ? "activated" : "suspended"} successfully`)
    } else {
      toast.error(result.error || "Failed to update business status")
    }
    setIsLoading(false)
  }

  const handleTogglePOS = async () => {
    setIsLoading(true)
    const newStatus = !business.posEnabled
    const result: ActionResult = await toggleBusinessPOS(business.id, newStatus)
    
    if (result.success) {
      toast.success(`POS system ${newStatus ? "enabled" : "disabled"} successfully`)
    } else {
      toast.error(result.error || "Failed to toggle POS system")
    }
    setIsLoading(false)
  }

  const handleToggleSupplyCatalog = async () => {
    setIsLoading(true)
    const newStatus = !business.supplyCatalogEnabled
    const result: ActionResult = await toggleBusinessSupplyCatalog(business.id, newStatus)
    
    if (result.success) {
      toast.success(`Supply Catalog ${newStatus ? "enabled" : "disabled"} successfully`)
    } else {
      toast.error(result.error || "Failed to toggle Supply Catalog")
    }
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${business.name}"? This will also delete all its shops and cannot be undone.`)) {
      return
    }
    
    setIsLoading(true)
    const result = await deleteBusiness(business.id)
    
    if (result.success) {
      toast.success("Business deleted successfully")
    } else {
      toast.error(result.error || "Failed to delete business")
    }
    setIsLoading(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {/* POS Toggle Button */}
      <button
        onClick={handleTogglePOS}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          business.posEnabled
            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
            : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border border-slate-500/20"
        }`}
        title={business.posEnabled ? "Disable POS" : "Enable POS"}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Supply Catalog Toggle Button */}
      <button
        onClick={handleToggleSupplyCatalog}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          business.supplyCatalogEnabled
            ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20"
            : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border border-slate-500/20"
        }`}
        title={business.supplyCatalogEnabled ? "Disable Supply Catalog" : "Enable Supply Catalog"}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </button>

      {/* Toggle Status Button */}
      <button
        onClick={handleToggleStatus}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          business.isActive
            ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20"
            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
        }`}
        title={business.isActive ? "Suspend Business" : "Activate Business"}
      >
        {business.isActive ? (
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
        title="Delete Business"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
