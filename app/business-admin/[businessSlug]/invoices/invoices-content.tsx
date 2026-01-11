"use client"

import { useState } from "react"
import { BusinessInvoiceData } from "../../actions"
import { ProgressInvoiceModal } from "./progress-invoice-modal"

interface InvoicesContentProps {
  invoices: BusinessInvoiceData[]
  shops: { name: string; shopSlug: string }[]
  businessSlug: string
}

export function InvoicesContent({ invoices, shops, businessSlug }: InvoicesContentProps) {
  const [search, setSearch] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      search === "" ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerPhone.includes(search)

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
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          {/* Shop Filter */}
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="all" className="bg-slate-800">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.shopSlug} value={shop.name} className="bg-slate-800">
                {shop.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="all" className="bg-slate-800">All Status</option>
            <option value="completed" className="bg-slate-800">Completed</option>
            <option value="active" className="bg-slate-800">Active (Pending)</option>
            <option value="waybill" className="bg-slate-800">Waybill Generated</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Shop
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Purchase
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
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">{invoice.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{invoice.shopName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{invoice.customerName}</p>
                      <p className="text-xs text-slate-500">{invoice.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-mono text-sm">{invoice.purchaseNumber}</p>
                      <p className="text-xs text-slate-500">{invoice.purchaseType}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-green-400 font-medium">
                        {formatCurrency(invoice.paymentAmount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {invoice.newBalance > 0 ? (
                        <p className="text-amber-400">{formatCurrency(invoice.newBalance)}</p>
                      ) : (
                        <p className="text-green-400">Paid</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {invoice.isPurchaseCompleted ? (
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
                        {invoice.waybillGenerated && (
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
                      <p className="text-slate-400 text-sm">{formatDate(invoice.generatedAt)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
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

        {/* Results count */}
        <div className="px-6 py-3 border-t border-white/10 text-sm text-slate-500">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoiceId && (
        <ProgressInvoiceModal
          businessSlug={businessSlug}
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </>
  )
}
