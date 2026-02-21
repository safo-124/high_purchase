"use client"

import { useRef } from "react"
import { ShopWalletDepositReceiptData } from "../../actions"
import { FileText, Printer, X, CheckCircle, User, Phone, MapPin, Wallet, Calendar } from "lucide-react"

interface ShopWalletDepositReceiptModalProps {
  deposit: ShopWalletDepositReceiptData | null
  onClose: () => void
}

export function ShopWalletDepositReceiptModal({ deposit, onClose }: ShopWalletDepositReceiptModalProps) {
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
            .badge-confirmed { background: #dcfce7; color: #166534; }
            .badge-deposit { background: #e0f2fe; color: #0369a1; }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
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
            .deposit-box {
              background: #ecfeff;
              border: 2px solid #06b6d4;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .deposit-label { font-size: 14px; color: #666; margin-bottom: 5px; }
            .deposit-amount { font-size: 28px; font-weight: bold; color: #0891b2; }
            .balance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #a5f3fc; }
            .balance-item { text-align: center; }
            .balance-label { font-size: 12px; color: #666; }
            .balance-value { font-size: 18px; font-weight: 600; }
            .collector-box {
              background: #f0fdfa;
              border-radius: 8px;
              padding: 15px;
              margin: 15px 0;
            }
            .collector-title {
              font-size: 12px;
              font-weight: bold;
              color: #0d9488;
              margin-bottom: 8px;
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

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  if (!deposit) {
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-3xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Wallet Deposit Receipt</h2>
              <p className="text-sm text-slate-400">{deposit.receiptNumber}</p>
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
            <div className="business-name text-xl font-bold text-white">{deposit.businessName}</div>
            <div className="shop-name text-sm text-slate-400">{deposit.shopName}</div>
            <div className="receipt-title text-lg font-bold text-cyan-400 mt-4 tracking-wider">WALLET DEPOSIT RECEIPT</div>
            <div className="receipt-number text-sm text-slate-400 mt-1">{deposit.receiptNumber}</div>
            <div className="mt-2 flex justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                <Wallet className="w-3 h-3" />
                WALLET DEPOSIT
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                <CheckCircle className="w-3 h-3" />
                CONFIRMED
              </span>
              {deposit.paymentMethod && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                  {deposit.paymentMethod}
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
                  <span className="text-white">{deposit.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">{deposit.customerPhone}</span>
                </div>
                {deposit.customerAddress && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">{deposit.customerAddress}</span>
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
                  <span className="text-slate-500">Receipt #:</span>
                  <span className="text-white font-mono">{deposit.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Type:</span>
                  <span className="text-white">
                    {deposit.type === "DEPOSIT" ? "Wallet Deposit" :
                     deposit.type === "REFUND" ? "Wallet Refund" :
                     deposit.type === "ADJUSTMENT" ? "Wallet Adjustment" : deposit.type}
                  </span>
                </div>
                {deposit.reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference:</span>
                    <span className="text-white font-mono">{deposit.reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-white">
                    {deposit.confirmedAt ? formatDate(deposit.confirmedAt) : formatDate(deposit.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Amount Box */}
          <div className="deposit-box bg-cyan-500/10 border-2 border-cyan-500/30 rounded-xl p-6 text-center mb-6">
            <div className="text-sm text-slate-400 mb-1">Deposit Amount</div>
            <div className="text-3xl font-bold text-cyan-400">{formatCurrency(deposit.amount)}</div>
            
            <div className="mt-4 pt-4 border-t border-cyan-500/20 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Wallet Balance Before</div>
                <div className="text-lg font-medium text-white">{formatCurrency(deposit.balanceBefore)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">New Wallet Balance</div>
                <div className="text-lg font-medium text-green-400">{formatCurrency(deposit.balanceAfter)}</div>
              </div>
            </div>
          </div>

          {/* Collector & Confirmation Info */}
          {deposit.collectorName && (
            <div className="collected-by bg-teal-500/10 rounded-lg p-4 mb-4">
              <div className="collected-by-title text-xs font-bold text-teal-400 mb-2">Deposited By</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-400" />
                  <span className="text-white">{deposit.collectorName}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  Collector
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created: {formatDate(deposit.createdAt)}
              </div>
            </div>
          )}

          {deposit.confirmedByName && (
            <div className="bg-green-500/10 rounded-lg p-4 mb-4 border border-green-500/20">
              <div className="text-xs font-bold text-green-400 mb-2">Confirmed By</div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-400" />
                <span className="text-white">{deposit.confirmedByName}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  Administrator
                </span>
              </div>
              {deposit.confirmedAt && (
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Confirmed: {formatDate(deposit.confirmedAt)}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {deposit.description && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Notes / Description:</div>
              <div className="text-sm text-slate-300">{deposit.description}</div>
            </div>
          )}

          {/* Footer */}
          <div className="footer text-center text-xs text-slate-500 mt-6 pt-4 border-t border-white/10">
            <p>Thank you for your deposit!</p>
            <p className="mt-1">Receipt generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
