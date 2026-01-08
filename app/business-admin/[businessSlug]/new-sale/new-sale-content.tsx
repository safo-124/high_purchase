"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  getShopProductsForSale, 
  getShopCustomersForSale, 
  getShopCollectorsForSale,
  createBusinessSale,
  createBusinessCustomer,
  type ProductForBusinessSale,
  type CustomerForBusinessSale,
  type CollectorForBusinessSale,
  type BusinessPurchaseType
} from "../../actions"
import { toast } from "sonner"
import { ShoppingCart, Plus, Trash2, Package, Store } from "lucide-react"

interface Shop {
  id: string
  name: string
  shopSlug: string
}

interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  categoryName: string | null
  stockQuantity: number
}

interface NewSaleContentProps {
  businessSlug: string
  shops: Shop[]
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

export function NewSaleContent({ businessSlug, shops }: NewSaleContentProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingShopData, setLoadingShopData] = useState(false)

  // Shop selection
  const [selectedShopSlug, setSelectedShopSlug] = useState("")
  const [products, setProducts] = useState<ProductForBusinessSale[]>([])
  const [customers, setCustomers] = useState<CustomerForBusinessSale[]>([])
  const [collectors, setCollectors] = useState<CollectorForBusinessSale[]>([])

  // Form state
  const [customerId, setCustomerId] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [downPayment, setDownPayment] = useState("")
  const [tenorDays, setTenorDays] = useState(30)
  const [purchaseType, setPurchaseType] = useState<BusinessPurchaseType>("CREDIT")

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
  const [newPreferredPayment, setNewPreferredPayment] = useState<"ONLINE" | "DEBT_COLLECTOR" | "BOTH">("BOTH")
  const [newAssignedCollectorId, setNewAssignedCollectorId] = useState("")
  const [newNotes, setNewNotes] = useState("")

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const selectedCustomer = customers.find((c) => c.id === customerId)

  // Load shop data when shop is selected
  useEffect(() => {
    if (selectedShopSlug) {
      setLoadingShopData(true)
      setCart([])
      setCustomerId("")
      setSelectedProductId("")
      
      Promise.all([
        getShopProductsForSale(businessSlug, selectedShopSlug),
        getShopCustomersForSale(businessSlug, selectedShopSlug),
        getShopCollectorsForSale(businessSlug, selectedShopSlug),
      ]).then(([prods, custs, colls]) => {
        setProducts(prods.filter(p => p.stockQuantity > 0))
        setCustomers(custs)
        setCollectors(colls)
        setLoadingShopData(false)
      }).catch(() => {
        toast.error("Failed to load shop data")
        setLoadingShopData(false)
      })
    }
  }, [businessSlug, selectedShopSlug])

  // Get the appropriate price based on purchase type
  const getProductPrice = useCallback((product: ProductForBusinessSale): number => {
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

    const existingItem = cart.find(item => item.productId === selectedProductId)
    const currentCartQty = existingItem?.quantity || 0
    const newTotalQty = currentCartQty + quantity

    if (newTotalQty > product.stockQuantity) {
      toast.error(`Only ${product.stockQuantity} units available in stock`)
      return
    }

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
    
    if (!selectedShopSlug) {
      toast.error("Please select a shop")
      return
    }

    if (cart.length === 0) {
      toast.error("Please add at least one product to the cart")
      return
    }

    if (!customerId) {
      toast.error("Please select a customer")
      return
    }
    
    setIsLoading(true)

    const result = await createBusinessSale(businessSlug, {
      shopSlug: selectedShopSlug,
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
      router.push(`/business-admin/${businessSlug}/purchases`)
    } else {
      toast.error(result.error || "Failed to create sale")
    }

    setIsLoading(false)
  }

  const handleNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewCustomerLoading(true)

    const result = await createBusinessCustomer(businessSlug, {
      shopSlug: selectedShopSlug,
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
    setNewPreferredPayment("BOTH")
    setNewAssignedCollectorId("")
    setNewNotes("")
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Selection */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Store className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Select Shop</h2>
              <p className="text-sm text-slate-400">Choose which shop this sale is for</p>
            </div>
          </div>

          <select
            value={selectedShopSlug}
            onChange={(e) => setSelectedShopSlug(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            required
          >
            <option value="">Select a shop...</option>
            {shops.map((shop) => (
              <option key={shop.shopSlug} value={shop.shopSlug}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        {selectedShopSlug && (
          <>
            {loadingShopData ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Loading shop data...</p>
              </div>
            ) : (
              <>
                {/* Purchase Type Selection */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Purchase Type</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {(["CASH", "LAYAWAY", "CREDIT"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPurchaseType(type)}
                        className={`p-4 rounded-xl border transition-all ${
                          purchaseType === type
                            ? type === "CASH"
                              ? "bg-green-500/20 border-green-500/50 text-green-400"
                              : type === "LAYAWAY"
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                              : "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        <p className="font-semibold">{type}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {type === "CASH" ? "Full payment" : type === "LAYAWAY" ? "Pay first, deliver later" : "Installments"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Selection */}
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Customer</h2>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomer(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      New Customer
                    </button>
                  </div>

                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    required
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} - {c.phone}
                      </option>
                    ))}
                  </select>

                  {selectedCustomer && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl">
                      <p className="text-white font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      <p className="text-sm text-slate-400">{selectedCustomer.phone}</p>
                      {selectedCustomer.email && <p className="text-sm text-slate-400">{selectedCustomer.email}</p>}
                    </div>
                  )}
                </div>

                {/* Product Selection (Cart) */}
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Products</h2>
                      <p className="text-sm text-slate-400">Add products to the cart</p>
                    </div>
                  </div>

                  {/* Add Product Row */}
                  <div className="flex gap-3 mb-4">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ₵{getProductPrice(p).toLocaleString()} ({p.stockQuantity} in stock)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct?.stockQuantity || 1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!selectedProductId}
                      className="px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Cart Items */}
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No products added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                        >
                          <div className="flex-1">
                            <p className="text-white font-medium">{item.productName}</p>
                            <p className="text-sm text-slate-400">
                              {item.quantity} × ₵{item.unitPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-semibold text-cyan-400">
                              ₵{item.totalPrice.toLocaleString()}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.productId)}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between items-center pt-4 border-t border-white/10">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-2xl font-bold text-white">₵{subtotal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Terms */}
                {purchaseType !== "CASH" && (
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Payment Terms</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Down Payment (₵)</label>
                        <input
                          type="number"
                          min="0"
                          max={subtotal}
                          value={downPayment}
                          onChange={(e) => setDownPayment(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Tenor (days)</label>
                        <select
                          value={tenorDays}
                          onChange={(e) => setTenorDays(parseInt(e.target.value))}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value={30}>30 days (1 month)</option>
                          <option value={60}>60 days (2 months)</option>
                          <option value={90}>90 days (3 months)</option>
                          <option value={120}>120 days (4 months)</option>
                          <option value={180}>180 days (6 months)</option>
                          <option value={365}>365 days (1 year)</option>
                        </select>
                      </div>
                    </div>

                    {subtotal > 0 && (
                      <div className="mt-4 p-4 bg-white/5 rounded-xl">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Down Payment</span>
                          <span className="text-white">₵{downPaymentNum.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold">
                          <span className="text-slate-400">Remaining Balance</span>
                          <span className="text-amber-400">₵{remaining.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || cart.length === 0 || !customerId}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Complete Sale - ₵{subtotal.toLocaleString()}
                    </>
                  )}
                </button>
              </>
            )}
          </>
        )}
      </form>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Add New Customer</h3>
              <button
                onClick={() => setShowNewCustomer(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleNewCustomer} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">ID Type</label>
                    <select
                      value={newIdType}
                      onChange={(e) => setNewIdType(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Select ID Type</option>
                      {ID_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">ID Number</label>
                    <input
                      type="text"
                      value={newIdNumber}
                      onChange={(e) => setNewIdNumber(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-3">Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Region</label>
                    <select
                      value={newRegion}
                      onChange={(e) => setNewRegion(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Select Region</option>
                      {GHANA_REGIONS.map((region) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Preferences */}
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-3">Payment Preferences</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Preferred Payment</label>
                    <select
                      value={newPreferredPayment}
                      onChange={(e) => setNewPreferredPayment(e.target.value as "ONLINE" | "DEBT_COLLECTOR" | "BOTH")}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="BOTH">Both Online & Collector</option>
                      <option value="ONLINE">Online Only</option>
                      <option value="DEBT_COLLECTOR">Collector Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Assigned Collector</label>
                    <select
                      value={newAssignedCollectorId}
                      onChange={(e) => setNewAssignedCollectorId(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">No Collector Assigned</option>
                      {collectors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="flex-1 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCustomerLoading}
                  className="flex-1 py-3 bg-cyan-500/20 text-cyan-400 font-medium rounded-xl hover:bg-cyan-500/30 transition-all disabled:opacity-50"
                >
                  {newCustomerLoading ? "Creating..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
