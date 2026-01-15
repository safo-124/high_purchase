"use client"

import { useState } from "react"
import { PurchaseData, recordPaymentAsCollector } from "../../../actions"
import { PaymentReceiptDialog } from "./payment-receipt-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CollectorPurchasesSectionProps {
  purchases: PurchaseData[]
  shopSlug: string
  customerId: string
customerName?: string
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pending" },
  ACTIVE: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Active" },
  COMPLETED: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Completed" },
  OVERDUE: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Overdue" },
  DEFAULTED: { bg: "bg-red-500/20", text: "text-red-400", label: "Defaulted" },
}

export function CollectorPurchasesSection({ purchases, shopSlug, customerName }: CollectorPurchasesSectionProps) {
  const router = useRouter()
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; purchase: PurchaseData | null }>({
    open: false,
    purchase: null,
  })
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentReference, setPaymentReference] = useState("")
  const [isRecording, setIsRecording] = useState(false)

  const handleRecordPayment = async () => {
    if (!paymentModal.purchase) return
    
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }

    if (amount > paymentModal.purchase.outstandingBalance) {
      toast.error("Amount cannot exceed outstanding balance")
      return
    }

    setIsRecording(true)
    
    const result = await recordPaymentAsCollector(shopSlug, {
      purchaseId: paymentModal.purchase.id,
      amount,
      paymentMethod: paymentMethod as "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD",
      reference: paymentReference || undefined,
    })

    if (result.success) {
      toast.success("Payment recorded successfully!")
      setPaymentModal({ open: false, purchase: null })
      setPaymentAmount("")
      setPaymentReference("")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to record payment")
    }
    
    setIsRecording(false)
  }

  // Separate active and completed purchases
  const activePurchases = purchases.filter((p) => p.status !== "COMPLETED")
  const completedPurchases = purchases.filter((p) => p.status === "COMPLETED")

  if (purchases.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No purchases yet</h3>
        <p className="text-slate-400 text-sm">This customer hasn&apos;t made any purchases on credit</p>
      </div>
    )
  }

  return (
    <>
      {/* Active Loans */}
      {activePurchases.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden mb-6 sm:mb-8">
          <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-white">Active Loans</h2>
            <span className="text-sm text-slate-400">{activePurchases.length} loan{activePurchases.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="divide-y divide-white/5">
            {activePurchases.map((purchase) => {
              const status = statusStyles[purchase.status]
              const isExpanded = expandedPurchase === purchase.id
              const progress = purchase.totalAmount > 0 
                ? (purchase.amountPaid / purchase.totalAmount) * 100 
                : 0

              return (
                <div key={purchase.id}>
                  {/* Purchase Header - Optimized for mobile */}
                  <div 
                    className="px-4 sm:px-6 py-4 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                    onClick={() => setExpandedPurchase(isExpanded ? null : purchase.id)}
                  >
                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{purchase.purchaseNumber}</p>
                            <p className="text-xs text-slate-400">
                              {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                          <svg 
                            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-lg font-bold text-orange-400">GHS {purchase.outstandingBalance.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{new Date(purchase.startDate).toLocaleDateString()}</p>
                      </div>
                      {/* Progress Bar */}
                      <div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-slate-500">
                            GHS {purchase.amountPaid.toLocaleString()} of GHS {purchase.totalAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-emerald-400 font-medium">{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:block">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{purchase.purchaseNumber}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(purchase.startDate).toLocaleDateString()} • {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-orange-400">GHS {purchase.outstandingBalance.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">outstanding</p>
                            {purchase.notes?.includes('[CREDIT]') && purchase.installments > 0 && (
                              <p className="text-xs text-cyan-400 mt-1">
                                Min/month: GHS {Math.ceil(purchase.outstandingBalance / purchase.installments).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                          <svg 
                            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="ml-14">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-slate-500">
                            Paid: GHS {purchase.amountPaid.toLocaleString()} of GHS {purchase.totalAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-emerald-400 font-medium">{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-6 space-y-4">
                      {/* Min Monthly Payment Hint - Mobile */}
                      {purchase.notes?.includes('[CREDIT]') && purchase.installments > 0 && (
                        <div className="sm:hidden bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
                          <p className="text-xs text-cyan-400">
                            Min monthly payment: <span className="font-bold">GHS {Math.ceil(purchase.outstandingBalance / purchase.installments).toLocaleString()}</span>
                          </p>
                        </div>
                      )}

                      {/* Items */}
                      <div className="bg-white/[0.02] rounded-xl p-4 sm:ml-14">
                        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Items Purchased</h4>
                        <div className="space-y-2">
                          {purchase.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-white">
                                {item.productName} <span className="text-slate-400">×{item.quantity}</span>
                              </span>
                              <span className="text-white">GHS {item.totalPrice.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="border-t border-white/5 pt-2 mt-2 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Subtotal</span>
                              <span className="text-white">GHS {purchase.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Interest</span>
                              <span className="text-white">GHS {purchase.interestAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-slate-300">Total</span>
                              <span className="text-white">GHS {purchase.totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment History */}
                      {purchase.payments.length > 0 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 sm:ml-14">
                          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Payment History</h4>
                          <div className="space-y-2">
                            {purchase.payments.map((payment) => (
                              <div key={payment.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-white">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Pending'}</span>
                                  <span className="text-slate-400">• {payment.paymentMethod.replace('_', ' ')}</span>
                                  {payment.reference && <span className="text-slate-500">({payment.reference})</span>}
                                </div>
                                <span className={`font-medium ${payment.status === 'COMPLETED' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                  <PaymentReceiptDialog payment={payment} customerName={customerName || purchase.customerName} purchaseNumber={purchase.purchaseNumber} outstandingBalance={purchase.outstandingBalance} totalAmount={purchase.totalAmount} amountPaid={purchase.amountPaid} />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Record Payment Button */}
                      <div className="flex justify-end sm:ml-14">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPaymentModal({ open: true, purchase })
                            setPaymentAmount("")
                            setPaymentReference("")
                          }}
                          className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Record Payment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed Loans */}
      {completedPurchases.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-white">Completed</h2>
            <span className="text-sm text-emerald-400">{completedPurchases.length} paid off</span>
          </div>

          <div className="divide-y divide-white/5">
            {completedPurchases.map((purchase) => (
              <div key={purchase.id} className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{purchase.purchaseNumber}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {purchase.items.map((i) => i.productName).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-emerald-400">GHS {purchase.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Fully paid</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal - Mobile Optimized */}
      {paymentModal.open && paymentModal.purchase && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md sm:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-white">Collect Payment</h3>
                <p className="text-sm text-slate-400">{paymentModal.purchase.purchaseNumber}</p>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setPaymentModal({ open: false, purchase: null })}
                className="sm:hidden p-2 -mr-2 text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-5 sm:mb-6">
              <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-3 sm:p-4 flex justify-between items-center">
                <span className="text-sm text-slate-300">Outstanding Balance</span>
                <span className="text-lg sm:text-xl font-bold text-orange-400">
                  GHS {paymentModal.purchase.outstandingBalance.toLocaleString()}
                </span>
              </div>

              {/* Minimum Monthly Payment for Credit purchases */}
              {paymentModal.purchase.notes?.includes('[CREDIT]') && paymentModal.purchase.installments > 0 && (
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-300">Minimum Monthly</span>
                    <span className="text-base sm:text-lg font-bold text-cyan-400">
                      GHS {Math.ceil(paymentModal.purchase.outstandingBalance / paymentModal.purchase.installments).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Math.ceil(paymentModal.purchase!.outstandingBalance / paymentModal.purchase!.installments).toString())}
                    className="w-full mt-2 px-3 py-2.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 active:bg-cyan-500/40 transition-all"
                  >
                    Use Minimum Amount
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount Collected (GHS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={paymentModal.purchase.outstandingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "CASH", label: "Cash", icon: "💵" },
                    { value: "MOBILE_MONEY", label: "MoMo", icon: "📱" },
                    { value: "BANK_TRANSFER", label: "Bank", icon: "🏦" },
                    { value: "CARD", label: "Card", icon: "💳" },
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        paymentMethod === method.value
                          ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400"
                          : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 active:bg-white/15"
                      }`}
                    >
                      <span>{method.icon}</span>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Reference (Optional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Transaction ID, receipt #, etc."
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={() => setPaymentModal({ open: false, purchase: null })}
                className="hidden sm:block px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={isRecording || !paymentAmount}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-sm shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isRecording ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Recording...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}



