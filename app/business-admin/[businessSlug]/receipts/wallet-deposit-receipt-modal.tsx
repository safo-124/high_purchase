"use client"

import { useRef } from "react"
import { WalletDepositReceiptData } from "../../actions"

interface WalletDepositReceiptModalProps {
  deposit: WalletDepositReceiptData | null
  onClose: () => void
}

export function WalletDepositReceiptModal({ deposit, onClose }: WalletDepositReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = printRef.current
    if (!content || !deposit) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wallet Deposit Receipt - ${deposit.receiptNumber}</title>
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
            .deposit-summary { margin-top: 20px; border: 2px solid #0891b2; border-radius: 8px; padding: 15px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .summary-row.highlight { font-size: 18px; font-weight: bold; border-top: 2px solid #0891b2; padding-top: 12px; margin-top: 8px; background: #f0fdfa; padding: 12px 8px; border-radius: 4px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .badge-confirmed { background: #dcfce7; color: #166534; }
            .badge-deposit { background: #e0f2fe; color: #0369a1; }
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

  const formatDate = (date: Date | string) =>
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

        {!deposit ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Receipt not found</p>
          </div>
        ) : (
          <>
            {/* Printable Content */}
            <div ref={printRef} className="text-gray-900">
              {/* Header */}
              <div className="text-center border-b-2 border-cyan-600 pb-5 mb-5">
                <p className="text-2xl font-bold text-cyan-600">{deposit.businessName}</p>
                <p className="text-sm text-gray-600">{deposit.shopName}</p>
                <p className="text-xl font-bold mt-4 uppercase tracking-widest text-gray-800">
                  Wallet Deposit Receipt
                </p>
                <p className="text-gray-600">{deposit.receiptNumber}</p>
                <div className="flex justify-center gap-2 mt-3">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700">
                    WALLET DEPOSIT
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    CONFIRMED
                  </span>
                  {deposit.paymentMethod && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                      {deposit.paymentMethod}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer & Deposit Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase text-cyan-600 border-b border-gray-200 pb-1 mb-3">
                    Customer Details
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Name</label>
                      <p className="font-medium text-gray-900">{deposit.customerName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Phone</label>
                      <p className="font-medium text-gray-900">{deposit.customerPhone}</p>
                    </div>
                    {deposit.customerAddress && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Address</label>
                        <p className="font-medium text-gray-900">{deposit.customerAddress}</p>
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
                      <label className="text-xs text-gray-500 uppercase">Receipt Number</label>
                      <p className="font-medium text-gray-900">{deposit.receiptNumber}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Transaction Type</label>
                      <p className="font-medium text-gray-900">
                        {deposit.type === "DEPOSIT" ? "Wallet Deposit" :
                         deposit.type === "REFUND" ? "Wallet Refund" :
                         deposit.type === "ADJUSTMENT" ? "Wallet Adjustment" : deposit.type}
                      </p>
                    </div>
                    {deposit.reference && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Reference</label>
                        <p className="font-medium text-gray-900">{deposit.reference}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Confirmed Date</label>
                      <p className="font-medium text-gray-900">
                        {deposit.confirmedAt ? formatDate(deposit.confirmedAt) : formatDate(deposit.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposit Details Table */}
              <div className="mb-6">
                <p className="text-xs font-bold uppercase text-cyan-600 border-b border-gray-200 pb-1 mb-3">
                  Deposit Details
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-cyan-50">
                      <th className="border border-gray-300 p-2 text-left text-xs uppercase font-semibold text-cyan-700">
                        Description
                      </th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-cyan-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 text-gray-900">
                        Wallet {deposit.type === "DEPOSIT" ? "Deposit" : deposit.type === "REFUND" ? "Refund" : "Adjustment"}
                        {deposit.description && (
                          <span className="block text-xs text-gray-500 mt-1">{deposit.description}</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-gray-900 font-medium">
                        {formatCurrency(deposit.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Wallet Summary */}
              <div className="border-t-2 border-cyan-600 pt-4 mb-6">
                <div className="flex justify-between py-1">
                  <span className="text-gray-700">Wallet Balance Before</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(deposit.balanceBefore)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300 mt-2 pt-2 bg-cyan-50 px-2 rounded">
                  <span className="text-cyan-700">Deposit Amount</span>
                  <span className="text-cyan-700">{formatCurrency(deposit.amount)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span className="text-green-600">New Wallet Balance</span>
                  <span className="text-green-600">{formatCurrency(deposit.balanceAfter)}</span>
                </div>
              </div>

              {/* Collector & Confirmation Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {deposit.collectorName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-blue-700 mb-2">Deposited By</p>
                    <p className="text-gray-900 font-medium">{deposit.collectorName}</p>
                    <p className="text-xs text-gray-500 mt-1">Collector</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {formatDate(deposit.createdAt)}
                    </p>
                  </div>
                )}
                {deposit.confirmedByName && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-green-700 mb-2">Confirmed By</p>
                    <p className="text-gray-900 font-medium">{deposit.confirmedByName}</p>
                    <p className="text-xs text-gray-500 mt-1">Administrator</p>
                    {deposit.confirmedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Confirmed: {formatDate(deposit.confirmedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {deposit.description && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase mb-1">Notes / Description</p>
                  <p className="text-gray-700">{deposit.description}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-10 text-center text-sm border-t border-gray-200 pt-5">
                <p className="text-cyan-600 font-medium">Thank you for your deposit!</p>
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
