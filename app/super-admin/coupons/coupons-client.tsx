"use client"

import { useState, useTransition } from "react"
import { createCoupon, toggleCoupon, deleteCoupon } from "../billing-actions"

type CouponType = {
  id: string; code: string; description: string | null; discountType: string;
  discountValue: number; appliesTo: string | null; minAmount: number | null;
  maxDiscount: number | null; validFrom: Date; validUntil: Date;
  maxUses: number; usedCount: number; isActive: boolean; createdAt: Date
}

export function CouponsList({ coupons }: { coupons: CouponType[] }) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: "", description: "", discountType: "PERCENTAGE" as const,
    discountValue: 10, validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    maxUses: 0,
  })

  function handleCreate() {
    startTransition(async () => {
      const result = await createCoupon(form)
      if (result.success) {
        setShowForm(false)
        setForm({
          code: "", description: "", discountType: "PERCENTAGE",
          discountValue: 10, validFrom: new Date().toISOString().split("T")[0],
          validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          maxUses: 0,
        })
      } else {
        alert(result.error)
      }
    })
  }

  const now = new Date()

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90">
          {showForm ? "Cancel" : "+ New Coupon"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Coupon Code (e.g., SAVE20)" value={form.code}
              onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            <select value={form.discountType} onChange={(e) => setForm(f => ({ ...f, discountType: e.target.value as any }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (GHS)</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Discount Value</label>
              <input type="number" value={form.discountValue} min={0}
                onChange={(e) => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Valid From</label>
              <input type="date" value={form.validFrom}
                onChange={(e) => setForm(f => ({ ...f, validFrom: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Valid Until</label>
              <input type="date" value={form.validUntil}
                onChange={(e) => setForm(f => ({ ...f, validUntil: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Description (optional)" value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            <div>
              <input type="number" placeholder="Max uses (0 = unlimited)" value={form.maxUses} min={0}
                onChange={(e) => setForm(f => ({ ...f, maxUses: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={isPending || !form.code}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium disabled:opacity-50">
            {isPending ? "Creating..." : "Create Coupon"}
          </button>
        </div>
      )}

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c => {
          const isExpired = new Date(c.validUntil) < now
          const isMaxed = c.maxUses > 0 && c.usedCount >= c.maxUses
          return (
            <div key={c.id} className={`glass-card p-5 ${!c.isActive || isExpired ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-lg font-bold">
                  {c.code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isExpired ? "bg-red-500/20 text-red-400" :
                  !c.isActive ? "bg-slate-500/20 text-slate-400" :
                  isMaxed ? "bg-amber-500/20 text-amber-400" :
                  "bg-green-500/20 text-green-400"
                }`}>
                  {isExpired ? "Expired" : !c.isActive ? "Inactive" : isMaxed ? "Maxed Out" : "Active"}
                </span>
              </div>
              {c.description && <p className="text-sm text-slate-400 mb-2">{c.description}</p>}
              <div className="text-2xl font-bold text-white mb-3">
                {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `GHS ${c.discountValue}`}
                <span className="text-sm text-slate-400 font-normal ml-1">off</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
                <p>From: {new Date(c.validFrom).toLocaleDateString()}</p>
                <p>Until: {new Date(c.validUntil).toLocaleDateString()}</p>
                <p>Used: {c.usedCount}{c.maxUses > 0 ? ` / ${c.maxUses}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startTransition(async () => { await toggleCoupon(c.id) })}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10">
                  {c.isActive ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => { if (confirm("Delete this coupon?")) startTransition(async () => { await deleteCoupon(c.id) }) }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20">
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {coupons.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center text-slate-400">No coupons yet</div>
        )}
      </div>
    </div>
  )
}
