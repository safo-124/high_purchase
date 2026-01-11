"use client"

import { useState } from "react"
import { SalesStaffInvoiceData } from "../../actions"
import { ProgressInvoiceModal } from "./progress-invoice-modal"
import { WaybillModal } from "../deliveries/waybill-modal"
import { FileText, Search, CheckCircle, Clock, Truck, Calendar, Printer } from "lucide-react"

interface InvoicesContentProps {
  invoices: SalesStaffInvoiceData[]
  shopSlug: string
}

export function InvoicesContent({ invoices, shopSlug }: InvoicesContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "partial">("all")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [waybillPurchaseId, setWaybillPurchaseId] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && inv.isPurchaseCompleted) ||
      (statusFilter === "partial" && !inv.isPurchaseCompleted)
    
    return matchesSearch && matchesStatus
  })

  // Stats
  const totalInvoices = invoices.length
  const completedInvoices = invoices.filter((i) => i.isPurchaseCompleted).length
  const readyForDelivery = invoices.filter((i) => i.waybillGenerated).length
  const totalPayments = invoices.reduce((sum, i) => sum + i.paymentAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Progress Invoices</h1>
          <p className="text-slate-400 mt-1">View payment invoices and print waybills for delivery</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Invoices</p>
              <p className="text-2xl font-bold text-white">{totalInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Fully Paid</p>
              <p className="text-2xl font-bold text-green-400">{completedInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20">
              <Truck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Ready for Delivery</p>
              <p className="text-2xl font-bold text-purple-400">{readyForDelivery}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Collected</p>
              <p className="text-xl font-bold text-cyan-400">{formatCurrency(totalPayments)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices, customers, purchase #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === "all"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              statusFilter === "completed"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Completed
          </button>
          <button
            onClick={() => setStatusFilter("partial")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              statusFilter === "partial"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <Clock className="w-4 h-4" />
            Partial
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No invoices found</p>
            <p className="text-sm text-slate-500 mt-1">Invoices are generated when payments are confirmed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Invoice #</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Purchase #</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Payment</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Balance</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-cyan-400 font-mono text-sm">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{invoice.customerName}</p>
                        <p className="text-xs text-slate-500">{invoice.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-mono text-sm">{invoice.purchaseNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-400 font-medium">{formatCurrency(invoice.paymentAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {invoice.newBalance > 0 ? (
                        <span className="text-amber-400 font-medium">{formatCurrency(invoice.newBalance)}</span>
                      ) : (
                        <span className="text-green-400 text-sm">Paid</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {invoice.isPurchaseCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                          <Clock className="w-3 h-3" />
                          Partial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(invoice.generatedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                          className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                          title="View Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {invoice.waybillGenerated && (
                          <button
                            onClick={() => setWaybillPurchaseId(invoice.purchaseId)}
                            className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                            title="Print Waybill for Delivery"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedInvoiceId && (
        <ProgressInvoiceModal
          shopSlug={shopSlug}
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onViewWaybill={(purchaseId) => {
            setSelectedInvoiceId(null)
            setWaybillPurchaseId(purchaseId)
          }}
        />
      )}

      {/* Waybill Modal */}
      {waybillPurchaseId && (
        <WaybillModal
          shopSlug={shopSlug}
          purchaseId={waybillPurchaseId}
          onClose={() => setWaybillPurchaseId(null)}
        />
      )}
    </div>
  )
}
