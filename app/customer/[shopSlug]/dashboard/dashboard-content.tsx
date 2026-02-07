"use client"

import Link from "next/link"
import { CustomerDashboardData } from "@/app/customer/actions"
import { 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  ChevronRight,
  Bell,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"

interface DashboardContentProps {
  data: CustomerDashboardData
  shopSlug: string
}

export function DashboardContent({ data, shopSlug }: DashboardContentProps) {
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
    const styles: Record<string, string> = {
      ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
      COMPLETED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      DEFAULTED: "bg-red-500/20 text-red-400 border-red-500/30",
      CANCELLED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    }
    return styles[status] || styles.ACTIVE
  }

  const getDaysUntilDue = (dueDate: Date | null) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header with Wallet Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Card */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Welcome back, {data.customer.firstName}! 👋
                </h1>
                <p className="text-slate-400">
                  Here&apos;s your financial overview at <span className="text-indigo-400">{data.shop.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/customer/${shopSlug}/purchases`}
                  className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  My Purchases
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className={`glass-card rounded-2xl p-6 bg-gradient-to-br ${data.stats.totalOwed > 0 ? "from-red-500/10 to-amber-500/10 border-red-500/20" : "from-emerald-500/10 to-cyan-500/10 border-emerald-500/20"} border`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${data.stats.totalOwed > 0 ? "bg-red-500/20" : "bg-emerald-500/20"} flex items-center justify-center`}>
                <Wallet className={`w-5 h-5 ${data.stats.totalOwed > 0 ? "text-red-400" : "text-emerald-400"}`} />
              </div>
              <span className="text-sm text-slate-400">My Wallet</span>
            </div>
            {data.stats.totalOwed > 0 ? (
              <div className="flex items-center gap-1 text-red-400 text-xs bg-red-500/20 px-2 py-1 rounded-full">
                <TrendingDown className="w-3 h-3" />
                Debt
              </div>
            ) : (
              <div className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-500/20 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                Cleared
              </div>
            )}
          </div>
          <div className="mb-2">
            <p className={`text-3xl font-bold ${data.stats.totalOwed > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {formatCurrency(data.stats.totalOwed)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {data.stats.totalOwed > 0 ? "Total Amount Owed" : "No Outstanding Balance"}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Deposited: {formatCurrency(data.wallet.totalDeposited)}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.totalPurchases}</p>
              <p className="text-xs text-slate-400">Total Purchases</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.activePurchases}</p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(data.stats.totalPaid)}</p>
              <p className="text-xs text-slate-400">Total Paid</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(data.stats.totalOwed)}</p>
              <p className="text-xs text-slate-400">Outstanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Purchases - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Payments Alert */}
          {data.upcomingPayments.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white">Upcoming Payments</h3>
              </div>
              <div className="space-y-3">
                {data.upcomingPayments.map((payment, idx) => {
                  const daysUntil = getDaysUntilDue(payment.dueDate)
                  const isOverdue = daysUntil !== null && daysUntil < 0
                  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isOverdue ? "bg-red-500/10 border border-red-500/30" : 
                        isDueSoon ? "bg-amber-500/10 border border-amber-500/30" : 
                        "bg-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isOverdue ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400" />
                        )}
                        <div>
                          <p className="font-medium text-white text-sm">{payment.purchaseNumber}</p>
                          <p className="text-xs text-slate-400">
                            {payment.dueDate ? (
                              isOverdue ? (
                                <span className="text-red-400">Overdue by {Math.abs(daysUntil!)} days</span>
                              ) : daysUntil === 0 ? (
                                <span className="text-amber-400">Due today</span>
                              ) : (
                                <span>Due in {daysUntil} days</span>
                              )
                            ) : (
                              "No due date set"
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold ${isOverdue ? "text-red-400" : "text-amber-400"}`}>
                        {formatCurrency(payment.outstandingBalance)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Purchases */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                Recent Purchases
              </h2>
              <Link 
                href={`/customer/${shopSlug}/purchases`}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-4">
              {data.recentPurchases.length > 0 ? (
                <div className="space-y-3">
                  {data.recentPurchases.map((purchase) => (
                    <Link
                      key={purchase.id}
                      href={`/customer/${shopSlug}/purchases/${purchase.id}`}
                      className="block p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-indigo-500/30 hover:bg-slate-800/50 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {purchase.purchaseNumber}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{formatDate(purchase.createdAt)}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs rounded-full border font-medium ${getStatusBadge(purchase.status)}`}>
                          {purchase.status}
                        </span>
                      </div>
                      
                      {/* Items */}
                      {purchase.items.length > 0 && (
                        <p className="text-sm text-slate-400 mb-3 line-clamp-1">
                          {purchase.items.join(", ")}
                        </p>
                      )}

                      {/* Progress */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                purchase.outstandingBalance === 0 ? "bg-green-500" : "bg-indigo-500"
                              }`}
                              style={{ 
                                width: `${Math.min(100, ((purchase.totalAmount - purchase.outstandingBalance) / purchase.totalAmount) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          {purchase.outstandingBalance > 0 ? (
                            <span className="text-amber-400 font-medium text-sm">
                              {formatCurrency(purchase.outstandingBalance)} left
                            </span>
                          ) : (
                            <span className="text-green-400 font-medium text-sm flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Paid
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-400 mb-2">No purchases yet</p>
                  <p className="text-sm text-slate-500">Your purchases will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Account Summary */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Account Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-slate-400">Total Deposited</span>
                <span className="text-white font-medium">{formatCurrency(data.wallet.totalDeposited)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-slate-400">Total Paid</span>
                <span className="text-green-400 font-medium">{formatCurrency(data.stats.totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 font-medium">Total Outstanding</span>
                <span className={`font-bold text-lg ${data.stats.totalOwed > 0 ? "text-red-400" : "text-green-400"}`}>
                  {data.stats.totalOwed > 0 ? `-${formatCurrency(data.stats.totalOwed)}` : formatCurrency(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                Notifications
                {data.notifications.length > 0 && (
                  <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                    {data.notifications.length}
                  </span>
                )}
              </h2>
              <Link 
                href={`/customer/${shopSlug}/notifications`}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-4">
              {data.notifications.length > 0 ? (
                <div className="space-y-3">
                  {data.notifications.slice(0, 4).map((notification) => (
                    <div 
                      key={notification.id}
                      className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-indigo-500/20 transition-all"
                    >
                      <p className="font-medium text-white text-sm mb-1 line-clamp-1">{notification.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-2">{notification.body}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatDate(notification.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm">No new notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link
                href={`/customer/${shopSlug}/purchases`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <span className="text-slate-300 group-hover:text-white transition-colors">My Purchases</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>
              <Link
                href={`/customer/${shopSlug}/receipts`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  <span className="text-slate-300 group-hover:text-white transition-colors">Payment Receipts</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>
              <Link
                href={`/customer/${shopSlug}/messages`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <span className="text-slate-300 group-hover:text-white transition-colors">Messages</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
