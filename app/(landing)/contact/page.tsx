"use client"

import { useState } from "react"
import Link from "next/link"
import { submitContactForm } from "../actions"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const result = await submitContactForm(formData)
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

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs sm:text-sm text-cyan-300 font-medium mb-6">📬 Contact</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Get in <span className="text-gradient">Touch</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Have a question, need a demo, or want to partner with us? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* ===== CONTACT GRID ===== */}
      <section className="relative z-10 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="glass-card p-6 sm:p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">✅</span>
                    <h3 className="text-2xl font-bold text-white mb-3">Message Sent!</h3>
                    <p className="text-slate-400 mb-6">
                      Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false)
                        setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
                      }}
                      className="px-6 py-3 text-sm font-medium text-purple-300 hover:text-white rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h2 className="text-2xl font-bold text-white mb-6">Send Us a Message</h2>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-colors"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-colors"
                          placeholder="+233 XX XXX XXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Subject *</label>
                        <select
                          required
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-colors [&>option]:bg-slate-900"
                        >
                          <option value="">Select a subject</option>
                          <option value="general">General Inquiry</option>
                          <option value="demo">Request a Demo</option>
                          <option value="sales">Sales / Enterprise</option>
                          <option value="support">Technical Support</option>
                          <option value="partnership">Partnership</option>
                          <option value="careers">Careers</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Message *</label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-colors resize-none"
                        placeholder="Tell us about your business and how we can help..."
                      />
                    </div>

                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Sending..." : "Send Message →"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Office */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Our Office</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">📍</span>
                    <div>
                      <p className="text-sm text-white font-medium">Location</p>
                      <p className="text-sm text-slate-400">Accra, Ghana</p>
                      <p className="text-xs text-slate-500">Osu, Oxford Street</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">📧</span>
                    <div>
                      <p className="text-sm text-white font-medium">Email</p>
                      <p className="text-sm text-slate-400">hello@highpurchase.com</p>
                      <p className="text-xs text-slate-500">support@highpurchase.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">📱</span>
                    <div>
                      <p className="text-sm text-white font-medium">Phone</p>
                      <p className="text-sm text-slate-400">+233 20 123 4567</p>
                      <p className="text-xs text-slate-500">+233 50 987 6543</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">💬</span>
                    <div>
                      <p className="text-sm text-white font-medium">WhatsApp</p>
                      <p className="text-sm text-slate-400">+233 20 123 4567</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Business Hours</h3>
                <div className="space-y-2.5">
                  {[
                    { day: "Monday – Friday", time: "8:00 AM – 6:00 PM", active: true },
                    { day: "Saturday", time: "9:00 AM – 2:00 PM", active: true },
                    { day: "Sunday", time: "Closed", active: false },
                  ].map((h) => (
                    <div key={h.day} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{h.day}</span>
                      <span className={`text-sm ${h.active ? "text-green-400" : "text-slate-500"}`}>{h.time}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">Response time: within 24 hours on business days</p>
              </div>

              {/* Social */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Follow Us</h3>
                <div className="flex items-center gap-3">
                  {[
                    { label: "Twitter", icon: "𝕏" },
                    { label: "Facebook", icon: "f" },
                    { label: "Instagram", icon: "📷" },
                    { label: "LinkedIn", icon: "in" },
                    { label: "YouTube", icon: "▶" },
                  ].map((social) => (
                    <button
                      key={social.label}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 flex items-center justify-center transition-all"
                      title={social.label}
                    >
                      <span className="text-sm text-slate-300">{social.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="glass-card p-1 overflow-hidden">
                <div className="w-full h-48 rounded-xl bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-3xl block mb-2">🗺️</span>
                    <p className="text-sm text-slate-400">Accra, Ghana</p>
                    <p className="text-xs text-slate-500">Osu, Oxford Street</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Quick Answers</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "How quickly do you respond?", a: "We aim to respond to all inquiries within 24 hours on business days. Enterprise customers with SLA get priority response within 1 hour." },
              { q: "Can I get a live demo?", a: "Absolutely! Select 'Request a Demo' in the subject field above, and we'll schedule a personalized walkthrough of the platform." },
              { q: "Do you offer on-site training?", a: "Yes, we offer on-site training for Enterprise customers in Accra, Kumasi, and Tamale. Virtual training is available for all plans." },
              { q: "I'm having a technical issue. What should I do?", a: "Email support@highpurchase.com or WhatsApp +233 20 123 4567. Include your business name and a description of the issue. Screenshots help!" },
            ].map((faq) => (
              <div key={faq.q} className="glass-card p-5 sm:p-6">
                <h3 className="text-base font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Prefer to Just Get Started?</h2>
              <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
                No need to talk to sales. Create your free account and start using High Purchase in minutes.
              </p>
              <Link href="/register" className="inline-flex px-10 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:-translate-y-0.5">
                Get Started Free →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
