"use client"

import { useEffect, useState, useRef } from "react"
import { getProgressInvoice, ProgressInvoiceData } from "../../actions"
import { FileText, Printer, X, CheckCircle, Clock, Truck, Phone, MapPin, User, CreditCard, Building2, Smartphone } from "lucide-react"

interface ReceiptModalProps {
  shopSlug: string
  receiptId: string
  onClose: () => void
  onViewWaybill?: (purchaseId: string) => void
}

export function ReceiptModal({ shopSlug, receiptId, onClose, onViewWaybill }: ReceiptModalProps) {
  const [receipt, setReceipt] = useState<ProgressInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadReceipt() {
      try {
        const data = await getProgressInvoice(shopSlug, receiptId)
        setReceipt(data)
      } catch (error) {
        console.error("Failed to load receipt:", error)
      } finally {
        setLoading(false)
      }
    }
    loadReceipt()
  }, [shopSlug, receiptId])

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
              color: #111;
            }
            * { box-sizing: border-box; }
            .header {
              text-align: center;
              border-bottom: 2px solid #06b6d4;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .business-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .shop-name { font-size: 14px; color: #666; }
            .receipt-title { font-size: 20px; font-weight: bold; margin-top: 15px; letter-spacing: 2px; color: #06b6d4; }
            .receipt-number { font-size: 14px; color: #666; margin-top: 5px; }
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
              color: #06b6d4;
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
            .items-table th {
              background: #f8f9fa;
              padding: 10px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
              border-bottom: 2px solid #e9ecef;
            }
            .items-table td {
              padding: 12px 10px;
              border-bottom: 1px solid #e9ecef;
              font-size: 13px;
            }
            .items-table .text-right { text-align: right; }
            .payment-box {
              background: #ecfeff;
              border: 2px solid #06b6d4;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .payment-label { font-size: 14px; color: #666; margin-bottom: 5px; }
            .payment-amount { font-size: 28px; font-weight: bold; color: #0891b2; }
            .balance-info {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-top: 1px solid #e9ecef;
              margin-top: 10px;
            }
            .collected-by {
              background: #f0fdfa;
              border-radius: 8px;
              padding: 15px;
              margin: 15px 0;
            }
            .collected-by-title {
              font-size: 12px;
              font-weight: bold;
              color: #0d9488;
              margin-bottom: 8px;
            }
            .payment-methods {
              margin-top: 20px;
              padding: 15px;
              background: #fef3c7;
              border-radius: 8px;
              border: 1px solid #f59e0b;
            }
            .payment-methods-title {
              font-size: 12px;
              font-weight: bold;
              color: #92400e;
              margin-bottom: 10px;
            }
            .payment-method {
              margin-bottom: 10px;
              padding: 10px;
              background: white;
              border-radius: 6px;
            }
            .payment-method-title {
              font-weight: bold;
              font-size: 13px;
              margin-bottom: 5px;
            }
            .payment-method-detail {
              font-size: 12px;
              color: #666;
              margin: 2px 0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 11px;
              color: #888;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

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

  // Helper to get who collected the payment
  const getCollectedBy = () => {
    if (!receipt) return { name: "N/A", role: "" }
    if (receipt.recordedByRole === "COLLECTOR" && receipt.collectorName) {
      return { name: receipt.collectorName, role: "Collector" }
    }
    if (receipt.recordedByRole === "SHOP_ADMIN" && receipt.recordedByName) {
      return { name: receipt.recordedByName, role: "Shop Admin" }
    }
    if (receipt.recordedByRole === "BUSINESS_ADMIN" && receipt.recordedByName) {
      return { name: receipt.recordedByName, role: "Business Admin" }
    }
    if (receipt.collectorName) {
      return { name: receipt.collectorName, role: "Collector" }
    }
    return { name: "N/A", role: "" }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-white/10">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-white/10">
          <p className="text-white">Receipt not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
            Close
          </button>
        </div>
      </div>
    )
  }

  const collectedBy = getCollectedBy()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-3xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Payment Receipt</h2>
              <p className="text-sm text-slate-400">{receipt.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-5 h-5" />
            </button>
            {receipt.waybillGenerated && onViewWaybill && (
              <button
                onClick={() => onViewWaybill(receipt.purchaseId)}
                className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                title="View Waybill"
              >
                <Truck className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content - Printable Area */}
        <div ref={printRef} className="p-6">
          {/* Header */}
          <div className="header text-center border-b-2 border-cyan-500/30 pb-4 mb-6">
            <div className="business-name text-xl font-bold text-white">{receipt.businessName}</div>
            <div className="shop-name text-sm text-slate-400">{receipt.shopName}</div>
            {receipt.shopAdminName && (
              <div className="text-xs text-slate-500">Shop Admin: {receipt.shopAdminName}</div>
            )}
            <div className="receipt-title text-lg font-bold text-cyan-400 mt-4 tracking-wider">PAYMENT RECEIPT</div>
            <div className="receipt-number text-sm text-slate-400 mt-1">{receipt.invoiceNumber}</div>
            <div className="mt-2">
              {receipt.isPurchaseCompleted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  COMPLETED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                  <Clock className="w-3 h-3" />
                  PARTIAL PAYMENT
                </span>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Customer Info */}
            <div className="info-section">
              <div className="info-title text-xs font-bold text-cyan-400 uppercase border-b border-white/10 pb-2 mb-3">
                Customer Details
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-white">{receipt.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">{receipt.customerPhone}</span>
                </div>
                {receipt.customerAddress && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">{receipt.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Info */}
            <div className="info-section">
              <div className="info-title text-xs font-bold text-cyan-400 uppercase border-b border-white/10 pb-2 mb-3">
                Receipt Details
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-white">{formatDate(receipt.generatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchase #:</span>
                  <span className="text-white font-mono">{receipt.purchaseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="text-white">{receipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Type:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    receipt.purchaseType === "CASH" ? "bg-green-500/20 text-green-400" :
                    receipt.purchaseType === "LAYAWAY" ? "bg-blue-500/20 text-blue-400" :
                    "bg-purple-500/20 text-purple-400"
                  }`}>
                    {receipt.purchaseType}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Amount Box */}
          <div className="payment-box bg-cyan-500/10 border-2 border-cyan-500/30 rounded-xl p-6 text-center mb-6">
            <div className="text-sm text-slate-400 mb-1">Payment Amount</div>
            <div className="text-3xl font-bold text-cyan-400">{formatCurrency(receipt.paymentAmount)}</div>
            
            <div className="mt-4 pt-4 border-t border-cyan-500/20 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Previous Balance</div>
                <div className="text-lg font-medium text-white">{formatCurrency(receipt.previousBalance)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">New Balance</div>
                <div className={`text-lg font-medium ${receipt.newBalance > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {receipt.newBalance > 0 ? formatCurrency(receipt.newBalance) : 'Paid in Full'}
                </div>
              </div>
            </div>
          </div>

          {/* Collected By */}
          <div className="collected-by bg-teal-500/10 rounded-lg p-4 mb-6">
            <div className="collected-by-title text-xs font-bold text-teal-400 mb-2">Payment Collected By</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-400" />
                <span className="text-white">{collectedBy.name}</span>
              </div>
              {collectedBy.role && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  collectedBy.role === "Collector" 
                    ? "bg-blue-500/20 text-blue-400" 
                    : collectedBy.role === "Shop Admin"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-purple-500/20 text-purple-400"
                }`}>
                  {collectedBy.role}
                </span>
              )}
            </div>
            {receipt.confirmedByName && (
              <div className="text-xs text-slate-500 mt-2">
                Confirmed by: {receipt.confirmedByName}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-6">
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">Purchase Items</div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase py-3 px-3">Item</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase py-3 px-3">Qty</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase py-3 px-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-3 px-3 text-white text-sm">{item.productName}</td>
                    <td className="py-3 px-3 text-center text-slate-400 text-sm">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-white text-sm">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-2">
              <div className="text-right">
                <span className="text-slate-500 text-sm">Total Purchase: </span>
                <span className="text-white font-medium">{formatCurrency(receipt.totalPurchaseAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods for Remaining Balance */}
          {receipt.newBalance > 0 && (receipt.bankName || receipt.mobileMoneyProvider) && (
            <div className="payment-methods bg-amber-500/10 rounded-xl p-5 border border-amber-500/30">
              <div className="payment-methods-title text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Methods for Remaining Balance ({formatCurrency(receipt.newBalance)})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Transfer */}
                {receipt.bankName && receipt.bankAccountNumber && (
                  <div className="payment-method bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="payment-method-title text-white font-medium mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      Bank Transfer
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Bank: <span className="text-white">{receipt.bankName}</span></p>
                      {receipt.bankBranch && (
                        <p className="text-xs text-slate-400">Branch: <span className="text-white">{receipt.bankBranch}</span></p>
                      )}
                      <p className="text-xs text-slate-400">Account Name: <span className="text-white">{receipt.bankAccountName}</span></p>
                      <p className="text-xs text-slate-400">Account #: <span className="text-white font-mono">{receipt.bankAccountNumber}</span></p>
                    </div>
                  </div>
                )}

                {/* Mobile Money */}
                {receipt.mobileMoneyProvider && receipt.mobileMoneyNumber && (
                  <div className="payment-method bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="payment-method-title text-white font-medium mb-2 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-yellow-400" />
                      Mobile Money
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Provider: <span className="text-white">{receipt.mobileMoneyProvider}</span></p>
                      <p className="text-xs text-slate-400">Name: <span className="text-white">{receipt.mobileMoneyName}</span></p>
                      <p className="text-xs text-slate-400">Number: <span className="text-white font-mono">{receipt.mobileMoneyNumber}</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Waybill Info */}
          {receipt.waybillGenerated && receipt.waybillNumber && (
            <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400">Waybill:</span>
                <span className="text-purple-400 font-mono">{receipt.waybillNumber}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {receipt.notes && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Notes:</div>
              <div className="text-sm text-slate-300">{receipt.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div className="footer text-center text-xs text-slate-500 mt-6 pt-4 border-t border-white/10">
            <p>Thank you for your payment!</p>
            <p className="mt-1">Receipt generated on {formatDate(receipt.generatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
