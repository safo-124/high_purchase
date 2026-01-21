"use client"

import { useState } from "react"
import { ShopPurchaseInvoiceListData } from "../../actions"
import { PurchaseInvoiceModal } from "./purchase-invoice-modal"
import { FileText, Search, CheckCircle, Clock, AlertCircle, Calendar } from "lucide-react"

interface PurchaseInvoicesContentProps {
  invoices: ShopPurchaseInvoiceListData[]
  shopSlug: string
}

export function PurchaseInvoicesContent({ invoices, shopSlug }: PurchaseInvoicesContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "PARTIALLY_PAID" | "FULLY_PAID">("all")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date))
  }

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.collectorName && inv.collectorName.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Stats
  const totalInvoices = invoices.length
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING").length
  const partialInvoices = invoices.filter((i) => i.status === "PARTIALLY_PAID").length
  const paidInvoices = invoices.filter((i) => i.status === "FULLY_PAID").length

  const getPurchaseTypeStyle = (type: string) => {
    switch (type) {
      case "CASH":
        return "bg-green-500/20 text-green-400"
      case "LAYAWAY":
        return "bg-blue-500/20 text-blue-400"
      case "CREDIT":
        return "bg-purple-500/20 text-purple-400"
      default:
        return "bg-slate-500/20 text-slate-400"
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "FULLY_PAID":
        return "bg-emerald-500/20 text-emerald-400"
      case "PARTIALLY_PAID":
        return "bg-yellow-500/20 text-yellow-400"
      case "PENDING":
        return "bg-slate-500/20 text-slate-400"
      default:
        return "bg-slate-500/20 text-slate-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Purchase Invoices</h1>
          <p className="text-slate-400 mt-1">Invoices generated when customers make purchases</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Invoices</p>
              <p className="text-2xl font-bold text-white">{totalInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-500/20">
              <AlertCircle className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Pending</p>
              <p className="text-2xl font-bold text-slate-400">{pendingInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Partially Paid</p>
              <p className="text-2xl font-bold text-yellow-400">{partialInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Fully Paid</p>
              <p className="text-2xl font-bold text-emerald-400">{paidInvoices}</p>
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
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              statusFilter === "all"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              statusFilter === "PENDING"
                ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("PARTIALLY_PAID")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              statusFilter === "PARTIALLY_PAID"
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <Clock className="w-4 h-4" />
            Partial
          </button>
          <button
            onClick={() => setStatusFilter("FULLY_PAID")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              statusFilter === "FULLY_PAID"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Paid
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No invoices found</p>
            <p className="text-sm text-slate-500 mt-1">Invoices are generated when purchases are made</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Invoice #</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Purchase Type</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Collector</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-purple-400 font-mono text-sm">{invoice.invoiceNumber}</span>
                      <p className="text-xs text-slate-500">{invoice.purchaseNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{invoice.customerName}</p>
                        <p className="text-xs text-slate-500">{invoice.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getPurchaseTypeStyle(invoice.purchaseType)}`}>
                        {invoice.purchaseType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{invoice.collectorName || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">{formatCurrency(invoice.totalAmount)}</span>
                      {invoice.downPayment > 0 && (
                        <p className="text-xs text-slate-500">Down: {formatCurrency(invoice.downPayment)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(invoice.status)}`}>
                        {invoice.status === "FULLY_PAID" && <CheckCircle className="w-3 h-3" />}
                        {invoice.status === "PARTIALLY_PAID" && <Clock className="w-3 h-3" />}
                        {invoice.status === "PENDING" && <AlertCircle className="w-3 h-3" />}
                        {invoice.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(invoice.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
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
        <PurchaseInvoiceModal
          shopSlug={shopSlug}
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  )
}
