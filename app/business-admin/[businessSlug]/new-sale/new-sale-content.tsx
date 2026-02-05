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
import { 
  ShoppingCart, Plus, Trash2, Package, Store, User, CreditCard, 
  Banknote, Clock, ChevronRight, Search, X, Check, Sparkles,
  ArrowLeft, Receipt, Wallet, Calendar, Users
} from "lucide-react"

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
  "Greater Accra", "Ashanti", "Central", "Eastern", "Northern", "Western",
  "Volta", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo",
  "Western North", "Oti", "North East", "Savannah",
]

const ID_TYPES = ["Ghana Card", "Voter ID", "Passport", "Driver's License", "NHIS Card", "SSNIT Card"]

export function NewSaleContent({ businessSlug, shops }: NewSaleContentProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingShopData, setLoadingShopData] = useState(false)

  // Current step (1: Shop, 2: Type & Customer, 3: Products, 4: Review)
  const [currentStep, setCurrentStep] = useState(1)

  // Shop selection
  const [selectedShopSlug, setSelectedShopSlug] = useState("")
  const [products, setProducts] = useState<ProductForBusinessSale[]>([])
  const [customers, setCustomers] = useState<CustomerForBusinessSale[]>([])
  const [collectors, setCollectors] = useState<CollectorForBusinessSale[]>([])

  // Search states
  const [productSearch, setProductSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")

  // Form state
  const [customerId, setCustomerId] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
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

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const selectedShop = shops.find((s) => s.shopSlug === selectedShopSlug)

  // Filter products and customers based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.categoryName?.toLowerCase().includes(productSearch.toLowerCase())
  )
  
  const filteredCustomers = customers.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  )

  // Load shop data when shop is selected
  useEffect(() => {
    if (selectedShopSlug) {
      setLoadingShopData(true)
      setCart([])
      setCustomerId("")
      
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
  const handleAddToCart = (product: ProductForBusinessSale) => {
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
        categoryName: product.categoryName || null,
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
    if (!selectedShopSlug || cart.length === 0 || !customerId) return
    
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
      downPayment: purchaseType === "CASH" ? subtotal : downPaymentNum,
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
    setNewFirstName(""); setNewLastName(""); setNewPhone(""); setNewEmail("")
    setNewIdType(""); setNewIdNumber(""); setNewAddress(""); setNewCity("")
    setNewRegion(""); setNewPreferredPayment("BOTH"); setNewAssignedCollectorId(""); setNewNotes("")
  }

  const canProceedToStep2 = selectedShopSlug && !loadingShopData
  const canProceedToStep3 = canProceedToStep2 && customerId
  const canProceedToStep4 = canProceedToStep3 && cart.length > 0

  const steps = [
    { num: 1, label: "Shop", icon: Store },
    { num: 2, label: "Customer", icon: User },
    { num: 3, label: "Products", icon: Package },
    { num: 4, label: "Checkout", icon: Receipt },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              New Sale
            </h1>
            <p className="text-slate-400 mt-1">Create a new hire purchase sale</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <button
                onClick={() => {
                  if (step.num === 1) setCurrentStep(1)
                  else if (step.num === 2 && canProceedToStep2) setCurrentStep(2)
                  else if (step.num === 3 && canProceedToStep3) setCurrentStep(3)
                  else if (step.num === 4 && canProceedToStep4) setCurrentStep(4)
                }}
                disabled={
                  (step.num === 2 && !canProceedToStep2) ||
                  (step.num === 3 && !canProceedToStep3) ||
                  (step.num === 4 && !canProceedToStep4)
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  currentStep === step.num
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : currentStep > step.num
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "text-slate-500 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  currentStep === step.num
                    ? "bg-cyan-500/30"
                    : currentStep > step.num
                    ? "bg-green-500/30"
                    : "bg-white/5"
                }`}>
                  {currentStep > step.num ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span className="hidden sm:block font-medium">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 text-slate-600 mx-2 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Shop Selection */}
          {currentStep === 1 && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Store className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Select Shop</h2>
                  <p className="text-sm text-slate-400">Choose which shop this sale is for</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shops.map((shop) => (
                  <button
                    key={shop.shopSlug}
                    onClick={() => {
                      setSelectedShopSlug(shop.shopSlug)
                      setCurrentStep(2)
                    }}
                    className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                      selectedShopSlug === shop.shopSlug
                        ? "bg-cyan-500/20 border-cyan-500/50"
                        : "bg-white/5 border-white/10 hover:border-cyan-500/30 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        selectedShopSlug === shop.shopSlug
                          ? "bg-cyan-500/30"
                          : "bg-white/10"
                      }`}>
                        <Store className={`w-7 h-7 ${
                          selectedShopSlug === shop.shopSlug ? "text-cyan-400" : "text-slate-400"
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-lg">{shop.name}</p>
                        <p className="text-sm text-slate-400">{shop.shopSlug}</p>
                      </div>
                    </div>
                    {selectedShopSlug === shop.shopSlug && (
                      <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm">
                        <Check className="w-4 h-4" />
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Purchase Type & Customer */}
          {currentStep === 2 && (
            <>
              {loadingShopData ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <div className="animate-spin w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-slate-400">Loading shop data...</p>
                </div>
              ) : (
                <>
                  {/* Purchase Type */}
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-violet-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">Payment Type</h2>
                        <p className="text-sm text-slate-400">How will the customer pay?</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { type: "CASH" as const, label: "Cash", desc: "Full payment now", icon: Banknote, color: "emerald" },
                        { type: "LAYAWAY" as const, label: "Layaway", desc: "Pay before delivery", icon: Clock, color: "amber" },
                        { type: "CREDIT" as const, label: "Credit", desc: "Buy now, pay later", icon: CreditCard, color: "violet" },
                      ].map((option) => (
                        <button
                          key={option.type}
                          onClick={() => setPurchaseType(option.type)}
                          className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                            purchaseType === option.type
                              ? option.color === "emerald" ? "bg-emerald-500/20 border-emerald-500/50"
                                : option.color === "amber" ? "bg-amber-500/20 border-amber-500/50"
                                : "bg-violet-500/20 border-violet-500/50"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <option.icon className={`w-8 h-8 mx-auto mb-2 ${
                            purchaseType === option.type
                              ? option.color === "emerald" ? "text-emerald-400"
                                : option.color === "amber" ? "text-amber-400"
                                : "text-violet-400"
                              : "text-slate-400"
                          }`} />
                          <p className="font-semibold text-white">{option.label}</p>
                          <p className="text-xs text-slate-400 mt-1">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer Selection */}
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center">
                          <User className="w-6 h-6 text-pink-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Select Customer</h2>
                          <p className="text-sm text-slate-400">{customers.length} customers available</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowNewCustomer(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 text-pink-400 rounded-xl hover:bg-pink-500/30 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        New Customer
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                    </div>

                    {/* Customer List */}
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No customers found</p>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setCustomerId(c.id)}
                            className={`w-full p-4 rounded-xl text-left transition-all ${
                              customerId === c.id
                                ? "bg-cyan-500/20 border-2 border-cyan-500/50"
                                : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold ${
                                customerId === c.id
                                  ? "bg-cyan-500/30 text-cyan-400"
                                  : "bg-white/10 text-slate-400"
                              }`}>
                                {c.firstName[0]}{c.lastName[0]}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-white">{c.firstName} {c.lastName}</p>
                                <p className="text-sm text-slate-400">{c.phone}</p>
                              </div>
                              {customerId === c.id && (
                                <Check className="w-5 h-5 text-cyan-400" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Continue Button */}
                    <button
                      onClick={() => setCurrentStep(3)}
                      disabled={!customerId}
                      className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Continue to Products
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 3: Product Selection */}
          {currentStep === 3 && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                    <Package className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Add Products</h2>
                    <p className="text-sm text-slate-400">{filteredProducts.length} products in stock</p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No products found</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const inCart = cart.find(i => i.productId === product.id)
                    const price = getProductPrice(product)
                    
                    return (
                      <div
                        key={product.id}
                        className={`p-4 rounded-xl border transition-all ${
                          inCart
                            ? "bg-cyan-500/10 border-cyan-500/30"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-white">{product.name}</p>
                            {product.categoryName && (
                              <p className="text-xs text-slate-400">{product.categoryName}</p>
                            )}
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-slate-400">
                            {product.stockQuantity} left
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-cyan-400">GH₵{price.toLocaleString()}</p>
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQuantity(product.id, inCart.quantity - 1)}
                                className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-white font-medium">{inCart.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(product.id, inCart.quantity + 1)}
                                className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm font-medium"
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

              {/* Continue Button */}
              <button
                onClick={() => setCurrentStep(4)}
                disabled={cart.length === 0}
                className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue to Checkout
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 4: Review & Checkout */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Cart Review */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Cart Items</h2>
                    <p className="text-sm text-slate-400">{cartItemCount} items</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.productName}</p>
                          <p className="text-sm text-slate-400">{item.quantity} × GH₵{item.unitPrice.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold text-cyan-400">GH₵{item.totalPrice.toLocaleString()}</p>
                        <button
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Terms (for non-CASH) */}
              {purchaseType !== "CASH" && (
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Payment Terms</h2>
                      <p className="text-sm text-slate-400">Set down payment and duration</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Down Payment</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">GH₵</span>
                        <input
                          type="number"
                          min="0"
                          max={subtotal}
                          value={downPayment}
                          onChange={(e) => setDownPayment(e.target.value)}
                          placeholder="0"
                          className="w-full pl-14 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Payment Duration</label>
                      <select
                        value={tenorDays}
                        onChange={(e) => setTenorDays(parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      >
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                        <option value={120}>120 days</option>
                        <option value={180}>180 days</option>
                        <option value={365}>365 days</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Sale Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Sale
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-cyan-400" />
              Order Summary
            </h3>

            {/* Shop */}
            {selectedShop && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-3">
                <Store className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-400">Shop</p>
                  <p className="text-white font-medium">{selectedShop.name}</p>
                </div>
              </div>
            )}

            {/* Customer */}
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-3">
                <User className="w-5 h-5 text-pink-400" />
                <div>
                  <p className="text-xs text-slate-400">Customer</p>
                  <p className="text-white font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                </div>
              </div>
            )}

            {/* Purchase Type */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
              {purchaseType === "CASH" ? <Banknote className="w-5 h-5 text-emerald-400" /> 
                : purchaseType === "LAYAWAY" ? <Clock className="w-5 h-5 text-amber-400" />
                : <CreditCard className="w-5 h-5 text-violet-400" />}
              <div>
                <p className="text-xs text-slate-400">Payment Type</p>
                <p className={`font-medium ${
                  purchaseType === "CASH" ? "text-emerald-400" 
                    : purchaseType === "LAYAWAY" ? "text-amber-400" 
                    : "text-violet-400"
                }`}>{purchaseType}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-4" />

            {/* Cart Items */}
            {cart.length > 0 && (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-slate-400">{item.productName} × {item.quantity}</span>
                    <span className="text-white">GH₵{item.totalPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white font-medium">GH₵{subtotal.toLocaleString()}</span>
              </div>
              {purchaseType !== "CASH" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Down Payment</span>
                    <span className="text-green-400">-GH₵{downPaymentNum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-white/10">
                    <span className="text-slate-300">Balance Due</span>
                    <span className="text-amber-400">GH₵{remaining.toLocaleString()}</span>
                  </div>
                </>
              )}
              {purchaseType === "CASH" && (
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-white/10">
                  <span className="text-slate-300">Total</span>
                  <span className="text-emerald-400">GH₵{subtotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">New Customer</h3>
                    <p className="text-sm text-slate-400">Add a new customer to {selectedShop?.name}</p>
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

            <form onSubmit={handleNewCustomer} className="p-6 space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                    <input type="text" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} required
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                    <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} required
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Phone *</label>
                    <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Email</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">ID Type</label>
                    <select value={newIdType} onChange={(e) => setNewIdType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                      <option value="">Select ID Type</option>
                      {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">ID Number</label>
                    <input type="text" value={newIdNumber} onChange={(e) => setNewIdNumber(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                  <Store className="w-4 h-4" /> Address
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <input type="text" placeholder="Street Address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                  </div>
                  <input type="text" placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
                  <select value={newRegion} onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                    <option value="">Select Region</option>
                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Payment Preferences
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <select value={newPreferredPayment} onChange={(e) => setNewPreferredPayment(e.target.value as "ONLINE" | "DEBT_COLLECTOR" | "BOTH")}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                    <option value="BOTH">Both Online & Collector</option>
                    <option value="ONLINE">Online Only</option>
                    <option value="DEBT_COLLECTOR">Collector Only</option>
                  </select>
                  <select value={newAssignedCollectorId} onChange={(e) => setNewAssignedCollectorId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                    <option value="">No Collector Assigned</option>
                    {collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <textarea placeholder="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewCustomer(false)}
                  className="flex-1 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={newCustomerLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {newCustomerLoading ? (
                    <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Creating...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Create Customer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}
