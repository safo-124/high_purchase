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
      <section className="relative z-10 pt-28 sm:pt-36 lg:pt-44 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-200 h-125 bg-linear-to-b from-purple-600/20 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 landing-fade-in">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs sm:text-sm text-purple-300 font-medium">&#127468;&#127469; Built for Ghanaian Businesses</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6 landing-fade-in landing-delay-1">
                Sell More with{" "}
                <span className="text-gradient-hero">Buy Now,{" "}</span>
                <br className="hidden sm:block" />
                <span className="text-gradient-hero">Pay Later</span>
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed landing-fade-in landing-delay-2">
                The complete platform to manage hire purchase sales, track payments,
                handle accounting, and grow your business. Multi-shop support, real-time collections,
                and automated invoicing &mdash; all in one place.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center lg:justify-start landing-fade-in landing-delay-3">
                <Link
                  href="/login"
                  className="group w-full sm:w-auto px-8 py-4 text-base font-semibold text-white rounded-2xl bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 text-center relative overflow-hidden"
                >
                  <span className="relative z-10">Get Started Free &rarr;</span>
                  <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="w-full sm:w-auto px-8 py-4 text-base font-medium text-slate-300 hover:text-white rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-center backdrop-blur-sm"
                >
                  See How It Works
                </Link>
              </div>

              <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start landing-fade-in landing-delay-4">
                {["Free to start", "No card required", "Cancel anytime"].map((text, i) => (
                  <div key={text} className={`${i === 2 ? "hidden sm:flex" : "flex"} items-center gap-2`}>
                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-sm text-slate-400">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative landing-fade-in landing-delay-3 hidden lg:block">
              <div className="absolute -inset-4 bg-linear-to-r from-purple-600/20 via-blue-600/20 to-cyan-500/20 rounded-3xl blur-2xl animate-pulse-slow" />
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
                    { label: "Revenue", value: "GHS 45.2K", pct: "\u2191 12%", bg: "bg-purple-500/10 border-purple-500/20" },
                    { label: "Collected", value: "GHS 38.1K", pct: "\u2191 8%", bg: "bg-green-500/10 border-green-500/20" },
                    { label: "Customers", value: "234", pct: "\u2191 15%", bg: "bg-blue-500/10 border-blue-500/20" },
                  ].map((s) => (
                    <div key={s.label} className={`p-3 rounded-xl ${s.bg} border`}>
                      <p className="text-xs text-slate-500">{s.label}</p>
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <p className="text-xs text-green-400">{s.pct}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-white/2 border border-white/5">
                  <p className="text-xs text-slate-500 mb-3">Weekly Collections</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-md bg-linear-to-t from-purple-600/80 to-blue-500/60 transition-all duration-500 hover:from-purple-500 hover:to-blue-400" style={{ height: `${h}%` }} />
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
                    <div key={tx.name} className="flex items-center justify-between p-2.5 rounded-lg bg-white/2 hover:bg-white/4 transition-colors">
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

      {/* ===== TRUSTED BY / STATS BAR ===== */}
      <section className="relative z-10 py-14 sm:py-18 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs uppercase tracking-widest text-slate-500 mb-8">Trusted by businesses across Ghana</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: "500+", label: "Businesses", icon: "\uD83C\uDFE2", color: "from-purple-500/20 to-purple-500/5 border-purple-500/20" },
              { value: "10,000+", label: "Customers Served", icon: "\uD83D\uDC65", color: "from-blue-500/20 to-blue-500/5 border-blue-500/20" },
              { value: "GHS 5M+", label: "Payments Processed", icon: "\uD83D\uDCB0", color: "from-green-500/20 to-green-500/5 border-green-500/20" },
              { value: "99.9%", label: "Uptime", icon: "\u26A1", color: "from-amber-500/20 to-amber-500/5 border-amber-500/20" },
            ].map((stat) => (
              <div key={stat.label} className={`text-center p-5 rounded-2xl bg-linear-to-b border ${stat.color} transition-all hover:scale-[1.03]`}>
                <span className="text-2xl sm:text-3xl mb-2 block">{stat.icon}</span>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE HIGHLIGHTS ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 sm:mb-18">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs sm:text-sm text-blue-300 font-medium mb-4">&#10024; Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              Everything You Need to <span className="text-gradient-hero">Run Your Business</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Manage shops, track purchases, collect payments, handle accounting, and generate reports &mdash; all from one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: "\uD83C\uDFEA", title: "Multi-Shop Management", desc: "Run multiple shops from one dashboard with separate staff, customers, and inventory.", color: "purple" },
              { icon: "\uD83D\uDC65", title: "Customer Tracking", desc: "Detailed profiles, purchase history, payment behavior, and credit scoring for every customer.", color: "blue" },
              { icon: "\uD83D\uDCB0", title: "Payment Collections", desc: "Dispatch debt collectors with real-time tracking. Confirm payments instantly.", color: "green" },
              { icon: "\uD83E\uDDFE", title: "POS System", desc: "Process cash sales alongside BNPL. Full POS with receipts, tax, and daily reports.", color: "cyan" },
              { icon: "\uD83D\uDCC4", title: "Automated Invoicing", desc: "Professional invoices, waybills, and receipts generated and sent via Email or SMS.", color: "amber" },
              { icon: "\uD83D\uDCCA", title: "Real-Time Reports", desc: "Daily financials, staff performance, collection tracking, and business analytics.", color: "pink" },
            ].map((f) => {
              const colors: Record<string, string> = {
                purple: "from-purple-500/20 to-purple-500/10 border-purple-500/30 group-hover:border-purple-400/40",
                blue: "from-blue-500/20 to-blue-500/10 border-blue-500/30 group-hover:border-blue-400/40",
                green: "from-green-500/20 to-green-500/10 border-green-500/30 group-hover:border-green-400/40",
                cyan: "from-cyan-500/20 to-cyan-500/10 border-cyan-500/30 group-hover:border-cyan-400/40",
                amber: "from-amber-500/20 to-amber-500/10 border-amber-500/30 group-hover:border-amber-400/40",
                pink: "from-pink-500/20 to-pink-500/10 border-pink-500/30 group-hover:border-pink-400/40",
              }
              const glows: Record<string, string> = {
                purple: "group-hover:shadow-purple-500/10",
                blue: "group-hover:shadow-blue-500/10",
                green: "group-hover:shadow-green-500/10",
                cyan: "group-hover:shadow-cyan-500/10",
                amber: "group-hover:shadow-amber-500/10",
                pink: "group-hover:shadow-pink-500/10",
              }
              return (
                <div key={f.title} className={`glass-card p-6 sm:p-8 group hover:-translate-y-1.5 transition-all duration-300 ${glows[f.color]} hover:shadow-2xl`}>
                  <div className={`w-14 h-14 rounded-2xl bg-linear-to-br border flex items-center justify-center mb-5 text-2xl ${colors[f.color]} transition-colors`}>
                    {f.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-12">
            <Link href="/features" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-purple-300 hover:text-white rounded-xl border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 transition-all hover:-translate-y-0.5">
              See All Features &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ===== ACCOUNTING MODULE ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-150 h-150 bg-linear-to-bl from-emerald-600/10 via-teal-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-100 h-100 bg-linear-to-tr from-purple-600/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs sm:text-sm text-emerald-300 font-medium mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Accounting Module
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Built-in{" "}
                <span className="text-gradient-emerald">Accounting</span>
                <br className="hidden sm:block" />
                for Smarter Decisions
              </h2>

              <p className="text-base sm:text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
                No need for separate accounting software. Our integrated accounting module gives you full financial visibility &mdash; from cash flow to profit margins, tax reports to financial statements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[
                  { icon: "\uD83D\uDCCA", title: "Financial Statements", desc: "Balance sheets, income & cash flow statements" },
                  { icon: "\uD83D\uDCB5", title: "Cash Flow Tracking", desc: "Real-time inflows and outflows monitoring" },
                  { icon: "\uD83D\uDCC8", title: "Profit Analysis", desc: "Margins, trends, and profitability insights" },
                  { icon: "\uD83E\uDDFE", title: "Expense Management", desc: "Categorize, track, and control spending" },
                  { icon: "\uD83D\uDCB0", title: "Tax Reports", desc: "Auto-generated tax summaries for filing" },
                  { icon: "\uD83D\uDCCB", title: "Audit Trail", desc: "Complete history of every financial action" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-emerald-500/20 transition-colors">
                    <span className="text-xl mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-emerald-300 hover:text-white rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all hover:-translate-y-0.5"
              >
                Explore Accounting Features &rarr;
              </Link>
            </div>

            {/* Accounting Dashboard Preview */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-6 bg-linear-to-br from-emerald-600/15 via-teal-600/10 to-blue-600/15 rounded-3xl blur-2xl" />
              <div className="relative glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Accounting</p>
                      <p className="text-sm font-bold text-white">Financial Overview</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Feb 2026</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-slate-500">Total Revenue</p>
                    <p className="text-xl font-bold text-white">GHS 128.5K</p>
                    <p className="text-xs text-emerald-400">&uarr; 18% vs last month</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-slate-500">Total Expenses</p>
                    <p className="text-xl font-bold text-white">GHS 42.3K</p>
                    <p className="text-xs text-red-400">&darr; 5% vs last month</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-linear-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 border border-emerald-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">Net Profit</p>
                    <span className="text-xs text-emerald-400 font-semibold">+67.1%</span>
                  </div>
                  <p className="text-2xl font-bold text-white">GHS 86.2K</p>
                  <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-[67%] rounded-full bg-linear-to-r from-emerald-500 to-teal-400" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/2 border border-white/5">
                  <p className="text-xs text-slate-500 mb-3">Cash Flow (Last 7 Days)</p>
                  <div className="flex items-end gap-1.5 h-14">
                    {[
                      { inH: 70, outH: 30 },
                      { inH: 55, outH: 45 },
                      { inH: 85, outH: 25 },
                      { inH: 60, outH: 40 },
                      { inH: 90, outH: 20 },
                      { inH: 75, outH: 35 },
                      { inH: 80, outH: 28 },
                    ].map((d, i) => (
                      <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
                        <div className="flex-1 rounded-t bg-emerald-500/60" style={{ height: `${d.inH}%` }} />
                        <div className="flex-1 rounded-t bg-red-500/40" style={{ height: `${d.outH}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded bg-emerald-500/60" />
                      <span className="text-[10px] text-slate-500">Income</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded bg-red-500/40" />
                      <span className="text-[10px] text-slate-500">Expenses</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Recent Transactions</p>
                  {[
                    { type: "Payment Received", ref: "HP-2891", amount: "+GHS 850", color: "text-emerald-400", iconBg: "bg-emerald-500/15 border-emerald-500/30" },
                    { type: "Expense: Rent", ref: "EXP-102", amount: "-GHS 2,500", color: "text-red-400", iconBg: "bg-red-500/15 border-red-500/30" },
                    { type: "Commission Paid", ref: "COM-045", amount: "-GHS 150", color: "text-orange-400", iconBg: "bg-orange-500/15 border-orange-500/30" },
                  ].map((tx) => (
                    <div key={tx.ref} className="flex items-center justify-between p-2.5 rounded-lg bg-white/2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${tx.iconBg}`}>
                          <span className="text-xs font-bold text-white">{tx.type.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-xs text-white font-medium">{tx.type}</p>
                          <p className="text-[10px] text-slate-500">{tx.ref}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${tx.color}`}>{tx.amount}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Accounting sub-feature strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-14">
            {[
              { icon: "\uD83D\uDCCA", label: "Cash Flow" },
              { icon: "\uD83D\uDCC8", label: "Budgets" },
              { icon: "\uD83C\uDFE6", label: "Bad Debts" },
              { icon: "\uD83D\uDCB3", label: "Commissions" },
              { icon: "\uD83D\uDCC9", label: "Aging Reports" },
              { icon: "\uD83E\uDDFE", label: "Refunds" },
              { icon: "\uD83D\uDCCB", label: "Revenue Split" },
              { icon: "\u26A1", label: "Exports" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-emerald-500/20 transition-colors text-center">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[11px] text-slate-400 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INDUSTRY USE CASES ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 sm:mb-18">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300 font-medium mb-4">&#127981; Industries</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              Perfect for <span className="text-gradient-hero">Your Industry</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              From electronics to furniture, businesses across Ghana use High Purchase to grow.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[
              { icon: "\uD83D\uDCFA", title: "Electronics", examples: "TVs, Phones, Laptops, Appliances", stat: "40% of our merchants", border: "hover:border-purple-500/30", statColor: "text-purple-300" },
              { icon: "\uD83D\uDECB\uFE0F", title: "Furniture", examples: "Sofas, Beds, Dining Sets, Mattresses", stat: "25% of our merchants", border: "hover:border-blue-500/30", statColor: "text-blue-300" },
              { icon: "\uD83C\uDFCD\uFE0F", title: "Motorbikes & Vehicles", examples: "Motorcycles, Tricycles, Auto Parts", stat: "15% of our merchants", border: "hover:border-green-500/30", statColor: "text-green-300" },
              { icon: "\uD83D\uDD27", title: "Building Materials", examples: "Roofing, Cement, Tiles, Plumbing", stat: "10% of our merchants", border: "hover:border-amber-500/30", statColor: "text-amber-300" },
            ].map((industry) => (
              <div key={industry.title} className={`glass-card p-6 group hover:-translate-y-1.5 transition-all duration-300 ${industry.border}`}>
                <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform origin-left">{industry.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{industry.title}</h3>
                <p className="text-sm text-slate-400 mb-3">{industry.examples}</p>
                <p className={`text-xs font-medium ${industry.statColor}`}>{industry.stat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 sm:mb-18">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs sm:text-sm text-green-300 font-medium mb-4">&#128640; Getting Started</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              Up and Running in <span className="text-gradient-hero">3 Easy Steps</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 relative">
            <div className="hidden sm:block absolute top-20 left-[20%] right-[20%] h-px bg-linear-to-r from-purple-500/40 via-blue-500/40 to-green-500/40" />
            {[
              { step: "01", title: "Register Your Business", desc: "Create your account, add shops, and invite your team \u2014 takes less than 5 minutes.", gradient: "from-purple-600 to-purple-400", glow: "shadow-purple-500/30" },
              { step: "02", title: "Add Products & Customers", desc: "Build your catalog, register your customer base, and set up payment plans.", gradient: "from-blue-600 to-blue-400", glow: "shadow-blue-500/30" },
              { step: "03", title: "Start Selling & Collecting", desc: "Create hire purchase agreements, track payments, and let the accounting handle itself.", gradient: "from-green-600 to-green-400", glow: "shadow-green-500/30" },
            ].map((item) => (
              <div key={item.step} className="relative text-center group">
                <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-linear-to-br ${item.gradient} flex items-center justify-center mx-auto mb-6 shadow-xl ${item.glow} group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300`}>
                  <span className="text-xl sm:text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-sm sm:text-base text-slate-400 max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-green-300 hover:text-white rounded-xl border border-green-500/20 hover:border-green-500/40 bg-green-500/5 hover:bg-green-500/10 transition-all hover:-translate-y-0.5">
              Learn More &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 sm:mb-18">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs sm:text-sm text-pink-300 font-medium mb-4">&#128172; Testimonials</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              Loved by <span className="text-gradient-hero">Businesses</span> Across Ghana
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Kwame Boateng", role: "Owner, Kwame Electronics", location: "Kumasi", quote: "High Purchase transformed how we do business. We used to track payments in a notebook \u2014 now everything is automated. Our collections went up 40% in the first month." },
              { name: "Akosua Mensah", role: "Manager, Akosua Furniture", location: "Accra", quote: "The multi-shop feature is a game-changer. I manage 3 branches from my phone. My staff know exactly who to collect from and how much, every single day." },
              { name: "Yaw Adjei", role: "Owner, Adjei Motorbikes", location: "Tamale", quote: "My customers love the portal \u2014 they can check their balance anytime. And the SMS reminders have reduced our default rate from 15% to just 3%. Incredible!" },
              { name: "Efua Darko", role: "Sales Manager, TechZone GH", location: "Takoradi", quote: "The accounting module is brilliant. I no longer need a separate spreadsheet for expenses \u2014 everything flows into reports automatically. Tax season is now stress-free." },
              { name: "Kofi Agyeman", role: "Owner, K&K Appliances", location: "Cape Coast", quote: "I was skeptical at first, but the free tier let me try it risk-free. Within a week I upgraded to Pro because the value is unbelievable for the price." },
              { name: "Ama Serwaa", role: "Owner, Serwaa Home Essentials", location: "Sunyani", quote: "The debt collector feature is what sold me. I can see exactly where my collectors are, what they collected, and everything gets confirmed in real time. No more disputes!" },
            ].map((t) => (
              <div key={t.name} className="glass-card p-6 group hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-300">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role} &middot; {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MOBILE PREVIEW ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-8 bg-linear-to-b from-purple-600/15 to-cyan-500/15 rounded-[3rem] blur-2xl" />
                <div className="relative w-65 sm:w-70 h-130 sm:h-140 rounded-[2.5rem] bg-linear-to-b from-slate-700 to-slate-800 p-2 shadow-2xl">
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
                      <div className="rounded-lg bg-linear-to-r from-purple-600/30 to-blue-600/30 border border-purple-500/20 p-2.5 mb-3">
                        <p className="text-[9px] text-slate-400 mb-0.5">Outstanding Balance</p>
                        <p className="text-lg font-bold text-white">GHS 1,250.00</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="w-[65%] h-full rounded-full bg-linear-to-r from-green-400 to-emerald-500" />
                          </div>
                          <span className="text-[9px] text-green-400">65%</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 mb-1.5 font-medium">Active Purchases</p>
                      {[
                        { item: "Samsung TV 55\"", remaining: "GHS 800" },
                        { item: "HP Laptop", remaining: "GHS 450" },
                      ].map((p) => (
                        <div key={p.item} className="flex items-center justify-between p-2 rounded-lg bg-white/4 border border-white/5 mb-1.5">
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
                        <div key={i} className="flex items-center justify-between p-1.5 rounded bg-white/2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400 text-[10px]">{"\u2713"}</span>
                            <span className="text-[9px] text-slate-400">{p.date}</span>
                          </div>
                          <span className="text-[10px] text-green-400 font-medium">{p.amount}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-900/90 backdrop-blur border-t border-white/5 flex items-center justify-around px-3">
                      {["\uD83C\uDFE0", "\uD83D\uDED2", "\uD83D\uDCAC", "\uD83D\uDC64"].map((icon, i) => (
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
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs sm:text-sm text-cyan-300 font-medium mb-6">&#128241; Mobile Ready</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Works on <span className="text-gradient-hero">Every Device</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-400 mb-8 max-w-lg mx-auto lg:mx-0">
                Customers check balances and payment history from their phones. Staff manage collections on the go. Accountants review financials remotely. No app download needed.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
                {[
                  { icon: "\uD83D\uDCF1", label: "Mobile Optimized" },
                  { icon: "\uD83D\uDDA5\uFE0F", label: "Desktop Dashboard" },
                  { icon: "\u26A1", label: "Real-Time Sync" },
                  { icon: "\uD83C\uDF10", label: "No App Needed" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-cyan-500/20 transition-colors">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLATFORM ROLES ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 sm:mb-18">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs sm:text-sm text-violet-300 font-medium mb-4">&#128101; Role-Based Access</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              Designed for <span className="text-gradient-hero">Every Role</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Each team member gets a tailored experience &mdash; from business owners to accountants, sales staff to debt collectors.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "\uD83C\uDFE2", title: "Business Admin", desc: "Full control over shops, staff, products, and settings. View cross-shop analytics and manage your entire operation.", color: "purple" },
              { icon: "\uD83E\uDDEE", title: "Accountant", desc: "Dedicated financial dashboard with cash flow, expenses, profit analysis, budgets, tax reports, and full audit trails.", color: "emerald" },
              { icon: "\uD83C\uDFEA", title: "Shop Admin", desc: "Manage a single shop \u2014 staff, inventory, sales, and customer relationships. Generate daily and weekly reports.", color: "blue" },
              { icon: "\uD83D\uDED2", title: "Sales Staff", desc: "Create hire purchase agreements, process POS sales, and manage customer interactions from the floor.", color: "cyan" },
              { icon: "\uD83D\uDCCB", title: "Debt Collector", desc: "View assigned collections, confirm payments, and update collection status in real-time while in the field.", color: "amber" },
              { icon: "\uD83D\uDC64", title: "Customer Portal", desc: "Customers view balances, payment history, upcoming dues, and download receipts \u2014 all from their phone.", color: "pink" },
            ].map((role) => {
              const colors: Record<string, { icon: string; border: string }> = {
                purple: { icon: "from-purple-500/20 to-purple-500/10 border-purple-500/30", border: "hover:border-purple-500/30" },
                emerald: { icon: "from-emerald-500/20 to-emerald-500/10 border-emerald-500/30", border: "hover:border-emerald-500/30" },
                blue: { icon: "from-blue-500/20 to-blue-500/10 border-blue-500/30", border: "hover:border-blue-500/30" },
                cyan: { icon: "from-cyan-500/20 to-cyan-500/10 border-cyan-500/30", border: "hover:border-cyan-500/30" },
                amber: { icon: "from-amber-500/20 to-amber-500/10 border-amber-500/30", border: "hover:border-amber-500/30" },
                pink: { icon: "from-pink-500/20 to-pink-500/10 border-pink-500/30", border: "hover:border-pink-500/30" },
              }
              return (
                <div key={role.title} className={`glass-card p-6 group hover:-translate-y-1 transition-all duration-300 ${colors[role.color].border}`}>
                  <div className={`w-12 h-12 rounded-xl bg-linear-to-br border flex items-center justify-center mb-4 text-xl ${colors[role.color].icon}`}>
                    {role.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{role.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{role.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== PRICING TEASER ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300 font-medium mb-4">&#128176; Pricing</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              Plans That <span className="text-gradient-hero">Scale With You</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Start free, upgrade when you&apos;re ready. Every plan includes core features plus the accounting module.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-6 sm:p-8 text-center group hover:-translate-y-1 transition-all duration-300">
              <p className="text-sm text-slate-400 mb-2">Starter</p>
              <p className="text-4xl font-bold text-white mb-2">Free</p>
              <p className="text-xs text-slate-500 mb-5">1 shop &middot; 50 customers</p>
              <ul className="text-left space-y-2 mb-6">
                {["Hire Purchase", "POS System", "Basic Reports", "Customer Portal"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="text-sm text-purple-300 hover:text-white transition-colors">See details &rarr;</Link>
            </div>

            <div className="glass-card p-6 sm:p-8 text-center ring-2 ring-purple-500/40 relative group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-purple-600 to-blue-600 text-[11px] font-semibold text-white shadow-lg shadow-purple-500/25">Most Popular</div>
              <p className="text-sm text-slate-400 mb-2">Professional</p>
              <p className="text-4xl font-bold text-white mb-2">GHS 99<span className="text-base text-slate-400 font-normal">/mo</span></p>
              <p className="text-xs text-slate-500 mb-5">5 shops &middot; Unlimited customers</p>
              <ul className="text-left space-y-2 mb-6">
                {["Everything in Starter", "Full Accounting Module", "Debt Collection Tracking", "Advanced Analytics"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="text-sm text-purple-300 hover:text-white transition-colors">See details &rarr;</Link>
            </div>

            <div className="glass-card p-6 sm:p-8 text-center group hover:-translate-y-1 transition-all duration-300">
              <p className="text-sm text-slate-400 mb-2">Enterprise</p>
              <p className="text-4xl font-bold text-white mb-2">Custom</p>
              <p className="text-xs text-slate-500 mb-5">Unlimited &middot; SLA &middot; API</p>
              <ul className="text-left space-y-2 mb-6">
                {["Everything in Pro", "Dedicated Support", "Custom Integrations", "SLA Guarantee"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="text-sm text-purple-300 hover:text-white transition-colors">See details &rarr;</Link>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-amber-300 hover:text-white rounded-xl border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-all hover:-translate-y-0.5">
              Compare All Plans &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">Ready to Grow Your Business?</h2>
              <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-8">
                Join hundreds of Ghanaian businesses already using High Purchase to sell more, collect faster, and manage finances smarter.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                <Link href="/login" className="group w-full sm:w-auto px-10 py-4 text-base font-semibold text-white rounded-2xl bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 relative overflow-hidden">
                  <span className="relative z-10">Get Started Free &rarr;</span>
                  <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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