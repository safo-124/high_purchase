"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ProductForCollector, 
  CustomerForCollectorSale, 
  createCollectorSale, 
  createQuickCustomerAsCollector, 
  PurchaseTypeOption, 
  CollectorOption 
} from "../../actions"
import { toast } from "sonner"
import { CollectorBillModal } from "./collector-bill-modal"
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

interface CollectorSaleFormProps {
  shopSlug: string
  products: ProductForCollector[]
  customers: CustomerForCollectorSale[]
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

export function CollectorSaleForm({ shopSlug, products, customers: initialCustomers, collectors }: CollectorSaleFormProps) {
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
  const [newFirstName, setNewFirstName] = useState("")
  const [newLastName, setNewLastName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newIdType, setNewIdType] = useState("")
  const [newIdNumber, setNewIdNumber] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newCity, setNewCity] = useState("")
  const [newRegion, setNewRegion] = useState("")
  const [newNotes, setNewNotes] = useState("")

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Get the appropriate price based on purchase type
  const getProductPrice = useCallback((product: ProductForCollector): number => {
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
        categoryName: product.category || null,
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

    const result = await createCollectorSale(shopSlug, {
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

    const result = await createQuickCustomerAsCollector(shopSlug, {
      firstName: newFirstName,
      lastName: newLastName,
      phone: newPhone,
      email: newEmail || null,
      idType: newIdType || null,
      idNumber: newIdNumber || null,
      address: newAddress || null,
      city: newCity || null,
      region: newRegion || null,
      notes: newNotes || null,
    })

    if (result.success) {
      const data = result.data as { id: string; firstName: string; lastName: string; phone: string }
      toast.success(`Customer "${data.firstName} ${data.lastName}" created!`)
      
      setCustomers([...customers, {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: newEmail || null,
      }])
      
      setCustomerId(data.id)
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
    setNewNotes("")
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Customer
          </h2>
          
          <div className="space-y-4">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="" className="bg-slate-800 text-white">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                  {c.firstName} {c.lastName} - {c.phone}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewCustomer(true)}
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Customer
            </button>
          </div>
        </div>

        {/* Product Selection */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Add Products
          </h2>
          
          <div className="space-y-4">
            {/* Payment Type Selection First */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Payment Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(["CASH", "LAYAWAY", "CREDIT"] as PurchaseTypeOption[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPurchaseType(type)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      purchaseType === type
                        ? type === "CASH"
                          ? "bg-green-500/20 border-green-500/50 text-green-400"
                          : type === "LAYAWAY"
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                          : "bg-blue-500/20 border-blue-500/50 text-blue-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <span className="font-medium text-sm">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product and Quantity Selection */}
            <div className="flex gap-3">
              <div className="flex-1">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="" className="bg-slate-800 text-white">Select a product...</option>
                  {products.filter(p => p.stockQuantity > 0).map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                      {p.name} - ₵{getProductPrice(p).toLocaleString()} ({p.stockQuantity} in stock)
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.stockQuantity || 999}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 text-center"
                />
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedProductId}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>

            {/* Selected product info */}
            {selectedProduct && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-white">{selectedProduct.name}</h3>
                    {selectedProduct.category && (
                      <p className="text-xs text-slate-400">{selectedProduct.category}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedProduct.stockQuantity > 10
                      ? "bg-green-500/20 text-green-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {selectedProduct.stockQuantity} in stock
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className={`p-2 rounded-lg ${purchaseType === "CASH" ? "bg-green-500/20 border border-green-500/30" : ""}`}>
                    <span className="text-green-400 block text-xs">Cash</span>
                    <span className="text-white">₵{selectedProduct.cashPrice.toLocaleString()}</span>
                  </div>
                  <div className={`p-2 rounded-lg ${purchaseType === "LAYAWAY" ? "bg-amber-500/20 border border-amber-500/30" : ""}`}>
                    <span className="text-amber-400 block text-xs">Layaway</span>
                    <span className="text-white">₵{selectedProduct.layawayPrice.toLocaleString()}</span>
                  </div>
                  <div className={`p-2 rounded-lg ${purchaseType === "CREDIT" ? "bg-blue-500/20 border border-blue-500/30" : ""}`}>
                    <span className="text-blue-400 block text-xs">Credit</span>
                    <span className="text-white">₵{selectedProduct.creditPrice.toLocaleString()}</span>
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
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
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
                      {item.quantity} × ₵{item.unitPrice.toLocaleString()} = <span className="text-emerald-400 font-medium">₵{item.totalPrice.toLocaleString()}</span>
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
                <span className="text-emerald-400">₵{subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Terms */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Payment Terms</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Down Payment (GHS)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Payment Tenor (Days)</label>
              <select
                value={tenorDays}
                onChange={(e) => setTenorDays(parseInt(e.target.value))}
                disabled={purchaseType === "CASH"}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
              >
                <option value={30} className="bg-slate-800 text-white">30 Days (1 Month)</option>
                <option value={60} className="bg-slate-800 text-white">60 Days (2 Months)</option>
                <option value={90} className="bg-slate-800 text-white">90 Days (3 Months)</option>
                <option value={180} className="bg-slate-800 text-white">180 Days (6 Months)</option>
                <option value={365} className="bg-slate-800 text-white">365 Days (12 Months)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        {cart.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Payment Type</span>
                <span className={`font-medium ${
                  purchaseType === "CASH" ? "text-green-400" : 
                  purchaseType === "LAYAWAY" ? "text-amber-400" : "text-blue-400"
                }`}>
                  {purchaseType}
                </span>
              </div>
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-400">{item.productName} × {item.quantity}</span>
                  <span className="text-white">₵{item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                <span className="text-slate-400">Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span className="text-white font-medium">₵{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Down Payment</span>
                <span className="text-green-400">- ₵{downPaymentNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-white/10 pt-3">
                <span className="text-white font-semibold">Balance Due</span>
                <span className="text-emerald-400 font-bold">₵{remaining.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !customerId || cart.length === 0}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-lg font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Complete Sale
            </>
          )}
        </button>
      </form>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewCustomer(false)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Add New Customer</h3>
            
            <form onSubmit={handleNewCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  placeholder="0XX XXX XXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Type</label>
                  <select
                    value={newIdType}
                    onChange={(e) => setNewIdType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="" className="bg-slate-800 text-white">Select...</option>
                    {ID_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-slate-800 text-white">{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Region</label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="" className="bg-slate-800 text-white">Select...</option>
                    {GHANA_REGIONS.map((region) => (
                      <option key={region} value={region} className="bg-slate-800 text-white">{region}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCustomerLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium disabled:opacity-50 transition-all flex items-center gap-2"
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
                    "Add Customer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBillModal && createdPurchaseId && (
        <CollectorBillModal
          shopSlug={shopSlug}
          purchaseId={createdPurchaseId}
          onClose={() => {
            setShowBillModal(false)
            setCreatedPurchaseId(null)
            router.push(`/collector/${shopSlug}/dashboard`)
          }}
        />
      )}
    </>
  )
}
