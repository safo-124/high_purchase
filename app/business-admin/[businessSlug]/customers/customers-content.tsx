"use client"

import { useState, useTransition } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { recordPaymentAsBusinessAdmin, getBusinessCustomerPurchases } from "../../actions"

interface Customer {
  id: string
  fullName: string
  phone: string
  idType: string | null
  idNumber: string | null
  createdAt: Date
  shopName: string
  shopSlug: string
  totalPurchases: number
  activePurchases: number
  totalPurchased: number
  totalPaid: number
  outstanding: number
}

interface Shop {
  name: string
  shopSlug: string
}

interface Purchase {
  id: string
  purchaseNumber: string
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  status: string
  items: { productName: string; quantity: number }[]
}

interface CustomersContentProps {
  customers: Customer[]
  shops: Shop[]
}

export function CustomersContent({ customers, shops }: CustomersContentProps) {
  const router = useRouter()
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cleared">("all")
  const [sortBy, setSortBy] = useState<"name" | "outstanding" | "recent">("name")
  
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean
    customer: Customer | null
    purchases: Purchase[]
    loading: boolean
  }>({ open: false, customer: null, purchases: [], loading: false })
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD">("CASH")
  const [paymentReference, setPaymentReference] = useState("")

  const openPaymentModal = async (customer: Customer) => {
    setPaymentModal({ open: true, customer, purchases: [], loading: true })
    setSelectedPurchaseId("")
    setPaymentAmount("")
    setPaymentReference("")
    
    const result = await getBusinessCustomerPurchases(businessSlug, customer.id)
    if (result.success && result.data) {
      setPaymentModal(prev => ({ ...prev, purchases: result.data as Purchase[], loading: false }))
      if (result.data.length > 0) {
        setSelectedPurchaseId(result.data[0].id)
      }
    } else {
      toast.error(result.error || "Failed to load purchases")
      setPaymentModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedPurchaseId || !paymentAmount) {
      toast.error("Please select a purchase and enter an amount")
      return
    }
    
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }
    
    startTransition(async () => {
      const result = await recordPaymentAsBusinessAdmin(businessSlug, {
        purchaseId: selectedPurchaseId,
        amount,
        paymentMethod,
        reference: paymentReference || undefined,
      })
      
      if (result.success) {
        const data = result.data as { awaitingConfirmation?: boolean } | undefined
        if (data?.awaitingConfirmation) {
          toast.success("Payment recorded - awaiting confirmation")
        } else {
          toast.success("Payment recorded and confirmed")
        }
        setPaymentModal({ open: false, customer: null, purchases: [], loading: false })
        router.refresh()
      } else {
        toast.error(result.error || "Failed to record payment")
      }
    })
  }

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      (customer.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone || "").includes(searchQuery) ||
      (customer.idNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesShop = shopFilter === "all" || customer.shopSlug === shopFilter
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && customer.activePurchases > 0) ||
      (statusFilter === "cleared" && customer.outstanding === 0 && customer.totalPurchases > 0)
    
    return matchesSearch && matchesShop && matchesStatus
  })

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case "outstanding":
        return b.outstanding - a.outstanding
      case "recent":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return a.fullName.localeCompare(b.fullName)
    }
  })

  return (
    <div className="glass-card overflow-hidden">
      {/* Search & Filters */}
      <div className="p-6 border-b border-white/5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          {/* Shop Filter */}
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.shopSlug} value={shop.shopSlug}>
                {shop.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["all", "active", "cleared"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {status === "all" ? "All" : status === "active" ? "Active HP" : "Cleared"}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="name">Sort by Name</option>
            <option value="outstanding">Sort by Outstanding</option>
            <option value="recent">Sort by Recent</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
        <p className="text-sm text-slate-400">
          Showing {sortedCustomers.length} of {customers.length} customers
        </p>
      </div>

      {/* Customers Table */}
      {sortedCustomers.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Purchases</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-cyan-300">
                          {(customer.fullName || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{customer.fullName || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{customer.phone || "N/A"}</p>
                        <p className="text-xs text-slate-600">{customer.idType || "ID"}: {customer.idNumber || "N/A"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                      {customer.shopName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{customer.totalPurchases}</p>
                      {customer.activePurchases > 0 && (
                        <p className="text-xs text-cyan-400">{customer.activePurchases} active</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">₵{customer.totalPurchased.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-green-400 font-medium">₵{customer.totalPaid.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`font-medium ${customer.outstanding > 0 ? "text-amber-400" : "text-green-400"}`}>
                      ₵{customer.outstanding.toLocaleString()}
                    </p>
                    {customer.totalPurchased > 0 && (
                      <div className="w-24 h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          style={{ width: `${(customer.totalPaid / customer.totalPurchased) * 100}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {customer.activePurchases > 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Active HP
                      </span>
                    ) : customer.outstanding === 0 && customer.totalPurchases > 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Cleared
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        New
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {customer.outstanding > 0 && (
                      <button
                        onClick={() => openPaymentModal(customer)}
                        className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                        </svg>
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Recording Modal */}
      {paymentModal.open && paymentModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Record Payment</h3>
              <button
                onClick={() => setPaymentModal({ open: false, customer: null, purchases: [], loading: false })}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <p className="text-sm text-slate-400">Customer</p>
              <p className="text-white font-medium">{paymentModal.customer.fullName}</p>
              <p className="text-xs text-slate-500">{paymentModal.customer.phone} • {paymentModal.customer.shopName}</p>
            </div>

            {paymentModal.loading ? (
              <div className="text-center py-8">
                <svg className="w-8 h-8 animate-spin mx-auto text-cyan-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-slate-400 mt-2">Loading purchases...</p>
              </div>
            ) : paymentModal.purchases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No active purchases with outstanding balance</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select Purchase */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Purchase <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedPurchaseId}
                    onChange={(e) => setSelectedPurchaseId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    {paymentModal.purchases.map((purchase) => (
                      <option key={purchase.id} value={purchase.id} className="bg-slate-800">
                        {purchase.purchaseNumber} - Outstanding: ₵{purchase.outstandingBalance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {selectedPurchaseId && (
                    <div className="mt-2 text-xs text-slate-500">
                      {paymentModal.purchases.find(p => p.id === selectedPurchaseId)?.items.map(i => `${i.productName} ×${i.quantity}`).join(", ")}
                    </div>
                  )}
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Amount <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₵</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="CASH" className="bg-slate-800">Cash</option>
                    <option value="MOBILE_MONEY" className="bg-slate-800">Mobile Money</option>
                    <option value="BANK_TRANSFER" className="bg-slate-800">Bank Transfer</option>
                    <option value="CARD" className="bg-slate-800">Card</option>
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, receipt number, etc."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setPaymentModal({ open: false, customer: null, purchases: [], loading: false })}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={isPending || !selectedPurchaseId || !paymentAmount}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Recording..." : "Record Payment"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Payment will be pending confirmation by a shop admin
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
