"use client"

import { useState, useRef } from "react"
import { CollectorPurchaseInvoiceListData } from "../../actions"

interface InvoicesContentProps {
  invoices: CollectorPurchaseInvoiceListData[]
  shopSlug: string
}

export function InvoicesContent({ invoices, shopSlug }: InvoicesContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "PARTIALLY_PAID" | "FULLY_PAID">("all")
  const [selectedInvoice, setSelectedInvoice] = useState<CollectorPurchaseInvoiceListData | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

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

  const formatDateFull = (date: Date) => {
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
      inv.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerPhone.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || inv.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Stats
  const totalInvoices = invoices.length
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING").length
  const partialInvoices = invoices.filter((i) => i.status === "PARTIALLY_PAID").length
  const paidInvoices = invoices.filter((i) => i.status === "FULLY_PAID").length
  const totalValue = invoices.reduce((sum, i) => sum + i.totalAmount, 0)

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: "Pending", bg: "bg-amber-500/20", text: "text-amber-400" },
    PARTIALLY_PAID: { label: "Partial", bg: "bg-blue-500/20", text: "text-blue-400" },
    FULLY_PAID: { label: "Paid", bg: "bg-green-500/20", text: "text-green-400" },
  }

  function handlePrint() {
    if (!selectedInvoice || !printRef.current) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${selectedInvoice.invoiceNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 500px;
              margin: 0 auto;
              color: #111;
            }
            * { box-sizing: border-box; }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 15px;
              margin-bottom: 15px;
            }
            .business-name { font-size: 18px; font-weight: bold; margin-bottom: 3px; }
            .shop-name { font-size: 12px; color: #666; }
            .invoice-title { font-size: 14px; font-weight: bold; margin-top: 10px; letter-spacing: 1px; }
            .invoice-number { font-size: 11px; color: #666; }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 12px;
            }
            .info-label { color: #666; }
            .info-value { font-weight: 500; }
            .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
            th { text-align: left; padding: 6px 4px; border-bottom: 1px solid #ddd; color: #666; }
            td { padding: 6px 4px; border-bottom: 1px solid #eee; }
            td.right, th.right { text-align: right; }
            .total-row { font-weight: bold; font-size: 14px; }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #888;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 10px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>window.print(); window.close();<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-5xl xl:max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="text-slate-400 mt-1">Purchase invoices for your assigned customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalInvoices}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-400">{pendingInvoices}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase">Partial</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-400">{partialInvoices}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase">Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">{paidInvoices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Total Value Banner */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Total Invoice Value</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search invoice #, customer, purchase #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
        >
          <option value="all" className="bg-slate-800">All Status</option>
          <option value="PENDING" className="bg-slate-800">Pending</option>
          <option value="PARTIALLY_PAID" className="bg-slate-800">Partially Paid</option>
          <option value="FULLY_PAID" className="bg-slate-800">Fully Paid</option>
        </select>
      </div>

      {/* Invoices List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-slate-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-400 text-lg">No invoices found</p>
            <p className="text-slate-500 text-sm mt-1">Purchase invoices for your assigned customers will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredInvoices.map((inv) => {
              const sc = statusConfig[inv.status] || statusConfig.PENDING
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="p-4 sm:p-5 hover:bg-white/[0.03] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <div className={`p-2 sm:p-2.5 rounded-xl ${sc.bg} flex-shrink-0 mt-0.5`}>
                        {inv.status === "FULLY_PAID" ? (
                          <svg className={`w-5 h-5 ${sc.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : inv.status === "PARTIALLY_PAID" ? (
                          <svg className={`w-5 h-5 ${sc.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ) : (
                          <svg className={`w-5 h-5 ${sc.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white text-sm">{inv.invoiceNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${sc.bg} ${sc.text}`}>
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1 truncate">
                          {inv.customerName} &bull; {inv.customerPhone}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-xs text-slate-500">{inv.purchaseNumber}</span>
                          <span className="text-xs text-slate-600">&bull;</span>
                          <span className="text-xs text-slate-500">{inv.purchaseType.replace("_", " ")}</span>
                          <span className="text-xs text-slate-600">&bull;</span>
                          <span className="text-xs text-slate-500">{formatDate(inv.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base sm:text-lg font-bold text-white">{formatCurrency(inv.totalAmount)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                        Due: {formatDate(inv.dueDate)}
                      </p>
                      {inv.installments > 1 && (
                        <p className="text-[10px] text-slate-500">{inv.installments} installments</p>
                      )}
                    </div>
                  </div>

                  {/* Items preview */}
                  {inv.itemsSnapshot.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pl-11 sm:pl-14">
                      {inv.itemsSnapshot.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400">
                          {item.quantity}x {item.productName}
                        </span>
                      ))}
                      {inv.itemsSnapshot.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-500">
                          +{inv.itemsSnapshot.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Purchase Invoice</h3>
                  <p className="text-sm text-slate-400">{selectedInvoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  title="Print Invoice"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div ref={printRef} className="p-5">
              {/* Invoice Header */}
              <div className="text-center mb-5 pb-4 border-b border-dashed border-white/20">
                <div className="text-lg font-bold text-white">{selectedInvoice.businessName}</div>
                <div className="text-sm text-slate-400">{selectedInvoice.shopName}</div>
                <div className="text-sm font-semibold text-indigo-400 mt-3 tracking-wider uppercase">Purchase Invoice</div>
                <div className="text-xs text-slate-500">{selectedInvoice.invoiceNumber}</div>
                <div className="mt-2">
                  {(() => {
                    const sc = statusConfig[selectedInvoice.status] || statusConfig.PENDING
                    return (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Bill To</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Customer</span>
                    <span className="text-white">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Phone</span>
                    <span className="text-white">{selectedInvoice.customerPhone}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Details */}
              <div className="mb-4 pt-4 border-t border-dashed border-white/10">
                <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Purchase Details</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Purchase #</span>
                    <span className="text-white">{selectedInvoice.purchaseNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white">{selectedInvoice.purchaseType.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Due Date</span>
                    <span className="text-white">{formatDate(selectedInvoice.dueDate)}</span>
                  </div>
                  {selectedInvoice.installments > 1 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Installments</span>
                      <span className="text-white">{selectedInvoice.installments}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Invoice Date</span>
                    <span className="text-white">{formatDateFull(selectedInvoice.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {selectedInvoice.itemsSnapshot.length > 0 && (
                <div className="mb-4 pt-4 border-t border-dashed border-white/10">
                  <h4 className="text-xs font-medium text-slate-400 uppercase mb-3">Items</h4>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/[0.03]">
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-400">Item</th>
                          <th className="text-center py-2.5 px-2 text-xs font-medium text-slate-400">Qty</th>
                          <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-400">Price</th>
                          <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {selectedInvoice.itemsSnapshot.map((item, i) => (
                          <tr key={i}>
                            <td className="py-2.5 px-3 text-white">{item.productName}</td>
                            <td className="py-2.5 px-2 text-center text-slate-300">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-slate-300">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-2.5 px-3 text-right text-white font-medium">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Amount Summary */}
              <div className="mt-4 bg-white/5 rounded-xl p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Amount</span>
                    <span className="text-white font-semibold text-base">{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                  {selectedInvoice.downPayment > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Down Payment</span>
                      <span className="text-emerald-400">{formatCurrency(selectedInvoice.downPayment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-slate-400 font-medium">Balance Due</span>
                    <span className="text-amber-400 font-bold text-base">
                      {formatCurrency(selectedInvoice.totalAmount - selectedInvoice.downPayment)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-dashed border-white/10 text-center text-xs text-slate-500">
                <p>Please make payments to your assigned collector.</p>
                <p className="mt-1">Invoice generated on {formatDateFull(selectedInvoice.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
