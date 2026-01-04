"use client"

import { useState } from "react"
import Link from "next/link"
import { CustomerPurchaseDetail } from "@/app/customer/actions"
import { 
  ShoppingBag, 
  ChevronDown,
  ChevronUp,
  Package,
  CreditCard,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react"

interface PurchasesContentProps {
  purchases: CustomerPurchaseDetail[]
  shopSlug: string
}

export function PurchasesContent({ purchases, shopSlug }: PurchasesContentProps) {
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("ALL")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date))
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      ACTIVE: { 
        bg: "bg-green-500/20 text-green-400 border-green-500/30",
        icon: <Clock className="w-4 h-4" />
      },
      COMPLETED: { 
        bg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: <CheckCircle className="w-4 h-4" />
      },
      DEFAULTED: { 
        bg: "bg-red-500/20 text-red-400 border-red-500/30",
        icon: <XCircle className="w-4 h-4" />
      },
      CANCELLED: { 
        bg: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        icon: <XCircle className="w-4 h-4" />
      },
    }
    return styles[status] || styles.ACTIVE
  }

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: "bg-green-500/20 text-green-400",
      PENDING: "bg-amber-500/20 text-amber-400",
      FAILED: "bg-red-500/20 text-red-400",
    }
    return styles[status] || "bg-slate-500/20 text-slate-400"
  }

  const getPurchaseTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      CASH: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      LAYAWAY: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      CREDIT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    }
    return styles[type] || styles.CASH
  }

  const filteredPurchases = filter === "ALL" 
    ? purchases 
    : purchases.filter(p => p.status === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Purchases</h1>
          <p className="text-slate-400 mt-1">View and track all your purchases</p>
        </div>
        
        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL" className="bg-slate-900 text-white">All Purchases</option>
            <option value="ACTIVE" className="bg-slate-900 text-white">Active</option>
            <option value="COMPLETED" className="bg-slate-900 text-white">Completed</option>
            <option value="DEFAULTED" className="bg-slate-900 text-white">Defaulted</option>
            <option value="CANCELLED" className="bg-slate-900 text-white">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchases List */}
      {filteredPurchases.length > 0 ? (
        <div className="space-y-4">
          {filteredPurchases.map((purchase) => {
            const isExpanded = expandedPurchase === purchase.id
            const statusStyle = getStatusBadge(purchase.status)
            const progress = purchase.totalAmount > 0 
              ? Math.round((purchase.amountPaid / purchase.totalAmount) * 100)
              : 0

            return (
              <div 
                key={purchase.id}
                className="glass-card rounded-xl overflow-hidden"
              >
                {/* Purchase Header */}
                <button
                  onClick={() => setExpandedPurchase(isExpanded ? null : purchase.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white">{purchase.purchaseNumber}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${statusStyle.bg}`}>
                          {purchase.status}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getPurchaseTypeBadge(purchase.purchaseType)}`}>
                          {purchase.purchaseType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{formatDate(purchase.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-slate-400">Total Amount</p>
                      <p className="font-semibold text-white">{formatCurrency(purchase.totalAmount)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-slate-400">Balance</p>
                      <p className={`font-semibold ${purchase.outstandingBalance > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        {formatCurrency(purchase.outstandingBalance)}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-700/50 px-6 py-5">
                    {/* Payment Progress */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Payment Progress</span>
                        <span className="text-sm font-medium text-white">{progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-green-400">{formatCurrency(purchase.amountPaid)} paid</span>
                        <span className="text-amber-400">{formatCurrency(purchase.outstandingBalance)} remaining</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Items */}
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Items ({purchase.items.length})
                        </h3>
                        <div className="space-y-2">
                          {purchase.items.map((item) => (
                            <div 
                              key={item.id}
                              className="p-3 bg-slate-800/30 rounded-lg flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium text-white">{item.productName}</p>
                                <p className="text-sm text-slate-400">
                                  {item.quantity} × {formatCurrency(item.unitPrice)}
                                </p>
                              </div>
                              <span className="font-medium text-white">{formatCurrency(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payments */}
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Payment History ({purchase.payments.length})
                        </h3>
                        {purchase.payments.length > 0 ? (
                          <div className="space-y-2">
                            {purchase.payments.map((payment) => (
                              <div 
                                key={payment.id}
                                className="p-3 bg-slate-800/30 rounded-lg flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-medium text-white">{formatCurrency(payment.amount)}</p>
                                  <p className="text-sm text-slate-400">
                                    {payment.paymentMethod} • {formatDate(payment.paidAt || payment.createdAt)}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusBadge(payment.status)}`}>
                                  {payment.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                            <p className="text-slate-400 text-sm">No payments recorded yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Purchase Info */}
                    <div className="mt-6 pt-4 border-t border-slate-700/50 flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>Purchased: {formatDate(purchase.createdAt)}</span>
                      </div>
                      {purchase.dueDate && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>Due: {formatDate(purchase.dueDate)}</span>
                        </div>
                      )}
                      {purchase.downPayment > 0 && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <DollarSign className="w-4 h-4" />
                          <span>Down Payment: {formatCurrency(purchase.downPayment)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Purchases Found</h2>
          <p className="text-slate-400">
            {filter === "ALL" 
              ? "You haven't made any purchases yet."
              : `No ${filter.toLowerCase()} purchases found.`
            }
          </p>
        </div>
      )}
    </div>
  )
}
