"use client"

import { useState } from "react"
import Link from "next/link"
import { submitBusinessRegistration } from "../(landing)/actions"

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    businessName: "",
    businessType: "",
    city: "",
    address: "",
    numberOfShops: 1,
    numberOfStaff: 1,
    monthlyRevenue: "",
    howHeard: "",
    message: "",
  })

  const update = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const result = await submitBusinessRegistration(form)
      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || "Something went wrong.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        </div>
        <div className="relative z-10 w-full max-w-lg glass-card p-8 sm:p-12 rounded-3xl text-center">
          <div className="w-20 h-20 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Application Submitted!</h1>
          <p className="text-sm sm:text-base text-slate-400 mb-2">
            Thank you for your interest in High Purchase.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            We&apos;ll review your application and get back to you via email within 24-48 hours. You&apos;ll receive your login credentials once approved.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              Back to Home
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-sm font-medium text-slate-300 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      </div>
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="glass-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl logo-glow flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-lg sm:text-xl font-bold text-white">High Purchase</span>
              </Link>
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all">
                Sign In
              </Link>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-start justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl">
            {/* Title */}
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs sm:text-sm text-purple-300 font-medium mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Free to Start
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Register Your Business</h1>
              <p className="text-sm sm:text-base text-slate-400">
                Tell us about your business and we&apos;ll get you set up within 24-48 hours.
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    s === step ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" :
                    s < step ? "bg-green-500/20 text-green-300 border border-green-500/40" :
                    "bg-white/5 text-slate-500 border border-white/10"
                  }`}>
                    {s < step ? "✓" : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 rounded-full ${s < step ? "bg-green-500/40" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="glass-card rounded-2xl p-6 sm:p-8">
                {/* Step 1: Personal Info */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-semibold text-white mb-1">Your Information</h2>
                    <p className="text-xs text-slate-500 mb-4">This will be used to create your admin account.</p>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Full Name *</label>
                      <input type="text" required value={form.ownerName} onChange={e => update("ownerName", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
                        placeholder="e.g. Nana Sarfo" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Email Address *</label>
                        <input type="email" required value={form.ownerEmail} onChange={e => update("ownerEmail", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
                          placeholder="you@example.com" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Phone Number *</label>
                        <input type="tel" required value={form.ownerPhone} onChange={e => update("ownerPhone", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
                          placeholder="+233 XX XXX XXXX" />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button type="button" onClick={() => {
                        if (!form.ownerName || !form.ownerEmail || !form.ownerPhone) { setError("Please fill in all required fields."); return }
                        setError(""); setStep(2)
                      }}
                        className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all">
                        Next: Business Details →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Business Info */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-semibold text-white mb-1">Business Details</h2>
                    <p className="text-xs text-slate-500 mb-4">Tell us about your business so we can set it up properly.</p>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Business Name *</label>
                      <input type="text" required value={form.businessName} onChange={e => update("businessName", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
                        placeholder="e.g. Accra Electronics Hub" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Business Type</label>
                        <select value={form.businessType} onChange={e => update("businessType", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40 [&>option]:bg-slate-900">
                          <option value="">Select type</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Furniture">Furniture</option>
                          <option value="Motorbikes">Motorbikes</option>
                          <option value="Building Materials">Building Materials</option>
                          <option value="Appliances">Appliances</option>
                          <option value="Fashion">Fashion</option>
                          <option value="General Merchandise">General Merchandise</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">City / Town</label>
                        <input type="text" value={form.city} onChange={e => update("city", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
                          placeholder="e.g. Accra" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Business Address</label>
                      <input type="text" value={form.address} onChange={e => update("address", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
                        placeholder="e.g. Circle, Accra" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Number of Shops</label>
                        <select value={form.numberOfShops} onChange={e => update("numberOfShops", parseInt(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40 [&>option]:bg-slate-900">
                          <option value={1}>1 shop</option>
                          <option value={2}>2-3 shops</option>
                          <option value={5}>4-5 shops</option>
                          <option value={10}>6-10 shops</option>
                          <option value={20}>10+ shops</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Number of Staff</label>
                        <select value={form.numberOfStaff} onChange={e => update("numberOfStaff", parseInt(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40 [&>option]:bg-slate-900">
                          <option value={1}>1-3 staff</option>
                          <option value={5}>4-10 staff</option>
                          <option value={15}>11-20 staff</option>
                          <option value={30}>20+ staff</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button type="button" onClick={() => setStep(1)}
                        className="px-6 py-3 text-sm font-medium text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all">
                        ← Back
                      </button>
                      <button type="button" onClick={() => {
                        if (!form.businessName) { setError("Please enter your business name."); return }
                        setError(""); setStep(3)
                      }}
                        className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all">
                        Next: Final Step →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Additional Info + Submit */}
                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-semibold text-white mb-1">Almost Done!</h2>
                    <p className="text-xs text-slate-500 mb-4">A few more optional details to help us serve you better.</p>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Estimated Monthly Revenue</label>
                        <select value={form.monthlyRevenue} onChange={e => update("monthlyRevenue", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40 [&>option]:bg-slate-900">
                          <option value="">Prefer not to say</option>
                          <option value="under-5k">Under GHS 5,000</option>
                          <option value="5k-20k">GHS 5,000 - 20,000</option>
                          <option value="20k-50k">GHS 20,000 - 50,000</option>
                          <option value="50k-100k">GHS 50,000 - 100,000</option>
                          <option value="100k+">GHS 100,000+</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">How did you hear about us?</label>
                        <select value={form.howHeard} onChange={e => update("howHeard", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40 [&>option]:bg-slate-900">
                          <option value="">Select</option>
                          <option value="google">Google Search</option>
                          <option value="social">Social Media</option>
                          <option value="referral">Friend / Referral</option>
                          <option value="event">Event / Conference</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Anything else you&apos;d like us to know?</label>
                      <textarea rows={3} value={form.message} onChange={e => update("message", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/40 resize-none"
                        placeholder="e.g. Specific features you need, current challenges..." />
                    </div>

                    {/* Summary */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <h3 className="text-sm font-medium text-white mb-3">Registration Summary</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-500">Name:</span> <span className="text-slate-300">{form.ownerName}</span></div>
                        <div><span className="text-slate-500">Email:</span> <span className="text-slate-300">{form.ownerEmail}</span></div>
                        <div><span className="text-slate-500">Phone:</span> <span className="text-slate-300">{form.ownerPhone}</span></div>
                        <div><span className="text-slate-500">Business:</span> <span className="text-slate-300">{form.businessName}</span></div>
                        {form.businessType && <div><span className="text-slate-500">Type:</span> <span className="text-slate-300">{form.businessType}</span></div>}
                        {form.city && <div><span className="text-slate-500">City:</span> <span className="text-slate-300">{form.city}</span></div>}
                      </div>
                    </div>

                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
                    )}

                    <div className="flex justify-between pt-2">
                      <button type="button" onClick={() => setStep(2)}
                        className="px-6 py-3 text-sm font-medium text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all">
                        ← Back
                      </button>
                      <button type="submit" disabled={loading}
                        className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? "Submitting..." : "Submit Application →"}
                      </button>
                    </div>
                  </div>
                )}

                {error && step !== 3 && (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
                )}
              </div>
            </form>

            {/* Bottom links */}
            <div className="text-center mt-6">
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign In</Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
