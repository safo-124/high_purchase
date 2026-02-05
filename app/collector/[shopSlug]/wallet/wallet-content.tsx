"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  collectorCreateWalletDeposit,
  getCollectorCustomerWalletHistory,
  type CustomerForWallet,
  type WalletTransactionData,
} from "../../wallet-actions"

// Define PaymentMethod locally to avoid importing from Prisma in client component
type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD"

interface CollectorWalletContentProps {
  shopSlug: string
  customers: CustomerForWallet[]
  canLoadWallet: boolean
  pendingDeposits: WalletTransactionData[]
}

type Tab = "load" | "pending" | "history"

export function CollectorWalletContent({
  shopSlug,
  customers,
  canLoadWallet,
  pendingDeposits,
}: CollectorWalletContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>(canLoadWallet ? "load" : "pending")
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
      const result = await collectorCreateWalletDeposit(
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
        setSuccess(`Deposit of ${formatCurrency(depositAmount)} for ${selectedCustomer.firstName} submitted`)
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
    
    const transactions = await getCollectorCustomerWalletHistory(shopSlug, customer.id)
    setCustomerTransactions(transactions)
    setLoadingTransactions(false)
  }

  const filteredCustomers = customers.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs = [
    { id: "load" as Tab, label: "Load Wallet", disabled: !canLoadWallet },
    { id: "pending" as Tab, label: "Pending", count: pendingDeposits.length },
    { id: "history" as Tab, label: "History" },
  ]

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* No Access Warning */}
      {!canLoadWallet && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-2.5 rounded-xl text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You don&apos;t have permission to load wallets. Contact your admin.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : tab.disabled
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
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
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Select Customer</h3>
            
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedCustomer?.id === c.id
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white text-sm">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${c.walletBalance > 0 ? "text-green-400" : "text-slate-500"}`}>
                        {formatCurrency(c.walletBalance)}
                      </p>
                      {c.pendingDeposits > 0 && (
                        <p className="text-xs text-amber-400">+{formatCurrency(c.pendingDeposits)}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredCustomers.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No customers found
                </div>
              )}
            </div>
          </div>

          {/* Deposit Form */}
          {selectedCustomer && (
            <div className="glass-card rounded-xl p-4">
              <form onSubmit={handleLoadWallet} className="space-y-3">
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-emerald-400">Loading wallet for:</p>
                  <p className="font-semibold text-white">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                  <p className="text-xs text-slate-400">Current: {formatCurrency(selectedCustomer.walletBalance)}</p>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Reference (optional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Transaction reference..."
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                {amount && (
                  <div className="p-2 bg-white/5 rounded-lg text-xs text-slate-400">
                    New balance: <span className="font-bold text-green-400">
                      {formatCurrency(selectedCustomer.walletBalance + (parseFloat(amount) || 0))}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !amount}
                    className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 text-sm font-medium"
                  >
                    {isPending ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === "pending" && (
        <div className="glass-card rounded-xl overflow-hidden">
          {pendingDeposits.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-1">All caught up!</h3>
              <p className="text-slate-400 text-sm">No pending deposits</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {pendingDeposits.map((t) => (
                <div key={t.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-white">{t.customerName}</p>
                      <p className="text-xs text-slate-400">{formatDate(t.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">{formatCurrency(t.amount)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        Pending
                      </span>
                    </div>
                  </div>
                  {t.reference && (
                    <p className="text-xs text-slate-500">Ref: {t.reference}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3">Select Customer</h3>
            
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleViewHistory(c)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    viewingCustomer?.id === c.id
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white text-sm">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                    <p className={`font-semibold text-sm ${c.walletBalance > 0 ? "text-green-400" : "text-slate-500"}`}>
                      {formatCurrency(c.walletBalance)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          {viewingCustomer && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">
                {viewingCustomer.firstName}&apos;s Transactions
              </h3>
              
              {loadingTransactions ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-slate-400 text-sm">Loading...</p>
                </div>
              ) : customerTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No transactions found
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {customerTransactions.map((t) => (
                    <div key={t.id} className="p-2.5 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.type === "DEPOSIT" ? "bg-green-500/20 text-green-400" :
                          t.type === "PURCHASE" ? "bg-blue-500/20 text-blue-400" :
                          "bg-purple-500/20 text-purple-400"
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
                        <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                        <p className={`font-semibold text-sm ${
                          t.type === "PURCHASE" ? "text-red-400" : "text-green-400"
                        }`}>
                          {t.type === "PURCHASE" ? "-" : "+"}{formatCurrency(t.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
