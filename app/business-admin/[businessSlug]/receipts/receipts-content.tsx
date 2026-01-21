"use client"

import { useState } from "react"
import { BusinessInvoiceData } from "../../actions"
import { ReceiptModal } from "./receipt-modal"

interface ReceiptsContentProps {
  invoices: BusinessInvoiceData[]
  shops: { name: string; shopSlug: string }[]
  businessSlug: string
}

export function ReceiptsContent({ invoices, shops, businessSlug }: ReceiptsContentProps) {
  const [search, setSearch] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)

  // Filter invoices
  const filteredReceipts = invoices.filter((inv) => {
    const matchesSearch =
      search === "" ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerPhone.includes(search) ||
      (inv.collectorName && inv.collectorName.toLowerCase().includes(search.toLowerCase()))

    const matchesShop = shopFilter === "all" || inv.shopName === shopFilter

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && inv.isPurchaseCompleted) ||
      (statusFilter === "active" && !inv.isPurchaseCompleted) ||
      (statusFilter === "waybill" && inv.waybillGenerated)

    return matchesSearch && matchesShop && matchesStatus
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

  // Helper to get who collected the payment
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
    // Fallback to collectorName if recordedByRole is not set
    if (invoice.collectorName) {
      return { name: invoice.collectorName, role: "Collector" }
    }
    return { name: "N/A", role: "" }
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
                placeholder="Search receipts..."
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="active">Active (Pending)</option>
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
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Balance
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
                  const collectedBy = getCollectedBy(receipt)
                  return (
                  <tr key={receipt.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{receipt.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">{receipt.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{receipt.customerName}</p>
                      <p className="text-xs text-slate-500">{receipt.customerPhone}</p>
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
                    <td className="px-6 py-4">
                      <p className="text-white">{receipt.shopName}</p>
                      {receipt.shopAdminName && (
                        <p className="text-xs text-slate-500">Admin: {receipt.shopAdminName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-green-400 font-medium">
                        {formatCurrency(receipt.paymentAmount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {receipt.newBalance > 0 ? (
                        <p className="text-amber-400">{formatCurrency(receipt.newBalance)}</p>
                      ) : (
                        <p className="text-green-400">Paid</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {receipt.isPurchaseCompleted ? (
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
                        {receipt.waybillGenerated && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Waybill
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-400 text-sm">{formatDate(receipt.generatedAt)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedReceiptId(receipt.id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        {/* Results count */}
        <div className="px-6 py-3 border-t border-white/10 text-sm text-slate-500">
          Showing {filteredReceipts.length} of {invoices.length} receipts
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceiptId && (
        <ReceiptModal
          businessSlug={businessSlug}
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}
    </>
  )
}
