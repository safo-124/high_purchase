"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { calculateCommissions, approveCommission, markCommissionPaid } from "../../actions"

interface Commission {
  id: string
  staffMemberId: string
  staffName: string
  staffRole: string
  shopName: string
  sourceType: string
  sourceId: string
  baseAmount: number
  rate: number
  amount: number
  status: string
  paidAt: Date | null
  paymentRef: string | null
  periodStart: Date
  periodEnd: Date
}

interface Shop {
  id: string
  name: string
}

interface Props {
  businessSlug: string
  commissions: Commission[]
  shops: Shop[]
  permissions: Record<string, boolean>
}

export function CommissionsContent({ businessSlug, commissions, shops, permissions }: Props) {
  const router = useRouter()
  const [showCalculateForm, setShowCalculateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    shopId: "",
    startDate: "",
    endDate: "",
  })

  const [calcData, setCalcData] = useState({
    shopId: "",
    periodStart: "",
    periodEnd: "",
    commissionRate: "5",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`/accountant/${businessSlug}/commissions?${params.toString()}`)
  }

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const rate = parseFloat(calcData.commissionRate) / 100 // Convert to decimal
      const result = await calculateCommissions(
        businessSlug,
        new Date(calcData.periodStart),
        new Date(calcData.periodEnd),
        { salesRate: rate, collectionRate: rate }
      )

      if (result.success) {
        setShowCalculateForm(false)
        setCalcData({
          shopId: "",
          periodStart: "",
          periodEnd: "",
          commissionRate: "5",
        })
        router.refresh()
      } else {
        setError(result.error || "Failed to calculate commissions")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (commissionId: string) => {
    const result = await approveCommission(businessSlug, commissionId)
    if (result.success) {
      router.refresh()
    }
  }

  const handleMarkPaid = async (commissionId: string) => {
    const reference = prompt("Enter payment reference (e.g., bank transfer ID):")
    if (reference) {
      const result = await markCommissionPaid(businessSlug, commissionId, reference)
      if (result.success) {
        router.refresh()
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const pendingCommissions = commissions.filter(c => c.status === "PENDING")
  const approvedCommissions = commissions.filter(c => c.status === "APPROVED")
  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.amount, 0)
  const totalPaid = commissions
    .filter(c => c.status === "PAID")
    .reduce((sum, c) => sum + c.amount, 0)

  // Group commissions by staff
  const byStaff = commissions.reduce((acc, c) => {
    if (!acc[c.staffMemberId]) {
      acc[c.staffMemberId] = { name: c.staffName, total: 0, count: 0 }
    }
    acc[c.staffMemberId].total += c.amount
    acc[c.staffMemberId].count++
    return acc
  }, {} as Record<string, { name: string; total: number; count: number }>)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Records</p>
          <p className="text-2xl font-bold text-white">{commissions.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-400">{pendingCommissions.length}</p>
          <p className="text-slate-500 text-xs mt-1">{formatCurrency(totalPending)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Awaiting Payout</p>
          <p className="text-2xl font-bold text-blue-400">{approvedCommissions.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-slate-400 text-sm">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {/* Staff Summary */}
      {Object.keys(byStaff).length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Commission by Staff</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(byStaff).map(([staffId, data]) => (
              <div key={staffId} className="p-4 rounded-lg bg-slate-800/50 border border-white/5">
                <p className="text-white font-medium">{data.name}</p>
                <p className="text-emerald-400 font-semibold text-lg">{formatCurrency(data.total)}</p>
                <p className="text-slate-400 text-xs">{data.count} commission records</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Calculate Button */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
          </select>

          <select
            value={filters.shopId}
            onChange={(e) => handleFilterChange("shopId", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
          >
            <option value="">All Shops</option>
            {shops.map(shop => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
          />

          <div className="flex-1" />

          <button
            onClick={() => setShowCalculateForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            Calculate Commissions
          </button>
        </div>
      </div>

      {/* Calculate Form Modal */}
      {showCalculateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Calculate Staff Commissions</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCalculate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Shop (Optional)</label>
                <select
                  value={calcData.shopId}
                  onChange={(e) => setCalcData({ ...calcData, shopId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="">All Shops</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Period Start *</label>
                  <input
                    type="date"
                    value={calcData.periodStart}
                    onChange={(e) => setCalcData({ ...calcData, periodStart: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Period End *</label>
                  <input
                    type="date"
                    value={calcData.periodEnd}
                    onChange={(e) => setCalcData({ ...calcData, periodEnd: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Commission Rate (%) *</label>
                <input
                  type="number"
                  value={calcData.commissionRate}
                  onChange={(e) => setCalcData({ ...calcData, commissionRate: e.target.value })}
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="text-slate-400 text-xs mt-1">Percentage of collections to award as commission</p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCalculateForm(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                >
                  {loading ? "Calculating..." : "Calculate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commissions Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-slate-400 font-medium">Staff</th>
                <th className="text-left p-4 text-slate-400 font-medium">Shop</th>
                <th className="text-left p-4 text-slate-400 font-medium">Period</th>
                <th className="text-right p-4 text-slate-400 font-medium">Base Amount</th>
                <th className="text-center p-4 text-slate-400 font-medium">Rate</th>
                <th className="text-right p-4 text-slate-400 font-medium">Commission</th>
                <th className="text-center p-4 text-slate-400 font-medium">Status</th>
                <th className="text-center p-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No commissions found. Calculate commissions to generate records.
                  </td>
                </tr>
              ) : (
                commissions.map((commission) => (
                  <tr key={commission.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{commission.staffName}</td>
                    <td className="p-4 text-slate-300">{commission.shopName || "N/A"}</td>
                    <td className="p-4 text-slate-300 text-sm">
                      {new Date(commission.periodStart).toLocaleDateString()} - {new Date(commission.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      {formatCurrency(commission.baseAmount)}
                    </td>
                    <td className="p-4 text-center text-white">{(commission.rate * 100).toFixed(1)}%</td>
                    <td className="p-4 text-right text-emerald-400 font-medium">
                      {formatCurrency(commission.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        commission.status === "PAID" 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : commission.status === "APPROVED"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {commission.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {commission.status === "PENDING" && permissions.canApproveCommissions && (
                          <button
                            onClick={() => handleApprove(commission.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                          >
                            Approve
                          </button>
                        )}
                        {commission.status === "APPROVED" && permissions.canPayCommissions && (
                          <button
                            onClick={() => handleMarkPaid(commission.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
