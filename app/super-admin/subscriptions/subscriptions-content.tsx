"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { upsertSubscriptionPlan, updateSubscriptionStatus } from "../platform-actions"

type Plan = {
  id: string
  name: string
  displayName: string
  price: number | string
  currency: string
  billingPeriod: string
  maxShops: number
  maxCustomers: number
  maxStaff: number
  maxSmsPerMonth: number
  advancedPos: boolean
  advancedAnalytics: boolean
  prioritySupport: boolean
  customBranding: boolean
  apiAccess: boolean
  accountingModule: boolean
  bonusSystem: boolean
  isActive: boolean
  sortOrder: number
  _count?: { subscriptions: number }
}

type Sub = {
  id: string
  businessId: string
  businessName: string
  businessSlug: string
  businessActive: boolean
  planName: string
  planPrice: number
  status: string
  currentPeriodStart: string | Date
  currentPeriodEnd: string | Date | null
  lastPaymentAt: string | Date | null
  lastPaymentMethod: string | null
  createdAt: string | Date
}

type Props = {
  plans: Plan[]
  subscriptions: { subscriptions: Sub[]; total: number; totalPages: number }
  currentTab: string
  currentPage: number
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/30",
  TRIAL: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  PAST_DUE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  SUSPENDED: "bg-red-500/10 text-red-400 border-red-500/30",
  CANCELLED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
}

const FEATURES = [
  { key: "advancedPos", label: "Advanced POS" },
  { key: "advancedAnalytics", label: "Advanced Analytics" },
  { key: "prioritySupport", label: "Priority Support" },
  { key: "customBranding", label: "Custom Branding" },
  { key: "apiAccess", label: "API Access" },
  { key: "accountingModule", label: "Accounting Module" },
  { key: "bonusSystem", label: "Bonus System" },
] as const

export function SubscriptionsContent({ plans, subscriptions, currentTab, currentPage }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState(currentTab)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [planForm, setPlanForm] = useState({
    name: "", displayName: "", price: 0, currency: "GHS", billingPeriod: "MONTHLY",
    maxShops: 1, maxCustomers: 100, maxStaff: 5, maxSmsPerMonth: 50,
    advancedPos: false, advancedAnalytics: false, prioritySupport: false,
    customBranding: false, apiAccess: false, accountingModule: false, bonusSystem: false,
    isActive: true, sortOrder: 0,
  })

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setCreating(false)
    setPlanForm({
      name: plan.name, displayName: plan.displayName, price: Number(plan.price),
      currency: plan.currency, billingPeriod: plan.billingPeriod,
      maxShops: plan.maxShops, maxCustomers: plan.maxCustomers, maxStaff: plan.maxStaff,
      maxSmsPerMonth: plan.maxSmsPerMonth, advancedPos: plan.advancedPos,
      advancedAnalytics: plan.advancedAnalytics, prioritySupport: plan.prioritySupport,
      customBranding: plan.customBranding, apiAccess: plan.apiAccess,
      accountingModule: plan.accountingModule, bonusSystem: plan.bonusSystem,
      isActive: plan.isActive, sortOrder: plan.sortOrder,
    })
  }

  const openCreate = () => {
    setEditingPlan(null)
    setCreating(true)
    setPlanForm({
      name: "", displayName: "", price: 0, currency: "GHS", billingPeriod: "MONTHLY",
      maxShops: 1, maxCustomers: 100, maxStaff: 5, maxSmsPerMonth: 50,
      advancedPos: false, advancedAnalytics: false, prioritySupport: false,
      customBranding: false, apiAccess: false, accountingModule: false, bonusSystem: false,
      isActive: true, sortOrder: plans.length,
    })
  }

  const handleSavePlan = async () => {
    setSaving(true)
    try {
      await upsertSubscriptionPlan({
        id: editingPlan?.id,
        ...planForm,
      })
      setEditingPlan(null)
      setCreating(false)
      router.refresh()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (subId: string, status: string) => {
    await updateSubscriptionStatus(subId, status)
    router.refresh()
  }

  const switchTab = (t: string) => {
    setTab(t)
    router.push(`/super-admin/subscriptions?tab=${t}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscriptions</h2>
          <p className="text-sm text-slate-400 mt-1">Manage subscription plans and business subscriptions.</p>
        </div>
        {tab === "plans" && (
          <button onClick={openCreate}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all">
            + New Plan
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => switchTab("plans")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "plans"
            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
            : "text-slate-400 hover:text-white border border-white/10 hover:border-white/20"
          }`}>Plans</button>
        <button onClick={() => switchTab("subscriptions")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "subscriptions"
            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
            : "text-slate-400 hover:text-white border border-white/10 hover:border-white/20"
          }`}>Business Subscriptions</button>
      </div>

      {/* Plans Tab */}
      {tab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="glass-card rounded-2xl p-6 relative">
              {!plan.isActive && (
                <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20">Inactive</div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{plan.displayName}</h3>
                <p className="text-xs text-slate-500">{plan.name}</p>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">GHS {Number(plan.price).toLocaleString()}</span>
                <span className="text-sm text-slate-500">/{plan.billingPeriod.toLowerCase()}</span>
              </div>
              <div className="space-y-2 mb-4 text-sm text-slate-400">
                <p>{plan.maxShops} shop{plan.maxShops !== 1 ? "s" : ""} · {plan.maxCustomers.toLocaleString()} customers · {plan.maxStaff} staff</p>
                <p>{plan.maxSmsPerMonth} SMS/month</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {FEATURES.map(f => (
                  <span key={f.key} className={`px-2 py-0.5 rounded text-xs ${plan[f.key] ? "bg-green-500/10 text-green-400" : "bg-white/5 text-slate-600 line-through"}`}>
                    {f.label}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-slate-500">
                  {(plan._count?.subscriptions ?? 0)} subscriber{(plan._count?.subscriptions ?? 0) !== 1 ? "s" : ""}
                </span>
                <button onClick={() => openEdit(plan)} className="text-xs text-purple-400 hover:text-purple-300 font-medium">Edit Plan</button>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="col-span-full glass-card rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-sm mb-4">No subscription plans yet.</p>
              <button onClick={openCreate} className="text-sm text-purple-400 hover:text-purple-300 font-medium">Create your first plan</button>
            </div>
          )}
        </div>
      )}

      {/* Business Subscriptions Tab */}
      {tab === "subscriptions" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          {subscriptions.subscriptions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-sm">No business subscriptions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Business</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Plan</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Period</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subscriptions.subscriptions.map(sub => (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">{sub.businessName}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {sub.planName}
                        <span className="text-xs text-slate-500 ml-2">GHS {sub.planPrice.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_STYLES[sub.status] || "text-slate-400"}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(sub.currentPeriodStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {sub.currentPeriodEnd && <> — {new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={sub.status}
                          onChange={e => handleStatusChange(sub.id, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 focus:outline-none [&>option]:bg-slate-900"
                        >
                          {["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CANCELLED"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit/Create Plan Modal */}
      {(editingPlan || creating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setEditingPlan(null); setCreating(false) }}>
          <div className="w-full max-w-xl glass-card rounded-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{editingPlan ? "Edit Plan" : "Create Plan"}</h3>
              <button onClick={() => { setEditingPlan(null); setCreating(false) }} className="text-slate-500 hover:text-white text-xl">&times;</button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name (slug)</label>
                  <input type="text" value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30"
                    placeholder="e.g. professional" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Display Name</label>
                  <input type="text" value={planForm.displayName} onChange={e => setPlanForm(p => ({ ...p, displayName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30"
                    placeholder="e.g. Professional" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Price (GHS)</label>
                  <input type="number" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Billing Period</label>
                  <select value={planForm.billingPeriod} onChange={e => setPlanForm(p => ({ ...p, billingPeriod: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none [&>option]:bg-slate-900">
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Sort Order</label>
                  <input type="number" value={planForm.sortOrder} onChange={e => setPlanForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max Shops</label>
                  <input type="number" value={planForm.maxShops} onChange={e => setPlanForm(p => ({ ...p, maxShops: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max Customers</label>
                  <input type="number" value={planForm.maxCustomers} onChange={e => setPlanForm(p => ({ ...p, maxCustomers: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Max Staff</label>
                  <input type="number" value={planForm.maxStaff} onChange={e => setPlanForm(p => ({ ...p, maxStaff: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">SMS/Month</label>
                  <input type="number" value={planForm.maxSmsPerMonth} onChange={e => setPlanForm(p => ({ ...p, maxSmsPerMonth: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/30" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-3">Features</label>
                <div className="grid grid-cols-2 gap-3">
                  {FEATURES.map(f => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={planForm[f.key]}
                        onChange={e => setPlanForm(p => ({ ...p, [f.key]: e.target.checked }))}
                        className="w-4 h-4 rounded bg-white/5 border-white/20 text-purple-500 focus:ring-purple-500/20" />
                      <span className="text-sm text-slate-300">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={planForm.isActive}
                  onChange={e => setPlanForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded bg-white/5 border-white/20 text-purple-500 focus:ring-purple-500/20" />
                <span className="text-sm text-slate-300">Active</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSavePlan} disabled={saving || !planForm.name || !planForm.displayName}
                  className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50">
                  {saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                </button>
                <button onClick={() => { setEditingPlan(null); setCreating(false) }}
                  className="px-6 py-3 text-sm font-medium text-slate-400 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
