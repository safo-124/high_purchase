"use client"

import { useState } from "react"
import { PurchaseData, recordPayment, updatePurchaseItems, ProductForSale } from "../../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { generateReceiptPDF, ReceiptPDFData } from "@/lib/pdf-generator"

interface PurchasesSectionProps {
  purchases: PurchaseData[]
  shopSlug: string
  customerId: string
  products: ProductForSale[]
  walletBalance?: number
  customerName?: string
  customerPhone?: string
  customerEmail?: string | null
  shopName?: string
}

interface EditCartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pending" },
  ACTIVE: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Active" },
  COMPLETED: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Completed" },
  OVERDUE: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Overdue" },
  DEFAULTED: { bg: "bg-red-500/20", text: "text-red-400", label: "Defaulted" },
}

export function PurchasesSection({ purchases, shopSlug, products, walletBalance = 0, customerName = "", customerPhone = "", customerEmail, shopName = "" }: PurchasesSectionProps) {
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

  // Edit purchase state
  const [editModal, setEditModal] = useState<{ open: boolean; purchase: PurchaseData | null }>({
    open: false,
    purchase: null,
  })
  const [editCart, setEditCart] = useState<EditCartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)

  const openEditModal = (purchase: PurchaseData) => {
    // Initialize cart with current purchase items (filter out items without productId)
    setEditCart(purchase.items
      .filter(item => item.productId !== null)
      .map(item => ({
        productId: item.productId as string,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })))
    setEditModal({ open: true, purchase })
    setSelectedProductId("")
    setQuantity(1)
  }

  const addToEditCart = () => {
    if (!selectedProductId) return
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    // Check if already in cart
    const existingIndex = editCart.findIndex(item => item.productId === selectedProductId)
    if (existingIndex >= 0) {
      // Update quantity
      const newCart = [...editCart]
      newCart[existingIndex].quantity += quantity
      newCart[existingIndex].totalPrice = newCart[existingIndex].unitPrice * newCart[existingIndex].quantity
      setEditCart(newCart)
    } else {
      // Add new item - use the purchase type to determine price
      const purchaseType = editModal.purchase?.purchaseType || "CREDIT"
      const unitPrice = purchaseType === "CASH" 
        ? product.cashPrice 
        : purchaseType === "LAYAWAY" 
        ? product.layawayPrice 
        : product.creditPrice
      
      setEditCart([...editCart, {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
      }])
    }
    setSelectedProductId("")
    setQuantity(1)
  }

  const removeFromEditCart = (productId: string) => {
    setEditCart(editCart.filter(item => item.productId !== productId))
  }

  const updateItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) return removeFromEditCart(productId)
    setEditCart(editCart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
        : item
    ))
  }

  const editCartTotal = editCart.reduce((sum, item) => sum + item.totalPrice, 0)

  const handleUpdatePurchase = async () => {
    if (!editModal.purchase || editCart.length === 0) return

    setIsUpdating(true)
    
    const result = await updatePurchaseItems(shopSlug, editModal.purchase.id, {
      items: editCart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })

    if (result.success) {
      toast.success("Purchase items updated successfully")
      setEditModal({ open: false, purchase: null })
      setEditCart([])
      router.refresh()
    } else {
      toast.error(result.error || "Failed to update purchase")
    }
    
    setIsUpdating(false)
  }

  const handleRecordPayment = async () => {
    if (!paymentModal.purchase) return
    
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }

    // Prevent overpayment
    const outstanding = paymentModal.purchase.outstandingBalance
    if (amount > outstanding) {
      toast.error(`Amount cannot exceed outstanding balance of ₵${outstanding.toLocaleString()}`)
      return
    }

    // Check wallet balance if using wallet payment
    if (paymentMethod === "WALLET" && amount > walletBalance) {
      toast.error(`Insufficient wallet balance. Available: GH₵${walletBalance.toLocaleString()}`)
      return
    }

    setIsRecording(true)
    
    const result = await recordPayment(shopSlug, {
      purchaseId: paymentModal.purchase.id,
      amount,
      paymentMethod: paymentMethod as "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD" | "WALLET",
      reference: paymentReference || undefined,
    })

    if (result.success) {
      const data = result.data as { awaitingConfirmation?: boolean } | undefined
      if (data?.awaitingConfirmation) {
        toast.success("Payment recorded - awaiting confirmation")
      } else {
        toast.success("Payment recorded and confirmed")
        // Generate and download receipt for confirmed payments
        const purchase = paymentModal.purchase
        const now = new Date()
        const newAmountPaid = purchase.amountPaid + amount
        const newOutstanding = purchase.totalAmount - newAmountPaid
        try {
          const receiptData: ReceiptPDFData = {
            receiptNumber: `RCP-${Date.now()}`,
            purchaseNumber: purchase.purchaseNumber,
            customerName: customerName || purchase.customerName,
            customerPhone: customerPhone,
            customerEmail: customerEmail,
            shopName: shopName || shopSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            businessName: "",
            paymentAmount: amount,
            paymentMethod: paymentMethod.replace(/_/g, " "),
            reference: paymentReference || null,
            previousBalance: purchase.outstandingBalance,
            newBalance: Math.max(0, newOutstanding),
            totalPurchaseAmount: purchase.totalAmount,
            totalAmountPaid: newAmountPaid,
            paymentDate: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            paymentTime: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            isFullyPaid: newOutstanding <= 0,
          }
          const pdfDataUri = generateReceiptPDF(receiptData)
          const link = document.createElement("a")
          link.href = pdfDataUri
          link.download = `Receipt_${purchase.purchaseNumber}_${now.toISOString().split("T")[0]}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } catch (err) {
          console.error("Failed to generate receipt:", err)
          toast.error("Payment recorded but receipt generation failed")
        }
      }
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
                            <div key={payment.id} className="text-sm">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-white">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Pending'}</span>
                                  <span className="text-slate-400 ml-2">• {payment.paymentMethod.replace('_', ' ')}</span>
                                  {payment.rejectedAt && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">Rejected</span>
                                  )}
                                  {!payment.isConfirmed && !payment.rejectedAt && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">Pending Confirmation</span>
                                  )}
                                </div>
                                <span className={`font-medium ${
                                  payment.rejectedAt 
                                    ? 'text-red-400 line-through' 
                                    : payment.status === 'COMPLETED' 
                                      ? 'text-emerald-400' 
                                      : 'text-yellow-400'
                                }`}>
                                  GHS {payment.amount.toLocaleString()}
                                </span>
                              </div>
                              {payment.rejectionReason && (
                                <div className="mt-1 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                                  <span className="font-medium">Reason:</span> {payment.rejectionReason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {purchase.status !== "COMPLETED" && (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(purchase)
                          }}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Items
                        </button>
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

              {/* Wallet Balance Card */}
              {walletBalance > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-sm text-emerald-300">Wallet Balance</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">
                    GH₵{walletBalance.toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Amount (GHS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={paymentMethod === "WALLET" 
                    ? Math.min(paymentModal.purchase.outstandingBalance, walletBalance)
                    : paymentModal.purchase.outstandingBalance
                  }
                  value={paymentAmount}
                  onChange={(e) => {
                    const maxAmount = paymentMethod === "WALLET"
                      ? Math.min(paymentModal.purchase?.outstandingBalance || 0, walletBalance)
                      : paymentModal.purchase?.outstandingBalance || 0
                    const value = parseFloat(e.target.value)
                    if (!isNaN(value) && value > maxAmount) {
                      setPaymentAmount(maxAmount.toString())
                    } else {
                      setPaymentAmount(e.target.value)
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="0.00"
                  autoFocus
                />
                <p className="mt-1 text-xs text-slate-500">
                  Max: ₵{paymentMethod === "WALLET" 
                    ? Math.min(paymentModal.purchase.outstandingBalance, walletBalance).toLocaleString()
                    : paymentModal.purchase.outstandingBalance.toLocaleString()
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value)
                    // Reset amount if switching to wallet and amount exceeds wallet balance
                    if (e.target.value === "WALLET") {
                      const currentAmount = parseFloat(paymentAmount) || 0
                      if (currentAmount > walletBalance) {
                        setPaymentAmount(walletBalance.toString())
                      }
                    }
                  }}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="CASH" className="bg-slate-800 text-white">Cash</option>
                  <option value="MOBILE_MONEY" className="bg-slate-800 text-white">Mobile Money</option>
                  <option value="BANK_TRANSFER" className="bg-slate-800 text-white">Bank Transfer</option>
                  <option value="CARD" className="bg-slate-800 text-white">Card</option>
                  {walletBalance > 0 && (
                    <option value="WALLET" className="bg-slate-800 text-emerald-400">
                      💳 Wallet (GH₵{walletBalance.toLocaleString()} available)
                    </option>
                  )}
                </select>
                {paymentMethod === "WALLET" && (
                  <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Payment will be deducted from customer&apos;s wallet balance
                  </p>
                )}
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

      {/* Edit Purchase Modal */}
      {editModal.open && editModal.purchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Edit Purchase Items</h3>
                <p className="text-sm text-slate-400">{editModal.purchase.purchaseNumber} • {editModal.purchase.purchaseType}</p>
              </div>
            </div>

            {/* Add Product */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Add Product</h4>
              <div className="flex gap-3">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="">Select a product...</option>
                  {products.filter(p => p.stockQuantity > 0).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - GHS {
                        (editModal.purchase?.purchaseType === "CASH" 
                          ? product.cashPrice 
                          : editModal.purchase?.purchaseType === "LAYAWAY" 
                          ? product.layawayPrice 
                          : product.creditPrice
                        ).toLocaleString()
                      } (Stock: {product.stockQuantity})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <button
                  onClick={addToEditCart}
                  disabled={!selectedProductId}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-all disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Purchase Items</h4>
              {editCart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No items in purchase</p>
              ) : (
                <div className="space-y-3">
                  {editCart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{item.productName}</p>
                        <p className="text-xs text-slate-400">GHS {item.unitPrice.toLocaleString()} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m6-6H6" />
                            </svg>
                          </button>
                        </div>
                        <span className="w-24 text-right text-sm font-medium text-white">
                          GHS {item.totalPrice.toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeFromEditCart(item.productId)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">New Subtotal</p>
                  <p className="text-lg font-bold text-white">GHS {editCartTotal.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Previous Subtotal</p>
                  <p className="text-lg font-medium text-slate-400">GHS {editModal.purchase.subtotal.toLocaleString()}</p>
                </div>
              </div>
              {editCartTotal !== editModal.purchase.subtotal && (
                <p className={`text-sm mt-2 ${editCartTotal > editModal.purchase.subtotal ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {editCartTotal > editModal.purchase.subtotal 
                    ? `+GHS ${(editCartTotal - editModal.purchase.subtotal).toLocaleString()} increase`
                    : `-GHS ${(editModal.purchase.subtotal - editCartTotal).toLocaleString()} decrease`
                  }
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">Interest will be recalculated based on the new subtotal</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditModal({ open: false, purchase: null })
                  setEditCart([])
                }}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePurchase}
                disabled={isUpdating || editCart.length === 0}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>Update Purchase</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
