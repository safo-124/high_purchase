"use client"

import { useEffect, useState } from "react"
import { X, Printer, Truck, Loader2, Store, User, Phone, MapPin, Calendar, FileText, CreditCard } from "lucide-react"
import { getSalesStaffProgressInvoice, SalesStaffInvoiceData } from "../../actions"

interface ProgressInvoiceModalProps {
  shopSlug: string
  invoiceId: string
  onClose: () => void
  onViewWaybill?: (purchaseId: string) => void
}

export function ProgressInvoiceModal({ shopSlug, invoiceId, onClose, onViewWaybill }: ProgressInvoiceModalProps) {
  const [invoice, setInvoice] = useState<SalesStaffInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInvoice() {
      setLoading(true)
      const data = await getSalesStaffProgressInvoice(shopSlug, invoiceId)
      setInvoice(data)
      setLoading(false)
    }
    fetchInvoice()
  }, [shopSlug, invoiceId])

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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
        {/* Action Buttons - Hide on Print */}
        <div className="absolute top-4 right-4 flex items-center gap-2 print:hidden">
          {invoice?.waybillGenerated && onViewWaybill && (
            <button
              onClick={() => onViewWaybill(invoice.purchaseId)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Truck className="w-4 h-4" />
              View Waybill
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        ) : invoice ? (
          <div className="p-8 print:p-6">
            {/* Header */}
            <div className="border-b-2 border-slate-200 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 print:text-2xl">PROGRESS INVOICE</h1>
                  <p className="text-slate-500 mt-1">Payment Receipt</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-cyan-600 font-mono print:text-xl">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-slate-500 mt-1 flex items-center justify-end gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(invoice.generatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Business & Shop Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 print:gap-6">
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">From</h2>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-slate-800">{invoice.businessName}</p>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Store className="w-4 h-4 text-cyan-600" />
                    <span>{invoice.shopName}</span>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bill To</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-800">
                    <User className="w-4 h-4 text-cyan-600" />
                    <span className="font-semibold">{invoice.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-cyan-600" />
                    <span>{invoice.customerPhone}</span>
                  </div>
                  {invoice.customerAddress && (
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-cyan-600 mt-0.5" />
                      <span>{invoice.customerAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase Details */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 print:bg-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <span className="text-sm text-slate-600">Purchase Reference:</span>
                  <span className="font-mono font-semibold text-slate-800">{invoice.purchaseNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    invoice.purchaseType === "HIGH_PURCHASE"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {invoice.purchaseType === "HIGH_PURCHASE" ? "Hire Purchase" : "One-Time"}
                  </span>
                  {invoice.isPurchaseCompleted && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      FULLY PAID
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            {invoice.items && invoice.items.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Purchase Items
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Item</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Qty</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Unit Price</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-slate-800">{item.productName}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-cyan-50 rounded-xl p-6 mb-6 print:bg-cyan-100">
              <h3 className="text-sm font-semibold text-cyan-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Purchase Amount</span>
                  <span className="font-medium text-slate-800">{formatCurrency(invoice.totalPurchaseAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Previously Paid</span>
                  <span className="font-medium text-slate-800">{formatCurrency(invoice.totalAmountPaid - invoice.paymentAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Balance Before This Payment</span>
                  <span className="font-medium text-amber-600">{formatCurrency(invoice.previousBalance)}</span>
                </div>
                <div className="h-px bg-cyan-200 my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-cyan-800">This Payment</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(invoice.paymentAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Payment Method</span>
                  <span className="font-medium text-slate-800 capitalize">{invoice.paymentMethod.toLowerCase().replace("_", " ")}</span>
                </div>
                <div className="h-px bg-cyan-200 my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-cyan-800">New Balance</span>
                  {invoice.newBalance > 0 ? (
                    <span className="text-xl font-bold text-amber-600">{formatCurrency(invoice.newBalance)}</span>
                  ) : (
                    <span className="text-xl font-bold text-green-600">PAID IN FULL</span>
                  )}
                </div>
              </div>
            </div>

            {/* Collector & Confirmed By */}
            <div className="grid grid-cols-2 gap-8 mb-6 text-sm print:gap-6">
              {invoice.collectorName && (
                <div>
                  <p className="text-slate-500">Collected By</p>
                  <p className="font-medium text-slate-800">{invoice.collectorName}</p>
                </div>
              )}
              {invoice.confirmedByName && (
                <div>
                  <p className="text-slate-500">Confirmed By</p>
                  <p className="font-medium text-slate-800">{invoice.confirmedByName}</p>
                </div>
              )}
            </div>

            {/* Waybill Info */}
            {invoice.waybillGenerated && (
              <div className="bg-purple-50 rounded-xl p-4 print:bg-purple-100">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Delivery Waybill Generated</p>
                    <p className="text-xs text-purple-600 font-mono">{invoice.waybillNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
              <p>Thank you for your payment!</p>
              <p className="mt-1">This is an automatically generated invoice.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <FileText className="w-12 h-12 mb-4" />
            <p>Invoice not found</p>
          </div>
        )}
      </div>
    </div>
  )
}
