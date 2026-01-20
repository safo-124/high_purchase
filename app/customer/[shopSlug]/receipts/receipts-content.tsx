"use client"

import { useState, useRef } from "react"
import { CustomerReceiptData } from "../../actions"
import { FileText, Search, Printer, CheckCircle, Clock, X, Download } from "lucide-react"

interface ReceiptsContentProps {
  receipts: CustomerReceiptData[]
  shopSlug: string
}

export function ReceiptsContent({ receipts, shopSlug }: ReceiptsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "partial">("all")
  const [selectedReceipt, setSelectedReceipt] = useState<CustomerReceiptData | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

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

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && receipt.isPurchaseCompleted) ||
      (statusFilter === "partial" && !receipt.isPurchaseCompleted)

    return matchesSearch && matchesStatus
  })

  // Stats
  const totalReceipts = receipts.length
  const totalPaid = receipts.reduce((sum, r) => sum + r.paymentAmount, 0)
  const completedPurchases = receipts.filter((r) => r.isPurchaseCompleted).length

  function handlePrint() {
    if (!selectedReceipt || !printRef.current) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${selectedReceipt.invoiceNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 400px;
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
            .receipt-title { font-size: 14px; font-weight: bold; margin-top: 10px; letter-spacing: 1px; }
            .receipt-number { font-size: 11px; color: #666; }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 12px;
            }
            .info-label { color: #666; }
            .info-value { font-weight: 500; }
            .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
            .amount-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 14px;
            }
            .amount-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
            .items-table { width: 100%; font-size: 11px; margin: 10px 0; border-collapse: collapse; }
            .items-table th, .items-table td { padding: 5px; text-align: left; border-bottom: 1px solid #eee; }
            .items-table th { font-weight: bold; }
            .items-table .number { text-align: right; }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #888;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Receipts</h1>
          <p className="text-slate-400 mt-1">View all your payment receipts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Receipts</p>
              <p className="text-2xl font-bold text-white">{totalReceipts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Paid</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Completed Purchases</p>
              <p className="text-2xl font-bold text-green-400">{completedPurchases}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by receipt # or purchase #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "completed" | "partial")}
          className="px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <option value="all" className="bg-slate-800 text-white">All Status</option>
          <option value="completed" className="bg-slate-800 text-white">Fully Paid</option>
          <option value="partial" className="bg-slate-800 text-white">Partial Payment</option>
        </select>
      </div>

      {/* Receipts List */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No receipts found</p>
            <p className="text-slate-500 text-sm mt-1">Your payment receipts will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                onClick={() => setSelectedReceipt(receipt)}
                className="p-5 hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${receipt.isPurchaseCompleted ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                      {receipt.isPurchaseCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{receipt.invoiceNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          receipt.isPurchaseCompleted
                            ? "bg-green-500/20 text-green-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {receipt.isPurchaseCompleted ? "Fully Paid" : "Partial"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {receipt.purchaseNumber} • {receipt.shopName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(receipt.generatedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(receipt.paymentAmount)}</p>
                    <p className="text-xs text-slate-400">{receipt.paymentMethod.replace("_", " ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Payment Receipt</h3>
                  <p className="text-sm text-slate-400">{selectedReceipt.invoiceNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  title="Print Receipt"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div ref={printRef} className="p-6">
              {/* Receipt Header */}
              <div className="header text-center mb-6 pb-4 border-b border-dashed border-white/20">
                <div className="business-name text-lg font-bold text-white">{selectedReceipt.businessName}</div>
                <div className="shop-name text-sm text-slate-400">{selectedReceipt.shopName}</div>
                <div className="receipt-title text-sm font-semibold text-indigo-400 mt-3 tracking-wider">PAYMENT RECEIPT</div>
                <div className="receipt-number text-xs text-slate-500">{selectedReceipt.invoiceNumber}</div>
              </div>

              {/* Purchase Info */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Purchase Details</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Purchase #</span>
                    <span className="text-white">{selectedReceipt.purchaseNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white">{selectedReceipt.purchaseType.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Date</span>
                    <span className="text-white">{formatDate(selectedReceipt.generatedAt)}</span>
                  </div>
                  {selectedReceipt.collectorName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Collected By</span>
                      <span className="text-white">{selectedReceipt.collectorName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              {selectedReceipt.items.length > 0 && (
                <div className="mb-4 pt-4 border-t border-dashed border-white/10">
                  <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Items</h4>
                  <table className="items-table w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs">
                        <th className="text-left py-2">Item</th>
                        <th className="text-center py-2">Qty</th>
                        <th className="text-right py-2">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="py-2 text-white">{item.productName}</td>
                          <td className="py-2 text-center text-slate-400">{item.quantity}</td>
                          <td className="py-2 text-right text-white">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Amount Summary */}
              <div className="mt-6 pt-4 border-t border-white/10 bg-white/5 rounded-xl p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Purchase</span>
                    <span className="text-white">{formatCurrency(selectedReceipt.totalPurchaseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Previous Balance</span>
                    <span className="text-white">{formatCurrency(selectedReceipt.previousBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">This Payment</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(selectedReceipt.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Paid</span>
                    <span className="text-white">{formatCurrency(selectedReceipt.totalAmountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-slate-300 font-medium">New Balance</span>
                    <span className={`font-bold ${selectedReceipt.newBalance === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {formatCurrency(selectedReceipt.newBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mt-4 text-center">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  selectedReceipt.isPurchaseCompleted
                    ? "bg-green-500/20 text-green-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {selectedReceipt.isPurchaseCompleted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Fully Paid
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      Balance Remaining
                    </>
                  )}
                </span>
              </div>

              {/* Footer */}
              <div className="footer mt-6 pt-4 border-t border-dashed border-white/10 text-center text-xs text-slate-500">
                <p>Thank you for your payment!</p>
                <p className="mt-1">Receipt generated on {formatDate(selectedReceipt.generatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
