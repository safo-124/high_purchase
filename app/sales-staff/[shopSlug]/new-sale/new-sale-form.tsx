"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProductForSale, CustomerForSale, createSale, createQuickCustomer } from "../../actions"
import { toast } from "sonner"

interface NewSaleFormProps {
  shopSlug: string
  products: ProductForSale[]
  customers: CustomerForSale[]
}

export function NewSaleForm({ shopSlug, products, customers: initialCustomers }: NewSaleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState(initialCustomers)

  // Form state
  const [customerId, setCustomerId] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [downPayment, setDownPayment] = useState("")
  const [tenorDays, setTenorDays] = useState(30)

  // New customer modal
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerLoading, setNewCustomerLoading] = useState(false)
  const [newFirstName, setNewFirstName] = useState("")
  const [newLastName, setNewLastName] = useState("")
  const [newPhone, setNewPhone] = useState("")

  const selectedProduct = products.find((p) => p.id === productId)
  const selectedCustomer = customers.find((c) => c.id === customerId)

  // Calculate totals (simplified - actual calculation uses server policy)
  const unitPrice = selectedProduct?.price || 0
  const subtotal = unitPrice * quantity
  const downPaymentNum = parseFloat(downPayment) || 0
  const remaining = Math.max(0, subtotal - downPaymentNum)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await createSale(shopSlug, {
      customerId,
      productId,
      quantity,
      downPayment: downPaymentNum,
      tenorDays,
    })

    if (result.success) {
      toast.success("Sale created successfully!")
      router.push(`/sales-staff/${shopSlug}/dashboard`)
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
        email: null,
      }])
      
      // Select the new customer
      setCustomerId(data.id)
      
      // Close modal
      setShowNewCustomer(false)
      setNewFirstName("")
      setNewLastName("")
      setNewPhone("")
    } else {
      toast.error(result.error || "Failed to create customer")
    }

    setNewCustomerLoading(false)
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
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Product
          </h2>
          
          <div className="space-y-4">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            >
              <option value="" className="bg-slate-900">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.name} — GHS {p.price.toLocaleString()} ({p.stockQuantity} in stock)
                </option>
              ))}
            </select>

            {selectedProduct && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{selectedProduct.name}</p>
                    {selectedProduct.categoryName && (
                      <p className="text-xs text-slate-400">{selectedProduct.categoryName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-400">GHS {selectedProduct.price.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{selectedProduct.stockQuantity} available</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">Quantity</label>
              <input
                type="number"
                min={1}
                max={selectedProduct?.stockQuantity || 999}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>
        </div>

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
        {selectedProduct && (
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20">
            <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>{selectedProduct.name} × {quantity}</span>
                <span>GHS {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Down Payment</span>
                <span className="text-green-400">- GHS {downPaymentNum.toLocaleString()}</span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-white">Amount to Finance</span>
                <span className="text-indigo-400">GHS {remaining.toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                * Final amount may include interest based on shop policy
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !customerId || !productId}
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
            onClick={() => setShowNewCustomer(false)}
          />
          
          <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Customer</h3>
            
            <form onSubmit={handleNewCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-1 block">First Name *</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    placeholder="Kwame"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-1 block">Last Name *</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                    placeholder="Asante"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-200 mb-1 block">Phone Number *</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  placeholder="0244123456"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCustomerLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium disabled:opacity-50 transition-all"
                >
                  {newCustomerLoading ? "Adding..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
