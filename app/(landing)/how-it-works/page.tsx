import Link from "next/link"

export const metadata = {
  title: "How It Works | High Purchase",
  description: "Learn how High Purchase works for business owners and customers. Get started in 3 easy steps.",
}

export default function HowItWorksPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs sm:text-sm text-green-300 font-medium mb-6">🚀 How It Works</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Simple Steps to <br className="hidden sm:block" />
            <span className="text-gradient">Transform Your Business</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Whether you&apos;re a business owner or a customer, High Purchase makes hire purchase management effortless.
          </p>
        </div>
      </section>

      {/* ===== FOR BUSINESS OWNERS ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/30">
              <span className="text-2xl">🏢</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">For Business Owners</h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">Set up your business and start selling in minutes.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-0">
            {[
              {
                step: "01",
                title: "Create Your Account",
                desc: "Sign up with your business details. It takes less than 2 minutes. No credit card required — start with our free tier.",
                details: ["Enter business name, phone, and email", "Choose your subscription plan", "Verify your account via SMS or Email"],
                gradient: "from-purple-600 to-purple-400",
                border: "border-purple-500/30",
              },
              {
                step: "02",
                title: "Set Up Your Shops",
                desc: "Create one or more shops under your business. Each shop gets its own staff, inventory, and customer base.",
                details: ["Add shop name and location", "Assign staff with specific roles", "Configure shop-specific settings"],
                gradient: "from-blue-600 to-blue-400",
                border: "border-blue-500/30",
              },
              {
                step: "03",
                title: "Add Your Products",
                desc: "Build your product catalog with prices, categories, stock levels, and cost prices for profit tracking.",
                details: ["Add product names, prices, and photos", "Set stock quantities and low-stock alerts", "Organize with categories (TV, Furniture, etc.)"],
                gradient: "from-cyan-600 to-cyan-400",
                border: "border-cyan-500/30",
              },
              {
                step: "04",
                title: "Register Customers",
                desc: "Add your customers with their contact details. They can also self-register through the customer portal.",
                details: ["Enter customer name, phone, and address", "Customers can register themselves online", "Auto-generated customer accounts and logins"],
                gradient: "from-green-600 to-green-400",
                border: "border-green-500/30",
              },
              {
                step: "05",
                title: "Create Hire Purchase Agreements",
                desc: "Set up installment plans with down payments, payment schedules, and interest. Multi-product purchases supported.",
                details: ["Select customer and products", "Set installment amount and frequency", "Define down payment and total duration"],
                gradient: "from-amber-600 to-amber-400",
                border: "border-amber-500/30",
              },
              {
                step: "06",
                title: "Collect & Track Payments",
                desc: "Dispatch collectors, confirm payments, and watch your revenue grow in real time. Everything is automated.",
                details: ["Assign collectors to customers", "Real-time payment confirmation", "Automated SMS receipts to customers"],
                gradient: "from-pink-600 to-pink-400",
                border: "border-pink-500/30",
              },
            ].map((item, index) => (
              <div key={item.step} className="relative flex gap-6 sm:gap-8">
                {/* Timeline line */}
                {index < 5 && (
                  <div className="absolute left-[27px] sm:left-[31px] top-16 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
                )}
                {/* Step circle */}
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}>
                    <span className="text-lg sm:text-xl font-bold text-white">{item.step}</span>
                  </div>
                </div>
                {/* Content */}
                <div className={`flex-1 pb-10 sm:pb-14`}>
                  <div className={`glass-card p-5 sm:p-6 ${item.border}`}>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-400 mb-4">{item.desc}</p>
                    <ul className="space-y-2">
                      {item.details.map((d) => (
                        <li key={d} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                          <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOR CUSTOMERS ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">For Customers</h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">A transparent, easy-to-use portal to manage your purchases.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Get Registered",
                desc: "Your shop registers you, or sign up yourself through the customer portal.",
                icon: "📝",
                gradient: "from-blue-600 to-blue-400",
              },
              {
                step: "2",
                title: "Buy Products",
                desc: "Choose products and agree on a payment plan with the shop.",
                icon: "🛒",
                gradient: "from-purple-600 to-purple-400",
              },
              {
                step: "3",
                title: "Make Payments",
                desc: "Pay via collectors, mobile money, or at the shop. Get instant receipts.",
                icon: "💳",
                gradient: "from-green-600 to-green-400",
              },
              {
                step: "4",
                title: "Track Progress",
                desc: "View your balance, payment history, and upcoming dues anytime online.",
                icon: "📊",
                gradient: "from-amber-600 to-amber-400",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== USE CASE SCENARIOS ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Real-World Scenarios</h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">See how businesses like yours use High Purchase every day.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {[
              {
                title: "Kwame sells a TV on installment",
                scenario: "A customer walks into Kwame's Electronics and wants a 55\" Samsung TV worth GHS 5,000. They can pay GHS 1,000 upfront and GHS 500/month for 8 months.",
                steps: [
                  "Kwame creates a new purchase → selects Samsung TV 55\"",
                  "Sets down payment: GHS 1,000, installment: GHS 500/month",
                  "System generates the agreement and invoice",
                  "Customer gets SMS confirmation and portal access",
                  "Each month, Kwame dispatches a collector or customer pays at shop",
                  "Dashboard shows real-time payment progress",
                ],
                color: "purple",
              },
              {
                title: "Akosua manages 3 furniture shops",
                scenario: "Akosua runs furniture shops in Accra, Kumasi, and Tema. She needs to track sales, payments, and staff across all 3 locations from her phone.",
                steps: [
                  "Creates 3 shops under her business account",
                  "Assigns shop admins and sales staff to each location",
                  "Views combined revenue dashboard with per-shop breakdown",
                  "Gets alerts when payments are confirmed at any branch",
                  "Compares shop performance side by side",
                  "Exports monthly reports for her accountant",
                ],
                color: "blue",
              },
              {
                title: "Yaw dispatches collectors in Tamale",
                scenario: "Yaw has 200 customers with outstanding balances. He dispatches 5 collectors each morning and needs to track what they collect.",
                steps: [
                  "Opens collector dispatch → sees which customers are due",
                  "Assigns customers to collectors based on area",
                  "Collectors visit customers, collect payment, mark as paid",
                  "Yaw confirms each payment from his dashboard",
                  "Customer receives SMS receipt automatically",
                  "End-of-day report shows total collected per collector",
                ],
                color: "green",
              },
              {
                title: "Customer checks balance on phone",
                scenario: "Ama bought a laptop on hire purchase from TechZone. She wants to check how much she still owes and when her next payment is due.",
                steps: [
                  "Opens customer portal on her phone browser",
                  "Logs in with her phone number",
                  "Sees outstanding balance: GHS 1,250",
                  "Views progress bar: 65% paid",
                  "Checks next payment: GHS 250 due Feb 15",
                  "Downloads receipt for last payment",
                ],
                color: "amber",
              },
            ].map((scenario) => {
              const borderColors: Record<string, string> = {
                purple: "border-purple-500/20",
                blue: "border-blue-500/20",
                green: "border-green-500/20",
                amber: "border-amber-500/20",
              }
              const dotColors: Record<string, string> = {
                purple: "bg-purple-400",
                blue: "bg-blue-400",
                green: "bg-green-400",
                amber: "bg-amber-400",
              }
              return (
                <div key={scenario.title} className={`glass-card p-6 sm:p-8 ${borderColors[scenario.color]}`}>
                  <h3 className="text-lg font-semibold text-white mb-2">{scenario.title}</h3>
                  <p className="text-sm text-slate-400 mb-5 leading-relaxed">{scenario.scenario}</p>
                  <ol className="space-y-2.5">
                    {scenario.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <span className={`w-5 h-5 rounded-full ${dotColors[scenario.color]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <span className="text-[10px] font-bold text-white">{i + 1}</span>
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Common Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "How long does it take to set up?", a: "You can have your first shop, products, and customer registered in under 10 minutes. Our setup wizard guides you through every step." },
              { q: "Do I need technical knowledge?", a: "Not at all! High Purchase is designed for everyday business owners. If you can use WhatsApp, you can use High Purchase." },
              { q: "Can my customers see their balance online?", a: "Yes! Every customer gets access to a portal where they can view their purchases, payment history, outstanding balance, and upcoming dues." },
              { q: "How do I track my debt collectors?", a: "You assign customers to collectors from your dashboard. As collectors visit customers and record payments, you see updates in real time and confirm each payment." },
              { q: "What happens if I outgrow the free plan?", a: "Simply upgrade to Professional or Enterprise. All your data is preserved. You can upgrade or downgrade at any time." },
              { q: "Is my data secure?", a: "Absolutely. We use industry-standard encryption, secure authentication, and regular backups. Your business data is safe with us." },
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
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-600/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
              <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
                Join hundreds of businesses managing their hire purchase operations with High Purchase.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                <Link href="/login" className="w-full sm:w-auto px-10 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:-translate-y-0.5">
                  Create Free Account →
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
