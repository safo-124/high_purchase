"use client"

import Link from "next/link"
import { CustomerDashboardData } from "@/app/customer/actions"
import { 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Bell,
  CreditCard
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
    }
    return styles[status] || styles.ACTIVE
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {data.customer.firstName}!
        </h1>
        <p className="text-slate-400 mt-1">
          Here's an overview of your purchases at {data.shop.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Purchases</p>
              <p className="text-2xl font-bold text-white">{data.stats.totalPurchases}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Purchases</p>
              <p className="text-2xl font-bold text-white">{data.stats.activePurchases}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Paid</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(data.stats.totalPaid)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Outstanding Balance</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(data.stats.totalOwed)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Purchases */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
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

          <div className="p-6">
            {data.recentPurchases.length > 0 ? (
              <div className="space-y-4">
                {data.recentPurchases.map((purchase) => (
                  <Link
                    key={purchase.id}
                    href={`/customer/${shopSlug}/purchases/${purchase.id}`}
                    className="block p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{purchase.purchaseNumber}</span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(purchase.status)}`}>
                        {purchase.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{formatDate(purchase.createdAt)}</span>
                      <div className="text-right">
                        <span className="text-slate-400">Balance: </span>
                        <span className={purchase.outstandingBalance > 0 ? "text-amber-400" : "text-green-400"}>
                          {formatCurrency(purchase.outstandingBalance)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No purchases yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              Notifications
            </h2>
            <Link 
              href={`/customer/${shopSlug}/notifications`}
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6">
            {data.notifications.length > 0 ? (
              <div className="space-y-3">
                {data.notifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification.id}
                    className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                  >
                    <p className="font-medium text-white text-sm mb-1">{notification.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{notification.body}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatDate(notification.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
