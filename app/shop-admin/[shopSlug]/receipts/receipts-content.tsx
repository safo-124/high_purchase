"use client"

import { useState } from "react"
import { ProgressInvoiceData } from "../../actions"
import { ReceiptModal } from "./receipt-modal"
import { WaybillModal } from "../components/waybill-modal"
import { FileText, Search, CheckCircle, Clock, Truck, Calendar } from "lucide-react"

interface ReceiptsContentProps {
  receipts: ProgressInvoiceData[]
  shopSlug: string
}

export function ReceiptsContent({ receipts, shopSlug }: ReceiptsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "partial">("all")
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
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

  const filteredReceipts = receipts.filter((rec) => {
    const matchesSearch =
      rec.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.collectorName && rec.collectorName.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && rec.isPurchaseCompleted) ||
      (statusFilter === "partial" && !rec.isPurchaseCompleted)
    
    return matchesSearch && matchesStatus
  })

  // Helper to get who collected the payment
  const getCollectedBy = (receipt: ProgressInvoiceData) => {
    if (receipt.recordedByRole === "COLLECTOR" && receipt.collectorName) {
      return { name: receipt.collectorName, role: "Collector" }
    }
    if (receipt.recordedByRole === "SHOP_ADMIN" && receipt.recordedByName) {
      return { name: receipt.recordedByName, role: "Shop Admin" }
    }
    if (receipt.recordedByRole === "BUSINESS_ADMIN" && receipt.recordedByName) {
      return { name: receipt.recordedByName, role: "Business Admin" }
    }
    // Fallback to collectorName if recordedByRole is not set
    if (receipt.collectorName) {
      return { name: receipt.collectorName, role: "Collector" }
    }
    return { name: "N/A", role: "" }
  }

  // Stats
  const totalReceipts = receipts.length
  const completedReceipts = receipts.filter((r) => r.isPurchaseCompleted).length
  const partialReceipts = receipts.filter((r) => !r.isPurchaseCompleted).length
  const totalPayments = receipts.reduce((sum, r) => sum + r.paymentAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Receipts</h1>
          <p className="text-slate-400 mt-1">Track all confirmed payment receipts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Receipts</p>
              <p className="text-2xl font-bold text-white">{totalReceipts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Completed</p>
              <p className="text-2xl font-bold text-green-400">{completedReceipts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Partial Payments</p>
              <p className="text-2xl font-bold text-amber-400">{partialReceipts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Collected</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalPayments)}</p>
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
            placeholder="Search receipts, customers, purchase #..."
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

      {/* Receipts Table */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No receipts found</p>
            <p className="text-sm text-slate-500 mt-1">Receipts are generated when payments are confirmed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Receipt #</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Collected By</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Balance</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredReceipts.map((receipt) => {
                  const collectedBy = getCollectedBy(receipt)
                  return (
                  <tr key={receipt.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-cyan-400 font-mono text-sm">{receipt.invoiceNumber}</span>
                      <p className="text-xs text-slate-500">{receipt.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{receipt.customerName}</p>
                        <p className="text-xs text-slate-500">{receipt.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{collectedBy.name}</p>
                      {collectedBy.role && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          collectedBy.role === "Collector" 
                            ? "bg-blue-500/20 text-blue-400" 
                            : collectedBy.role === "Shop Admin"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {collectedBy.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-400 font-medium">{formatCurrency(receipt.paymentAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {receipt.newBalance > 0 ? (
                        <span className="text-amber-400 font-medium">{formatCurrency(receipt.newBalance)}</span>
                      ) : (
                        <span className="text-green-400 text-sm">Paid</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {receipt.isPurchaseCompleted ? (
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
                        {formatDate(receipt.generatedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedReceiptId(receipt.id)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                        {receipt.waybillGenerated && (
                          <button
                            onClick={() => setWaybillPurchaseId(receipt.purchaseId)}
                            className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                            title="View Waybill"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceiptId && (
        <ReceiptModal
          shopSlug={shopSlug}
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
          onViewWaybill={(purchaseId) => {
            setSelectedReceiptId(null)
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
