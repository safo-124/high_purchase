"use client"

import { useEffect, useState, useRef } from "react"
import { getShopPurchaseInvoice, ShopPurchaseInvoiceDetailData } from "../../actions"
import { FileText, Printer, X, CheckCircle, Clock, AlertCircle, Phone, MapPin, User, CreditCard, Building2, Smartphone } from "lucide-react"

interface PurchaseInvoiceModalProps {
  shopSlug: string
  invoiceId: string
  onClose: () => void
}

export function PurchaseInvoiceModal({ shopSlug, invoiceId, onClose }: PurchaseInvoiceModalProps) {
  const [invoice, setInvoice] = useState<ShopPurchaseInvoiceDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadInvoice() {
      try {
        const data = await getShopPurchaseInvoice(shopSlug, invoiceId)
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
              border-bottom: 2px solid #7c3aed;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .business-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .shop-name { font-size: 14px; color: #666; }
            .invoice-title { font-size: 20px; font-weight: bold; margin-top: 15px; letter-spacing: 2px; color: #7c3aed; }
            .invoice-number { font-size: 14px; color: #666; margin-top: 5px; }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              margin-top: 10px;
            }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-partial { background: #fef3c7; color: #92400e; }
            .status-pending { background: #f1f5f9; color: #475569; }
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
              color: #7c3aed;
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
            .totals {
              margin-left: auto;
              width: 300px;
              margin-top: 20px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .totals-row.total {
              border-top: 2px solid #7c3aed;
              font-weight: bold;
              font-size: 16px;
              margin-top: 10px;
              padding-top: 15px;
            }
            .payment-methods {
              margin-top: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .payment-methods-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #7c3aed;
            }
            .payment-method {
              margin-bottom: 15px;
              padding: 10px;
              background: white;
              border-radius: 6px;
              border: 1px solid #e9ecef;
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
            .collector-section {
              margin-top: 20px;
              padding: 15px;
              background: #ede9fe;
              border-radius: 8px;
            }
            .collector-title {
              font-size: 12px;
              font-weight: bold;
              color: #7c3aed;
              margin-bottom: 5px;
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

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-white/10">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-white/10">
          <p className="text-white">Invoice not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg">
            Close
          </button>
        </div>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (invoice.status) {
      case "FULLY_PAID":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            FULLY PAID
          </span>
        )
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3" />
            PARTIALLY PAID
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
            <AlertCircle className="w-3 h-3" />
            PENDING
          </span>
        )
    }
  }

  const getPurchaseTypeBadge = () => {
    switch (invoice.purchaseType) {
      case "CASH":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">CASH</span>
      case "LAYAWAY":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">LAYAWAY</span>
      case "CREDIT":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">CREDIT</span>
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-3xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Purchase Invoice</h2>
              <p className="text-sm text-slate-400">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
              title="Print Invoice"
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

        {/* Invoice Content - Printable Area */}
        <div ref={printRef} className="p-6">
          {/* Header */}
          <div className="header text-center border-b-2 border-purple-500/30 pb-4 mb-6">
            <div className="business-name text-xl font-bold text-white">{invoice.businessName}</div>
            <div className="shop-name text-sm text-slate-400">{invoice.shopName}</div>
            {invoice.shopAdminName && (
              <div className="text-xs text-slate-500">Shop Admin: {invoice.shopAdminName}</div>
            )}
            <div className="invoice-title text-lg font-bold text-purple-400 mt-4 tracking-wider">INVOICE</div>
            <div className="invoice-number text-sm text-slate-400 mt-1">{invoice.invoiceNumber}</div>
            <div className="mt-2">{getStatusBadge()}</div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Customer Info */}
            <div className="info-section">
              <div className="info-title text-xs font-bold text-purple-400 uppercase border-b border-white/10 pb-2 mb-3">
                Customer Details
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-white">{invoice.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">{invoice.customerPhone}</span>
                </div>
                {invoice.customerAddress && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">{invoice.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Info */}
            <div className="info-section">
              <div className="info-title text-xs font-bold text-purple-400 uppercase border-b border-white/10 pb-2 mb-3">
                Invoice Details
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-white">{formatDate(invoice.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date:</span>
                  <span className="text-white">{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchase #:</span>
                  <span className="text-white font-mono">{invoice.purchaseNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Type:</span>
                  {getPurchaseTypeBadge()}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Collector */}
          {invoice.collectorName && (
            <div className="collector-section bg-purple-500/10 rounded-lg p-4 mb-6">
              <div className="collector-title text-xs font-bold text-purple-400 mb-2">Assigned Collector</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-white">{invoice.collectorName}</span>
                </div>
                {invoice.collectorPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-400">{invoice.collectorPhone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase py-3 px-3">Item</th>
                  <th className="text-center text-xs font-medium text-slate-400 uppercase py-3 px-3">Qty</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase py-3 px-3">Unit Price</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase py-3 px-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.itemsSnapshot.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-3 px-3 text-white text-sm">{item.productName}</td>
                    <td className="py-3 px-3 text-center text-slate-400 text-sm">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-400 text-sm">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-right text-white text-sm font-medium">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="text-white">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.interestAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Interest:</span>
                  <span className="text-white">{formatCurrency(invoice.interestAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-purple-500/30">
                <span className="text-purple-400">Total Amount:</span>
                <span className="text-white">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.downPayment > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Down Payment:</span>
                  <span className="text-green-400">{formatCurrency(invoice.downPayment)}</span>
                </div>
              )}
              {invoice.installments > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Installments:</span>
                  <span className="text-slate-400">{invoice.installments} payments</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="payment-methods bg-white/5 rounded-xl p-5">
            <div className="payment-methods-title text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Available Payment Methods
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cash */}
              {invoice.paymentMethods.includes("CASH") && (
                <div className="payment-method bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="payment-method-title text-white font-medium mb-1">💵 Cash Payment</div>
                  <p className="text-xs text-slate-500">Pay at any of our locations</p>
                </div>
              )}

              {/* Bank Transfer */}
              {invoice.paymentMethods.includes("BANK_TRANSFER") && invoice.bankName && (
                <div className="payment-method bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="payment-method-title text-white font-medium mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Bank Transfer
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Bank: <span className="text-white">{invoice.bankName}</span></p>
                    {invoice.bankBranch && (
                      <p className="text-xs text-slate-400">Branch: <span className="text-white">{invoice.bankBranch}</span></p>
                    )}
                    <p className="text-xs text-slate-400">Account Name: <span className="text-white">{invoice.bankAccountName}</span></p>
                    <p className="text-xs text-slate-400">Account #: <span className="text-white font-mono">{invoice.bankAccountNumber}</span></p>
                  </div>
                </div>
              )}

              {/* Mobile Money */}
              {invoice.paymentMethods.includes("MOBILE_MONEY") && invoice.mobileMoneyProvider && (
                <div className="payment-method bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="payment-method-title text-white font-medium mb-2 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-yellow-400" />
                    Mobile Money
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Provider: <span className="text-white">{invoice.mobileMoneyProvider}</span></p>
                    <p className="text-xs text-slate-400">Name: <span className="text-white">{invoice.mobileMoneyName}</span></p>
                    <p className="text-xs text-slate-400">Number: <span className="text-white font-mono">{invoice.mobileMoneyNumber}</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="footer text-center text-xs text-slate-500 mt-6 pt-4 border-t border-white/10">
            <p>Thank you for your business!</p>
            <p className="mt-1">Generated on {formatDate(invoice.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
