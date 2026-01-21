"use client"

import { useEffect, useState, useRef } from "react"
import { getBusinessPurchaseInvoice, PurchaseInvoiceDetailData } from "../../actions"

interface Props {
  businessSlug: string
  invoiceId: string
  onClose: () => void
}

export function PurchaseInvoiceModal({ businessSlug, invoiceId, onClose }: Props) {
  const [invoice, setInvoice] = useState<PurchaseInvoiceDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadInvoice() {
      try {
        const data = await getBusinessPurchaseInvoice(businessSlug, invoiceId)
        setInvoice(data)
      } catch (error) {
        console.error("Failed to load invoice:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInvoice()
  }, [businessSlug, invoiceId])

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

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
              color: #333;
            }
            .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 20px; margin-bottom: 20px; }
            .business-name { font-size: 24px; font-weight: bold; color: #0891b2; }
            .shop-name { font-size: 16px; color: #666; margin-top: 5px; }
            .invoice-title { font-size: 20px; font-weight: bold; margin-top: 15px; text-transform: uppercase; letter-spacing: 2px; }
            .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0891b2; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .info-item { margin-bottom: 8px; }
            .info-item label { font-size: 11px; color: #888; display: block; text-transform: uppercase; }
            .info-item span { font-size: 14px; font-weight: 500; color: #333; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
            .items-table th { background: #e0f2fe; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #0891b2; }
            .totals { margin-top: 20px; border-top: 2px solid #0891b2; padding-top: 15px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
            .total-row.highlight { font-size: 18px; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
            .payment-section { margin-top: 20px; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; }
            .payment-title { font-size: 14px; font-weight: bold; color: #166534; margin-bottom: 10px; }
            .payment-method { margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px; }
            .payment-method-title { font-weight: bold; color: #333; margin-bottom: 5px; }
            .payment-detail { font-size: 13px; color: #666; margin: 3px 0; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { body { padding: 0; } }
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          </div>
        ) : !invoice ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Invoice not found</p>
          </div>
        ) : (
          <>
            {/* Printable Content */}
            <div ref={printRef} className="p-8 text-gray-900">
              {/* Header */}
              <div className="text-center border-b-2 border-cyan-600 pb-5 mb-5">
                <p className="text-2xl font-bold text-cyan-600">{invoice.businessName}</p>
                <p className="text-sm text-gray-600">{invoice.shopName}</p>
                {invoice.shopAdminName && (
                  <p className="text-xs text-gray-500">Shop Admin: {invoice.shopAdminName}</p>
                )}
                <p className="text-xl font-bold mt-4 uppercase tracking-widest text-gray-800">
                  Purchase Invoice
                </p>
                <p className="text-gray-600">{invoice.invoiceNumber}</p>
                <div className="flex justify-center gap-2 mt-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    invoice.purchaseType === "CASH" ? "bg-green-100 text-green-700" :
                    invoice.purchaseType === "LAYAWAY" ? "bg-blue-100 text-blue-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>
                    {invoice.purchaseType}
                  </span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    invoice.status === "FULLY_PAID" ? "bg-emerald-100 text-emerald-700" :
                    invoice.status === "PARTIALLY_PAID" ? "bg-yellow-100 text-yellow-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {invoice.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Customer & Invoice Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase text-cyan-600 border-b border-gray-200 pb-1 mb-3">
                    Bill To
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Name</label>
                      <p className="font-medium text-gray-900">{invoice.customerName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Phone</label>
                      <p className="font-medium text-gray-900">{invoice.customerPhone}</p>
                    </div>
                    {invoice.customerAddress && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Address</label>
                        <p className="font-medium text-gray-900">{invoice.customerAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-cyan-600 border-b border-gray-200 pb-1 mb-3">
                    Invoice Details
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Date</label>
                      <p className="font-medium text-gray-900">{formatDate(invoice.generatedAt)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Due Date</label>
                      <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Purchase #</label>
                      <p className="font-medium text-gray-900">{invoice.purchaseNumber}</p>
                    </div>
                    {invoice.collectorName && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Assigned Collector</label>
                        <p className="font-medium text-gray-900">{invoice.collectorName}</p>
                        {invoice.collectorPhone && (
                          <p className="text-xs text-gray-500">{invoice.collectorPhone}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <p className="text-xs font-bold uppercase text-cyan-600 border-b border-gray-200 pb-1 mb-3">
                  Items
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-cyan-50">
                      <th className="border border-gray-300 p-2 text-left text-xs uppercase font-semibold text-cyan-700">
                        Item
                      </th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-cyan-700">
                        Qty
                      </th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-cyan-700">
                        Unit Price
                      </th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-cyan-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-2 text-gray-900">{item.productName}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="border border-gray-300 p-2 text-right font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t-2 border-cyan-600 pt-4 mb-6">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.interestAmount > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Interest</span>
                    <span className="font-medium">{formatCurrency(invoice.interestAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-200 mt-2">
                  <span>Total Amount</span>
                  <span className="text-cyan-700">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.downPayment > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Down Payment Required</span>
                    <span className="font-medium">{formatCurrency(invoice.downPayment)}</span>
                  </div>
                )}
                {invoice.installments > 1 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">Number of Installments</span>
                    <span className="font-medium">{invoice.installments}</span>
                  </div>
                )}
              </div>

              {/* Payment Methods Section */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-bold text-emerald-700 mb-3">Payment Methods Available</p>
                
                <div className="space-y-3">
                  {invoice.paymentMethods.includes("CASH") && (
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium text-gray-800">💵 Cash Payment</p>
                      <p className="text-sm text-gray-600">Pay cash to the assigned collector or at the shop</p>
                    </div>
                  )}

                  {invoice.paymentMethods.includes("BANK_TRANSFER") && invoice.bankName && (
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium text-gray-800 mb-2">🏦 Bank Transfer</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Bank:</span>
                          <span className="ml-2 font-medium">{invoice.bankName}</span>
                        </div>
                        {invoice.bankBranch && (
                          <div>
                            <span className="text-gray-500">Branch:</span>
                            <span className="ml-2 font-medium">{invoice.bankBranch}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Account Name:</span>
                          <span className="ml-2 font-medium">{invoice.bankAccountName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Account No:</span>
                          <span className="ml-2 font-medium">{invoice.bankAccountNumber}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {invoice.paymentMethods.includes("MOBILE_MONEY") && invoice.mobileMoneyProvider && (
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium text-gray-800 mb-2">📱 Mobile Money</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Provider:</span>
                          <span className="ml-2 font-medium">{invoice.mobileMoneyProvider}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Name:</span>
                          <span className="ml-2 font-medium">{invoice.mobileMoneyName}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Number:</span>
                          <span className="ml-2 font-medium text-lg">{invoice.mobileMoneyNumber}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-emerald-600 mt-3">
                  Please include your invoice number ({invoice.invoiceNumber}) as reference when making payment.
                </p>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                <p>Thank you for your business!</p>
                <p className="mt-1">For inquiries, please contact the shop or your assigned collector.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Invoice
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
