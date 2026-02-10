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
  Legend,
} from "recharts"

const formatCurrency = (value: number) =>
  `GHS ${value.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const PIE_COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"]

// Revenue Trend Chart
export function RevenueChart({
  data,
}: {
  data: { month: string; revenue: number; payments: number; purchases: number }[]
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
          <p className="text-xs text-slate-400">Last 12 months performance</p>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "12px",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                formatCurrency(Number(value) || 0),
                name === "revenue" ? "Revenue" : "Collections",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
              formatter={(value) => (value === "revenue" ? "Revenue" : "Collections")}
            />
            <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            <Area type="monotone" dataKey="payments" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPayments)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Purchase Type Pie Chart
export function PurchaseTypePieChart({
  data,
}: {
  data: { cash: number; layaway: number; credit: number }
}) {
  const chartData = [
    { name: "Cash", value: data.cash },
    { name: "Layaway", value: data.layaway },
    { name: "Credit", value: data.credit },
  ].filter((d) => d.value > 0)

  const total = chartData.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Purchase Types</h3>
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          No purchase data yet
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-white mb-2">Purchase Types</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => { const v = Number(value) || 0; return [`${v} (${((v / total) * 100).toFixed(0)}%)`, ""]; }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {chartData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
            {d.name} ({d.value})
          </div>
        ))}
      </div>
    </div>
  )
}

// Purchase Status Pie Chart
export function PurchaseStatusPieChart({
  data,
}: {
  data: { pending: number; active: number; completed: number; overdue: number; defaulted: number }
}) {
  const STATUS_COLORS = ["#64748b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"]
  const chartData = [
    { name: "Pending", value: data.pending },
    { name: "Active", value: data.active },
    { name: "Completed", value: data.completed },
    { name: "Overdue", value: data.overdue },
    { name: "Defaulted", value: data.defaulted },
  ].filter((d) => d.value > 0)

  const total = chartData.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Purchase Status</h3>
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          No purchase data yet
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-white mb-2">Purchase Status</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, i) => {
                const colorIndex = ["Pending", "Active", "Completed", "Overdue", "Defaulted"].indexOf(entry.name)
                return <Cell key={i} fill={STATUS_COLORS[colorIndex >= 0 ? colorIndex : i]} />
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => { const v = Number(value) || 0; return [`${v} (${((v / total) * 100).toFixed(0)}%)`, ""]; }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {chartData.map((d) => {
          const colorIndex = ["Pending", "Active", "Completed", "Overdue", "Defaulted"].indexOf(d.name)
          return (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[colorIndex >= 0 ? colorIndex : 0] }} />
              {d.name} ({d.value})
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Customers by Region Bar Chart
export function RegionBarChart({ data }: { data: { region: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Customers by Region</h3>
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          No regional data yet
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Customers by Region</h3>
          <p className="text-xs text-slate-400">Geographic distribution</p>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="region" width={100} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${Number(value) || 0} customers`, ""]}
            />
            <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
