import Link from "next/link"
import { getSessionUser } from "../../lib/auth"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const user = await getSessionUser()
  if (user) {
    if (user.role === "SUPER_ADMIN") redirect("/super-admin")
    if (user.role === "BUSINESS_ADMIN") redirect("/business-admin/select-shop")
    if (user.role === "SHOP_ADMIN") redirect("/shop-admin/select-shop")
    if (user.role === "SALES_STAFF") redirect("/sales-staff/select-shop")
    if (user.role === "DEBT_COLLECTOR") redirect("/collector/select-shop")
  }

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative z-10 pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 landing-fade-in">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs sm:text-sm text-purple-300 font-medium">🇬🇭 Built for Ghanaian Businesses</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6 landing-fade-in landing-delay-1">
                Sell More with{" "}
                <span className="text-gradient">Buy Now,{" "}</span>
                <br className="hidden sm:block" />
                <span className="text-gradient">Pay Later</span>
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 mb-8 landing-fade-in landing-delay-2">
                The complete platform to manage hire purchase sales, track payments,
                and grow your business. Multi-shop support, real-time collections,
                and automated invoicing — all in one place.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center lg:justify-start landing-fade-in landing-delay-3">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 text-center"
                >
                  Get Started Free →
                </Link>
                <Link
                  href="/how-it-works"
                  className="w-full sm:w-auto px-8 py-4 text-base font-medium text-slate-300 hover:text-white rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-center"
                >
                  See How It Works
                </Link>
              </div>

              <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start landing-fade-in landing-delay-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm text-slate-400">Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm text-slate-400">No card required</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm text-slate-400">Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative landing-fade-in landing-delay-3 hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-500/20 rounded-3xl blur-2xl" />
              <div className="relative glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Dashboard</p>
                    <p className="text-lg font-bold text-white">Kwame&apos;s Electronics</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400">Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Revenue", value: "GHS 45.2K", pct: "↑ 12%", bg: "bg-purple-500/10 border-purple-500/20" },
                    { label: "Collected", value: "GHS 38.1K", pct: "↑ 8%", bg: "bg-green-500/10 border-green-500/20" },
                    { label: "Customers", value: "234", pct: "↑ 15%", bg: "bg-blue-500/10 border-blue-500/20" },
                  ].map((s) => (
                    <div key={s.label} className={`p-3 rounded-xl ${s.bg} border`}>
                      <p className="text-xs text-slate-500">{s.label}</p>
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <p className="text-xs text-green-400">{s.pct}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs text-slate-500 mb-3">Weekly Collections</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-purple-600/80 to-blue-500/60" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <span key={i} className="flex-1 text-center text-xs text-slate-600">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Recent Payments</p>
                  {[
                    { name: "Ama Mensah", amount: "GHS 250", status: "Paid", color: "text-green-400" },
                    { name: "Kofi Asante", amount: "GHS 180", status: "Paid", color: "text-green-400" },
                    { name: "Abena Osei", amount: "GHS 320", status: "Pending", color: "text-orange-400" },
                  ].map((tx) => (
                    <div key={tx.name} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-xs font-semibold text-purple-300">{tx.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm text-white">{tx.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{tx.amount}</p>
                        <p className={`text-xs ${tx.color}`}>{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative z-10 py-12 sm:py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: "500+", label: "Businesses", icon: "🏢" },
              { value: "10,000+", label: "Customers Served", icon: "👥" },
              { value: "GHS 5M+", label: "Payments Processed", icon: "💰" },
              { value: "99.9%", label: "Uptime", icon: "⚡" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="text-2xl sm:text-3xl mb-2 block">{stat.icon}</span>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE HIGHLIGHTS ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs sm:text-sm text-blue-300 font-medium mb-4">✨ Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Everything You Need to <span className="text-gradient">Run Your Business</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Manage shops, track purchases, collect payments, and generate reports — all from one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: "🏪", title: "Multi-Shop Management", desc: "Run multiple shops from one dashboard with separate staff, customers, and inventory.", color: "purple" },
              { icon: "👥", title: "Customer Tracking", desc: "Detailed profiles, purchase history, payment behavior, and credit scoring for every customer.", color: "blue" },
              { icon: "💰", title: "Payment Collections", desc: "Dispatch debt collectors with real-time tracking. Confirm payments instantly.", color: "green" },
              { icon: "🧾", title: "POS System", desc: "Process cash sales alongside BNPL. Full POS with receipts, tax, and daily reports.", color: "cyan" },
              { icon: "📄", title: "Automated Invoicing", desc: "Professional invoices, waybills, and receipts generated and sent via Email or SMS.", color: "amber" },
              { icon: "📊", title: "Real-Time Reports", desc: "Daily financials, staff performance, collection tracking, and business analytics.", color: "pink" },
            ].map((f) => {
              const colors: Record<string, string> = {
                purple: "from-purple-500/20 to-purple-500/10 border-purple-500/30",
                blue: "from-blue-500/20 to-blue-500/10 border-blue-500/30",
                green: "from-green-500/20 to-green-500/10 border-green-500/30",
                cyan: "from-cyan-500/20 to-cyan-500/10 border-cyan-500/30",
                amber: "from-amber-500/20 to-amber-500/10 border-amber-500/30",
                pink: "from-pink-500/20 to-pink-500/10 border-pink-500/30",
              }
              return (
                <div key={f.title} className="glass-card p-6 sm:p-8 group hover:-translate-y-1 transition-transform duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br border flex items-center justify-center mb-5 text-xl ${colors[f.color]}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/features" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-purple-300 hover:text-white rounded-xl border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
              See All Features →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== INDUSTRY USE CASES ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300 font-medium mb-4">🏭 Industries</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Perfect for <span className="text-gradient">Your Industry</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              From electronics to furniture, businesses across Ghana use High Purchase to grow.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: "📺", title: "Electronics", examples: "TVs, Phones, Laptops, Appliances", stat: "40% of our merchants" },
              { icon: "🛋️", title: "Furniture", examples: "Sofas, Beds, Dining Sets, Mattresses", stat: "25% of our merchants" },
              { icon: "🏍️", title: "Motorbikes & Vehicles", examples: "Motorcycles, Tricycles, Auto Parts", stat: "15% of our merchants" },
              { icon: "🔧", title: "Building Materials", examples: "Roofing, Cement, Tiles, Plumbing", stat: "10% of our merchants" },
            ].map((industry) => (
              <div key={industry.title} className="glass-card p-6 group hover:-translate-y-1 transition-transform duration-300">
                <span className="text-3xl mb-4 block">{industry.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{industry.title}</h3>
                <p className="text-sm text-slate-400 mb-3">{industry.examples}</p>
                <p className="text-xs text-purple-300 font-medium">{industry.stat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS — BRIEF ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs sm:text-sm text-green-300 font-medium mb-4">🚀 Getting Started</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Up and Running in <span className="text-gradient">3 Easy Steps</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 relative">
            <div className="hidden sm:block absolute top-20 left-[20%] right-[20%] h-px bg-gradient-to-r from-purple-500/40 via-blue-500/40 to-green-500/40" />
            {[
              { step: "01", title: "Register Your Business", desc: "Create your account, add shops, and invite your team.", gradient: "from-purple-600 to-purple-400", glow: "shadow-purple-500/30" },
              { step: "02", title: "Add Products & Customers", desc: "Build your catalog and register your customer base.", gradient: "from-blue-600 to-blue-400", glow: "shadow-blue-500/30" },
              { step: "03", title: "Start Selling & Collecting", desc: "Create hire purchase agreements and track payments.", gradient: "from-green-600 to-green-400", glow: "shadow-green-500/30" },
            ].map((item) => (
              <div key={item.step} className="relative text-center group">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-6 shadow-xl ${item.glow} group-hover:scale-110 transition-transform`}>
                  <span className="text-xl sm:text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-sm sm:text-base text-slate-400 max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-green-300 hover:text-white rounded-xl border border-green-500/20 hover:border-green-500/40 bg-green-500/5 hover:bg-green-500/10 transition-all">
              Learn More →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs sm:text-sm text-pink-300 font-medium mb-4">💬 Testimonials</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Loved by <span className="text-gradient">Businesses</span> Across Ghana
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Kwame Boateng",
                role: "Owner, Kwame Electronics",
                location: "Kumasi",
                quote: "High Purchase transformed how we do business. We used to track payments in a notebook — now everything is automated. Our collections went up 40% in the first month.",
                stars: 5,
              },
              {
                name: "Akosua Mensah",
                role: "Manager, Akosua Furniture",
                location: "Accra",
                quote: "The multi-shop feature is a game-changer. I manage 3 branches from my phone. My staff know exactly who to collect from and how much, every single day.",
                stars: 5,
              },
              {
                name: "Yaw Adjei",
                role: "Owner, Adjei Motorbikes",
                location: "Tamale",
                quote: "My customers love the portal — they can check their balance anytime. And the SMS reminders have reduced our default rate from 15% to just 3%. Incredible!",
                stars: 5,
              },
              {
                name: "Efua Darko",
                role: "Sales Manager, TechZone GH",
                location: "Takoradi",
                quote: "The POS system lets us handle cash sales and hire purchase from the same platform. No more switching between systems. The reports are beautiful too.",
                stars: 5,
              },
              {
                name: "Kofi Agyeman",
                role: "Owner, K&K Appliances",
                location: "Cape Coast",
                quote: "I was skeptical at first, but the free tier let me try it risk-free. Within a week I upgraded to Pro because the value is unbelievable for the price.",
                stars: 5,
              },
              {
                name: "Ama Serwaa",
                role: "Owner, Serwaa Home Essentials",
                location: "Sunyani",
                quote: "The debt collector feature is what sold me. I can see exactly where my collectors are, what they collected, and everything gets confirmed in real time. No more disputes!",
                stars: 5,
              },
            ].map((t) => (
              <div key={t.name} className="glass-card p-6">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-300">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MOBILE PREVIEW ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Phone */}
            <div className="flex justify-center order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-b from-purple-600/15 to-cyan-500/15 rounded-[3rem] blur-2xl" />
                <div className="relative w-[260px] sm:w-[280px] h-[520px] sm:h-[560px] rounded-[2.5rem] bg-gradient-to-b from-slate-700 to-slate-800 p-2 shadow-2xl">
                  <div className="w-full h-full rounded-[2rem] bg-mesh overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-2xl z-20" />
                    <div className="pt-9 px-3 pb-3 h-full overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[9px] text-slate-500">Welcome back,</p>
                          <p className="text-xs font-bold text-white">Ama Mensah</p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-purple-300">A</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-500/20 p-2.5 mb-3">
                        <p className="text-[9px] text-slate-400 mb-0.5">Outstanding Balance</p>
                        <p className="text-lg font-bold text-white">GHS 1,250.00</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="w-[65%] h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
                          </div>
                          <span className="text-[9px] text-green-400">65%</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 mb-1.5 font-medium">Active Purchases</p>
                      {[
                        { item: "Samsung TV 55\"", remaining: "GHS 800" },
                        { item: "HP Laptop", remaining: "GHS 450" },
                      ].map((p) => (
                        <div key={p.item} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04] border border-white/5 mb-1.5">
                          <p className="text-[10px] text-white font-medium">{p.item}</p>
                          <p className="text-[10px] font-bold text-orange-400">{p.remaining}</p>
                        </div>
                      ))}
                      <p className="text-[9px] text-slate-500 mb-1.5 mt-2 font-medium">Recent Payments</p>
                      {[
                        { date: "Feb 1", amount: "GHS 200" },
                        { date: "Jan 15", amount: "GHS 200" },
                        { date: "Jan 1", amount: "GHS 150" },
                      ].map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 rounded bg-white/[0.02] mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400 text-[10px]">✓</span>
                            <span className="text-[9px] text-slate-400">{p.date}</span>
                          </div>
                          <span className="text-[10px] text-green-400 font-medium">{p.amount}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-900/90 backdrop-blur border-t border-white/5 flex items-center justify-around px-3">
                      {["🏠", "🛒", "💬", "👤"].map((icon, i) => (
                        <div key={i} className={`w-9 h-9 rounded-lg flex items-center justify-center ${i === 0 ? "bg-purple-500/20" : ""}`}>
                          <span className="text-sm">{icon}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center lg:text-left order-1 lg:order-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs sm:text-sm text-cyan-300 font-medium mb-6">📱 Mobile Ready</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Works on <span className="text-gradient">Every Device</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-400 mb-8 max-w-lg mx-auto lg:mx-0">
                Customers check balances and payment history from their phones. Staff manage collections on the go. No app download needed.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
                {[
                  { icon: "📱", label: "Mobile Optimized" },
                  { icon: "🖥️", label: "Desktop Dashboard" },
                  { icon: "⚡", label: "Real-Time Sync" },
                  { icon: "🌐", label: "No App Needed" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING TEASER ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300 font-medium mb-4">💰 Pricing</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Plans That <span className="text-gradient">Scale With You</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Start free, upgrade when you&apos;re ready. Every plan includes core features.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-slate-400 mb-2">Starter</p>
              <p className="text-3xl font-bold text-white mb-2">Free</p>
              <p className="text-xs text-slate-500 mb-4">1 shop · 50 customers</p>
              <Link href="/pricing" className="text-sm text-purple-300 hover:text-white transition-colors">See details →</Link>
            </div>
            <div className="glass-card p-6 text-center ring-2 ring-purple-500/40 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-[10px] font-medium text-white">Popular</div>
              <p className="text-sm text-slate-400 mb-2">Professional</p>
              <p className="text-3xl font-bold text-white mb-2">GHS 99<span className="text-sm text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-500 mb-4">5 shops · Unlimited</p>
              <Link href="/pricing" className="text-sm text-purple-300 hover:text-white transition-colors">See details →</Link>
            </div>
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-slate-400 mb-2">Enterprise</p>
              <p className="text-3xl font-bold text-white mb-2">Custom</p>
              <p className="text-xs text-slate-500 mb-4">Unlimited · SLA</p>
              <Link href="/pricing" className="text-sm text-purple-300 hover:text-white transition-colors">See details →</Link>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-amber-300 hover:text-white rounded-xl border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-all">
              Compare All Plans →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Ready to Grow Your Business?</h2>
              <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-8">
                Join hundreds of Ghanaian businesses already using High Purchase to sell more and collect faster.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                <Link href="/login" className="w-full sm:w-auto px-10 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5">
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
