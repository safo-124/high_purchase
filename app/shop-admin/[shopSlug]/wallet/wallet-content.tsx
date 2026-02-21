"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createWalletDeposit,
  getCustomerWalletTransactions,
  shopAdminConfirmDeposit,
  type CustomerForWallet,
  type WalletTransactionData,
} from "../../wallet-actions"

// Define PaymentMethod locally to avoid importing from Prisma in client component
type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD"

interface ShopWalletContentProps {
  shopSlug: string
  customers: CustomerForWallet[]
  canLoadWallet: boolean
  pendingDeposits: WalletTransactionData[]
  isShopAdmin: boolean
}

type Tab = "load" | "pending" | "history"

export function ShopWalletContent({
  shopSlug,
  customers,
  canLoadWallet,
  pendingDeposits,
  isShopAdmin,
}: ShopWalletContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>("load")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Load wallet form
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerForWallet | null>(null)
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [reference, setReference] = useState("")
  const [description, setDescription] = useState("")
  
  // Customer transaction history
  const [viewingCustomer, setViewingCustomer] = useState<CustomerForWallet | null>(null)
  const [customerTransactions, setCustomerTransactions] = useState<WalletTransactionData[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  
  // Pending search
  const [pendingSearchQuery, setPendingSearchQuery] = useState("")
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleLoadWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !amount) return

    const depositAmount = parseFloat(amount)
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    startTransition(async () => {
      const result = await createWalletDeposit(
        shopSlug,
        selectedCustomer.id,
        depositAmount,
        paymentMethod,
        reference || undefined,
        description || undefined
      )

      if (!result.success) {
        setError(result.error || "Failed to create deposit")
      } else {
        setSuccess(`Deposit of ${formatCurrency(depositAmount)} for ${selectedCustomer.firstName} ${selectedCustomer.lastName} submitted for confirmation`)
        setSelectedCustomer(null)
        setAmount("")
        setReference("")
        setDescription("")
        router.refresh()
      }
    })
  }

  const handleViewHistory = async (customer: CustomerForWallet) => {
    setViewingCustomer(customer)
    setLoadingTransactions(true)
    
    const transactions = await getCustomerWalletTransactions(shopSlug, customer.id)
    setCustomerTransactions(transactions)
    setLoadingTransactions(false)
  }

  const handleConfirmDeposit = async (transactionId: string) => {
    startTransition(async () => {
      const result = await shopAdminConfirmDeposit(shopSlug, transactionId)
      if (!result.success) {
        setError(result.error || "Failed to confirm deposit")
      } else {
        setSuccess("Deposit confirmed successfully")
        router.refresh()
      }
    })
  }

  const handleConfirmAll = async (transactionIds: string[]) => {
    if (!confirm(`Are you sure you want to confirm ${transactionIds.length} deposit${transactionIds.length !== 1 ? "s" : ""}? This action cannot be undone.`)) return
    startTransition(async () => {
      let confirmed = 0
      let failed = 0
      for (const id of transactionIds) {
        const result = await shopAdminConfirmDeposit(shopSlug, id)
        if (result.success) {
          confirmed++
        } else {
          failed++
        }
      }
      if (failed > 0) {
        setError(`${failed} deposit${failed !== 1 ? "s" : ""} failed to confirm`)
      }
      if (confirmed > 0) {
        setSuccess(`${confirmed} deposit${confirmed !== 1 ? "s" : ""} confirmed successfully`)
      }
      router.refresh()
    })
  }

  const filteredCustomers = customers.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs = [
    { id: "load" as Tab, label: "Load Wallet", disabled: !canLoadWallet },
    { id: "pending" as Tab, label: "Pending", count: pendingDeposits.length },
    { id: "history" as Tab, label: "Customer History" },
  ]

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* No Access Warning */}
      {!canLoadWallet && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You don&apos;t have permission to load customer wallets. Contact your business admin.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : tab.disabled
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-emerald-500/30" : "bg-white/10"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Load Wallet Tab */}
      {activeTab === "load" && canLoadWallet && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Customer</h3>
            
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedCustomer?.id === c.id
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{c.firstName} {c.lastName}</p>
                      <p className="text-sm text-slate-400">{c.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${c.walletBalance > 0 ? "text-green-400" : "text-slate-500"}`}>
                        {formatCurrency(c.walletBalance)}
                      </p>
                      {c.pendingDeposits > 0 && (
                        <p className="text-xs text-amber-400">+{formatCurrency(c.pendingDeposits)} pending</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredCustomers.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No customers found
                </div>
              )}
            </div>
          </div>

          {/* Deposit Form */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Load Wallet</h3>
            
            {selectedCustomer ? (
              <form onSubmit={handleLoadWallet} className="space-y-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <p className="text-sm text-emerald-400">Loading wallet for:</p>
                  <p className="font-semibold text-white">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                  <p className="text-sm text-slate-400">Current balance: {formatCurrency(selectedCustomer.walletBalance)}</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Amount (GHS) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Reference (optional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Transaction reference..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Note about this deposit..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {amount && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-sm text-slate-400">
                      New balance after confirmation:{" "}
                      <span className="font-bold text-green-400">
                        {formatCurrency(selectedCustomer.walletBalance + (parseFloat(amount) || 0))}
                      </span>
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !amount}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50"
                  >
                    {isPending ? "Submitting..." : "Submit Deposit"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Deposits require confirmation from shop admin or business admin
                </p>
              </form>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-slate-400">Select a customer to load their wallet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Deposits Tab */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by customer name or collector..."
              value={pendingSearchQuery}
              onChange={(e) => setPendingSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {pendingSearchQuery && (
              <button
                onClick={() => setPendingSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtered Summary */}
          {(() => {
            const q = pendingSearchQuery.toLowerCase()
            const filtered = q
              ? pendingDeposits.filter(
                  (t) =>
                    t.customerName.toLowerCase().includes(q) ||
                    t.createdByName.toLowerCase().includes(q)
                )
              : pendingDeposits
            const filteredTotal = filtered.reduce((sum, t) => sum + t.amount, 0)

            // Group by collector for summary
            const collectorTotals = new Map<string, { count: number; total: number }>()
            for (const t of filtered) {
              const existing = collectorTotals.get(t.createdByName)
              if (existing) {
                existing.count++
                existing.total += t.amount
              } else {
                collectorTotals.set(t.createdByName, { count: 1, total: t.amount })
              }
            }

            return (
              <>
                {/* Summary Bar */}
                {filtered.length > 0 && (
                  <div className="glass-card rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">
                            {pendingSearchQuery ? "Filtered" : "Total"} Pending
                          </p>
                          <p className="text-xl font-bold text-amber-400">
                            {formatCurrency(filteredTotal)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">{filtered.length} deposit{filtered.length !== 1 ? "s" : ""}</span>
                        <span className="text-white/10">|</span>
                        <span className="text-sm text-slate-400">{collectorTotals.size} staff</span>
                        {isShopAdmin && filtered.length > 1 && (
                          <button
                            onClick={() => handleConfirmAll(filtered.map(t => t.id))}
                            disabled={isPending}
                            className="ml-2 px-4 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {isPending ? "Confirming..." : `Confirm All (${filtered.length})`}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collector breakdown when searching */}
                    {pendingSearchQuery && collectorTotals.size > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                        {Array.from(collectorTotals.entries()).map(([name, data]) => (
                          <div key={name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 text-xs font-semibold flex-shrink-0">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-slate-300">{name}</span>
                              <span className="text-xs text-slate-500">({data.count} deposit{data.count !== 1 ? "s" : ""})</span>
                            </div>
                            <span className="font-semibold text-amber-400">{formatCurrency(data.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pending list */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {pendingSearchQuery ? "No matches found" : "All caught up!"}
                      </h3>
                      <p className="text-slate-400">
                        {pendingSearchQuery
                          ? `No pending deposits match "${pendingSearchQuery}"`
                          : "No pending deposits to confirm"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filtered.map((t) => (
                        <div key={t.id} className="p-4 hover:bg-white/[0.02]">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-white">{t.customerName}</h4>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                    Pending
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                  <span>By: {t.createdByName}</span>
                                  <span>{formatDate(t.createdAt)}</span>
                                  {t.reference && <span>Ref: {t.reference}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-400">{formatCurrency(t.amount)}</p>
                                <p className="text-xs text-slate-500">{t.paymentMethod?.replace("_", " ")}</p>
                              </div>
                              {isShopAdmin && (
                                <button
                                  onClick={() => handleConfirmDeposit(t.id)}
                                  disabled={isPending}
                                  className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 font-medium text-sm transition-all disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Customer History Tab */}
      {activeTab === "history" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer List */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Customer</h3>
            
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleViewHistory(c)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    viewingCustomer?.id === c.id
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{c.firstName} {c.lastName}</p>
                      <p className="text-sm text-slate-400">{c.phone}</p>
                    </div>
                    <p className={`font-semibold ${c.walletBalance > 0 ? "text-green-400" : "text-slate-500"}`}>
                      {formatCurrency(c.walletBalance)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
            
            {viewingCustomer ? (
              loadingTransactions ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading transactions...</p>
                </div>
              ) : customerTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">No transactions found for this customer</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {customerTransactions.map((t) => (
                    <div key={t.id} className="p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.type === "DEPOSIT" ? "bg-green-500/20 text-green-400" :
                          t.type === "PURCHASE" ? "bg-blue-500/20 text-blue-400" :
                          t.type === "ADJUSTMENT" ? "bg-purple-500/20 text-purple-400" :
                          "bg-cyan-500/20 text-cyan-400"
                        }`}>
                          {t.type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.status === "CONFIRMED" ? "bg-green-500/20 text-green-400" :
                          t.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                          {t.description && (
                            <p className="text-xs text-slate-400 mt-1">{t.description}</p>
                          )}
                        </div>
                        <p className={`font-semibold ${
                          t.type === "PURCHASE" ? "text-red-400" : "text-green-400"
                        }`}>
                          {t.type === "PURCHASE" ? "-" : "+"}{formatCurrency(t.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-400">Select a customer to view their transaction history</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
