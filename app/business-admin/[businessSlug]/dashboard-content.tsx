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
  Legend
} from 'recharts'
import { useEffect, useState, useMemo } from 'react'

interface WalletStats {
  totalWalletBalance: number
  customersWithBalance: number
  pendingTransactions: number
  todayDeposits: number
  totalDeposits: number
  totalTransactions: number
  walletTrend: { day: string; deposits: number; spent: number }[]
}

interface DashboardContentProps {
  walletStats: WalletStats
  businessSlug: string
  stats: {
    totalShops: number
    activeShops: number
    suspendedShops: number
    totalProducts: number
    totalCustomers: number
    totalPurchases: number
    totalStaff: number
    totalRevenue: number
    totalCollected: number
    totalOutstanding: number
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    revenueGrowth: number
    recentCustomers: number
    saleTypeDistribution: {
      cash: number
      credit: number
      layaway: number
    }
    statusDistribution: {
      active: number
      completed: number
      overdue: number
    }
    paymentMethodDistribution: {
      cash: number
      mobileMoney: number
      bank: number
      wallet: number
    }
    monthlyData: { month: string; revenue: number; payments: number }[]
    customerGrowth: { week: string; count: number }[]
  }
  businessName: string
  currency: string
}

const COLORS = {
  primary: '#06b6d4',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
}

const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981']

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: currency || 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-white/10 shadow-xl">
        <p className="text-white font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Revenue') ? formatCurrency(entry.value, currency) : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

/* Animated circular progress ring */
function CollectionRing({ percentage, size = 140, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const [animatedPct, setAnimatedPct] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(percentage), 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const offset = circumference - (animatedPct / 100) * circumference
  const color = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#06b6d4' : percentage >= 25 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
      {/* Glow effect */}
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth + 4}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" opacity={0.15}
        className="transition-all duration-1000 ease-out blur-[2px]"
      />
    </svg>
  )
}

export function DashboardContent({ stats, businessName, currency, walletStats, businessSlug }: DashboardContentProps) {
  // Prepare sale type data for pie chart
  const saleTypeData = [
    { name: 'Cash Sales', value: stats.saleTypeDistribution.cash, color: '#10b981' },
    { name: 'Credit Sales', value: stats.saleTypeDistribution.credit, color: '#06b6d4' },
    { name: 'Layaway Sales', value: stats.saleTypeDistribution.layaway, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Prepare payment method data for pie chart
  const paymentMethodData = [
    { name: 'Cash', value: stats.paymentMethodDistribution.cash, color: '#10b981' },
    { name: 'Mobile Money', value: stats.paymentMethodDistribution.mobileMoney, color: '#06b6d4' },
    { name: 'Bank Transfer', value: stats.paymentMethodDistribution.bank, color: '#8b5cf6' },
    { name: 'Wallet', value: stats.paymentMethodDistribution.wallet, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Prepare status distribution data
  const statusData = [
    { name: 'Active', value: stats.statusDistribution.active, color: '#3b82f6' },
    { name: 'Completed', value: stats.statusDistribution.completed, color: '#10b981' },
    { name: 'Overdue', value: stats.statusDistribution.overdue, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const collectionRate = stats.totalRevenue > 0 
    ? Math.round((stats.totalCollected / stats.totalRevenue) * 100) 
    : 0

  const overdueRate = stats.totalPurchases > 0
    ? Math.round((stats.statusDistribution.overdue / stats.totalPurchases) * 100)
    : 0

  // Generate smart insights
  const insights = useMemo(() => {
    const items: { text: string; type: 'success' | 'warning' | 'info' | 'danger' }[] = []
    if (collectionRate >= 80) items.push({ text: `Excellent collection rate at ${collectionRate}%! Your team is performing well.`, type: 'success' })
    else if (collectionRate >= 50) items.push({ text: `Collection rate is at ${collectionRate}%. There's room to improve debt recovery.`, type: 'info' })
    else if (stats.totalRevenue > 0) items.push({ text: `Collection rate is low at ${collectionRate}%. Consider following up on outstanding balances.`, type: 'warning' })
    
    if (stats.revenueGrowth > 10) items.push({ text: `Revenue grew ${stats.revenueGrowth}% vs last month — strong upward trend!`, type: 'success' })
    else if (stats.revenueGrowth < -10) items.push({ text: `Revenue dropped ${Math.abs(stats.revenueGrowth)}% vs last month. Review your sales strategy.`, type: 'danger' })
    
    if (stats.recentCustomers > 0) items.push({ text: `${stats.recentCustomers} new customer${stats.recentCustomers > 1 ? 's' : ''} in the last 30 days.`, type: 'info' })
    
    if (stats.statusDistribution.overdue > 0) items.push({ text: `${stats.statusDistribution.overdue} overdue purchase${stats.statusDistribution.overdue > 1 ? 's' : ''} need attention.`, type: 'warning' })
    
    if (walletStats.pendingTransactions > 0) items.push({ text: `${walletStats.pendingTransactions} wallet transaction${walletStats.pendingTransactions > 1 ? 's' : ''} awaiting confirmation.`, type: 'warning' })
    
    if (stats.todayRevenue > 0) items.push({ text: `${formatCurrency(stats.todayRevenue, currency)} collected today — keep it up!`, type: 'success' })

    if (items.length === 0) items.push({ text: 'Start making sales to see performance insights here.', type: 'info' })
    return items
  }, [stats, walletStats, collectionRate, currency])

  const baseUrl = `/business-admin/${businessSlug}`

  return (
    <div className="space-y-8">
      {/* Wallet Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Wallet Balance */}
        <a href={`${baseUrl}/wallet`} className="glass-card p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 block">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                </svg>
              </div>
              <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
                Wallet
              </span>
            </div>
            <p className="text-3xl font-bold text-indigo-400 mb-1">{formatCurrency(walletStats.totalWalletBalance, currency)}</p>
            <p className="text-sm text-slate-400">Total Wallet Balance</p>
          </div>
        </a>

        {/* Today's Deposits */}
        <a href={`${baseUrl}/wallet`} className="glass-card p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300 block">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                Today
              </span>
            </div>
            <p className="text-3xl font-bold text-emerald-400 mb-1">{formatCurrency(walletStats.todayDeposits, currency)}</p>
            <p className="text-sm text-slate-400">Today&apos;s Deposits</p>
          </div>
        </a>

        {/* Total Deposits */}
        <a href={`${baseUrl}/wallet`} className="glass-card p-6 relative overflow-hidden group hover:border-teal-500/30 transition-all duration-300 block">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <span className="text-xs text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full border border-teal-500/20">
                All Time
              </span>
            </div>
            <p className="text-3xl font-bold text-teal-400 mb-1">{formatCurrency(walletStats.totalDeposits, currency)}</p>
            <p className="text-sm text-slate-400">Total Deposits</p>
          </div>
        </a>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                stats.revenueGrowth >= 0 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                <svg className={`w-3 h-3 ${stats.revenueGrowth >= 0 ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {Math.abs(stats.revenueGrowth)}%
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.totalRevenue, currency)}</p>
            <p className="text-sm text-slate-400">Total Revenue</p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-green-500/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                {collectionRate}% collected
              </span>
            </div>
            <p className="text-3xl font-bold text-green-400 mb-1">{formatCurrency(stats.totalCollected, currency)}</p>
            <p className="text-sm text-slate-400">Total Collected</p>
          </div>
        </div>

        {/* Outstanding */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                Pending
              </span>
            </div>
            <p className="text-3xl font-bold text-amber-400 mb-1">{formatCurrency(stats.totalOutstanding, currency)}</p>
            <p className="text-sm text-slate-400">Outstanding Balance</p>
          </div>
        </div>

        {/* This Month */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20">
                This Month
              </span>
            </div>
            <p className="text-3xl font-bold text-purple-400 mb-1">{formatCurrency(stats.monthRevenue, currency)}</p>
            <p className="text-sm text-slate-400">Monthly Collections</p>
          </div>
        </div>
      </div>

      {/* Collection Health & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Ring */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-white mb-1">Collection Health</h3>
            <p className="text-sm text-slate-400 mb-6">Revenue collected vs outstanding</p>
            <div className="flex items-center justify-center">
              <div className="relative">
                <CollectionRing percentage={collectionRate} size={160} strokeWidth={12} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{collectionRate}%</span>
                  <span className="text-xs text-slate-400">Collected</span>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-400">Collected</span>
                  <span className="text-green-400 font-medium">{formatCurrency(stats.totalCollected, currency)}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000" style={{ width: `${collectionRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-400">Outstanding</span>
                  <span className="text-amber-400 font-medium">{formatCurrency(stats.totalOutstanding, currency)}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000" style={{ width: `${100 - collectionRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-blue-500/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Performance Insights</h3>
                <p className="text-sm text-slate-400">AI-powered observations</p>
              </div>
            </div>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] ${
                  insight.type === 'success' ? 'bg-green-500/5 border-green-500/20' :
                  insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                  insight.type === 'danger' ? 'bg-red-500/5 border-red-500/20' :
                  'bg-blue-500/5 border-blue-500/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    insight.type === 'success' ? 'bg-green-400' :
                    insight.type === 'warning' ? 'bg-amber-400' :
                    insight.type === 'danger' ? 'bg-red-400' :
                    'bg-blue-400'
                  }`} />
                  <p className="text-sm text-slate-300 leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-br from-pink-500/10 to-rose-500/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                <p className="text-sm text-slate-400">Jump to common tasks</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href={`${baseUrl}/new-sale`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 hover:border-cyan-500/40 hover:from-cyan-500/15 transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">New Sale</span>
              </a>
              <a href={`${baseUrl}/customers`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 hover:border-green-500/40 hover:from-green-500/15 transition-all">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Customers</span>
              </a>
              <a href={`${baseUrl}/purchases`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 hover:border-purple-500/40 hover:from-purple-500/15 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Purchases</span>
              </a>
              <a href={`${baseUrl}/wallet`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/40 hover:from-amber-500/15 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Wallets</span>
              </a>
              <a href={`${baseUrl}/products`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 hover:border-blue-500/40 hover:from-blue-500/15 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Products</span>
              </a>
              <a href={`${baseUrl}/reports`} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/5 border border-rose-500/20 hover:border-rose-500/40 hover:from-rose-500/15 transition-all">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Reports</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
              <p className="text-sm text-slate-400">Last 6 months performance</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-xs text-slate-400">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-slate-400">Purchases</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue"
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="payments" 
                  name="Purchases"
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPayments)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sale Type Distribution */}
        <div className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Sale Type Distribution</h3>
            <p className="text-sm text-slate-400">Breakdown by sale type</p>
          </div>
          <div className="h-[200px]">
            {saleTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={saleTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {saleTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No sales data yet</p>
              </div>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {saleTypeData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-slate-300">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
            <p className="text-sm text-slate-400">How customers pay</p>
          </div>
          <div className="h-[250px]">
            {paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#06b6d4" 
                    radius={[0, 8, 8, 0]}
                    maxBarSize={40}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No payment data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Status */}
        <div className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Purchase Status</h3>
            <p className="text-sm text-slate-400">Current purchase state overview</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-3xl font-bold text-blue-400">{stats.statusDistribution.active}</p>
              <p className="text-xs text-slate-400 mt-1">Active</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
              <p className="text-3xl font-bold text-green-400">{stats.statusDistribution.completed}</p>
              <p className="text-xs text-slate-400 mt-1">Completed</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-3xl font-bold text-red-400">{stats.statusDistribution.overdue}</p>
              <p className="text-xs text-slate-400 mt-1">Overdue</p>
            </div>
          </div>
          <div className="h-[150px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No purchase data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Statistics — Chart + Cards */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-linear-to-br from-indigo-500/10 to-violet-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-linear-to-br from-emerald-500/8 to-cyan-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Wallet Overview</h3>
                <p className="text-sm text-slate-400">Customer wallet balances &amp; activity</p>
              </div>
            </div>
            {/* Big balance pill */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Balance</span>
              <span className="text-lg font-bold text-indigo-400">{formatCurrency(walletStats.totalWalletBalance, currency)}</span>
            </div>
          </div>

          {/* Two-column: Chart + Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Area Chart — 3 cols */}
            <div className="lg:col-span-3">
              {/* Mobile balance (shown only on small screens) */}
              <div className="sm:hidden mb-4 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Wallet Balance</p>
                <p className="text-2xl font-bold text-indigo-400">{formatCurrency(walletStats.totalWalletBalance, currency)}</p>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={walletStats.walletTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="walletDepositGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="walletSpentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f472b6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => v.split(', ').pop() || v}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    />
                    <Tooltip content={<CustomTooltip currency={currency} />} />
                    <Area
                      type="monotone"
                      dataKey="deposits"
                      name="Deposits"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      fill="url(#walletDepositGrad)"
                      dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#1e1b4b' }}
                      activeDot={{ r: 6, fill: '#818cf8', stroke: '#c7d2fe', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spent"
                      name="Spent"
                      stroke="#f472b6"
                      strokeWidth={2}
                      fill="url(#walletSpentGrad)"
                      dot={{ r: 3, fill: '#f472b6', strokeWidth: 2, stroke: '#4a1942' }}
                      activeDot={{ r: 5, fill: '#f472b6', stroke: '#fbcfe8', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Deposits
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> Spent
                </span>
              </div>
            </div>

            {/* Stat Cards — 2 cols */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-3 content-start">
              {/* Customers with Balance */}
              <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <span className="text-[11px] text-slate-400">With Balance</span>
                </div>
                <p className="text-lg font-bold text-violet-400">{walletStats.customersWithBalance}</p>
              </div>

              {/* Pending */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[11px] text-slate-400">Pending</span>
                </div>
                <p className="text-lg font-bold text-amber-400">{walletStats.pendingTransactions}</p>
              </div>

              {/* Today's Deposits */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[11px] text-slate-400">Today&apos;s Deposits</span>
                </div>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(walletStats.todayDeposits, currency)}</p>
              </div>

              {/* Total Deposits */}
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/40 transition-all">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-[11px] text-slate-400">Total Deposits</span>
                </div>
                <p className="text-lg font-bold text-teal-400">{formatCurrency(walletStats.totalDeposits, currency)}</p>
              </div>

              {/* Transactions */}
              <div className="col-span-2 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:border-sky-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      <span className="text-[11px] text-slate-400">Total Transactions</span>
                    </div>
                    <p className="text-lg font-bold text-sky-400">{walletStats.totalTransactions}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-6L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-green-500 opacity-30" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Business Overview</h3>
              <p className="text-sm text-slate-400">Key metrics at a glance</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="group p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.totalShops}</p>
              <p className="text-xs text-slate-400 mt-0.5">Shops</p>
            </div>

            <div className="group p-4 rounded-2xl bg-green-500/5 border border-green-500/10 hover:border-green-500/30 hover:bg-green-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.activeShops}</p>
              <p className="text-xs text-slate-400 mt-0.5">Active Shops</p>
            </div>

            <div className="group p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-blue-400">{stats.totalProducts}</p>
              <p className="text-xs text-slate-400 mt-0.5">Products</p>
            </div>

            <div className="group p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-amber-400">{stats.totalCustomers}</p>
              <p className="text-xs text-slate-400 mt-0.5">Customers</p>
            </div>

            <div className="group p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-cyan-400">{stats.totalPurchases}</p>
              <p className="text-xs text-slate-400 mt-0.5">Purchases</p>
            </div>

            <div className="group p-4 rounded-2xl bg-pink-500/5 border border-pink-500/10 hover:border-pink-500/30 hover:bg-pink-500/10 transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-pink-400">{stats.totalStaff}</p>
              <p className="text-xs text-slate-400 mt-0.5">Staff</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Stats & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-400">Today&apos;s Collections</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.todayRevenue, currency)}</p>
              {stats.monthRevenue > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">of monthly target</span>
                    <span className="text-cyan-400">{Math.min(Math.round((stats.todayRevenue / stats.monthRevenue) * 100), 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700" style={{ width: `${Math.min((stats.todayRevenue / stats.monthRevenue) * 100, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-400">This Week</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.weekRevenue, currency)}</p>
              {stats.monthRevenue > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">of monthly total</span>
                    <span className="text-purple-400">{Math.min(Math.round((stats.weekRevenue / stats.monthRevenue) * 100), 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700" style={{ width: `${Math.min((stats.weekRevenue / stats.monthRevenue) * 100, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden group hover:border-green-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400">New Customers (30d)</p>
                  <p className="text-xl font-bold text-white">{stats.recentCustomers}</p>
                </div>
              </div>
              {stats.totalCustomers > 0 && (
                <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  {Math.round((stats.recentCustomers / stats.totalCustomers) * 100)}% of total
                </span>
              )}
            </div>
            <div className="h-[80px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.customerGrowth} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="customerGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Customers']}
                  />
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#customerGrowthGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
