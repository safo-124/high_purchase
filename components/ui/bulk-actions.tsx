"use client"

import { useState } from "react"

interface BulkActionsBarProps<T> {
  items: T[]
  selectedIds: Set<string>
  onSelectAll: () => void
  onDeselectAll: () => void
  actions: { label: string; icon?: string; onClick: (ids: string[]) => Promise<void> | void; variant?: "default" | "danger" }[]
  idKey?: keyof T
}

export function BulkActionsBar<T extends Record<string, unknown>>({
  items,
  selectedIds,
  onSelectAll,
  onDeselectAll,
  actions,
}: BulkActionsBarProps<T>) {
  const [processing, setProcessing] = useState("")

  if (selectedIds.size === 0) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 lg:left-[calc(50%+9rem)] -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800/95 backdrop-blur-xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center justify-center">
            {selectedIds.size}
          </span>
          <span className="text-sm text-slate-300">selected</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size < items.length ? (
            <button onClick={onSelectAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 transition-all">
              Select All ({items.length})
            </button>
          ) : (
            <button onClick={onDeselectAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5 transition-all">
              Deselect All
            </button>
          )}
          {actions.map(action => (
            <button
              key={action.label}
              onClick={async () => {
                setProcessing(action.label)
                await action.onClick(Array.from(selectedIds))
                setProcessing("")
              }}
              disabled={!!processing}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                action.variant === "danger"
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                  : "bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/20"
              }`}
            >
              {processing === action.label ? "..." : `${action.icon || ""} ${action.label}`}
            </button>
          ))}
        </div>
        <button onClick={onDeselectAll} className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Checkbox component for table rows
export function BulkCheckbox({ checked, onChange, className = "" }: { checked: boolean; onChange: () => void; className?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
        checked
          ? "bg-cyan-500 border-cyan-500"
          : "border-white/20 hover:border-cyan-500/50 bg-white/5"
      } ${className}`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}

// Hook for managing bulk selection state
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(items.map(i => i.id)))
  const deselectAll = () => setSelectedIds(new Set())
  const isSelected = (id: string) => selectedIds.has(id)

  return { selectedIds, toggle, selectAll, deselectAll, isSelected }
}

// CSV download utility
export function downloadCSV(data: Record<string, string | number | boolean | null>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      const str = val === null || val === undefined ? "" : String(val)
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str
    }).join(","))
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
