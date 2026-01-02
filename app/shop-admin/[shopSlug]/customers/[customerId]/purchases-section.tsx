"use client"

import { useState } from "react"
import { PurchaseData, recordPayment } from "../../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PurchasesSectionProps {
  purchases: PurchaseData[]
  shopSlug: string
  customerId: string
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pending" },
  ACTIVE: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Active" },
  COMPLETED: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Completed" },
  OVERDUE: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Overdue" },
  DEFAULTED: { bg: "bg-red-500/20", text: "text-red-400", label: "Defaulted" },
}

export function PurchasesSection({ purchases, shopSlug }: PurchasesSectionProps) {
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

    setIsRecording(true)
    
    const result = await recordPayment(shopSlug, {
      purchaseId: paymentModal.purchase.id,
      amount,
      paymentMethod: paymentMethod as "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD",
      reference: paymentReference || undefined,
    })

    if (result.success) {
      toast.success("Payment recorded successfully")
      setPaymentModal({ open: false, purchase: null })
      setPaymentAmount("")
      setPaymentReference("")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to record payment")
    }
    
    setIsRecording(false)
  }

  if (purchases.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Purchase History</h2>
          <span className="text-sm text-slate-400">{purchases.length} purchase{purchases.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="divide-y divide-white/5">
          {purchases.map((purchase) => {
            const status = statusStyles[purchase.status]
            const isExpanded = expandedPurchase === purchase.id
            const progress = purchase.totalAmount > 0 
              ? (purchase.amountPaid / purchase.totalAmount) * 100 
              : 0

            return (
              <div key={purchase.id} className="hover:bg-white/[0.02] transition-colors">
                {/* Purchase Header */}
                <div 
                  className="px-6 py-4 cursor-pointer"
                  onClick={() => setExpandedPurchase(isExpanded ? null : purchase.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
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
                        <p className="text-sm font-medium text-white">GHS {purchase.totalAmount.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">
                          Outstanding: <span className="text-orange-400">GHS {purchase.outstandingBalance.toLocaleString()}</span>
                        </p>
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
                  <div className="mt-3">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">Paid: GHS {purchase.amountPaid.toLocaleString()}</span>
                      <span className="text-xs text-slate-500">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4">
                    {/* Items */}
                    <div className="bg-white/[0.02] rounded-xl p-4">
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Items</h4>
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
                      <div className="bg-white/[0.02] rounded-xl p-4">
                        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Payments</h4>
                        <div className="space-y-2">
                          {purchase.payments.map((payment) => (
                            <div key={payment.id} className="flex justify-between items-center text-sm">
                              <div>
                                <span className="text-white">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Pending'}</span>
                                <span className="text-slate-400 ml-2">• {payment.paymentMethod.replace('_', ' ')}</span>
                              </div>
                              <span className={`font-medium ${payment.status === 'COMPLETED' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                GHS {payment.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {purchase.status !== "COMPLETED" && (
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPaymentModal({ open: true, purchase })
                            setPaymentAmount("")
                            setPaymentReference("")
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-medium text-sm transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Record Payment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal.open && paymentModal.purchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Record Payment</h3>
                <p className="text-sm text-slate-400">{paymentModal.purchase.purchaseNumber}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 flex justify-between">
                <span className="text-sm text-slate-400">Outstanding Balance</span>
                <span className="text-lg font-bold text-orange-400">
                  GHS {paymentModal.purchase.outstandingBalance.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Amount (GHS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={paymentModal.purchase.outstandingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Reference (Optional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Transaction ID, receipt number, etc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPaymentModal({ open: false, purchase: null })}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={isRecording || !paymentAmount}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
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
                  <>Record Payment</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
