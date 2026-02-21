"use client"

import { useState, useMemo } from "react"
import { BusinessInvoiceData, WalletDepositReceiptData } from "../../actions"
import { ReceiptModal } from "./receipt-modal"
import { WalletDepositReceiptModal } from "./wallet-deposit-receipt-modal"

type UnifiedReceipt =
  | { kind: "payment"; data: BusinessInvoiceData; date: Date }
  | { kind: "wallet"; data: WalletDepositReceiptData; date: Date }

interface ReceiptsContentProps {
  invoices: BusinessInvoiceData[]
  walletDeposits: WalletDepositReceiptData[]
  shops: { name: string; shopSlug: string }[]
  businessSlug: string
}

export function ReceiptsContent({ invoices, walletDeposits, shops, businessSlug }: ReceiptsContentProps) {
  const [search, setSearch] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
  const [selectedReceiptKind, setSelectedReceiptKind] = useState<"payment" | "wallet">("payment")

  // Merge and sort all receipts by date (newest first)
  const allReceipts: UnifiedReceipt[] = useMemo(() => {
    const paymentReceipts: UnifiedReceipt[] = invoices.map((inv) => ({
      kind: "payment" as const,
      data: inv,
      date: new Date(inv.generatedAt),
    }))

    const walletReceipts: UnifiedReceipt[] = walletDeposits.map((wd) => ({
      kind: "wallet" as const,
      data: wd,
      date: new Date(wd.confirmedAt || wd.createdAt),
    }))

    return [...paymentReceipts, ...walletReceipts].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    )
  }, [invoices, walletDeposits])

  // Filter
  const filteredReceipts = allReceipts.filter((receipt) => {
    // Type filter
    if (typeFilter === "payment" && receipt.kind !== "payment") return false
    if (typeFilter === "wallet" && receipt.kind !== "wallet") return false
    if (typeFilter === "completed" && (receipt.kind !== "payment" || !receipt.data.isPurchaseCompleted)) return false
    if (typeFilter === "waybill" && (receipt.kind !== "payment" || !receipt.data.waybillGenerated)) return false

    // Shop filter
    if (shopFilter !== "all") {
      if (receipt.kind === "payment" && receipt.data.shopName !== shopFilter) return false
      if (receipt.kind === "wallet" && receipt.data.shopName !== shopFilter) return false
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      if (receipt.kind === "payment") {
        const d = receipt.data
        return (
          d.invoiceNumber.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.purchaseNumber.toLowerCase().includes(q) ||
          d.customerPhone.includes(q) ||
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

  const formatCurrency = (amount: number) =>
    `₵${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))

  const getCollectedBy = (invoice: BusinessInvoiceData) => {
    if (invoice.recordedByRole === "COLLECTOR" && invoice.collectorName) {
      return { name: invoice.collectorName, role: "Collector" }
    }
    if (invoice.recordedByRole === "SHOP_ADMIN" && invoice.recordedByName) {
      return { name: invoice.recordedByName, role: "Shop Admin" }
    }
    if (invoice.recordedByRole === "BUSINESS_ADMIN" && invoice.recordedByName) {
      return { name: invoice.recordedByName, role: "Business Admin" }
    }
    if (invoice.recordedByRole === "WALLET") {
      return { name: invoice.collectorName || "Wallet", role: "Wallet" }
    }
    if (invoice.collectorName) {
      return { name: invoice.collectorName, role: "Collector" }
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

  return (
    <>
      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search receipts, customers, references..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Shop Filter */}
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="all">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.shopSlug} value={shop.name}>
                {shop.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="all">All Types</option>
            <option value="payment">Payment Receipts</option>
            <option value="wallet">Wallet Deposits</option>
            <option value="completed">Completed Purchases</option>
            <option value="waybill">Waybill Generated</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Receipt #
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Collected By
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Branch (Shop)
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No receipts found
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => {
                  if (receipt.kind === "payment") {
                    const inv = receipt.data
                    const collectedBy = getCollectedBy(inv)
                    return (
                      <tr key={`p-${inv.id}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{inv.invoiceNumber}</p>
                          <p className="text-xs text-slate-500">{inv.paymentMethod}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Payment
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{inv.customerName}</p>
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
                        <td className="px-6 py-4">
                          <p className="text-white">{inv.shopName}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-green-400 font-medium">
                            {formatCurrency(inv.paymentAmount)}
                          </p>
                          {inv.newBalance > 0 && (
                            <p className="text-xs text-amber-400">Bal: {formatCurrency(inv.newBalance)}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {inv.isPurchaseCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                Active
                              </span>
                            )}
                            {inv.waybillGenerated && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                                Waybill
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-400 text-sm">{formatDate(receipt.date)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleViewReceipt(inv.id, "payment")}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  } else {
                    const wd = receipt.data
                    return (
                      <tr key={`w-${wd.id}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{wd.receiptNumber}</p>
                          <p className="text-xs text-slate-500">{wd.paymentMethod || "WALLET"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Wallet Deposit
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{wd.customerName}</p>
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
                        <td className="px-6 py-4">
                          <p className="text-white">{wd.shopName}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-cyan-400 font-medium">
                            {formatCurrency(wd.amount)}
                          </p>
                          <p className="text-xs text-slate-500">Wallet: {formatCurrency(wd.balanceAfter)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Confirmed
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-400 text-sm">{formatDate(receipt.date)}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleViewReceipt(wd.id, "wallet")}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Results count */}
        <div className="px-6 py-3 border-t border-white/10 text-sm text-slate-500">
          Showing {filteredReceipts.length} of {allReceipts.length} receipts
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {selectedReceiptId && selectedReceiptKind === "payment" && (
        <ReceiptModal
          businessSlug={businessSlug}
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}

      {/* Wallet Deposit Receipt Modal */}
      {selectedReceiptId && selectedReceiptKind === "wallet" && (
        <WalletDepositReceiptModal
          deposit={walletDeposits.find((wd) => wd.id === selectedReceiptId) || null}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}
    </>
  )
}
