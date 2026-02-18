"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ProductForCollector, 
  CustomerForCollectorSale, 
  createCollectorSale, 
  createCustomerAsCollector,
  PurchaseTypeOption 
} from "../../actions"
import { toast } from "sonner"
import { ShoppingCart, Plus, Trash2, Package, Search, User, X, Check, CreditCard, Banknote, Clock } from "lucide-react"

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
  products: ProductForCollector[]
  customers: CustomerForCollectorSale[]
  canCreateCustomers: boolean
}

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Northern", "Western",
  "Volta", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo",
  "Western North", "Oti", "North East", "Savannah",
]

const ID_TYPES = ["Ghana Card", "Voter ID", "Passport", "Driver's License", "NHIS Card", "SSNIT Card"]

export function NewSaleForm({ shopSlug, products, customers: initialCustomers, canCreateCustomers }: NewSaleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState(initialCustomers)

  // Form state
  const [customerId, setCustomerId] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [downPayment, setDownPayment] = useState("")
  const [tenorDays, setTenorDays] = useState(30)
  const [purchaseType, setPurchaseType] = useState<PurchaseTypeOption>("CREDIT")

  // Search states
  const [productSearch, setProductSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")

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
  
  // Customer portal account fields
  const [createAccount, setCreateAccount] = useState(false)
  const [accountEmail, setAccountEmail] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const selectedCustomer = customers.find((c) => c.id === customerId)

  // Filter products and customers based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category?.toLowerCase().includes(productSearch.toLowerCase())
  )
  
  const filteredCustomers = customers.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  )

  // Get the appropriate price based on purchase type
  const getProductPrice = useCallback((product: ProductForCollector): number => {
    switch (purchaseType) {
      case "CASH": return product.cashPrice || product.price
      case "LAYAWAY": return product.layawayPrice || product.price
      case "CREDIT": return product.creditPrice || product.price
      default: return product.price
    }
  }, [purchaseType])

  // Recalculate cart prices when payment type changes
  useEffect(() => {
    if (cart.length > 0) {
      setCart(prevCart => prevCart.map(item => {
        const product = products.find(p => p.id === item.productId)
        if (!product) return item
        const unitPrice = getProductPrice(product)
        return { ...item, unitPrice, totalPrice: unitPrice * item.quantity }
      }))
    }
  }, [purchaseType, products, getProductPrice])

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  const downPaymentNum = parseFloat(downPayment) || 0
  const remaining = Math.max(0, subtotal - downPaymentNum)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Add to cart handler
  const handleAddToCart = (product: ProductForCollector) => {
    const unitPrice = getProductPrice(product)
    const existingItem = cart.find(item => item.productId === product.id)
    const currentCartQty = existingItem?.quantity || 0
    const newTotalQty = currentCartQty + 1

    if (newTotalQty > product.stockQuantity) {
      toast.error(`Only ${product.stockQuantity} units available`)
      return
    }

    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        categoryName: product.category || null,
        stockQuantity: product.stockQuantity,
      }])
    }
    toast.success(`Added ${product.name}`)
  }

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    const item = cart.find(i => i.productId === productId)
    if (!item) return
    
    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId))
      return
    }
    
    if (newQty > item.stockQuantity) {
      toast.error(`Only ${item.stockQuantity} units available`)
      return
    }
    
    setCart(cart.map(i => 
      i.productId === productId 
        ? { ...i, quantity: newQty, totalPrice: newQty * i.unitPrice }
        : i
    ))
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const handleSubmit = async () => {
    if (cart.length === 0 || !customerId) return
    
    setIsLoading(true)

    const result = await createCollectorSale(shopSlug, {
      customerId,
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      downPayment: purchaseType === "CASH" ? subtotal : downPaymentNum,
      purchaseType,
      tenorDays,
    })

    if (result.success) {
      toast.success("Sale created successfully!")
      router.push(`/collector/${shopSlug}/customers`)
    } else {
      toast.error(result.error || "Failed to create sale")
    }

    setIsLoading(false)
  }

  const handleNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewCustomerLoading(true)

    // Validate passwords if creating account
    if (createAccount) {
      if (accountPassword !== confirmPassword) {
        toast.error("Passwords do not match")
        setNewCustomerLoading(false)
        return
      }
      if (accountPassword.length < 8) {
        toast.error("Password must be at least 8 characters")
        setNewCustomerLoading(false)
        return
      }
    }

    const result = await createCustomerAsCollector(shopSlug, {
      firstName: newFirstName,
      lastName: newLastName,
      phone: newPhone,
      email: createAccount ? undefined : (newEmail || undefined),
      idType: newIdType || undefined,
      idNumber: newIdNumber || undefined,
      address: newAddress || undefined,
      city: newCity || undefined,
      region: newRegion || undefined,
      createAccount,
      accountEmail: createAccount ? accountEmail : undefined,
      accountPassword: createAccount ? accountPassword : undefined,
    })

    if (result.success && result.data) {
      const data = result.data as { id: string; firstName: string; lastName: string; phone: string; hasAccount?: boolean }
      if (data.hasAccount) {
        toast.success(`Customer "${data.firstName} ${data.lastName}" created with portal account!`)
      } else {
        toast.success(`Customer "${data.firstName} ${data.lastName}" created!`)
      }
      
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
    setNewFirstName(""); setNewLastName(""); setNewPhone(""); setNewEmail("")
    setNewIdType(""); setNewIdNumber(""); setNewAddress(""); setNewCity(""); setNewRegion("")
    setCreateAccount(false); setAccountEmail(""); setAccountPassword(""); setConfirmPassword("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <ShoppingCart className="w-6 h-6 text-emerald-400" />
            </div>
            New Sale
          </h1>
          <p className="text-slate-400 mt-1">Create a new hire purchase sale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Type Selection */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Payment Type
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: "CASH" as const, label: "Cash", desc: "Full payment", icon: Banknote, color: "emerald" },
                { type: "LAYAWAY" as const, label: "Layaway", desc: "Pay before delivery", icon: Clock, color: "amber" },
                { type: "CREDIT" as const, label: "Credit", desc: "Buy now, pay later", icon: CreditCard, color: "violet" },
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => setPurchaseType(option.type)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    purchaseType === option.type
                      ? option.color === "emerald" ? "bg-emerald-500/20 border-emerald-500/50"
                        : option.color === "amber" ? "bg-amber-500/20 border-amber-500/50"
                        : "bg-violet-500/20 border-violet-500/50"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <option.icon className={`w-6 h-6 mx-auto mb-2 ${
                    purchaseType === option.type
                      ? option.color === "emerald" ? "text-emerald-400"
                        : option.color === "amber" ? "text-amber-400"
                        : "text-violet-400"
                      : "text-slate-400"
                  }`} />
                  <p className="font-medium text-white text-sm">{option.label}</p>
                  <p className="text-xs text-slate-400">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Selection */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                Customer
              </h2>
              {canCreateCustomers && (
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Customer
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>

            {/* Customer List */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredCustomers.length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-sm">No customers found</p>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCustomerId(c.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      customerId === c.id
                        ? "bg-emerald-500/20 border-2 border-emerald-500/50"
                        : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                        customerId === c.id ? "bg-emerald-500/30 text-emerald-400" : "bg-white/10 text-slate-400"
                      }`}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white text-sm">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-400">{c.phone}</p>
                      </div>
                      {customerId === c.id && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Product Selection */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              Products
            </h2>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="col-span-2 text-center py-4 text-slate-400 text-sm">No products found</p>
              ) : (
                filteredProducts.map((product) => {
                  const inCart = cart.find(i => i.productId === product.id)
                  const price = getProductPrice(product)
                  
                  return (
                    <div
                      key={product.id}
                      className={`p-3 rounded-xl border transition-all ${
                        inCart ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-white text-sm">{product.name}</p>
                          {product.category && <p className="text-xs text-slate-400">{product.category}</p>}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                          {product.stockQuantity} left
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-emerald-400">GH₵{price.toLocaleString()}</p>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(product.id, inCart.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center text-sm"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-white text-sm">{inCart.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(product.id, inCart.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all text-xs font-medium"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Payment Terms (for non-CASH) */}
          {purchaseType !== "CASH" && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Payment Terms</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Down Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">GH₵</span>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Duration</label>
                  <select
                    value={tenorDays}
                    onChange={(e) => setTenorDays(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={120}>120 days</option>
                    <option value={180}>180 days</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Order Summary
            </h3>

            {/* Customer */}
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-3">
                <User className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs text-slate-400">Customer</p>
                  <p className="text-white text-sm font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                </div>
              </div>
            )}

            {/* Cart Items */}
            {cart.length > 0 && (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white text-sm">{item.productName}</p>
                      <p className="text-xs text-slate-400">{item.quantity} × GH₵{item.unitPrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-sm font-medium">GH₵{item.totalPrice.toLocaleString()}</span>
                      <button
                        onClick={() => handleRemoveFromCart(item.productId)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-white/10 my-4" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal ({cartItemCount} items)</span>
                <span className="text-white font-medium">GH₵{subtotal.toLocaleString()}</span>
              </div>
              {purchaseType !== "CASH" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Down Payment</span>
                    <span className="text-green-400">-GH₵{downPaymentNum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
                    <span className="text-slate-300">Balance Due</span>
                    <span className="text-amber-400">GH₵{remaining.toLocaleString()}</span>
                  </div>
                </>
              )}
              {purchaseType === "CASH" && (
                <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
                  <span className="text-slate-300">Total</span>
                  <span className="text-emerald-400">GH₵{subtotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || cart.length === 0 || !customerId}
              className="w-full mt-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">New Customer</h3>
                    <p className="text-sm text-slate-400">Add a new customer</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewCustomer(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleNewCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                  <input type="text" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                  <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone *</label>
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Type</label>
                  <select value={newIdType} onChange={(e) => setNewIdType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm [&>option]:bg-slate-800 [&>option]:text-white">
                    <option value="">Select</option>
                    {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Number</label>
                  <input type="text" value={newIdNumber} onChange={(e) => setNewIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Address</label>
                <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">City</label>
                  <input type="text" value={newCity} onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Region</label>
                  <select value={newRegion} onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm [&>option]:bg-slate-800 [&>option]:text-white">
                    <option value="">Select</option>
                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Customer Portal Account */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span className="text-sm font-medium text-white">Customer Portal Access</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateAccount(!createAccount)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${createAccount ? "bg-emerald-600" : "bg-slate-700"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${createAccount ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                
                {createAccount && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                    <p className="text-xs text-emerald-300">Create login credentials for the customer to access their portal.</p>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Account Email *</label>
                      <input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} required={createAccount}
                        placeholder="customer@email.com"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Password *</label>
                        <input type="password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} required={createAccount} minLength={8}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Confirm *</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required={createAccount} minLength={8}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                      </div>
                    </div>
                    {accountPassword && confirmPassword && accountPassword !== confirmPassword && (
                      <p className="text-xs text-red-400">Passwords do not match</p>
                    )}
                    {accountPassword && accountPassword.length > 0 && accountPassword.length < 8 && (
                      <p className="text-xs text-amber-400">Password must be at least 8 characters</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowNewCustomer(false)}
                  className="flex-1 py-2.5 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-all text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={newCustomerLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {newCustomerLoading ? (
                    <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Creating...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Create</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
