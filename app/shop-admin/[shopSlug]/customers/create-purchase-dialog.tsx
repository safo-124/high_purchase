"use client"

import { useState, useEffect, useCallback } from "react"
import { CustomerSummary, ProductData, createPurchase, getShopPolicy } from "../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ShoppingCart, Plus, Trash2, X, CreditCard, Wallet, Clock, Package } from "lucide-react"

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
  categoryName: string | null
  stockQuantity?: number
}

type PaymentType = "CASH" | "LAYAWAY" | "CREDIT"

export function CreatePurchaseDialog({ customer, shopSlug, products }: CreatePurchaseDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [policy, setPolicy] = useState<{ interestType: string; interestRate: number } | null>(null)
  
  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>("CREDIT")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [quantity, setQuantity] = useState(1)
  const [downPayment, setDownPayment] = useState(0)
  const [installments, setInstallments] = useState(3)
  const [notes, setNotes] = useState("")

  // Get unique categories
  const categories = products.reduce((acc, p) => {
    if (p.categoryId && p.categoryName && !acc.find(c => c.id === p.categoryId)) {
      acc.push({ id: p.categoryId, name: p.categoryName, color: p.categoryColor || "#6366f1" })
    }
    return acc
  }, [] as { id: string; name: string; color: string }[])

  // Filter products by category
  const filteredProducts = selectedCategory === "all" 
    ? products.filter(p => p.isActive)
    : products.filter(p => p.isActive && p.categoryId === selectedCategory)

  // Get price based on payment type
  const getProductPrice = useCallback((product: ProductData): number => {
    switch (paymentType) {
      case "CASH": return product.cashPrice
      case "LAYAWAY": return product.layawayPrice
      case "CREDIT": return product.creditPrice
    }
  }, [paymentType])

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

  // Recalculate cart prices when payment type changes
  useEffect(() => {
    if (cart.length > 0) {
      setCart(prevCart => prevCart.map(item => {
        const product = products.find(p => p.id === item.productId)
        if (!product) return item
        const unitPrice = getProductPrice(product)
        return {
          ...item,
          unitPrice,
          totalPrice: unitPrice * item.quantity
        }
      }))
    }
  }, [paymentType, products, getProductPrice])

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  
  // Interest only applies to Credit purchases
  const interestAmount = paymentType === "CREDIT" && policy
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

    const unitPrice = getProductPrice(product)

    // Check existing cart quantity
    const existingItem = cart.find(item => item.productId === selectedProductId)
    const currentCartQty = existingItem?.quantity || 0
    const newTotalQty = currentCartQty + quantity

    // Validate stock
    if (newTotalQty > product.stockQuantity) {
      toast.error(`Only ${product.stockQuantity} units available in stock`)
      return
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(item => item.productId === selectedProductId)
    
    if (existingIndex >= 0) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += quantity
      newCart[existingIndex].totalPrice = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice
      setCart(newCart)
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        categoryName: product.categoryName,
        stockQuantity: product.stockQuantity,
      }])
    }

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

    // For cash purchases, installments should be 1
    const finalInstallments = paymentType === "CASH" ? 1 : installments

    setIsLoading(true)
    
    const result = await createPurchase(shopSlug, {
      customerId: customer.id,
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      downPayment: paymentType === "CASH" ? subtotal : downPayment,
      installments: finalInstallments,
      notes: notes ? `[${paymentType}] ${notes}` : `[${paymentType}]`,
    })

    if (result.success) {
      toast.success("Purchase created successfully")
      setOpen(false)
      setCart([])
      setDownPayment(0)
      setInstallments(3)
      setNotes("")
      setPaymentType("CREDIT")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to create purchase")
    }
    
    setIsLoading(false)
  }

  const paymentTypeOptions = [
    { 
      value: "CASH" as PaymentType, 
      label: "Cash", 
      icon: Wallet, 
      description: "Pay full amount now",
      color: "emerald"
    },
    { 
      value: "LAYAWAY" as PaymentType, 
      label: "Layaway", 
      icon: Clock, 
      description: "Pay before taking product",
      color: "amber"
    },
    { 
      value: "CREDIT" as PaymentType, 
      label: "Credit (BNPL)", 
      icon: CreditCard, 
      description: "Take now, pay later",
      color: "violet"
    },
  ]

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all"
        title="New Purchase"
      >
        <Plus className="w-4 h-4" />
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
        <Plus className="w-4 h-4" />
      </button>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-slate-900 border-b border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">New Purchase</h2>
                <p className="text-sm text-slate-400">
                  For {customer.firstName} {customer.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Payment Type Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Type
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {paymentTypeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setPaymentType(option.value)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      paymentType === option.value
                        ? option.color === "emerald"
                          ? "bg-emerald-500/20 border-emerald-500/50"
                          : option.color === "amber"
                          ? "bg-amber-500/20 border-amber-500/50"
                          : "bg-violet-500/20 border-violet-500/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <option.icon className={`w-4 h-4 ${
                        paymentType === option.value
                          ? option.color === "emerald"
                            ? "text-emerald-400"
                            : option.color === "amber"
                            ? "text-amber-400"
                            : "text-violet-400"
                          : "text-slate-400"
                      }`} />
                      <span className={`font-medium text-sm ${
                        paymentType === option.value ? "text-white" : "text-slate-300"
                      }`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter & Product Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Add Products
              </h3>
              
              {/* Category Tabs */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === "all"
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    All Products
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Product Selector */}
              <div className="flex gap-3">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="" className="bg-slate-800 text-slate-400">Select a product...</option>
                  {filteredProducts.map(product => {
                    const price = getProductPrice(product)
                    const inStock = product.stockQuantity > 0
                    const cartItem = cart.find(c => c.productId === product.id)
                    const cartQty = cartItem?.quantity || 0
                    const availableStock = product.stockQuantity - cartQty
                    return (
                      <option 
                        key={product.id} 
                        value={product.id} 
                        className="bg-slate-800 text-white"
                        disabled={!inStock || availableStock <= 0}
                      >
                        {product.name} — GHS {price.toLocaleString()} • {inStock ? `${availableStock} in stock` : 'Out of stock'}
                      </option>
                    )
                  })}
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
                  className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Price Comparison Helper */}
              {selectedProductId && (
                <div className="bg-white/5 rounded-xl p-3">
                  {(() => {
                    const product = products.find(p => p.id === selectedProductId)
                    if (!product) return null
                    return (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400">Price comparison for {product.name}:</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className={`p-2 rounded-lg ${paymentType === "CASH" ? "bg-emerald-500/20 ring-1 ring-emerald-500/50" : "bg-white/5"}`}>
                            <p className="text-xs text-slate-400">Cash</p>
                            <p className={`font-semibold ${paymentType === "CASH" ? "text-emerald-400" : "text-white"}`}>
                              GHS {product.cashPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className={`p-2 rounded-lg ${paymentType === "LAYAWAY" ? "bg-amber-500/20 ring-1 ring-amber-500/50" : "bg-white/5"}`}>
                            <p className="text-xs text-slate-400">Layaway</p>
                            <p className={`font-semibold ${paymentType === "LAYAWAY" ? "text-amber-400" : "text-white"}`}>
                              GHS {product.layawayPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className={`p-2 rounded-lg ${paymentType === "CREDIT" ? "bg-violet-500/20 ring-1 ring-violet-500/50" : "bg-white/5"}`}>
                            <p className="text-xs text-slate-400">Credit</p>
                            <p className={`font-semibold ${paymentType === "CREDIT" ? "text-violet-400" : "text-white"}`}>
                              GHS {product.creditPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Cart Items */}
            {cart.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Cart Items ({cart.length})
                </h3>
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{item.productName}</p>
                          {item.categoryName && (
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-slate-400">
                              {item.categoryName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {item.quantity} × GHS {item.unitPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white">
                          GHS {item.totalPrice.toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Terms - Only for Layaway and Credit */}
            {paymentType !== "CASH" && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Payment Terms
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Down Payment (GHS)
                    </label>
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
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Number of Installments
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map(n => (
                        <option key={n} value={n} className="bg-slate-800 text-white">{n} month{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                placeholder="Any additional notes..."
              />
            </div>

            {/* Order Summary */}
            {cart.length > 0 && (
              <div className={`rounded-xl p-5 space-y-3 ${
                paymentType === "CASH" 
                  ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
                  : paymentType === "LAYAWAY"
                  ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                  : "bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20"
              }`}>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  Order Summary
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    paymentType === "CASH" 
                      ? "bg-emerald-500/20 text-emerald-400"
                      : paymentType === "LAYAWAY"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-violet-500/20 text-violet-400"
                  }`}>
                    {paymentType}
                  </span>
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                    <span className="text-white font-medium">GHS {subtotal.toLocaleString()}</span>
                  </div>

                  {paymentType === "CREDIT" && interestAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        Interest ({policy?.interestRate || 0}% {policy?.interestType === "FLAT" ? "flat" : "monthly"})
                      </span>
                      <span className="text-orange-400">+ GHS {interestAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
                    <span className="text-white">Total Amount</span>
                    <span className="text-white text-lg">GHS {totalAmount.toLocaleString()}</span>
                  </div>

                  {paymentType !== "CASH" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Down Payment</span>
                        <span className="text-emerald-400">- GHS {downPayment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-300">Amount to Finance</span>
                        <span className="text-orange-400">GHS {amountToFinance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm bg-white/5 rounded-lg p-3 -mx-1">
                        <span className="text-slate-300 font-medium">Monthly Payment</span>
                        <span className={`text-lg font-bold ${
                          paymentType === "LAYAWAY" ? "text-amber-400" : "text-violet-400"
                        }`}>
                          GHS {monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          <span className="text-xs text-slate-400 font-normal"> × {installments} months</span>
                        </span>
                      </div>
                    </>
                  )}

                  {paymentType === "CASH" && (
                    <div className="flex justify-between text-sm bg-emerald-500/10 rounded-lg p-3 -mx-1">
                      <span className="text-emerald-300 font-medium">Amount Due Now</span>
                      <span className="text-lg font-bold text-emerald-400">
                        GHS {subtotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-900 border-t border-white/5 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
            <button
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || cart.length === 0}
              className={`px-6 py-2.5 rounded-xl text-white font-medium text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 ${
                paymentType === "CASH"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  : paymentType === "LAYAWAY"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                  : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
              }`}
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
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Create {paymentType === "CASH" ? "Cash" : paymentType === "LAYAWAY" ? "Layaway" : "Credit"} Purchase
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
