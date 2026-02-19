"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import Link from 'next/link'

interface WalletStats {
  totalBalance: number
  customersWithBalance: number
  pendingDeposits: number
  todayDeposits: number
  walletTrend: { day: string; deposits: number; spent: number }[]
}

interface ShopDashboardProps {
  shopSlug: string
  shopName: string
  shopCountry: string
  userName: string
  currency: string
  stats: {
    totalCustomers: number
    activeCustomers: number
    totalProducts: number
    lowStockProducts: number
    totalPurchases: number
    activePurchases: number
    overduePurchases: number
    completedPurchases: number
    totalCollected: number
    pendingPaymentsAmount: number
    pendingPaymentsCount: number
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    recentCustomers: number
    paymentMethodDistribution: {
      cash: number
      mobileMoney: number
      bank: number
      wallet: number
    }
    revenueTrend: { day: string; revenue: number; count: number }[]
    customerGrowth: { week: string; count: number }[]
    recentPurchases: {
      id: string
      totalAmount: number
      status: string
      createdAt: string
      customerName: string
      customerInitial: string
      itemCount: number
    }[]
  }
  walletStats: WalletStats
}

const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981']

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function ShopDashboardContent({
  shopSlug,
  shopName,
  shopCountry,
  userName,
  currency,
  stats,
  walletStats,
}: ShopDashboardProps) {
  const baseUrl = `/shop-admin/${shopSlug}`
  const collectionRate = stats.totalCollected + stats.pendingPaymentsAmount > 0
    ? Math.round((stats.totalCollected / (stats.totalCollected + stats.pendingPaymentsAmount)) * 100)
    : 0

  const purchaseStatusData = [
    { name: 'Active', value: stats.activePurchases, color: '#3b82f6' },
    { name: 'Completed', value: stats.completedPurchases, color: '#10b981' },
    { name: 'Overdue', value: stats.overduePurchases, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const paymentMethodData = [
    { name: 'Cash', value: stats.paymentMethodDistribution.cash, color: '#06b6d4' },
    { name: 'Mobile Money', value: stats.paymentMethodDistribution.mobileMoney, color: '#8b5cf6' },
    { name: 'Bank', value: stats.paymentMethodDistribution.bank, color: '#f59e0b' },
    { name: 'Wallet', value: stats.paymentMethodDistribution.wallet, color: '#10b981' },
  ].filter(d => d.value > 0)

  const totalPaymentMethods = paymentMethodData.reduce((s, d) => s + d.value, 0)
  const totalPurchaseStatuses = purchaseStatusData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome Section */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Active
          </span>
          <span className="text-xs text-slate-500">🇬🇭 {shopCountry}</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">
          Welcome, <span className="text-gradient">{userName}</span>
        </h2>
        <p className="text-slate-400">
          {shopName} — Manage your shop operations and track performance.
        </p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{stats.activeCustomers} active</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalCustomers}</p>
            <p className="text-xs text-slate-400 mt-0.5">Customers</p>
          </div>
        </div>

        {/* Active Purchases */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              {stats.overduePurchases > 0 && (
                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{stats.overduePurchases} overdue</span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{stats.activePurchases}</p>
            <p className="text-xs text-slate-400 mt-0.5">Active Purchases</p>
          </div>
        </div>

        {/* Revenue */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-green-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{stats.pendingPaymentsCount} pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalCollected, currency)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Collected</p>
          </div>
        </div>

        {/* Products */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              {stats.lowStockProducts > 0 ? (
                <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">{stats.lowStockProducts} low stock</span>
              ) : (
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Healthy</span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
            <p className="text-xs text-slate-400 mt-0.5">Products</p>
          </div>
        </div>
      </div>

      {/* Collection Health + Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Collection Health Ring */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-white mb-1">Collection Health</h3>
            <p className="text-xs text-slate-400 mb-6">Payment collection rate</p>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="url(#collectionGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${collectionRate * 3.14} ${314 - collectionRate * 3.14}`}
                  />
                  <defs>
                    <linearGradient id="collectionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{collectionRate}%</span>
                  <span className="text-[10px] text-slate-400">collected</span>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Collected</span>
                    <span className="text-green-400 font-medium">{formatCurrency(stats.totalCollected, currency)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000" style={{ width: `${collectionRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Pending</span>
                    <span className="text-amber-400 font-medium">{formatCurrency(stats.pendingPaymentsAmount, currency)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000" style={{ width: `${100 - collectionRate}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="lg:col-span-3 glass-card p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-blue-500/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Performance Insights</h3>
                <p className="text-xs text-slate-400">Key metrics at a glance</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-center">
                <p className="text-xl font-bold text-cyan-400">{formatCurrency(stats.todayRevenue, currency)}</p>
                <p className="text-[11px] text-slate-400 mt-1">Today</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                <p className="text-xl font-bold text-purple-400">{formatCurrency(stats.weekRevenue, currency)}</p>
                <p className="text-[11px] text-slate-400 mt-1">This Week</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                <p className="text-xl font-bold text-green-400">{formatCurrency(stats.monthRevenue, currency)}</p>
                <p className="text-[11px] text-slate-400 mt-1">This Month</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
                <p className="text-xl font-bold text-amber-400">{stats.recentCustomers}</p>
                <p className="text-[11px] text-slate-400 mt-1">New Customers (30d)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend + Purchase Status Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend (7 days) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
                <p className="text-xs text-slate-400">Last 7 days collection</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-slate-400">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span className="text-slate-400">Payments</span>
              </div>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="shopRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="shopCountGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    name === 'revenue' ? formatCurrency(value ?? 0, currency) : (value ?? 0),
                    name === 'revenue' ? 'Revenue' : 'Payments'
                  ]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2} fill="url(#shopRevGrad)" dot={false} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#shopCountGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Purchase Status Pie */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Purchase Status</h3>
              <p className="text-xs text-slate-400">{stats.totalPurchases} total</p>
            </div>
          </div>
          {purchaseStatusData.length > 0 ? (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={purchaseStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {purchaseStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(value: number | undefined) => [value ?? 0, 'Purchases']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {purchaseStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400">{item.name}</span>
                    </div>
                    <span className="text-white font-medium">
                      {item.value} ({totalPurchaseStatuses > 0 ? Math.round((item.value / totalPurchaseStatuses) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No purchases yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Overview + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Wallet Overview */}
        <div className="lg:col-span-3 glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Wallet Overview</h3>
                <p className="text-xs text-slate-400">7-day deposit & spend trend</p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              {formatCurrency(walletStats.totalBalance, currency)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-3 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={walletStats.walletTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="shopWalletDeposit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="shopWalletSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number | undefined, name: string | undefined) => [formatCurrency(value ?? 0, currency), name === 'deposits' ? 'Deposits' : 'Spent']}
                  />
                  <Area type="monotone" dataKey="deposits" stroke="#f59e0b" strokeWidth={2} fill="url(#shopWalletDeposit)" dot={false} />
                  <Area type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={1.5} fill="url(#shopWalletSpent)" dot={false} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="md:col-span-2 space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-[11px] text-slate-400 mb-1">Total Balance</p>
                <p className="text-lg font-bold text-amber-400">{formatCurrency(walletStats.totalBalance, currency)}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-[11px] text-slate-400 mb-1">Customers w/ Balance</p>
                <p className="text-lg font-bold text-blue-400">{walletStats.customersWithBalance}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <p className="text-[11px] text-slate-400 mb-1">Pending Deposits</p>
                <p className="text-lg font-bold text-orange-400">{walletStats.pendingDeposits}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-[11px] text-slate-400 mb-1">Today&apos;s Deposits</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(walletStats.todayDeposits, currency)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
              <p className="text-xs text-slate-400">{totalPaymentMethods} total payments</p>
            </div>
          </div>
          {paymentMethodData.length > 0 ? (
            <>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentMethodData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(value: number | undefined) => [value ?? 0, 'Payments']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {paymentMethodData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {paymentMethodData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400">{item.name}</span>
                    </div>
                    <span className="text-white font-medium">
                      {item.value} ({totalPaymentMethods > 0 ? Math.round((item.value / totalPaymentMethods) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No payments yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Growth + Recent Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Growth */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Customer Growth</h3>
              <p className="text-xs text-slate-400">Weekly new signups</p>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.customerGrowth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="shopCustGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number | undefined) => [value ?? 0, 'Customers']}
                />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#shopCustGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Recent Purchases</h3>
                <p className="text-xs text-slate-400">Latest transactions</p>
              </div>
            </div>
            <Link
              href={`${baseUrl}/customers`}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              View all →
            </Link>
          </div>

          {stats.recentPurchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">No purchases yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                      <span className="text-xs font-semibold text-purple-300">{purchase.customerInitial}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{purchase.customerName}</p>
                      <p className="text-[11px] text-slate-500">{purchase.itemCount} item{purchase.itemCount !== 1 ? 's' : ''} · {new Date(purchase.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(purchase.totalAmount, currency)}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      purchase.status === 'COMPLETED'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : purchase.status === 'ACTIVE'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : purchase.status === 'OVERDUE'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {purchase.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-br from-pink-500/10 to-rose-500/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              <p className="text-xs text-slate-400">Manage your shop</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href={`${baseUrl}/new-sale`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-xs font-medium text-cyan-300/80 group-hover:text-cyan-300 transition-colors">New Sale</span>
            </Link>
            <Link href={`${baseUrl}/customers`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-blue-300/80 group-hover:text-blue-300 transition-colors">Customers</span>
            </Link>
            <Link href={`${baseUrl}/products`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-xs font-medium text-purple-300/80 group-hover:text-purple-300 transition-colors">Products</span>
            </Link>
            <Link href={`${baseUrl}/pending-payments`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-amber-300/80 group-hover:text-amber-300 transition-colors">Payments</span>
            </Link>
            <Link href={`${baseUrl}/wallet`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-green-500/5 border border-green-500/10 hover:border-green-500/30 hover:bg-green-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-green-300/80 group-hover:text-green-300 transition-colors">Wallets</span>
            </Link>
            <Link href={`${baseUrl}/waybills`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-rose-300/80 group-hover:text-rose-300 transition-colors">Waybills</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
