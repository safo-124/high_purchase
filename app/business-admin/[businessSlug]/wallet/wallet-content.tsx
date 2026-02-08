"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  confirmWalletTransaction,
  rejectWalletTransaction,
  toggleStaffWalletPermission,
  adjustCustomerWallet,
  type WalletTransactionData,
  type CustomerWalletData,
  type StaffWalletPermission,
} from "../../wallet-actions"

interface WalletContentProps {
  businessSlug: string
  pendingTransactions: WalletTransactionData[]
  customers: CustomerWalletData[]
  staffPermissions: StaffWalletPermission[]
  allTransactions: WalletTransactionData[]
}

type Tab = "pending" | "customers" | "staff" | "history"

export function WalletContent({
  businessSlug,
  pendingTransactions,
  customers,
  staffPermissions,
  allTransactions,
}: WalletContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<Tab>("pending")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Modal states
  const [rejectModal, setRejectModal] = useState<WalletTransactionData | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [adjustModal, setAdjustModal] = useState<CustomerWalletData | null>(null)
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustDescription, setAdjustDescription] = useState("")
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add")
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
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

  const handleConfirm = async (transactionId: string) => {
    startTransition(async () => {
      const result = await confirmWalletTransaction(businessSlug, transactionId)
      if (!result.success) {
        setError(result.error || "Failed to confirm")
      }
      router.refresh()
    })
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    
    startTransition(async () => {
      const result = await rejectWalletTransaction(businessSlug, rejectModal.id, rejectReason)
      if (!result.success) {
        setError(result.error || "Failed to reject")
      } else {
        setRejectModal(null)
        setRejectReason("")
      }
      router.refresh()
    })
  }

  const handleTogglePermission = async (memberId: string) => {
    startTransition(async () => {
      const result = await toggleStaffWalletPermission(businessSlug, memberId)
      if (!result.success) {
        setError(result.error || "Failed to update permission")
      }
      router.refresh()
    })
  }

  const handleAdjust = async () => {
    if (!adjustModal || !adjustAmount || !adjustDescription.trim()) return
    
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    startTransition(async () => {
      const result = await adjustCustomerWallet(
        businessSlug,
        adjustModal.id,
        amount,
        adjustDescription,
        adjustType === "add"
      )
      if (!result.success) {
        setError(result.error || "Failed to adjust")
      } else {
        setAdjustModal(null)
        setAdjustAmount("")
        setAdjustDescription("")
        setAdjustType("add")
      }
      router.refresh()
    })
  }

  // Filter functions
  const filteredCustomers = customers.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredStaff = staffPermissions.filter((s) =>
    `${s.name} ${s.email} ${s.shopName}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTransactions = allTransactions.filter((t) =>
    `${t.customerName} ${t.customerPhone} ${t.reference || ""}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs = [
    { id: "pending" as Tab, label: "Pending Confirmations", count: pendingTransactions.length },
    { id: "customers" as Tab, label: "Customer Wallets", count: customers.filter(c => c.walletBalance > 0).length },
    { id: "staff" as Tab, label: "Staff Permissions", count: staffPermissions.filter(s => s.canLoadWallet).length },
    { id: "history" as Tab, label: "Transaction History", count: allTransactions.length },
  ]

  return (
    <div className="space-y-6">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-white/80 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === tab.id ? "bg-green-500/30" : "bg-white/10"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab !== "pending" && (
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
        </div>
      )}

      {/* Pending Confirmations Tab */}
      {activeTab === "pending" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          {pendingTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">All caught up!</h3>
              <p className="text-slate-400">No pending transactions to confirm</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {pendingTransactions.map((t) => (
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
                        <p className="text-sm text-slate-400">{t.customerPhone} • {t.shopName}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-slate-500">By: {t.createdByName}</span>
                          <span className="text-slate-500">{formatDate(t.createdAt)}</span>
                          {t.reference && (
                            <span className="text-slate-500">Ref: {t.reference}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(t.amount)}</p>
                        <p className="text-xs text-slate-500">{t.paymentMethod?.replace("_", " ")}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirm(t.id)}
                          disabled={isPending}
                          className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 font-medium text-sm transition-all disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setRejectModal(t)}
                          disabled={isPending}
                          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium text-sm transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Wallets Tab */}
      {activeTab === "customers" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Net Balance</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Pending</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Wallet Balance</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((c) => {
                  // Net balance = negative of outstanding (negative means they owe money)
                  const netBalance = -c.totalOutstanding
                  return (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{c.firstName} {c.lastName}</p>
                        <p className="text-sm text-slate-400">{c.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{c.shopName}</td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <span className={`font-semibold ${netBalance > 0 ? "text-green-400" : netBalance < 0 ? "text-red-400" : "text-slate-500"}`}>
                          {formatCurrency(netBalance)}
                        </span>
                        {netBalance < 0 && (
                          <p className="text-xs text-red-400/70">owes</p>
                        )}
                        {netBalance > 0 && (
                          <p className="text-xs text-green-400/70">credit</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.totalOutstanding > 0 ? (
                        <div>
                          <span className="font-semibold text-amber-400">{formatCurrency(c.totalOutstanding)}</span>
                          <p className="text-xs text-slate-500">{c.activePurchases} purchase{c.activePurchases !== 1 ? "s" : ""}</p>
                        </div>
                      ) : (
                        <span className="text-green-400 text-sm">Cleared</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.pendingDeposits > 0 ? (
                        <span className="text-amber-400">{formatCurrency(c.pendingDeposits)}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(() => {
                        const walletNet = c.walletBalance - c.totalOutstanding
                        return (
                          <span className={`font-semibold ${walletNet >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {formatCurrency(walletNet)}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setAdjustModal(c)}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-sm font-medium transition-all"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Permissions Tab */}
      {activeTab === "staff" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <p className="text-sm text-slate-400">
              Control which staff members can create wallet deposits for customers. Only business admins can confirm or edit balances.
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {filteredStaff.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 font-semibold">{s.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{s.name}</p>
                    <p className="text-sm text-slate-400">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-slate-300">{s.shopName}</p>
                    <p className="text-xs text-slate-500">{s.role.replace("_", " ")}</p>
                  </div>
                  <button
                    onClick={() => handleTogglePermission(s.id)}
                    disabled={isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      s.canLoadWallet ? "bg-green-500" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        s.canLoadWallet ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === "history" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm text-slate-300">{formatDate(t.createdAt)}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{t.customerName}</p>
                      <p className="text-xs text-slate-500">{t.shopName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        t.type === "DEPOSIT" ? "bg-green-500/20 text-green-400" :
                        t.type === "PURCHASE" ? "bg-blue-500/20 text-blue-400" :
                        t.type === "ADJUSTMENT" ? "bg-purple-500/20 text-purple-400" :
                        "bg-cyan-500/20 text-cyan-400"
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${
                        t.type === "PURCHASE" ? "text-red-400" : "text-green-400"
                      }`}>
                        {t.type === "PURCHASE" ? "-" : "+"}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        t.status === "CONFIRMED" ? "bg-green-500/20 text-green-400" :
                        t.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{t.createdByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Reject Transaction</h3>
            <p className="text-slate-400 mb-4">
              Rejecting deposit of <span className="text-green-400 font-semibold">{formatCurrency(rejectModal.amount)}</span> for {rejectModal.customerName}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAdjustModal(null)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-2">Adjust Wallet Balance</h3>
            <p className="text-slate-400 mb-4">
              {adjustModal.firstName} {adjustModal.lastName} • Current: <span className="text-green-400 font-semibold">{formatCurrency(adjustModal.walletBalance)}</span>
            </p>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAdjustType("add")}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  adjustType === "add"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                + Add
              </button>
              <button
                onClick={() => setAdjustType("subtract")}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  adjustType === "subtract"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                − Subtract
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Amount (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Reason / Description</label>
                <input
                  type="text"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="e.g., Correction, Refund, etc."
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>

            {adjustAmount && (
              <div className="p-3 bg-white/5 rounded-xl mb-4">
                <p className="text-sm text-slate-400">
                  New Balance: <span className={`font-bold ${adjustType === "add" ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(
                      adjustModal.walletBalance + (adjustType === "add" ? parseFloat(adjustAmount) || 0 : -(parseFloat(adjustAmount) || 0))
                    )}
                  </span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setAdjustModal(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={isPending || !adjustAmount || !adjustDescription.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all disabled:opacity-50"
              >
                Adjust Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
