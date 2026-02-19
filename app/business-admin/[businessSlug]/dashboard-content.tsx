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

interface WalletStats {
  totalWalletBalance: number
  customersWithBalance: number
  pendingTransactions: number
  todayDeposits: number
  totalOutstanding: number
  customersWithOutstanding: number
}

interface DashboardContentProps {
  walletStats: WalletStats
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

export function DashboardContent({ stats, businessName, currency, walletStats }: DashboardContentProps) {
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

  return (
    <div className="space-y-8">
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

      {/* Wallet Statistics */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Wallet Overview</h3>
              <p className="text-sm text-slate-400">Customer wallet balances &amp; activity</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Wallet Balance */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                </svg>
                <span className="text-xs text-slate-400">Total Balance</span>
              </div>
              <p className="text-xl font-bold text-indigo-400">{formatCurrency(walletStats.totalWalletBalance, currency)}</p>
            </div>

            {/* Customers with Balance */}
            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span className="text-xs text-slate-400">With Balance</span>
              </div>
              <p className="text-xl font-bold text-violet-400">{walletStats.customersWithBalance}</p>
            </div>

            {/* Pending Transactions */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-slate-400">Pending</span>
              </div>
              <p className="text-xl font-bold text-amber-400">{walletStats.pendingTransactions}</p>
            </div>

            {/* Today's Deposits */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-slate-400">Today&apos;s Deposits</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(walletStats.todayDeposits, currency)}</p>
            </div>

            {/* Total Outstanding */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                <span className="text-xs text-slate-400">Outstanding</span>
              </div>
              <p className="text-xl font-bold text-rose-400">{formatCurrency(walletStats.totalOutstanding, currency)}</p>
            </div>

            {/* Customers with Outstanding */}
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span className="text-xs text-slate-400">Owing</span>
              </div>
              <p className="text-xl font-bold text-orange-400">{walletStats.customersWithOutstanding}</p>
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

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 text-center hover:border-purple-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-purple-400">{stats.totalShops}</p>
          <p className="text-xs text-slate-400">Shops</p>
        </div>

        <div className="glass-card p-4 text-center hover:border-green-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.activeShops}</p>
          <p className="text-xs text-slate-400">Active Shops</p>
        </div>

        <div className="glass-card p-4 text-center hover:border-blue-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.totalProducts}</p>
          <p className="text-xs text-slate-400">Products</p>
        </div>

        <div className="glass-card p-4 text-center hover:border-amber-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-amber-400">{stats.totalCustomers}</p>
          <p className="text-xs text-slate-400">Customers</p>
        </div>

        <div className="glass-card p-4 text-center hover:border-cyan-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{stats.totalPurchases}</p>
          <p className="text-xs text-slate-400">Purchases</p>
        </div>

        <div className="glass-card p-4 text-center hover:border-pink-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-pink-400">{stats.totalStaff}</p>
          <p className="text-xs text-slate-400">Staff</p>
        </div>
      </div>

      {/* Today's Stats & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Today&apos;s Collections</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.todayRevenue, currency)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">This Week</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.weekRevenue, currency)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 hover:border-green-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">New Customers (30 days)</p>
              <p className="text-2xl font-bold text-white">{stats.recentCustomers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
