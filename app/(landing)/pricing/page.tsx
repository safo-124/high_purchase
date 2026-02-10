import Link from "next/link"

export const metadata = {
  title: "Pricing | High Purchase",
  description: "Simple, transparent pricing for High Purchase. Start free, upgrade as you grow.",
}

export default function PricingPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300 font-medium mb-6">💰 Pricing</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Simple, Transparent <br className="hidden sm:block" />
            <span className="text-gradient">Pricing</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Start free and upgrade as your business grows. No hidden fees, no surprises. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ===== PRICING CARDS ===== */}
      <section className="relative z-10 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Starter */}
            <div className="glass-card p-6 sm:p-8 flex flex-col">
              <div className="mb-8">
                <p className="text-sm text-slate-400 mb-2">Starter</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">Free</span>
                </div>
                <p className="text-sm text-slate-500">Perfect for trying things out</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "1 shop",
                  "Up to 50 customers",
                  "3 staff accounts",
                  "Basic POS system",
                  "Hire purchase management",
                  "Customer portal access",
                  "SMS notifications (50/mo)",
                  "Basic reports",
                  "Email support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full text-center px-6 py-3.5 text-sm font-semibold text-white rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Professional */}
            <div className="glass-card p-6 sm:p-8 flex flex-col ring-2 ring-purple-500/40 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-xs font-semibold text-white shadow-lg shadow-purple-500/25">
                Most Popular
              </div>
              <div className="mb-8">
                <p className="text-sm text-purple-300 mb-2">Professional</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">GHS 99</span>
                  <span className="text-sm text-slate-400">/month</span>
                </div>
                <p className="text-sm text-slate-500">For growing businesses</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Up to 5 shops",
                  "Unlimited customers",
                  "20 staff accounts",
                  "Advanced POS system",
                  "Hire purchase management",
                  "Debt collector tracking",
                  "Customer portal access",
                  "Unlimited SMS notifications",
                  "Advanced analytics & reports",
                  "Custom branding",
                  "Profit & cost tracking",
                  "Export to CSV/PDF",
                  "Priority email & chat support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full text-center px-6 py-3.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25">
                Start Free Trial →
              </Link>
            </div>

            {/* Enterprise */}
            <div className="glass-card p-6 sm:p-8 flex flex-col">
              <div className="mb-8">
                <p className="text-sm text-slate-400 mb-2">Enterprise</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-white">Custom</span>
                </div>
                <p className="text-sm text-slate-500">For large operations</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Unlimited shops",
                  "Unlimited customers",
                  "Unlimited staff accounts",
                  "Everything in Professional",
                  "API access & integrations",
                  "White-label branding",
                  "Custom feature development",
                  "Dedicated account manager",
                  "SLA guarantee (99.9% uptime)",
                  "On-site training",
                  "Phone & WhatsApp support",
                  "Data migration assistance",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="block w-full text-center px-6 py-3.5 text-sm font-semibold text-white rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE COMPARISON ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Detailed Comparison</h2>
            <p className="text-base text-slate-400">Every feature, every plan.</p>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 font-medium min-w-[200px]">Feature</th>
                    <th className="text-center p-4 text-slate-400 font-medium min-w-[100px]">Starter</th>
                    <th className="text-center p-4 text-purple-300 font-medium min-w-[100px]">Pro</th>
                    <th className="text-center p-4 text-slate-400 font-medium min-w-[100px]">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cat: "Shops & Staff", items: [
                      { feature: "Number of Shops", s: "1", p: "5", e: "Unlimited" },
                      { feature: "Staff Accounts", s: "3", p: "20", e: "Unlimited" },
                      { feature: "Role Management", s: true, p: true, e: true },
                      { feature: "Multi-Shop Dashboard", s: false, p: true, e: true },
                    ]},
                    { cat: "Customers", items: [
                      { feature: "Customer Limit", s: "50", p: "Unlimited", e: "Unlimited" },
                      { feature: "Customer Portal", s: true, p: true, e: true },
                      { feature: "SMS Notifications", s: "50/mo", p: "Unlimited", e: "Unlimited" },
                      { feature: "Email Notifications", s: true, p: true, e: true },
                    ]},
                    { cat: "Sales & Payments", items: [
                      { feature: "POS System", s: true, p: true, e: true },
                      { feature: "Hire Purchase", s: true, p: true, e: true },
                      { feature: "Multi-Product Purchase", s: true, p: true, e: true },
                      { feature: "Debt Collector Tracking", s: false, p: true, e: true },
                      { feature: "Payment Confirmation", s: true, p: true, e: true },
                      { feature: "Wallet System", s: false, p: true, e: true },
                    ]},
                    { cat: "Analytics & Reports", items: [
                      { feature: "Basic Reports", s: true, p: true, e: true },
                      { feature: "Advanced Analytics", s: false, p: true, e: true },
                      { feature: "Profit & Cost Tracking", s: false, p: true, e: true },
                      { feature: "Export CSV/PDF", s: false, p: true, e: true },
                      { feature: "Staff Performance", s: false, p: true, e: true },
                    ]},
                    { cat: "Support & Integration", items: [
                      { feature: "Email Support", s: true, p: true, e: true },
                      { feature: "Priority Support", s: false, p: true, e: true },
                      { feature: "Phone/WhatsApp Support", s: false, p: false, e: true },
                      { feature: "API Access", s: false, p: false, e: true },
                      { feature: "SLA Guarantee", s: false, p: false, e: true },
                      { feature: "Custom Development", s: false, p: false, e: true },
                    ]},
                  ].map((category) => (
                    <>
                      <tr key={category.cat} className="bg-white/[0.02]">
                        <td colSpan={4} className="p-4 text-xs font-semibold text-purple-300 uppercase tracking-wider">{category.cat}</td>
                      </tr>
                      {category.items.map((row) => (
                        <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="p-4 text-white">{row.feature}</td>
                          {[row.s, row.p, row.e].map((val, i) => (
                            <td key={i} className="text-center p-4">
                              {typeof val === "boolean" ? (
                                val ? (
                                  <svg className="w-5 h-5 text-green-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                  <svg className="w-5 h-5 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                )
                              ) : (
                                <span className="text-slate-300">{val}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Pricing FAQ</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "Is the Starter plan really free?", a: "Yes! The Starter plan is 100% free forever. You get 1 shop, 50 customers, and 3 staff accounts. No credit card required." },
              { q: "Can I switch plans anytime?", a: "Absolutely. Upgrade or downgrade at any time. When you upgrade, you get instant access to new features. When you downgrade, your data is preserved." },
              { q: "Is there a free trial for Professional?", a: "Yes! You get a 14-day free trial of the Professional plan. No credit card required. If you don't upgrade, you'll be moved to the Starter plan." },
              { q: "How do I pay?", a: "We accept Mobile Money (MTN, Vodafone, AirtelTigo), bank transfer, and card payments. Pay monthly or annually (2 months free with annual billing)." },
              { q: "What happens if I exceed my customer limit?", a: "We'll notify you and suggest upgrading. Your existing data is never affected. You simply won't be able to add new customers until you upgrade." },
              { q: "Do you offer discounts for NGOs or schools?", a: "Yes! We offer special pricing for non-profits, educational institutions, and government agencies. Contact us for details." },
              { q: "What's included in the SLA guarantee?", a: "Enterprise customers get a 99.9% uptime SLA. If we fail to meet this, you receive service credits. We also provide priority incident response within 1 hour." },
              { q: "Can I get a refund?", a: "Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, contact support for a full refund." },
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
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start Selling Today</h2>
              <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
                No credit card required. Set up your first shop in under 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                <Link href="/login" className="w-full sm:w-auto px-10 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:-translate-y-0.5">
                  Get Started Free →
                </Link>
                <Link href="/contact" className="w-full sm:w-auto px-10 py-4 text-base font-medium text-slate-300 hover:text-white rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
