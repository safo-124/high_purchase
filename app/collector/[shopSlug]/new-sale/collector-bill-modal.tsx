"use client"

import { useEffect, useState } from "react"
import { getCollectorBillData, CollectorBillData } from "../../actions"

interface CollectorBillModalProps {
  shopSlug: string
  purchaseId: string
  onClose: () => void
}

export function CollectorBillModal({ shopSlug, purchaseId, onClose }: CollectorBillModalProps) {
  const [bill, setBill] = useState<CollectorBillData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBill = async () => {
      const result = await getCollectorBillData(shopSlug, purchaseId)
      if (result) {
        setBill(result)
      } else {
        setError("Failed to load bill")
      }
      setLoading(false)
    }
    fetchBill()
  }, [shopSlug, purchaseId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative glass-card rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-white">Loading bill...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area .bg-slate-900,
          .print-area .bg-slate-800,
          .print-area .bg-white\\/5 {
            background: white !important;
          }
          .print-area .text-white,
          .print-area .text-slate-400,
          .print-area .text-emerald-400 {
            color: #1f2937 !important;
          }
          .print-area .border-white\\/10 {
            border-color: #e5e7eb !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm no-print" onClick={onClose} />
        
        <div className="relative bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print-area">
          {/* Header Actions */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10 p-4 flex justify-between items-center no-print">
            <h2 className="text-xl font-bold text-white">Sale Bill</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bill Content */}
          <div className="p-6">
            {/* Business Header */}
            <div className="text-center mb-6 pb-6 border-b border-white/10">
              <h1 className="text-2xl font-bold text-white">{bill.shop.name}</h1>
              {bill.shop.address && <p className="text-slate-400">{bill.shop.address}</p>}
              {bill.shop.phone && <p className="text-sm text-slate-400">Tel: {bill.shop.phone}</p>}
            </div>

            {/* Bill Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-slate-400">Bill #</p>
                <p className="text-white font-mono">{bill.purchaseNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Date</p>
                <p className="text-white">{new Date(bill.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-4 rounded-xl bg-white/5 mb-6">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Customer</h3>
              <p className="text-white font-medium">{bill.customer.name}</p>
              <p className="text-slate-400 text-sm">{bill.customer.phone}</p>
              {bill.customer.address && (
                <p className="text-slate-400 text-sm">{bill.customer.address}</p>
              )}
              {bill.customer.city && bill.customer.region && (
                <p className="text-slate-400 text-sm">{bill.customer.city}, {bill.customer.region}</p>
              )}
            </div>

            {/* Collector Info */}
            {bill.collectorName && (
              <div className="p-4 rounded-xl bg-white/5 mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Collector</h3>
                <p className="text-white">{bill.collectorName}</p>
              </div>
            )}

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Items</h3>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Item</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-400">Qty</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Price</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-white/10">
                        <td className="px-4 py-3 text-white">{item.productName}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-400">GHS {item.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-white">GHS {item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white">GHS {bill.subtotal.toLocaleString()}</span>
              </div>
              {bill.interestAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Interest ({bill.interestRate}%)</span>
                  <span className="text-white">GHS {bill.interestAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                <span className="text-slate-400">Total Amount</span>
                <span className="text-white font-bold">GHS {bill.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Down Payment</span>
                <span className="text-green-400">- GHS {bill.downPayment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount Paid</span>
                <span className="text-green-400">- GHS {bill.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-white/10 pt-2">
                <span className="text-white font-semibold">Outstanding Balance</span>
                <span className="text-emerald-400 font-bold">GHS {bill.outstandingBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="p-4 rounded-xl bg-white/5 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Payment Type</span>
                  <p className="text-white font-medium">{bill.purchaseType}</p>
                </div>
                <div>
                  <span className="text-slate-400">Installments</span>
                  <p className="text-white font-medium">{bill.installments}</p>
                </div>
                {bill.dueDate && (
                  <div>
                    <span className="text-slate-400">Due Date</span>
                    <p className="text-white">{new Date(bill.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Interest Type</span>
                  <p className="text-white">{bill.interestType}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-slate-400 pt-6 border-t border-white/10">
              <p>Thank you for your business!</p>
              <p className="mt-1">This is a computer-generated bill.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
