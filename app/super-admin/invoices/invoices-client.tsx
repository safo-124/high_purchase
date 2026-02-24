"use client"

import { useState, useTransition } from "react"
import { updateInvoiceStatus } from "../billing-actions"

type Invoice = {
  id: string; invoiceNumber: string; subscriptionId: string; businessId: string;
  businessName: string; planName: string; amount: number; tax: number;
  totalAmount: number; currency: string; status: string; dueDate: Date;
  paidAt: Date | null; notes: string | null; createdAt: Date
}

export function InvoicesList({ invoices }: { invoices: Invoice[] }) {
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState("all")

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-500/20 text-slate-400",
    SENT: "bg-blue-500/20 text-blue-400",
    PAID: "bg-green-500/20 text-green-400",
    OVERDUE: "bg-red-500/20 text-red-400",
    CANCELLED: "bg-amber-500/20 text-amber-400",
    VOID: "bg-gray-500/20 text-gray-400",
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => { await updateInvoiceStatus(id, status as any) })
  }

  const filtered = filter === "all" ? invoices : invoices.filter(i => i.status === filter)

  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.totalAmount, 0)
  const totalPending = invoices.filter(i => ["DRAFT", "SENT"].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0)
  const totalOverdue = invoices.filter(i => i.status === "OVERDUE").reduce((s, i) => s + i.totalAmount, 0)

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/15 border-green-500/30">
          <p className="text-xs text-green-400 mb-1">Paid</p>
          <p className="text-xl font-bold text-white">GHS {totalPaid.toLocaleString("en-GH", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border-blue-500/30">
          <p className="text-xs text-blue-400 mb-1">Pending</p>
          <p className="text-xl font-bold text-white">GHS {totalPending.toLocaleString("en-GH", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card p-4 bg-gradient-to-br from-red-500/20 to-rose-500/15 border-red-500/30">
          <p className="text-xs text-red-400 mb-1">Overdue</p>
          <p className="text-xl font-bold text-white">GHS {totalOverdue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["all", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? "bg-purple-500/30 text-purple-300 border border-purple-500/40" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Invoice #</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Business</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Plan</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Due Date</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-white font-mono">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{inv.businessName}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{inv.planName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right">
                    {inv.currency} {inv.totalAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 text-right">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={inv.status}
                      onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      disabled={isPending}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="VOID">Void</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
