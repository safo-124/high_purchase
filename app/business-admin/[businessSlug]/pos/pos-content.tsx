"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createPosTransaction, toggleStaffPosAccess } from "../../actions"

interface Product {
  id: string
  name: string
  cashPrice: number
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
}

interface Shop {
  id: string
  name: string
  shopSlug: string
}

interface StaffMember {
  id: string
  userId: string
  userName: string
  userEmail: string
  shopName: string
  posAccess: boolean
}

interface Transaction {
  id: string
  transactionNo: string
  customerName: string | null
  totalAmount: number
  paymentMethod: string
  cashierName: string
  itemCount: number
  createdAt: Date
}

interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface PosContentProps {
  businessSlug: string
  products: Product[]
  shops: Shop[]
  staffWithPosAccess: StaffMember[]
  todayTransactions: Transaction[]
  currentUserId: string
}

export function PosContent({
  businessSlug,
  products,
  shops,
  staffWithPosAccess,
  todayTransactions,
}: PosContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<"pos" | "transactions" | "staff">("pos")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MOBILE_MONEY" | "CARD">("CASH")
  const [amountPaid, setAmountPaid] = useState("")
  const [selectedShop, setSelectedShop] = useState(shops[0]?.id || "")

  // Get unique categories
  const categories = products.reduce((acc, p) => {
    if (p.categoryId && p.categoryName && !acc.find(c => c.id === p.categoryId)) {
      acc.push({ id: p.categoryId, name: p.categoryName, color: p.categoryColor || "#6366f1" })
    }
    return acc
  }, [] as { id: string; name: string; color: string }[])

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  const total = subtotal
  const change = Number(amountPaid) - total
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleAddToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.productId === product.id)
    
    if (existingIndex >= 0) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      newCart[existingIndex].totalPrice = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice
      setCart(newCart)
      toast.success(`Added another ${product.name}`)
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.cashPrice,
        totalPrice: product.cashPrice,
      }])
      toast.success(`${product.name} added to cart`)
    }
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId))
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
          : item
      ))
    }
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const handleClearCart = () => {
    setCart([])
    setCustomerName("")
    setCustomerPhone("")
    setAmountPaid("")
  }

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    if (!selectedShop) {
      toast.error("Please select a shop")
      return
    }

    if (Number(amountPaid) < total) {
      toast.error("Amount paid is less than total")
      return
    }

    startTransition(async () => {
      const result = await createPosTransaction(businessSlug, {
        shopId: selectedShop,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        items: cart,
        paymentMethod,
        amountPaid: Number(amountPaid),
      })

      if (result.success) {
        toast.success("Sale completed successfully!")
        handleClearCart()
        router.refresh()
      } else {
        toast.error(result.error || "Failed to complete sale")
      }
    })
  }

  const handleTogglePosAccess = (memberId: string, currentAccess: boolean) => {
    startTransition(async () => {
      const result = await toggleStaffPosAccess(businessSlug, memberId, !currentAccess)
      if (result.success) {
        toast.success(`POS access ${!currentAccess ? "granted" : "revoked"}`)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update POS access")
      }
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  // Today's summary
  const todaySales = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0)
  const todayCount = todayTransactions.length

  // Quick amounts for cash
  const quickAmounts = [5, 10, 20, 50, 100, 200]

  return (
    <div className="h-[calc(100vh-180px)]">
      {/* Tab Navigation & Stats Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Tabs */}
        <div className="flex bg-slate-800/50 rounded-xl p-1 border border-white/5">
          {(["pos", "transactions", "staff"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab
                  ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab === "pos" && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Terminal
                </span>
              )}
              {tab === "transactions" && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Sales ({todayCount})
                </span>
              )}
              {tab === "staff" && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Access
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400">Today</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-xs text-slate-500">{todayCount} sales</p>
              <p className="text-sm font-bold text-emerald-400">{formatCurrency(todaySales)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* POS Terminal */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
          {/* Products Section - 3 cols */}
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
            {/* Search & Shop Selection */}
            <div className="flex gap-3">
              {/* Shop Dropdown */}
              <div className="relative">
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="appearance-none h-12 pl-4 pr-10 bg-slate-800/80 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-800/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === "all"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700/80"
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? "text-white shadow-lg"
                      : "bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700/80"
                  }`}
                  style={{ 
                    backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                    boxShadow: selectedCategory === cat.id ? `0 10px 25px -5px ${cat.color}40` : undefined
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCategory !== cat.id ? cat.color : "white" }} />
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-medium">No products found</p>
                  <p className="text-sm text-slate-500">Try a different search or category</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find(item => item.productId === product.id)
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        className={`relative group p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                          inCart 
                            ? "bg-emerald-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10" 
                            : "bg-slate-800/60 border border-white/5 hover:bg-slate-800/90 hover:border-white/10"
                        }`}
                      >
                        {/* Category Color Bar */}
                        <div 
                          className="absolute top-0 left-4 right-4 h-1 rounded-b-full opacity-60"
                          style={{ backgroundColor: product.categoryColor || "#6366f1" }}
                        />
                        
                        {/* In Cart Badge */}
                        {inCart && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                            {inCart.quantity}
                          </div>
                        )}

                        {/* Product Icon */}
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                          style={{ backgroundColor: `${product.categoryColor || "#6366f1"}20` }}
                        >
                          <svg 
                            className="w-6 h-6" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                            style={{ color: product.categoryColor || "#6366f1" }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>

                        {/* Product Info */}
                        <p className="text-sm font-medium text-white truncate mb-1 group-hover:text-emerald-400 transition-colors">
                          {product.name}
                        </p>
                        <p className="text-lg font-bold text-emerald-400">
                          {formatCurrency(product.cashPrice)}
                        </p>

                        {/* Add Hover Effect */}
                        <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 rounded-2xl transition-all">
                          <div className="opacity-0 group-hover:opacity-100 absolute bottom-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-all transform scale-0 group-hover:scale-100">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart Section - 2 cols */}
          <div className="lg:col-span-2 flex flex-col bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden h-[calc(100vh-300px)]">
            {/* Cart Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Current Sale</h3>
                  <p className="text-xs text-slate-400">{totalItems} items</p>
                </div>
              </div>
              {cart.length > 0 && (
                <button 
                  onClick={handleClearCart}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-medium">Cart is empty</p>
                  <p className="text-sm text-slate-500">Add products to start a sale</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl group hover:bg-slate-700/50 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.productName}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-400 shrink-0">
                      {formatCurrency(item.totalPrice)}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-600/50 text-white hover:bg-red-500/30 hover:text-red-400 transition-all flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-7 text-center text-white font-medium text-sm">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-600/50 text-white hover:bg-emerald-500/30 hover:text-emerald-400 transition-all flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer & Payment Section */}
            <div className="p-4 border-t border-white/10 space-y-3 bg-slate-900/30">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-3 py-2 bg-slate-700/50 border border-white/5 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="px-3 py-2 bg-slate-700/50 border border-white/5 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Payment Method Pills */}
              <div className="flex gap-2">
                {(["CASH", "MOBILE_MONEY", "CARD"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === method
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {method === "CASH" && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {method === "CARD" && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    )}
                    {method === "MOBILE_MONEY" && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {method.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Quick Amount Buttons for Cash */}
              {paymentMethod === "CASH" && (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setAmountPaid(String(amount))}
                        className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-emerald-500/20 hover:text-emerald-400 transition-all"
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                    <button
                      onClick={() => setAmountPaid(String(total))}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all"
                    >
                      Exact
                    </button>
                  </div>
                </div>
              )}

              {/* Amount Paid Input */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-slate-700/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="Amount Paid"
                  />
                </div>
                {Number(amountPaid) > 0 && Number(amountPaid) >= total && (
                  <div className="px-4 py-2.5 bg-emerald-500/20 rounded-xl">
                    <p className="text-xs text-slate-400">Change</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(change)}</p>
                  </div>
                )}
              </div>

              {/* Totals & Complete Sale */}
              <div className="flex items-center justify-between py-3 border-t border-white/10">
                <div>
                  <p className="text-xs text-slate-400">Total Amount</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(total)}</p>
                </div>
                <button
                  onClick={handleCompleteSale}
                  disabled={isPending || cart.length === 0 || Number(amountPaid) < total}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Complete Sale
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Transactions */}
      {activeTab === "transactions" && (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Today&apos;s Transactions</h3>
                <p className="text-sm text-slate-400">{todayTransactions.length} transactions completed</p>
              </div>
            </div>
          </div>
          {todayTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">No transactions today</p>
              <p className="text-sm text-slate-500">Complete a sale to see it here</p>
            </div>
          ) : (
            <div className="p-4 grid gap-3 max-h-[600px] overflow-y-auto">
              {todayTransactions.map((t) => (
                <div key={t.id} className="p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-mono text-white">{t.transactionNo}</p>
                        <p className="text-xs text-slate-400">{formatTime(t.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(t.totalAmount)}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t.customerName || "Walk-in"}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {t.itemCount} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        {t.paymentMethod.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500">by {t.cashierName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staff POS Access */}
      {activeTab === "staff" && (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Staff POS Access</h3>
                <p className="text-sm text-slate-400">
                  {staffWithPosAccess.filter(s => s.posAccess).length} of {staffWithPosAccess.length} staff members have access
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
              <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-300">
                Click the toggle to grant or revoke POS access for each staff member.
                <br/>
                <span className="text-blue-400/70">Staff with POS access can process sales from their assigned shops.</span>
              </p>
            </div>
            
            {staffWithPosAccess.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-slate-400 font-medium">No staff members found</p>
                <p className="text-sm text-slate-500 mt-1">Add staff members in Staff Management first</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {staffWithPosAccess.map((staff) => (
                  <div 
                    key={staff.id} 
                    className={`p-4 rounded-xl transition-all ${
                      staff.posAccess 
                        ? "bg-emerald-500/10 border border-emerald-500/30" 
                        : "bg-slate-700/30 hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        staff.posAccess 
                          ? "bg-gradient-to-br from-emerald-500 to-green-500" 
                          : "bg-gradient-to-br from-slate-500 to-slate-600"
                      }`}>
                        {staff.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{staff.userName}</p>
                        <p className="text-sm text-slate-400 truncate">{staff.userEmail}</p>
                      </div>
                      {/* Status Badge */}
                      {staff.posAccess && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {staff.shopName}
                      </span>
                      <button
                        onClick={() => handleTogglePosAccess(staff.id, staff.posAccess)}
                        disabled={isPending}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-2 ${
                          staff.posAccess
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        }`}
                      >
                        {staff.posAccess ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Revoke
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
