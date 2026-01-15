"use client"

import { useState } from "react"

interface PaymentData {
  id: string
  amount: number
  paymentMethod: string
  status: string
  paidAt: Date | null
  reference: string | null
  isConfirmed?: boolean
}

interface PaymentReceiptDialogProps {
  payment: PaymentData
  customerName: string
  purchaseNumber: string
  outstandingBalance: number
  totalAmount: number
  amountPaid: number
  shopName?: string
}

export function PaymentReceiptDialog({
  payment,
  customerName,
  purchaseNumber,
  outstandingBalance,
  totalAmount,
  amountPaid,
}: PaymentReceiptDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date()
  const receiptNumber = `RCP-${paidAt.toISOString().split("T")[0].replace(/-/g, "")}-${payment.id.slice(-6).toUpperCase()}`
  
  const previousPaid = amountPaid - payment.amount
  const balanceAfterPayment = outstandingBalance

  return (
    <>
      {/* Trigger - Clickable amount */}
      <button
        onClick={() => setIsOpen(true)}
        className="font-medium hover:underline transition-all cursor-pointer text-left"
        title="View Receipt"
      >
        +GHS {payment.amount.toLocaleString()}
      </button>

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Receipt Header */}
            <div className="p-5 sm:p-6 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    payment.isConfirmed || payment.status === "COMPLETED"
                      ? "bg-emerald-500/20"
                      : "bg-yellow-500/20"
                  }`}>
                    {payment.isConfirmed || payment.status === "COMPLETED" ? (
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Payment Receipt</h3>
                    <p className="text-xs text-slate-400">{receiptNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center">
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                  payment.isConfirmed || payment.status === "COMPLETED"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {payment.isConfirmed || payment.status === "COMPLETED" ? "✓ Confirmed" : "⏳ Pending Confirmation"}
                </span>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Amount */}
              <div className="text-center py-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Amount Collected</p>
                <p className="text-3xl font-bold text-emerald-400">GHS {payment.amount.toLocaleString()}</p>
              </div>

              {/* Customer Info */}
              <div className="bg-white/[0.02] rounded-xl p-4">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Customer</h4>
                <p className="text-white font-medium">{customerName}</p>
              </div>

              {/* Payment Details */}
              <div className="bg-white/[0.02] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Payment Details</h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Purchase</span>
                  <span className="text-white font-medium">{purchaseNumber}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Date</span>
                  <span className="text-white">
                    {paidAt.toLocaleDateString("en-GB", { 
                      day: "numeric", 
                      month: "short", 
                      year: "numeric" 
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time</span>
                  <span className="text-white">
                    {paidAt.toLocaleTimeString("en-GB", { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Method</span>
                  <span className="text-white">{payment.paymentMethod.replace("_", " ")}</span>
                </div>
                
                {payment.reference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Reference</span>
                    <span className="text-white font-mono text-xs">{payment.reference}</span>
                  </div>
                )}
              </div>

              {/* Balance Summary */}
              <div className="bg-white/[0.02] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Balance Summary</h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Purchase</span>
                  <span className="text-white">GHS {totalAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Previously Paid</span>
                  <span className="text-white">GHS {previousPaid.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">This Payment</span>
                  <span className="text-emerald-400 font-medium">+GHS {payment.amount.toLocaleString()}</span>
                </div>
                
                <div className="border-t border-white/5 pt-3 flex justify-between text-sm">
                  <span className="text-slate-300 font-medium">Outstanding</span>
                  <span className={`font-bold ${balanceAfterPayment > 0 ? "text-orange-400" : "text-emerald-400"}`}>
                    GHS {balanceAfterPayment.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Pending Notice */}
              {!(payment.isConfirmed || payment.status === "COMPLETED") && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm text-yellow-400 font-medium">Awaiting Confirmation</p>
                      <p className="text-xs text-yellow-400/70 mt-1">
                        This payment is pending confirmation by an admin. The customer will receive their receipt once confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 border-t border-white/5">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
