"use client"

import { useState } from "react"
import { PurchaseInvoiceListData } from "../../actions"
import { PurchaseInvoiceModal } from "./purchase-invoice-modal"

interface Props {
  businessSlug: string
  businessName: string
  invoices: PurchaseInvoiceListData[]
}

export function PurchaseInvoicesContent({ businessSlug, businessName, invoices }: Props) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter

    return matchesSearch && matchesStatus
  })

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "FULLY_PAID":
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Fully Paid</span>
      case "PARTIALLY_PAID":
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Partial</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">Pending</span>
    }
  }

  function getPurchaseTypeBadge(type: string) {
    switch (type) {
      case "CASH":
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">Cash</span>
      case "LAYAWAY":
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">Layaway</span>
      case "CREDIT":
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">Credit</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-500/20 text-slate-400">{type}</span>
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Purchase Invoices</h1>
        <p className="text-slate-400">
          Invoices generated at time of purchase showing payment details and methods
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by invoice #, customer, or purchase #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="FULLY_PAID">Fully Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">
            Invoices ({filteredInvoices.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Shop</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Collector</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-cyan-400">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{invoice.customerName}</p>
                        <p className="text-xs text-slate-400">{invoice.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{invoice.shopName}</td>
                    <td className="px-4 py-3">{getPurchaseTypeBadge(invoice.purchaseType)}</td>
                    <td className="px-4 py-3 text-slate-300">{invoice.collectorName || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-white">{formatCurrency(invoice.totalAmount)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(invoice.status)}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{formatDate(invoice.generatedAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoiceId && (
        <PurchaseInvoiceModal
          businessSlug={businessSlug}
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  )
}
