"use client"

import { useState, useMemo } from "react"
import { ProgressInvoiceData, ShopWalletDepositReceiptData } from "../../actions"
import { ReceiptModal } from "./receipt-modal"
import { ShopWalletDepositReceiptModal } from "./wallet-deposit-receipt-modal"
import { WaybillModal } from "../components/waybill-modal"
import { FileText, Search, CheckCircle, Clock, Truck, Calendar, Wallet, CreditCard } from "lucide-react"

type UnifiedReceipt =
  | { kind: "payment"; data: ProgressInvoiceData; date: Date }
  | { kind: "wallet"; data: ShopWalletDepositReceiptData; date: Date }

interface ReceiptsContentProps {
  receipts: ProgressInvoiceData[]
  walletDeposits: ShopWalletDepositReceiptData[]
  shopSlug: string
}

export function ReceiptsContent({ receipts, walletDeposits, shopSlug }: ReceiptsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "payment" | "wallet" | "completed" | "partial">("all")
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
  const [selectedReceiptKind, setSelectedReceiptKind] = useState<"payment" | "wallet">("payment")
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

  // Merge and sort all receipts by date (newest first)
  const allReceipts: UnifiedReceipt[] = useMemo(() => {
    const paymentReceipts: UnifiedReceipt[] = receipts.map((r) => ({
      kind: "payment" as const,
      data: r,
      date: new Date(r.generatedAt),
    }))

    const walletReceipts: UnifiedReceipt[] = walletDeposits.map((wd) => ({
      kind: "wallet" as const,
      data: wd,
      date: new Date(wd.confirmedAt || wd.createdAt),
    }))

    return [...paymentReceipts, ...walletReceipts].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    )
  }, [receipts, walletDeposits])

  // Filter
  const filteredReceipts = allReceipts.filter((receipt) => {
    // Type filter
    if (typeFilter === "payment" && receipt.kind !== "payment") return false
    if (typeFilter === "wallet" && receipt.kind !== "wallet") return false
    if (typeFilter === "completed" && (receipt.kind !== "payment" || !receipt.data.isPurchaseCompleted)) return false
    if (typeFilter === "partial" && (receipt.kind !== "payment" || receipt.data.isPurchaseCompleted)) return false

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (receipt.kind === "payment") {
        const d = receipt.data
        return (
          d.invoiceNumber.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.purchaseNumber.toLowerCase().includes(q) ||
          (d.collectorName && d.collectorName.toLowerCase().includes(q))
        )
      } else {
        const d = receipt.data
        return (
          d.receiptNumber.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.customerPhone.includes(q) ||
          (d.collectorName && d.collectorName.toLowerCase().includes(q)) ||
          (d.reference && d.reference.toLowerCase().includes(q))
        )
      }
    }

    return true
  })

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
    if (receipt.recordedByRole === "WALLET") {
      return { name: receipt.collectorName || "Wallet", role: "Wallet" }
    }
    if (receipt.collectorName) {
      return { name: receipt.collectorName, role: "Collector" }
    }
    return { name: "N/A", role: "" }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "Collector": return "bg-blue-500/20 text-blue-400"
      case "Shop Admin": return "bg-emerald-500/20 text-emerald-400"
      case "Business Admin": return "bg-purple-500/20 text-purple-400"
      case "Wallet": return "bg-cyan-500/20 text-cyan-400"
      default: return "bg-slate-500/20 text-slate-400"
    }
  }

  const handleViewReceipt = (id: string, kind: "payment" | "wallet") => {
    setSelectedReceiptId(id)
    setSelectedReceiptKind(kind)
  }

  // Stats
  const totalPaymentReceipts = receipts.length
  const totalWalletReceipts = walletDeposits.length
  const totalAllReceipts = totalPaymentReceipts + totalWalletReceipts
  const completedReceipts = receipts.filter((r) => r.isPurchaseCompleted).length
  const totalPayments = receipts.reduce((sum, r) => sum + r.paymentAmount, 0)
  const totalWalletDeposited = walletDeposits.reduce((sum, wd) => sum + wd.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Receipts</h1>
          <p className="text-slate-400 mt-1">Track all confirmed payment receipts and wallet deposits</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Receipts</p>
              <p className="text-2xl font-bold text-white">{totalAllReceipts}</p>
              <p className="text-xs text-slate-500">{totalPaymentReceipts} payments, {totalWalletReceipts} wallet</p>
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
            <div className="p-2.5 rounded-xl bg-cyan-500/20">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Wallet Deposits</p>
              <p className="text-xl font-bold text-cyan-400">{formatCurrency(totalWalletDeposited)}</p>
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
              <p className="text-2xl font-bold text-amber-400">{totalPaymentReceipts - completedReceipts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20">
              <CreditCard className="w-5 h-5 text-emerald-400" />
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
            placeholder="Search receipts, customers, references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              typeFilter === "all"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter("payment")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              typeFilter === "payment"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Payments
          </button>
          <button
            onClick={() => setTypeFilter("wallet")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              typeFilter === "wallet"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Wallet
          </button>
          <button
            onClick={() => setTypeFilter("completed")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              typeFilter === "completed"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Completed
          </button>
          <button
            onClick={() => setTypeFilter("partial")}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              typeFilter === "partial"
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
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Type</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Collected By</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredReceipts.map((receipt) => {
                  if (receipt.kind === "payment") {
                    const inv = receipt.data
                    const collectedBy = getCollectedBy(inv)
                    return (
                      <tr key={`p-${inv.id}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-cyan-400 font-mono text-sm">{inv.invoiceNumber}</span>
                          <p className="text-xs text-slate-500">{inv.paymentMethod}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20">
                            <CreditCard className="w-3 h-3" />
                            Payment
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{inv.customerName}</p>
                          <p className="text-xs text-slate-500">{inv.customerPhone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{collectedBy.name}</p>
                          {collectedBy.role && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeClass(collectedBy.role)}`}>
                              {collectedBy.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-green-400 font-medium">{formatCurrency(inv.paymentAmount)}</span>
                          {inv.newBalance > 0 && (
                            <p className="text-xs text-amber-400">Bal: {formatCurrency(inv.newBalance)}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {inv.isPurchaseCompleted ? (
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
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(receipt.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewReceipt(inv.id, "payment")}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
                            >
                              View
                            </button>
                            {inv.waybillGenerated && (
                              <button
                                onClick={() => setWaybillPurchaseId(inv.purchaseId)}
                                className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                                title="View Waybill"
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  } else {
                    const wd = receipt.data
                    return (
                      <tr key={`w-${wd.id}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-cyan-400 font-mono text-sm">{wd.receiptNumber}</span>
                          <p className="text-xs text-slate-500">{wd.paymentMethod || "WALLET"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            <Wallet className="w-3 h-3" />
                            Wallet Deposit
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{wd.customerName}</p>
                          <p className="text-xs text-slate-500">{wd.customerPhone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{wd.collectorName || "—"}</p>
                          {wd.collectorName && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              Collector
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-cyan-400 font-medium">{formatCurrency(wd.amount)}</span>
                          <p className="text-xs text-slate-500">Wallet: {formatCurrency(wd.balanceAfter)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                            <CheckCircle className="w-3 h-3" />
                            Confirmed
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(receipt.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewReceipt(wd.id, "wallet")}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        <div className="px-6 py-3 border-t border-white/10 text-sm text-slate-500">
          Showing {filteredReceipts.length} of {allReceipts.length} receipts
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {selectedReceiptId && selectedReceiptKind === "payment" && (
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

      {/* Wallet Deposit Receipt Modal */}
      {selectedReceiptId && selectedReceiptKind === "wallet" && (
        <ShopWalletDepositReceiptModal
          deposit={walletDeposits.find((wd) => wd.id === selectedReceiptId) || null}
          onClose={() => setSelectedReceiptId(null)}
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
