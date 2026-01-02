"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { upsertShopPolicy, PolicyPayload } from "../../actions"
import { toast } from "sonner"
import { InterestType } from "../../../generated/prisma/client"

interface PolicyFormProps {
  shopSlug: string
  initialPolicy: {
    interestType: InterestType
    interestRate: number
    graceDays: number
    maxTenorDays: number
    lateFeeFixed: number | null
    lateFeeRate: number | null
  }
}

export function PolicyForm({ shopSlug, initialPolicy }: PolicyFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const [interestType, setInterestType] = useState<InterestType>(initialPolicy.interestType)
  const [interestRate, setInterestRate] = useState(initialPolicy.interestRate.toString())
  const [graceDays, setGraceDays] = useState(initialPolicy.graceDays.toString())
  const [maxTenorDays, setMaxTenorDays] = useState(initialPolicy.maxTenorDays.toString())
  const [lateFeeFixed, setLateFeeFixed] = useState(initialPolicy.lateFeeFixed?.toString() || "")
  const [lateFeeRate, setLateFeeRate] = useState(initialPolicy.lateFeeRate?.toString() || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const payload: PolicyPayload = {
      interestType,
      interestRate: parseFloat(interestRate) || 0,
      graceDays: parseInt(graceDays) || 0,
      maxTenorDays: parseInt(maxTenorDays) || 1,
      lateFeeFixed: lateFeeFixed ? parseFloat(lateFeeFixed) : null,
      lateFeeRate: lateFeeRate ? parseFloat(lateFeeRate) : null,
    }

    const result = await upsertShopPolicy(shopSlug, payload)

    if (result.success) {
      toast.success("Policy saved successfully!")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to save policy")
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Interest Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Interest Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setInterestType("FLAT")}
            className={`p-4 rounded-xl border text-left transition-all ${
              interestType === "FLAT"
                ? "bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20"
                : "bg-white/5 border-white/10 hover:bg-white/[0.07]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                interestType === "FLAT" ? "bg-blue-500/20" : "bg-white/10"
              }`}>
                <svg className={`w-5 h-5 ${interestType === "FLAT" ? "text-blue-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14" />
                </svg>
              </div>
              <div>
                <p className={`font-medium ${interestType === "FLAT" ? "text-white" : "text-slate-300"}`}>Flat Rate</p>
                <p className="text-xs text-slate-500">One-time interest</p>
              </div>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setInterestType("MONTHLY")}
            className={`p-4 rounded-xl border text-left transition-all ${
              interestType === "MONTHLY"
                ? "bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/20"
                : "bg-white/5 border-white/10 hover:bg-white/[0.07]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                interestType === "MONTHLY" ? "bg-purple-500/20" : "bg-white/10"
              }`}>
                <svg className={`w-5 h-5 ${interestType === "MONTHLY" ? "text-purple-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className={`font-medium ${interestType === "MONTHLY" ? "text-white" : "text-slate-300"}`}>Monthly</p>
                <p className="text-xs text-slate-500">Compounding interest</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Interest Rate */}
      <div className="space-y-2">
        <label htmlFor="interestRate" className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          Interest Rate (%)
        </label>
        <div className="relative">
          <input
            id="interestRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all pr-12"
            placeholder="0.00"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
        </div>
        <p className="text-xs text-slate-500">
          {interestType === "FLAT" 
            ? "Applied once to the total purchase amount" 
            : "Applied to remaining balance each month"}
        </p>
      </div>

      {/* Grace Days & Max Tenor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="graceDays" className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Grace Period (days)
          </label>
          <div className="relative">
            <input
              id="graceDays"
              type="number"
              min="0"
              max="60"
              value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all pr-16"
              placeholder="3"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">days</span>
          </div>
          <p className="text-xs text-slate-500">Days before late fees apply (0-60)</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="maxTenorDays" className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Max Tenor (days)
          </label>
          <div className="relative">
            <input
              id="maxTenorDays"
              type="number"
              min="1"
              max="365"
              value={maxTenorDays}
              onChange={(e) => setMaxTenorDays(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all pr-16"
              placeholder="60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">days</span>
          </div>
          <p className="text-xs text-slate-500">Maximum repayment period (1-365)</p>
        </div>
      </div>

      {/* Late Fees Section */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h4 className="text-sm font-medium text-slate-200">Late Fees (Optional)</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="lateFeeFixed" className="text-sm text-slate-300">
              Fixed Amount (GHS)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">GHS</span>
              <input
                id="lateFeeFixed"
                type="number"
                step="0.01"
                min="0"
                value={lateFeeFixed}
                onChange={(e) => setLateFeeFixed(e.target.value)}
                className="w-full pl-14 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-slate-500">Fixed fee per late payment</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="lateFeeRate" className="text-sm text-slate-300">
              Percentage Rate (%)
            </label>
            <div className="relative">
              <input
                id="lateFeeRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={lateFeeRate}
                onChange={(e) => setLateFeeRate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all pr-12"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
            <p className="text-xs text-slate-500">% of overdue amount</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/5">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Policy
            </>
          )}
        </button>
      </div>
    </form>
  )
}
