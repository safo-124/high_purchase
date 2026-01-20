"use client"

import { useEffect, useState, useRef } from "react"
import { getProgressInvoice, ProgressInvoiceData } from "../../actions"
import { FileText, Printer, X, CheckCircle, Clock, Truck } from "lucide-react"

interface ProgressInvoiceModalProps {
  shopSlug: string
  invoiceId: string
  onClose: () => void
  onViewWaybill?: (purchaseId: string) => void
}

export function ProgressInvoiceModal({ shopSlug, invoiceId, onClose, onViewWaybill }: ProgressInvoiceModalProps) {
  const [invoice, setInvoice] = useState<ProgressInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadInvoice() {
      try {
        const data = await getProgressInvoice(shopSlug, invoiceId)
        setInvoice(data)
      } catch (error) {
        console.error("Failed to load invoice:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInvoice()
  }, [shopSlug, invoiceId])

  function handlePrint() {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice?.invoiceNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              color: #111;
            }
            * { box-sizing: border-box; }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .business-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .shop-name { font-size: 14px; color: #666; }
            .invoice-title { font-size: 20px; font-weight: bold; margin-top: 15px; letter-spacing: 2px; }
            .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              margin-top: 10px;
            }
            .status-completed { background: #dcfce7; color: #166534; }
            .status-partial { background: #fef3c7; color: #92400e; }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-section { }
            .info-title {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 13px;
            }
            .info-label { color: #666; }
            .info-value { font-weight: 500; }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th, .items-table td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            .items-table th {
              background: #f5f5f5;
              font-size: 11px;
              text-transform: uppercase;
            }
            .items-table .number { text-align: right; }
            .payment-summary {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
            }
            .payment-row.highlight {
              font-size: 16px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
            }
            .payment-row.paid { color: #166534; }
            .payment-row.balance { color: #dc2626; }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #888;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const formatCurrency = (amount: number) => {
    return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      CASH: "Cash",
      MOBILE_MONEY: "Mobile Money",
      BANK_TRANSFER: "Bank Transfer",
      CARD: "Card",
    }
    return methods[method] || method
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !invoice ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Invoice not found</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Actions */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Progress Invoice
              </h2>
              <div className="flex items-center gap-2">
                {invoice.waybillGenerated && onViewWaybill && (
                  <button
                    onClick={() => onViewWaybill(invoice.purchaseId)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    View Waybill
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div ref={printRef} className="text-gray-900">
              {/* Header */}
              <div className="header text-center border-b-2 border-black pb-4 mb-5">
                <div className="business-name text-2xl font-bold">{invoice.businessName}</div>
                <div className="shop-name text-sm text-gray-600">{invoice.shopName}</div>
                <div className="invoice-title text-xl font-bold mt-4 tracking-widest">PROGRESS INVOICE</div>
                <div className="invoice-number text-gray-600">{invoice.invoiceNumber}</div>
                <span className={`status-badge inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                  invoice.isPurchaseCompleted ? "status-completed bg-green-100 text-green-700" : "status-partial bg-amber-100 text-amber-700"
                }`}>
                  {invoice.isPurchaseCompleted ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> FULLY PAID
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> PARTIAL PAYMENT
                    </span>
                  )}
                </span>
              </div>

              {/* Info Grid */}
              <div className="info-grid grid grid-cols-2 gap-5 mb-5">
                <div className="info-section">
                  <div className="info-title text-xs font-bold uppercase text-gray-500 border-b border-gray-200 pb-1 mb-2">Customer Details</div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Name</span>
                    <span className="info-value font-medium">{invoice.customerName}</span>
                  </div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Phone</span>
                    <span className="info-value font-medium">{invoice.customerPhone}</span>
                  </div>
                  {invoice.customerAddress && (
                    <div className="info-row flex justify-between py-1 text-sm">
                      <span className="info-label text-gray-500">Address</span>
                      <span className="info-value font-medium">{invoice.customerAddress}</span>
                    </div>
                  )}
                </div>
                <div className="info-section text-right">
                  <div className="info-title text-xs font-bold uppercase text-gray-500 border-b border-gray-200 pb-1 mb-2">Payment Details</div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Date</span>
                    <span className="info-value font-medium">{formatDate(invoice.generatedAt)}</span>
                  </div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Purchase #</span>
                    <span className="info-value font-medium">{invoice.purchaseNumber}</span>
                  </div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Method</span>
                    <span className="info-value font-medium">{formatPaymentMethod(invoice.paymentMethod)}</span>
                  </div>
                  {invoice.collectorName && (
                    <div className="info-row flex justify-between py-1 text-sm">
                      <span className="info-label text-gray-500">Collected By</span>
                      <span className="info-value font-medium">
                        {invoice.collectorName}
                        {invoice.recordedByRole && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({invoice.recordedByRole === "COLLECTOR" ? "Collector" : 
                              invoice.recordedByRole === "SHOP_ADMIN" ? "Shop Admin" : 
                              invoice.recordedByRole === "BUSINESS_ADMIN" ? "Business Admin" : ""})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {!invoice.collectorName && invoice.recordedByName && (
                    <div className="info-row flex justify-between py-1 text-sm">
                      <span className="info-label text-gray-500">Recorded By</span>
                      <span className="info-value font-medium">
                        {invoice.recordedByName}
                        {invoice.recordedByRole && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({invoice.recordedByRole === "SHOP_ADMIN" ? "Shop Admin" : 
                              invoice.recordedByRole === "BUSINESS_ADMIN" ? "Business Admin" : ""})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {invoice.confirmedByName && (
                    <div className="info-row flex justify-between py-1 text-sm">
                      <span className="info-label text-gray-500">Confirmed By</span>
                      <span className="info-value font-medium">{invoice.confirmedByName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-5">
                <div className="text-xs font-bold uppercase text-gray-500 border-b border-gray-200 pb-1 mb-2">Purchase Items</div>
                <table className="items-table w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left text-xs uppercase font-semibold">Item</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold">Qty</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold">Unit Price</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-2 text-sm">{item.productName}</td>
                        <td className="border border-gray-300 p-2 text-right text-sm">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                        <td className="border border-gray-300 p-2 text-right text-sm">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Summary */}
              <div className="payment-summary bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-bold uppercase text-gray-500 mb-3">Payment Summary</div>
                <div className="payment-row flex justify-between py-1 text-sm">
                  <span>Total Purchase Amount</span>
                  <span className="font-medium">{formatCurrency(invoice.totalPurchaseAmount)}</span>
                </div>
                <div className="payment-row flex justify-between py-1 text-sm">
                  <span>Previous Balance</span>
                  <span className="font-medium">{formatCurrency(invoice.previousBalance)}</span>
                </div>
                <div className="payment-row highlight flex justify-between py-2 text-base font-bold text-green-700 border-t border-gray-300 mt-2 pt-2">
                  <span>This Payment</span>
                  <span>{formatCurrency(invoice.paymentAmount)}</span>
                </div>
                <div className="payment-row flex justify-between py-1 text-sm">
                  <span>Total Amount Paid to Date</span>
                  <span className="font-medium">{formatCurrency(invoice.totalAmountPaid)}</span>
                </div>
                <div className={`payment-row flex justify-between py-2 text-base font-bold ${invoice.newBalance > 0 ? "text-red-600" : "text-green-600"} border-t border-gray-300 mt-2 pt-2`}>
                  <span>Remaining Balance</span>
                  <span>{invoice.newBalance > 0 ? formatCurrency(invoice.newBalance) : "PAID IN FULL"}</span>
                </div>
              </div>

              {/* Waybill Info */}
              {invoice.waybillGenerated && invoice.waybillNumber && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-700 font-medium">
                    <Truck className="w-4 h-4" />
                    Waybill Generated: {invoice.waybillNumber}
                  </div>
                  <p className="text-sm text-purple-600 mt-1">Purchase fully paid - Ready for delivery</p>
                </div>
              )}

              {/* Footer */}
              <div className="footer mt-8 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                <p>Thank you for your payment!</p>
                <p className="mt-1 text-gray-400">Generated on {new Date().toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
