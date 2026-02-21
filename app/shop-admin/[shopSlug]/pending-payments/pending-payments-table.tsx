"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { confirmPayment, rejectPayment, type PendingPaymentForAdmin } from "../../actions"
import { PaymentMethod } from "@/app/generated/prisma/client"
import { ProgressInvoiceModal } from "../components/progress-invoice-modal"
import { WaybillModal } from "../components/waybill-modal"
import { toast } from "sonner"

interface PendingPaymentsTableProps {
  payments: PendingPaymentForAdmin[]
  shopSlug: string
}

interface ConfirmationResult {
  invoiceId: string
  receiptNumber: string
  purchaseCompleted: boolean
  waybillGenerated: boolean
  waybillNumber: string | null
  purchaseId: string
}

export function PendingPaymentsTable({ payments, shopSlug }: PendingPaymentsTableProps) {
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PendingPaymentForAdmin | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  
  // Invoice/Waybill modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [showWaybillModal, setShowWaybillModal] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const handleConfirm = async (payment: PendingPaymentForAdmin) => {
    setProcessingId(payment.id)
    startTransition(async () => {
      const result = await confirmPayment(shopSlug, payment.id)
      if (result.success && result.data) {
        const data = result.data as {
          purchaseCompleted: boolean
          invoiceId: string
          receiptNumber: string
          waybillGenerated: boolean
          waybillNumber: string | null
        }
        
        setConfirmationResult({
          ...data,
          purchaseId: payment.purchaseId,
        })
        setShowInvoiceModal(true)
        
        if (data.purchaseCompleted) {
          toast.success(`Payment confirmed! Purchase completed. Waybill ${data.waybillNumber} generated.`)
        } else {
          toast.success(`Payment confirmed! Receipt ${data.receiptNumber} generated.`)
        }
      } else {
        toast.error(result.error || "Failed to confirm payment")
      }
      setProcessingId(null)
    })
  }

  const openRejectModal = (payment: PendingPaymentForAdmin) => {
    setSelectedPayment(payment)
    setRejectReason("")
    setRejectModalOpen(true)
  }

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason.trim()) {
      alert("Please provide a reason for rejection")
      return
    }

    setProcessingId(selectedPayment.id)
    startTransition(async () => {
      const result = await rejectPayment(shopSlug, selectedPayment.id, rejectReason)
      if (!result.success) {
        alert(result.error || "Failed to reject payment")
      }
      setRejectModalOpen(false)
      setSelectedPayment(null)
      setRejectReason("")
      setProcessingId(null)
    })
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-white mb-2">All Caught Up!</h3>
        <p className="text-slate-400">No payments pending confirmation</p>
        <p className="text-sm text-slate-500 mt-1">
          Payments collected by debt collectors will appear here for your approval
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Date Collected</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Recorded By</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Customer</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Purchase</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Method</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase">Amount</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Reference</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-4 px-4 text-sm text-slate-300">
                  {formatDate(payment.paidAt)}
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-300">{payment.recordedBy}</span>
                  {payment.collectorId && (
                    <span className="block text-xs text-slate-500">via Collector</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <Link 
                    href={`/shop-admin/${shopSlug}/customers/${payment.customerId}`}
                    className="text-sm text-white hover:text-indigo-400 font-medium"
                  >
                    {payment.customerName}
                  </Link>
                </td>
                <td className="py-4 px-4 text-sm text-slate-400">
                  {payment.purchaseNumber}
                </td>
                <td className="py-4 px-4">
                  <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">
                    {payment.paymentMethod.replace("_", " ")}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(payment.amount)}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-slate-400">
                  {payment.reference || "-"}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleConfirm(payment)}
                      disabled={isPending && processingId === payment.id}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isPending && processingId === payment.id ? (
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Confirm
                    </button>
                    <button
                      onClick={() => openRejectModal(payment)}
                      disabled={isPending && processingId === payment.id}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">Reject Payment</h3>
            <p className="text-sm text-slate-400 mb-4">
              You are about to reject a payment of <span className="text-white font-medium">{formatCurrency(selectedPayment.amount)}</span> recorded by <span className="text-white">{selectedPayment.recordedBy}</span>.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                placeholder="e.g., Payment not received, incorrect amount, etc."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModalOpen(false)
                  setSelectedPayment(null)
                  setRejectReason("")
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Rejecting..." : "Reject Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && confirmationResult && (
        <ProgressInvoiceModal
          shopSlug={shopSlug}
          invoiceId={confirmationResult.invoiceId}
          onClose={() => {
            setShowInvoiceModal(false)
            setConfirmationResult(null)
          }}
          onViewWaybill={(purchaseId) => {
            setShowInvoiceModal(false)
            setShowWaybillModal(true)
          }}
        />
      )}

      {/* Waybill Modal */}
      {showWaybillModal && confirmationResult && (
        <WaybillModal
          shopSlug={shopSlug}
          purchaseId={confirmationResult.purchaseId}
          onClose={() => {
            setShowWaybillModal(false)
            setConfirmationResult(null)
          }}
        />
      )}
    </>
  )
}
