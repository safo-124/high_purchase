"use client"

import { useState, useEffect, useCallback } from "react"
import { CustomerSummary, ProductData, createPurchase, getShopPolicy } from "../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CreatePurchaseDialogProps {
  customer: CustomerSummary
  shopSlug: string
  products: ProductData[]
}

interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export function CreatePurchaseDialog({ customer, shopSlug, products }: CreatePurchaseDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [policy, setPolicy] = useState<{ interestType: string; interestRate: number } | null>(null)
  
  // Form state
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [downPayment, setDownPayment] = useState(0)
  const [installments, setInstallments] = useState(3)
  const [notes, setNotes] = useState("")

  // Load shop policy
  const loadPolicy = useCallback(async () => {
    const policyData = await getShopPolicy(shopSlug)
    setPolicy({
      interestType: policyData.interestType,
      interestRate: policyData.interestRate,
    })
  }, [shopSlug])

  useEffect(() => {
    if (open && !policy) {
      loadPolicy()
    }
  }, [open, policy, loadPolicy])

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  const interestAmount = policy
    ? policy.interestType === "FLAT"
      ? subtotal * (policy.interestRate / 100)
      : subtotal * (policy.interestRate / 100) * installments
    : 0
  const totalAmount = subtotal + interestAmount
  const amountToFinance = totalAmount - downPayment
  const monthlyPayment = installments > 0 ? amountToFinance / installments : 0

  const handleAddToCart = () => {
    if (!selectedProductId) return
    
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    // Check if already in cart
    const existingIndex = cart.findIndex(item => item.productId === selectedProductId)
    
    if (existingIndex >= 0) {
      // Update quantity
      const newCart = [...cart]
      newCart[existingIndex].quantity += quantity
      newCart[existingIndex].totalPrice = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice
      setCart(newCart)
    } else {
      // Add new item
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
      }])
    }

    // Reset selection
    setSelectedProductId("")
    setQuantity(1)
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Please add at least one product")
      return
    }

    setIsLoading(true)
    
    const result = await createPurchase(shopSlug, {
      customerId: customer.id,
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      downPayment,
      installments,
      notes: notes || undefined,
    })

    if (result.success) {
      toast.success("Purchase created successfully")
      setOpen(false)
      // Reset form
      setCart([])
      setDownPayment(0)
      setInstallments(3)
      setNotes("")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to create purchase")
    }
    
    setIsLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all"
        title="New Purchase"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all"
        title="New Purchase"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">New Purchase</h2>
              <p className="text-sm text-slate-400">
                For {customer.firstName} {customer.lastName}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Product Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300">Add Products</h3>
              <div className="flex gap-3">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="">Select a product...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - GHS {product.price.toLocaleString()}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  placeholder="Qty"
                />
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedProductId}
                  className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300">Cart Items</h3>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{item.productName}</p>
                        <p className="text-xs text-slate-400">
                          {item.quantity} × GHS {item.unitPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">
                          GHS {item.totalPrice.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Down Payment (GHS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Installments</label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {[1, 2, 3, 4, 5, 6, 9, 12].map(n => (
                    <option key={n} value={n}>{n} month{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                placeholder="Any additional notes..."
              />
            </div>

            {/* Summary */}
            {cart.length > 0 && (
              <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white">GHS {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Interest ({policy?.interestRate || 0}% {policy?.interestType === "FLAT" ? "flat" : "monthly"})
                  </span>
                  <span className="text-white">GHS {interestAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t border-white/10 pt-2">
                  <span className="text-slate-300">Total Amount</span>
                  <span className="text-white">GHS {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Down Payment</span>
                  <span className="text-emerald-400">- GHS {downPayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t border-white/10 pt-2">
                  <span className="text-slate-300">To Finance</span>
                  <span className="text-orange-400">GHS {amountToFinance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Monthly Payment</span>
                  <span className="text-white font-medium">GHS {monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-white/5 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || cart.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-medium text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>Create Purchase</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
