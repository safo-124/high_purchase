"use client"

import { useState } from "react"
import { DebtCollectorData, deleteDebtCollector, toggleDebtCollectorStatus } from "../../actions"
import { toast } from "sonner"

interface CollectorsTableProps {
  collectors: DebtCollectorData[]
  shopSlug: string
}

export function CollectorsTable({ collectors, shopSlug }: CollectorsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [collectorToDelete, setCollectorToDelete] = useState<DebtCollectorData | null>(null)

  const handleDeleteClick = (collector: DebtCollectorData) => {
    setCollectorToDelete(collector)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!collectorToDelete) return

    setDeletingId(collectorToDelete.id)
    const result = await deleteDebtCollector(shopSlug, collectorToDelete.id)
    
    if (result.success) {
      toast.success(`"${collectorToDelete.name}" removed successfully`)
    } else {
      toast.error(result.error || "Failed to remove collector")
    }
    
    setDeletingId(null)
    setShowDeleteModal(false)
    setCollectorToDelete(null)
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
          Add debt collectors to your team to handle in-person payment collections.
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

                {/* Assigned Customers */}
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {collector.assignedCustomersCount}
                  </span>
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
                      onClick={() => handleDeleteClick(collector)}
                      disabled={deletingId === collector.id}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all disabled:opacity-50"
                      title="Remove collector"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && collectorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          
          <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Remove Debt Collector</h3>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to remove <span className="text-white font-medium">&quot;{collectorToDelete.name}&quot;</span> from your team?
                  {collectorToDelete.assignedCustomersCount > 0 && (
                    <span className="block mt-2 text-amber-400">
                      ⚠️ This collector has {collectorToDelete.assignedCustomersCount} assigned customers.
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingId === collectorToDelete.id}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-medium text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {deletingId === collectorToDelete.id ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Removing...
                  </>
                ) : (
                  "Remove Collector"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
