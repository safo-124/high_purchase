"use client"

import { useEffect, useState, useRef } from "react"
import { getBillData, BillData } from "../../actions"

interface BillModalProps {
  shopSlug: string
  purchaseId: string
  onClose: () => void
}

export function BillModal({ shopSlug, purchaseId, onClose }: BillModalProps) {
  const [bill, setBill] = useState<BillData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadBill() {
      try {
        const data = await getBillData(shopSlug, purchaseId)
        setBill(data)
      } catch (error) {
        console.error("Failed to load bill:", error)
      } finally {
        setLoading(false)
      }
    }
    loadBill()
  }, [shopSlug, purchaseId])

  function handlePrint() {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${bill?.purchaseNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .shop-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .shop-info {
              font-size: 12px;
              color: #666;
            }
            .bill-title {
              font-size: 20px;
              font-weight: bold;
              margin-top: 15px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .bill-number {
              font-size: 14px;
              color: #666;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 10px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .info-item label {
              font-size: 11px;
              color: #888;
              display: block;
              text-transform: uppercase;
            }
            .info-item span {
              font-size: 14px;
              font-weight: 500;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 10px 12px;
              text-align: left;
            }
            .items-table th {
              background: #f5f5f5;
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 600;
            }
            .items-table .number {
              text-align: right;
            }
            .totals {
              margin-top: 20px;
              border-top: 2px solid #000;
              padding-top: 15px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 14px;
            }
            .total-row.highlight {
              font-size: 18px;
              font-weight: bold;
              border-top: 1px solid #ddd;
              padding-top: 10px;
              margin-top: 10px;
            }
            .total-row.outstanding {
              color: #dc2626;
            }
            .payment-schedule {
              margin-top: 20px;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 8px;
            }
            .payment-schedule h4 {
              margin: 0 0 10px 0;
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
            }
            .payment-schedule p {
              margin: 5px 0;
              font-size: 14px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #888;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .footer p {
              margin: 5px 0;
            }
            .purchase-type {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .purchase-type.CASH { background: #dcfce7; color: #166534; }
            .purchase-type.LAYAWAY { background: #fef3c7; color: #92400e; }
            .purchase-type.CREDIT { background: #dbeafe; color: #1e40af; }
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

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date))
  }

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : !bill ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Bill not found</p>
          </div>
        ) : (
          <>
            {/* Printable Content */}
            <div ref={printRef} className="text-gray-900">
              {/* Header */}
              <div className="header text-center border-b-2 border-gray-800 pb-5 mb-5">
                <p className="shop-name text-2xl font-bold text-gray-900">{bill.shop.name}</p>
                {bill.shop.address && <p className="shop-info text-sm text-gray-600">{bill.shop.address}</p>}
                {bill.shop.phone && <p className="shop-info text-sm text-gray-600">Tel: {bill.shop.phone}</p>}
                <p className="bill-title text-xl font-bold mt-4 uppercase tracking-widest text-indigo-600">
                  {bill.purchaseType === "CASH" ? "RECEIPT" : "INVOICE"}
                </p>
                <p className="bill-number text-gray-600">{bill.purchaseNumber}</p>
                <span className={`purchase-type inline-block mt-2 px-3 py-1 rounded text-xs font-bold uppercase ${
                  bill.purchaseType === "CASH" 
                    ? "bg-green-100 text-green-700" 
                    : bill.purchaseType === "LAYAWAY"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {bill.purchaseType}
                </span>
              </div>

              {/* Customer & Date Info */}
              <div className="section info-grid grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="section-title text-xs font-bold uppercase text-indigo-600 border-b border-gray-200 pb-1 mb-2">Bill To</p>
                  <div className="info-item">
                    <label className="text-xs text-gray-500 uppercase">Customer Name</label>
                    <span className="text-sm font-medium text-gray-900 block">{bill.customer.name}</span>
                  </div>
                  <div className="info-item mt-2">
                    <label className="text-xs text-gray-500 uppercase">Phone</label>
                    <span className="text-sm font-medium text-gray-900 block">{bill.customer.phone}</span>
                  </div>
                  {bill.customer.address && (
                    <div className="info-item mt-2">
                      <label className="text-xs text-gray-500 uppercase">Address</label>
                      <span className="text-sm font-medium text-gray-900 block">
                        {bill.customer.address}
                        {bill.customer.city && `, ${bill.customer.city}`}
                        {bill.customer.region && `, ${bill.customer.region}`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="section-title text-xs font-bold uppercase text-indigo-600 border-b border-gray-200 pb-1 mb-2">Details</p>
                  <div className="info-item">
                    <label className="text-xs text-gray-500 uppercase">Date</label>
                    <span className="text-sm font-medium text-gray-900 block">{formatDate(bill.createdAt)}</span>
                  </div>
                  {bill.dueDate && bill.purchaseType !== "CASH" && (
                    <div className="info-item mt-2">
                      <label className="text-xs text-gray-500 uppercase">Due Date</label>
                      <span className="text-sm font-medium text-gray-900 block">{formatDate(bill.dueDate)}</span>
                    </div>
                  )}
                  {bill.salesStaff && (
                    <div className="info-item mt-2">
                      <label className="text-xs text-gray-500 uppercase">Shop Admin</label>
                      <span className="text-sm font-medium text-gray-900 block">{bill.salesStaff}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="section mb-5">
                <p className="section-title text-xs font-bold uppercase text-indigo-600 border-b border-gray-200 pb-1 mb-2">Items</p>
                <table className="items-table w-full border-collapse">
                  <thead>
                    <tr className="bg-indigo-50">
                      <th className="border border-gray-300 p-2 text-left text-xs uppercase font-semibold text-indigo-700">Item</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-indigo-700">Qty</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-indigo-700">Unit Price</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-indigo-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-2 text-gray-900">{item.productName}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900 font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="totals border-t-2 border-gray-800 pt-4">
                <div className="total-row flex justify-between py-1">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(bill.subtotal)}</span>
                </div>
                {bill.interestAmount > 0 && (
                  <div className="total-row flex justify-between py-1">
                    <span className="text-gray-700">Interest ({bill.interestRate}% {bill.interestType})</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(bill.interestAmount)}</span>
                  </div>
                )}
                <div className="total-row highlight flex justify-between py-2 text-lg font-bold border-t border-gray-300 mt-2 pt-2">
                  <span className="text-gray-900">Total Amount</span>
                  <span className="text-gray-900">{formatCurrency(bill.totalAmount)}</span>
                </div>
                {bill.downPayment > 0 && (
                  <div className="total-row flex justify-between py-1">
                    <span className="text-green-700">Down Payment</span>
                    <span className="text-green-600 font-medium">- {formatCurrency(bill.downPayment)}</span>
                  </div>
                )}
                {bill.outstandingBalance > 0 && (
                  <div className="total-row outstanding flex justify-between py-2 text-lg font-bold">
                    <span className="text-red-600">Balance Due</span>
                    <span className="text-red-600">{formatCurrency(bill.outstandingBalance)}</span>
                  </div>
                )}
                {bill.outstandingBalance === 0 && (
                  <div className="total-row flex justify-between py-2 text-lg font-bold">
                    <span className="text-green-600">Status</span>
                    <span className="text-green-600">PAID IN FULL</span>
                  </div>
                )}
              </div>

              {/* Payment Schedule for Credit */}
              {bill.purchaseType === "CREDIT" && bill.outstandingBalance > 0 && (
                <div className="payment-schedule mt-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-xs uppercase font-bold text-blue-700 mb-2">Payment Schedule</h4>
                  <p className="text-sm text-gray-700">Number of Installments: <strong className="text-gray-900">{bill.installments}</strong></p>
                  <p className="text-sm text-gray-700">Monthly Payment: <strong className="text-gray-900">{formatCurrency(Math.ceil(bill.outstandingBalance / bill.installments))}</strong></p>
                  <p className="text-sm text-gray-700">Due Date: <strong className="text-gray-900">{formatDate(bill.dueDate)}</strong></p>
                </div>
              )}

              {/* Footer */}
              <div className="footer mt-10 text-center text-sm border-t border-gray-200 pt-5">
                <p className="text-blue-600 font-medium">Thank you for your business!</p>
                <p className="text-gray-600">For inquiries, please contact us at {bill.shop.phone || "the shop"}</p>
                <p className="mt-2 text-gray-400 text-xs">Generated on {new Date().toLocaleString()}</p>
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
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Bill
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
