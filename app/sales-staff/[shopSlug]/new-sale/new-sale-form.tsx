"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProductForSale, CustomerForSale, createSale, createQuickCustomer, PurchaseTypeOption, CollectorOption } from "../../actions"
import { toast } from "sonner"
import { BillModal } from "../components/bill-modal"
import { ShoppingCart, Plus, Trash2, Package } from "lucide-react"

interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  categoryName: string | null
  stockQuantity: number
}

interface NewSaleFormProps {
  shopSlug: string
  products: ProductForSale[]
  customers: CustomerForSale[]
  collectors: CollectorOption[]
}

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Northern",
  "Western",
  "Volta",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
  "Oti",
  "North East",
  "Savannah",
]

const ID_TYPES = [
  "Ghana Card",
  "Voter ID",
  "Passport",
  "Driver's License",
  "NHIS Card",
  "SSNIT Card",
]

export function NewSaleForm({ shopSlug, products, customers: initialCustomers, collectors }: NewSaleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState(initialCustomers)
  const [showBillModal, setShowBillModal] = useState(false)
  const [createdPurchaseId, setCreatedPurchaseId] = useState<string | null>(null)

  // Form state
  const [customerId, setCustomerId] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [downPayment, setDownPayment] = useState("")
  const [tenorDays, setTenorDays] = useState(30)
  const [purchaseType, setPurchaseType] = useState<PurchaseTypeOption>("CREDIT")

  // New customer modal
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerLoading, setNewCustomerLoading] = useState(false)
  // Personal Information
  const [newFirstName, setNewFirstName] = useState("")
  const [newLastName, setNewLastName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newIdType, setNewIdType] = useState("")
  const [newIdNumber, setNewIdNumber] = useState("")
  // Address Information
  const [newAddress, setNewAddress] = useState("")
  const [newCity, setNewCity] = useState("")
  const [newRegion, setNewRegion] = useState("")
  // Payment Preference
  const [newPreferredPayment, setNewPreferredPayment] = useState<"ONLINE" | "COLLECTOR" | "BOTH">("BOTH")
  const [newAssignedCollectorId, setNewAssignedCollectorId] = useState("")
  const [newNotes, setNewNotes] = useState("")

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const selectedCustomer = customers.find((c) => c.id === customerId)

  // Get the appropriate price based on purchase type
  const getProductPrice = useCallback((product: ProductForSale): number => {
    switch (purchaseType) {
      case "CASH":
        return product.cashPrice || product.price
      case "LAYAWAY":
        return product.layawayPrice || product.price
      case "CREDIT":
      default:
        return product.creditPrice || product.price
    }
  }, [purchaseType])

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
  }, [purchaseType, products, getProductPrice])

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  const downPaymentNum = parseFloat(downPayment) || 0
  const remaining = Math.max(0, subtotal - downPaymentNum)

  // Add to cart handler
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
        categoryName: product.categoryName || null,
        stockQuantity: product.stockQuantity,
      }])
    }

    setSelectedProductId("")
    setQuantity(1)
    toast.success(`${product.name} added to cart`)
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (cart.length === 0) {
      toast.error("Please add at least one product to the cart")
      return
    }
    
    setIsLoading(true)

    const result = await createSale(shopSlug, {
      customerId,
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      downPayment: downPaymentNum,
      purchaseType,
      tenorDays,
    })

    if (result.success) {
      toast.success("Sale created successfully!")
      const data = result.data as { purchaseId: string }
      setCreatedPurchaseId(data.purchaseId)
      setShowBillModal(true)
      setCart([])
    } else {
      toast.error(result.error || "Failed to create sale")
    }

    setIsLoading(false)
  }

  const handleNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewCustomerLoading(true)

    const result = await createQuickCustomer(shopSlug, {
      firstName: newFirstName,
      lastName: newLastName,
      phone: newPhone,
      email: newEmail || null,
      idType: newIdType || null,
      idNumber: newIdNumber || null,
      address: newAddress || null,
      city: newCity || null,
      region: newRegion || null,
      preferredPayment: newPreferredPayment,
      assignedCollectorId: newAssignedCollectorId || null,
      notes: newNotes || null,
    })

    if (result.success) {
      const data = result.data as { id: string; firstName: string; lastName: string; phone: string }
      toast.success(`Customer "${data.firstName} ${data.lastName}" created!`)
      
      // Add to local state
      setCustomers([...customers, {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: newEmail || null,
      }])
      
      // Select the new customer
      setCustomerId(data.id)
      
      // Close modal and reset form
      setShowNewCustomer(false)
      resetNewCustomerForm()
    } else {
      toast.error(result.error || "Failed to create customer")
    }

    setNewCustomerLoading(false)
  }

  const resetNewCustomerForm = () => {
    setNewFirstName("")
    setNewLastName("")
    setNewPhone("")
    setNewEmail("")
    setNewIdType("")
    setNewIdNumber("")
    setNewAddress("")
    setNewCity("")
    setNewRegion("")
    setNewPreferredPayment("BOTH")
    setNewAssignedCollectorId("")
    setNewNotes("")
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Customer
          </h2>
          
          <div className="space-y-4">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="" className="bg-slate-900">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.firstName} {c.lastName} — {c.phone}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewCustomer(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Customer
            </button>

            {selectedCustomer && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-sm text-white font-medium">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </p>
                <p className="text-xs text-slate-400">{selectedCustomer.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Product Selection */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            Add Products
          </h2>
          
          <div className="space-y-4">
            {/* Payment Type Selection - First so price calculations are correct */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">Payment Type</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPurchaseType("CASH")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    purchaseType === "CASH"
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-green-500/30"
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs font-medium">Cash</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Full upfront</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseType("LAYAWAY")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    purchaseType === "LAYAWAY"
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/30"
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium">Layaway</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Pay first</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseType("CREDIT")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    purchaseType === "CREDIT"
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/30"
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-xs font-medium">Credit</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">BNPL</p>
                </button>
              </div>
            </div>

            {/* Product and Quantity Selection */}
            <div className="flex gap-3">
              <div className="flex-1">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                >
                  <option value="" className="bg-slate-900">Select a product...</option>
                  {products.filter(p => p.stockQuantity > 0).map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">
                      {p.name} — ₵{getProductPrice(p).toLocaleString()} ({p.stockQuantity} in stock)
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min={1}
                  max={selectedProduct?.stockQuantity || 999}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-center"
                />
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedProductId}
                className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>

            {/* Selected product info */}
            {selectedProduct && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-white font-medium">{selectedProduct.name}</p>
                    {selectedProduct.categoryName && (
                      <p className="text-xs text-slate-400">{selectedProduct.categoryName}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{selectedProduct.stockQuantity} available</p>
                </div>
                
                {/* Price tiers display */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className={`text-center p-2 rounded-lg ${purchaseType === "CASH" ? "bg-green-500/20 border-2 border-green-500/50" : "bg-green-500/10 border border-green-500/20"}`}>
                    <p className="text-green-400 font-medium">Cash</p>
                    <p className="text-white">₵{(selectedProduct.cashPrice || selectedProduct.price).toLocaleString()}</p>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${purchaseType === "LAYAWAY" ? "bg-blue-500/20 border-2 border-blue-500/50" : "bg-blue-500/10 border border-blue-500/20"}`}>
                    <p className="text-blue-400 font-medium">Layaway</p>
                    <p className="text-white">₵{(selectedProduct.layawayPrice || selectedProduct.price).toLocaleString()}</p>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${purchaseType === "CREDIT" ? "bg-amber-500/20 border-2 border-amber-500/50" : "bg-amber-500/10 border border-amber-500/20"}`}>
                    <p className="text-amber-400 font-medium">Credit</p>
                    <p className="text-white">₵{(selectedProduct.creditPrice || selectedProduct.price).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shopping Cart */}
        {cart.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </h2>
            
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{item.productName}</p>
                    {item.categoryName && (
                      <p className="text-xs text-slate-400">{item.categoryName}</p>
                    )}
                    <p className="text-xs text-slate-300 mt-1">
                      {item.quantity} × ₵{item.unitPrice.toLocaleString()} = <span className="text-indigo-400 font-medium">₵{item.totalPrice.toLocaleString()}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(item.productId)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <div className="border-t border-white/10 pt-3 mt-3 flex justify-between font-semibold">
                <span className="text-white">Subtotal</span>
                <span className="text-indigo-400">₵{subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Terms */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payment Terms
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Down Payment */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">Down Payment (GHS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₵</span>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all"
                />
              </div>
            </div>

            {/* Tenor */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">Payment Period (Days)</label>
              <select
                value={tenorDays}
                onChange={(e) => setTenorDays(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all"
              >
                <option value={7} className="bg-slate-900">7 days (1 week)</option>
                <option value={14} className="bg-slate-900">14 days (2 weeks)</option>
                <option value={30} className="bg-slate-900">30 days (1 month)</option>
                <option value={60} className="bg-slate-900">60 days (2 months)</option>
                <option value={90} className="bg-slate-900">90 days (3 months)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        {cart.length > 0 && (
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20">
            <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Payment Type</span>
                <span className={`font-medium ${
                  purchaseType === "CASH" ? "text-green-400" : 
                  purchaseType === "LAYAWAY" ? "text-blue-400" : "text-amber-400"
                }`}>
                  {purchaseType === "CASH" ? "💵 Cash" : 
                   purchaseType === "LAYAWAY" ? "📅 Layaway" : "💳 Credit (BNPL)"}
                </span>
              </div>
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between text-slate-300">
                  <span>{item.productName} × {item.quantity}</span>
                  <span>₵{item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-slate-300 font-medium border-t border-white/10 pt-2">
                <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span>₵{subtotal.toLocaleString()}</span>
              </div>
              {purchaseType !== "CASH" && (
                <div className="flex justify-between text-slate-300">
                  <span>Down Payment</span>
                  <span className="text-green-400">- ₵{downPaymentNum.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-white">
                  {purchaseType === "CASH" ? "Total Due" : "Amount to Finance"}
                </span>
                <span className="text-indigo-400">
                  ₵{purchaseType === "CASH" ? subtotal.toLocaleString() : remaining.toLocaleString()}
                </span>
              </div>
              {purchaseType !== "CASH" && (
                <p className="text-xs text-slate-500 mt-2">
                  * Final amount may include interest based on shop policy
                </p>
              )}
              {purchaseType === "CASH" && (
                <p className="text-xs text-green-500/70 mt-2">
                  ✓ No interest - best price for full upfront payment
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !customerId || cart.length === 0}
          className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Sale...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete Sale
            </>
          )}
        </button>
      </form>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowNewCustomer(false); resetNewCustomerForm(); }}
          />
          
          <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/15 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Add New Customer</h3>
                <p className="text-sm text-slate-400">Enter customer details and payment preferences</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowNewCustomer(false); resetNewCustomerForm(); }}
                className="ml-auto p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleNewCustomer} className="space-y-5">
              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">First Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      required
                      placeholder="Kwame"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Last Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      required
                      placeholder="Asante"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Phone <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      required
                      placeholder="0244123456"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">ID Type</label>
                    <select
                      value={newIdType}
                      onChange={(e) => setNewIdType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                    >
                      <option value="" className="bg-slate-900">Select ID Type</option>
                      {ID_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-slate-900">{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">ID Number</label>
                    <input
                      type="text"
                      value={newIdNumber}
                      onChange={(e) => setNewIdNumber(e.target.value)}
                      placeholder="GHA-123456789-0"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Address Information
                </h4>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Street Address</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="12 Independence Ave"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">City/Town</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Accra"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Region</label>
                    <select
                      value={newRegion}
                      onChange={(e) => setNewRegion(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                    >
                      <option value="" className="bg-slate-900">Select Region</option>
                      {GHANA_REGIONS.map((region) => (
                        <option key={region} value={region} className="bg-slate-900">{region}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Preference */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Payment Preference
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPreferredPayment("ONLINE")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      newPreferredPayment === "ONLINE"
                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:border-green-500/30"
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium">Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPreferredPayment("COLLECTOR")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      newPreferredPayment === "COLLECTOR"
                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:border-green-500/30"
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-xs font-medium">Collector</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPreferredPayment("BOTH")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      newPreferredPayment === "BOTH"
                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:border-green-500/30"
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-xs font-medium">Both</span>
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Assign Collector (optional)</label>
                  <select
                    value={newAssignedCollectorId}
                    onChange={(e) => setNewAssignedCollectorId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 transition-all text-sm"
                  >
                    <option value="" className="bg-slate-900">Select Collector (optional)</option>
                    {collectors.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.name} {c.email ? `— ${c.email}` : ""}
                      </option>
                    ))}
                  </select>
                  {collectors.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">No active collectors available. Add collectors first.</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional notes about this customer..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-slate-500/50 transition-all text-sm resize-none"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => { setShowNewCustomer(false); resetNewCustomerForm(); }}
                  className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCustomerLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {newCustomerLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Add Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBillModal && createdPurchaseId && (
        <BillModal
          shopSlug={shopSlug}
          purchaseId={createdPurchaseId}
          onClose={() => {
            setShowBillModal(false)
            setCreatedPurchaseId(null)
            router.push(`/sales-staff/${shopSlug}/dashboard`)
          }}
        />
      )}
    </>
  )
}
