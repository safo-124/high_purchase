"use client"

import { useEffect, useState, useRef } from "react"
import { getBusinessProgressInvoice, BusinessInvoiceData } from "../../actions"

interface ReceiptModalProps {
  businessSlug: string
  receiptId: string
  onClose: () => void
}

export function ReceiptModal({ businessSlug, receiptId, onClose }: ReceiptModalProps) {
  const [receipt, setReceipt] = useState<BusinessInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadReceipt() {
      try {
        const data = await getBusinessProgressInvoice(businessSlug, receiptId)
        setReceipt(data)
      } catch (error) {
        console.error("Failed to load receipt:", error)
      } finally {
        setLoading(false)
      }
    }
    loadReceipt()
  }, [businessSlug, receiptId])

  function handlePrint() {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt?.invoiceNumber}</title>
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
            .receipt-title { font-size: 18px; font-weight: bold; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; }
            .receipt-number { font-size: 14px; color: #666; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0891b2; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .info-item label { font-size: 11px; color: #888; display: block; text-transform: uppercase; }
            .info-item span { font-size: 14px; font-weight: 500; color: #333; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
            .items-table th { background: #e0f2fe; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #0891b2; }
            .totals { margin-top: 20px; border-top: 2px solid #0891b2; padding-top: 15px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
            .total-row.highlight { font-size: 18px; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
            .payment-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #dcfce7; color: #166534; }
            .completed-badge { background: #dbeafe; color: #1e40af; }
            .payment-info { margin-top: 20px; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; }
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

  const formatCurrency = (amount: number) =>
    `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
        ) : !receipt ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Receipt not found</p>
          </div>
        ) : (
          <>
            {/* Printable Content */}
            <div ref={printRef} className="text-gray-900">
              {/* Header */}
              <div className="text-center border-b-2 border-cyan-600 pb-5 mb-5">
                <p className="text-2xl font-bold text-cyan-600">{receipt.businessName}</p>
                <p className="text-sm text-gray-600">{receipt.shopName}</p>
                {receipt.shopAdminName && (
                  <p className="text-xs text-gray-500">Shop Admin: {receipt.shopAdminName}</p>
                )}
                <p className="text-xl font-bold mt-4 uppercase tracking-widest text-gray-800">
                  Payment Receipt
                </p>
                <p className="text-gray-600">{receipt.invoiceNumber}</p>
                <div className="flex justify-center gap-2 mt-3">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    {receipt.paymentMethod}
                  </span>
                  {receipt.isPurchaseCompleted && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      FULLY PAID
                    </span>
                  )}
                  {receipt.waybillGenerated && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      WAYBILL: {receipt.waybillNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer & Payment Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase text-cyan-600 border-b border-gray-200 pb-1 mb-3">
                    Customer Details
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Name</label>
                      <p className="font-medium text-gray-900">{receipt.customerName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Phone</label>
                      <p className="font-medium text-gray-900">{receipt.customerPhone}</p>
                    </div>
                    {receipt.customerAddress && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Address</label>
                        <p className="font-medium text-gray-900">{receipt.customerAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-cyan-600 border-b border-gray-200 pb-1 mb-3">
                    Receipt Details
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Date</label>
                      <p className="font-medium text-gray-900">{formatDate(receipt.generatedAt)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Purchase #</label>
                      <p className="font-medium text-gray-900">{receipt.purchaseNumber}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Type</label>
                      <p className="font-medium text-gray-900">{receipt.purchaseType}</p>
                    </div>
                    {receipt.collectorName && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Collected By</label>
                        <p className="font-medium text-gray-900">
                          {receipt.collectorName}
                          {receipt.recordedByRole && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({receipt.recordedByRole === "COLLECTOR" ? "Collector" : 
                                receipt.recordedByRole === "SHOP_ADMIN" ? "Shop Admin" : 
                                receipt.recordedByRole === "BUSINESS_ADMIN" ? "Business Admin" : ""})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {receipt.recordedByRole && receipt.recordedByRole !== "COLLECTOR" && receipt.recordedByName && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Recorded By</label>
                        <p className="font-medium text-gray-900">
                          {receipt.recordedByName}
                          <span className="ml-1 text-xs text-gray-400">
                            ({receipt.recordedByRole === "SHOP_ADMIN" ? "Shop Admin" : "Business Admin"})
                          </span>
                        </p>
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
                    {receipt.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-2 text-gray-900">{item.productName}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900 font-medium">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Summary */}
              <div className="border-t-2 border-cyan-600 pt-4 mb-6">
                <div className="flex justify-between py-1">
                  <span className="text-gray-700">Total Purchase Amount</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(receipt.totalPurchaseAmount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-700">Previously Paid</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(receipt.totalAmountPaid - receipt.paymentAmount)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-700">Balance Before This Payment</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(receipt.previousBalance)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300 mt-2 pt-2 bg-green-50 px-2 rounded">
                  <span className="text-green-700">This Payment</span>
                  <span className="text-green-700">{formatCurrency(receipt.paymentAmount)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span className={receipt.newBalance > 0 ? "text-amber-600" : "text-green-600"}>
                    Remaining Balance
                  </span>
                  <span className={receipt.newBalance > 0 ? "text-amber-600" : "text-green-600"}>
                    {formatCurrency(receipt.newBalance)}
                  </span>
                </div>
              </div>

              {/* Payment Methods for Future Payments */}
              {receipt.newBalance > 0 && (receipt.bankName || receipt.mobileMoneyProvider) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-bold text-emerald-700 mb-3">Payment Methods for Remaining Balance</p>
                  
                  <div className="space-y-3">
                    {receipt.bankName && (
                      <div className="bg-white p-3 rounded border">
                        <p className="font-medium text-gray-800 mb-2">🏦 Bank Transfer</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Bank:</span>
                            <span className="ml-2 font-medium">{receipt.bankName}</span>
                          </div>
                          {receipt.bankBranch && (
                            <div>
                              <span className="text-gray-500">Branch:</span>
                              <span className="ml-2 font-medium">{receipt.bankBranch}</span>
                            </div>
                          )}
                          {receipt.bankAccountName && (
                            <div>
                              <span className="text-gray-500">Account Name:</span>
                              <span className="ml-2 font-medium">{receipt.bankAccountName}</span>
                            </div>
                          )}
                          {receipt.bankAccountNumber && (
                            <div>
                              <span className="text-gray-500">Account No:</span>
                              <span className="ml-2 font-medium">{receipt.bankAccountNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {receipt.mobileMoneyProvider && (
                      <div className="bg-white p-3 rounded border">
                        <p className="font-medium text-gray-800 mb-2">📱 Mobile Money</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Provider:</span>
                            <span className="ml-2 font-medium">{receipt.mobileMoneyProvider}</span>
                          </div>
                          {receipt.mobileMoneyName && (
                            <div>
                              <span className="text-gray-500">Name:</span>
                              <span className="ml-2 font-medium">{receipt.mobileMoneyName}</span>
                            </div>
                          )}
                          {receipt.mobileMoneyNumber && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Number:</span>
                              <span className="ml-2 font-medium text-lg">{receipt.mobileMoneyNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-emerald-600 mt-3">
                    Please include your purchase number ({receipt.purchaseNumber}) as reference when making payment.
                  </p>
                </div>
              )}

              {/* Notes */}
              {receipt.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
                  <p className="text-gray-700">{receipt.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-10 text-center text-sm border-t border-gray-200 pt-5">
                <p className="text-cyan-600 font-medium">Thank you for your payment!</p>
                <p className="text-gray-500">This is a computer-generated receipt</p>
                <p className="mt-2 text-gray-400 text-xs">
                  Generated on {new Date().toLocaleString()}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Receipt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
