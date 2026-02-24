"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import type { CollectorDashboardV2Data } from "../../actions"

// ========== Mini SVG Pie Chart ==========
function PieChart({
  segments,
  size = 120,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center">
          <span className="text-xs text-slate-500">No data</span>
        </div>
      </div>
    )
  }

  const r = size / 2
  const cx = r
  const cy = r
  const innerR = r * 0.55 // donut

  let cumAngle = -90
  const paths = segments.filter(s => s.value > 0).map((seg) => {
    const angle = (seg.value / total) * 360
    const startAngle = cumAngle
    const endAngle = cumAngle + angle
    cumAngle = endAngle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const ix1 = cx + innerR * Math.cos(startRad)
    const iy1 = cy + innerR * Math.sin(startRad)
    const ix2 = cx + innerR * Math.cos(endRad)
    const iy2 = cy + innerR * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      `Z`,
    ].join(" ")

    return <path key={seg.label} d={d} fill={seg.color} opacity={0.85} />
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </svg>
  )
}

// ========== Mini Bar Chart ==========
function BarChart({
  data,
  height = 120,
  barColor = "rgb(99, 102, 241)",
  barColor2,
}: {
  data: { label: string; value: number; value2?: number }[]
  height?: number
  barColor?: string
  barColor2?: string
}) {
  const maxVal = Math.max(...data.map(d => d.value + (d.value2 || 0)), 1)

  return (
    <div className="flex items-end gap-1.5 sm:gap-2 lg:gap-3" style={{ height }}>
      {data.map((item, idx) => {
        const h1 = (item.value / maxVal) * (height - 24)
        const h2 = item.value2 ? (item.value2 / maxVal) * (height - 24) : 0
        const isToday = idx === data.length - 1
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="flex flex-col items-center gap-0">
              {item.value + (item.value2 || 0) > 0 && (
                <span className="text-[9px] sm:text-[10px] lg:text-xs text-slate-400 mb-0.5">
                  {"\u20B5"}{(item.value + (item.value2 || 0)).toLocaleString()}
                </span>
              )}
              <div className="flex gap-px">
                <div
                  className="rounded-t transition-all"
                  style={{
                    height: `${Math.max(h1, 2)}px`,
                    width: barColor2 ? "8px" : "14px",
                    backgroundColor: isToday ? barColor : barColor.replace(")", ", 0.5)").replace("rgb", "rgba"),
                  }}
                />
                {barColor2 && h2 > 0 && (
                  <div
                    className="rounded-t transition-all"
                    style={{
                      height: `${Math.max(h2, 2)}px`,
                      width: "8px",
                      backgroundColor: isToday ? barColor2 : barColor2.replace(")", ", 0.5)").replace("rgb", "rgba"),
                    }}
                  />
                )}
              </div>
            </div>
            <span className={`text-[10px] lg:text-xs ${isToday ? "text-indigo-400 font-medium" : "text-slate-500"}`}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ========== Desktop Detection ==========
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])
  return isDesktop
}

// ========== Props ==========
interface Props {
  shopSlug: string
  dashboard: CollectorDashboardV2Data
}

export function CollectorDashboardContent({ shopSlug, dashboard }: Props) {
  const [activityTab, setActivityTab] = useState<"payments" | "wallets">("payments")
  const isLg = useIsDesktop()

  const d = dashboard

  // Weekly bar chart data
  const weeklyData = useMemo(() =>
    d.weeklyTrend.map(day => ({
      label: new Date(day.date).toLocaleDateString("en-GB", { weekday: "short" }),
      value: day.collections,
      value2: day.wallets,
    })),
    [d.weeklyTrend]
  )

  // Monthly bar chart data
  const monthlyData = useMemo(() =>
    d.monthlyCollections.map(m => ({
      label: m.month,
      value: m.amount,
    })),
    [d.monthlyCollections]
  )

  // Pie chart colors
  const statusColors: Record<string, string> = {
    ACTIVE: "rgb(59, 130, 246)",
    PENDING: "rgb(245, 158, 11)",
    OVERDUE: "rgb(239, 68, 68)",
    COMPLETED: "rgb(34, 197, 94)",
    DEFAULTED: "rgb(127, 29, 29)",
  }

  const methodColors: Record<string, string> = {
    CASH: "rgb(34, 197, 94)",
    "MOBILE MONEY": "rgb(245, 158, 11)",
    "BANK TRANSFER": "rgb(59, 130, 246)",
    CARD: "rgb(168, 85, 247)",
    WALLET: "rgb(6, 182, 212)",
  }

  const totalWeek = d.weeklyTrend.reduce((s, day) => s + day.collections + day.wallets, 0)

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* ========== STAT CARDS ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* Assigned */}
        <div className="glass-card p-3.5 sm:p-5 lg:p-6 rounded-2xl">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-slate-500 uppercase tracking-wider">Assigned</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{d.assignedCustomers}</p>
            </div>
          </div>
        </div>
        {/* Active Loans */}
        <div className="glass-card p-3.5 sm:p-5 lg:p-6 rounded-2xl">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/25 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-slate-500 uppercase tracking-wider">Active Loans</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{d.activeLoans}</p>
            </div>
          </div>
        </div>
        {/* To Collect */}
        <div className="glass-card p-3.5 sm:p-5 lg:p-6 rounded-2xl">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-slate-500 uppercase tracking-wider">To Collect</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-400">{"\u20B5"}{d.totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </div>
        {/* Total Collected */}
        <div className="glass-card p-3.5 sm:p-5 lg:p-6 rounded-2xl">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/25 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs lg:text-sm text-slate-500 uppercase tracking-wider">Collected</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">{"\u20B5"}{d.totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== TODAY'S HIGHLIGHT + WALLET BANNER ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Today */}
        <div className="glass-card p-4 sm:p-5 lg:p-7 rounded-2xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/15">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs sm:text-sm lg:text-base text-slate-400 font-medium">Today&apos;s Collections</p>
            <span className="text-[10px] lg:text-xs text-slate-500">
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400">{"\u20B5"}{d.todayCollected.toLocaleString()}</p>
          <div className="mt-2 lg:mt-3 h-1.5 lg:h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
              style={{ width: `${d.totalOutstanding > 0 ? Math.min((d.todayCollected / d.totalOutstanding) * 100, 100) : 0}%` }}
            />
          </div>
          <p className="text-[10px] lg:text-xs text-slate-500 mt-1">of {"\u20B5"}{d.totalOutstanding.toLocaleString()} outstanding</p>
        </div>

        {/* Wallet Summary */}
        <div className="glass-card p-4 sm:p-5 lg:p-7 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/15">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs sm:text-sm lg:text-base text-slate-400 font-medium">Wallet Overview</p>
            <Link
              href={`/collector/${shopSlug}/wallet`}
              className="text-[10px] lg:text-xs text-cyan-400 hover:text-cyan-300"
            >
              View All
            </Link>
          </div>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyan-400">{"\u20B5"}{d.walletTotalBalance.toLocaleString()}</p>
          <div className="flex items-center gap-3 lg:gap-4 mt-2 lg:mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] sm:text-xs lg:text-sm text-slate-400">{d.walletPendingCount} pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] sm:text-xs lg:text-sm text-slate-400">{d.walletCustomersWithBalance} with balance</span>
            </div>
          </div>
          {d.walletConfirmedToday > 0 && (
            <p className="text-[10px] lg:text-xs text-green-400 mt-1.5">+{"\u20B5"}{d.walletConfirmedToday.toLocaleString()} confirmed today</p>
          )}
        </div>
      </div>

      {/* ========== COLLECTION RATE GAUGE ========== */}
      <div className="glass-card p-4 sm:p-5 lg:p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm lg:text-base font-medium text-white">Collection Rate</p>
          <span className={`text-sm lg:text-lg font-bold ${
            d.collectionRate >= 70 ? "text-green-400" :
            d.collectionRate >= 40 ? "text-amber-400" :
            "text-red-400"
          }`}>
            {d.collectionRate}%
          </span>
        </div>
        <div className="h-3 lg:h-4 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              d.collectionRate >= 70 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
              d.collectionRate >= 40 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
              "bg-gradient-to-r from-red-500 to-rose-400"
            }`}
            style={{ width: `${Math.min(d.collectionRate, 100)}%` }}
          />
        </div>
        <p className="text-[10px] lg:text-xs text-slate-500 mt-1.5">
          {"\u20B5"}{d.totalCollected.toLocaleString()} collected of {"\u20B5"}{(d.totalCollected + d.totalOutstanding).toLocaleString()} total loans
        </p>
      </div>

      {/* ========== WEEKLY TREND CHART ========== */}
      <div className="glass-card p-4 sm:p-5 lg:p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm lg:text-base font-medium text-white">This Week</p>
            <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5">Collections & wallet deposits</p>
          </div>
          <p className="text-lg lg:text-xl font-bold text-white">{"\u20B5"}{totalWeek.toLocaleString()}</p>
        </div>
        <BarChart
          data={weeklyData}
          height={isLg ? 160 : 110}
          barColor="rgb(99, 102, 241)"
          barColor2="rgb(6, 182, 212)"
        />
        <div className="flex items-center justify-center gap-4 lg:gap-6 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-indigo-500" />
            <span className="text-[10px] lg:text-xs text-slate-400">Collections</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-cyan-500" />
            <span className="text-[10px] lg:text-xs text-slate-400">Wallets</span>
          </div>
        </div>
      </div>

      {/* ========== CHARTS ROW: Monthly Trend + Payment Methods ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Monthly Trend */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 rounded-2xl">
          <p className="text-sm lg:text-base font-medium text-white mb-4">Monthly Collections</p>
          <BarChart
            data={monthlyData}
            height={isLg ? 150 : 100}
            barColor="rgb(34, 197, 94)"
          />
        </div>

        {/* Payment Method Pie */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 rounded-2xl">
          <p className="text-sm lg:text-base font-medium text-white mb-4">Payment Methods</p>
          <div className="flex items-center gap-4 lg:gap-6">
            <PieChart
              segments={d.paymentMethodBreakdown.map(m => ({
                label: m.method,
                value: m.amount,
                color: methodColors[m.method] || "rgb(100, 116, 139)",
              }))}
              size={isLg ? 140 : 100}
            />
            <div className="flex-1 space-y-1.5 lg:space-y-2.5">
              {d.paymentMethodBreakdown.length === 0 && (
                <p className="text-xs lg:text-sm text-slate-500">No payments yet</p>
              )}
              {d.paymentMethodBreakdown.map(m => (
                <div key={m.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: methodColors[m.method] || "rgb(100, 116, 139)" }}
                    />
                    <span className="text-[10px] sm:text-xs lg:text-sm text-slate-400 capitalize">{m.method.toLowerCase()}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs lg:text-sm text-white font-medium">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== PURCHASE STATUS PIE + TOP OWING ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Purchase Status */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 rounded-2xl">
          <p className="text-sm lg:text-base font-medium text-white mb-4">Loan Status</p>
          <div className="flex items-center gap-4 lg:gap-6">
            <PieChart
              segments={d.purchaseStatusBreakdown.map(s => ({
                label: s.status,
                value: s.count,
                color: statusColors[s.status] || "rgb(100, 116, 139)",
              }))}
              size={isLg ? 140 : 100}
            />
            <div className="flex-1 space-y-1.5 lg:space-y-2.5">
              {d.purchaseStatusBreakdown.length === 0 && (
                <p className="text-xs lg:text-sm text-slate-500">No loans yet</p>
              )}
              {d.purchaseStatusBreakdown.map(s => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: statusColors[s.status] || "rgb(100, 116, 139)" }}
                    />
                    <span className="text-[10px] sm:text-xs lg:text-sm text-slate-400 capitalize">{s.status.toLowerCase()}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs lg:text-sm text-white font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Owing Customers */}
        <div className="glass-card p-4 sm:p-5 lg:p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm lg:text-base font-medium text-white">Top Owing</p>
            <Link
              href={`/collector/${shopSlug}/customers`}
              className="text-[10px] lg:text-xs text-indigo-400 hover:text-indigo-300"
            >
              See All
            </Link>
          </div>
          {d.topOwingCustomers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs lg:text-sm text-slate-500">No outstanding balances</p>
            </div>
          ) : (
            <div className="space-y-2">
              {d.topOwingCustomers.map((c, idx) => (
                <Link
                  key={c.id}
                  href={`/collector/${shopSlug}/customers/${c.id}`}
                  className="flex items-center gap-2.5 lg:gap-3 p-2 lg:p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center text-[10px] lg:text-xs font-bold text-orange-400 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs lg:text-sm font-medium text-white truncate">{c.name}</p>
                    <p className="text-[10px] lg:text-xs text-slate-500">{c.phone}</p>
                  </div>
                  <p className="text-xs lg:text-sm font-bold text-orange-400 shrink-0">{"\u20B5"}{c.amount.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== RECENT ACTIVITY (Tabs: Payments | Wallets) ========== */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActivityTab("payments")}
            className={`flex-1 px-4 py-3 lg:py-4 text-xs sm:text-sm lg:text-base font-medium transition-all ${
              activityTab === "payments"
                ? "text-green-400 border-b-2 border-green-400 bg-green-500/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Recent Collections
          </button>
          <button
            onClick={() => setActivityTab("wallets")}
            className={`flex-1 px-4 py-3 lg:py-4 text-xs sm:text-sm lg:text-base font-medium transition-all ${
              activityTab === "wallets"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Wallet Deposits
          </button>
        </div>

        {activityTab === "payments" && (
          <div>
            {d.recentPayments.length === 0 ? (
              <div className="p-6 sm:p-8 lg:p-10 text-center">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-500/20 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm lg:text-base text-slate-400">No payments collected yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {d.recentPayments.map(p => (
                  <div key={p.id} className="flex items-center gap-3 lg:gap-4 px-4 py-3 lg:px-6 lg:py-4">
                    <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm lg:text-base font-medium text-white truncate">{p.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] lg:text-xs text-slate-500">{p.purchaseNumber}</span>
                        <span className="text-[10px] lg:text-xs px-1.5 py-0.5 rounded bg-white/5 text-slate-400 capitalize">{p.method.toLowerCase()}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm lg:text-base font-bold text-green-400">+{"\u20B5"}{p.amount.toLocaleString()}</p>
                      <p className="text-[10px] lg:text-xs text-slate-500">
                        {new Date(p.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activityTab === "wallets" && (
          <div>
            {d.recentWalletDeposits.length === 0 ? (
              <div className="p-6 sm:p-8 lg:p-10 text-center">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-500/20 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                  </svg>
                </div>
                <p className="text-sm lg:text-base text-slate-400">No wallet deposits yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {d.recentWalletDeposits.map(w => (
                  <div key={w.id} className="flex items-center gap-3 lg:gap-4 px-4 py-3 lg:px-6 lg:py-4">
                    <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      w.status === "CONFIRMED" ? "bg-green-500/15" :
                      w.status === "PENDING" ? "bg-amber-500/15" :
                      "bg-red-500/15"
                    }`}>
                      <svg className={`w-4 h-4 lg:w-5 lg:h-5 ${
                        w.status === "CONFIRMED" ? "text-green-400" :
                        w.status === "PENDING" ? "text-amber-400" :
                        "text-red-400"
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {w.status === "CONFIRMED"
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          : w.status === "PENDING"
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        }
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm lg:text-base font-medium text-white truncate">{w.customerName}</p>
                      <span className={`text-[10px] lg:text-xs px-1.5 py-0.5 rounded-full ${
                        w.status === "CONFIRMED" ? "bg-green-500/10 text-green-400" :
                        w.status === "PENDING" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {w.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm lg:text-base font-bold text-cyan-400">{"\u20B5"}{w.amount.toLocaleString()}</p>
                      <p className="text-[10px] lg:text-xs text-slate-500">
                        {new Date(w.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== QUICK ACTIONS ========== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <Link
          href={`/collector/${shopSlug}/payments`}
          className="glass-card p-3.5 sm:p-4 lg:p-6 rounded-2xl flex flex-col items-center gap-2 lg:gap-3 hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl bg-green-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 lg:w-7 lg:h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-[11px] sm:text-xs lg:text-sm font-medium text-slate-300">Collect</span>
        </Link>
        <Link
          href={`/collector/${shopSlug}/wallets`}
          className="glass-card p-3.5 sm:p-4 lg:p-6 rounded-2xl flex flex-col items-center gap-2 lg:gap-3 hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 lg:w-7 lg:h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
            </svg>
          </div>
          <span className="text-[11px] sm:text-xs lg:text-sm font-medium text-slate-300">Wallets</span>
        </Link>
        <Link
          href={`/collector/${shopSlug}/customers`}
          className="glass-card p-3.5 sm:p-4 lg:p-6 rounded-2xl flex flex-col items-center gap-2 lg:gap-3 hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 lg:w-7 lg:h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-[11px] sm:text-xs lg:text-sm font-medium text-slate-300">Customers</span>
        </Link>
        <Link
          href={`/collector/${shopSlug}/reports`}
          className="glass-card p-3.5 sm:p-4 lg:p-6 rounded-2xl flex flex-col items-center gap-2 lg:gap-3 hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 lg:w-7 lg:h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-[11px] sm:text-xs lg:text-sm font-medium text-slate-300">Reports</span>
        </Link>
      </div>
    </div>
  )
}
