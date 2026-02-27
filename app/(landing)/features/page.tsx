import Link from "next/link"

export const metadata = {
  title: "Features | High Purchase",
  description: "Discover all the powerful features that make High Purchase the #1 hire purchase management platform in Ghana.",
}

export default function FeaturesPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-blue-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto text-center relative">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs sm:text-sm text-blue-300 font-medium mb-6">&#10024; Features</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Powerful Features for <br className="hidden sm:block" />
            <span className="text-gradient-hero">Modern Businesses</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            From hire purchase management to POS, debt collection, accounting, and analytics &mdash; everything you need to run and grow your business, all in one platform.
          </p>
        </div>
      </section>

      {/* ===== CORE FEATURES GRID ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Core Features</h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">The essential tools every hire purchase business needs.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "\uD83C\uDFEA",
                title: "Multi-Shop Management",
                desc: "Run multiple shops from a single dashboard. Each shop gets its own staff, customers, inventory, and financial reports. Perfect for growing businesses with multiple branches across Ghana.",
                features: ["Separate dashboards per shop", "Role-based access control", "Cross-shop reporting", "Centralized inventory"],
                color: "purple",
              },
              {
                icon: "\uD83D\uDC65",
                title: "Customer Management",
                desc: "Detailed customer profiles with full purchase and payment history. Track every interaction, assess credit-worthiness, and build lasting relationships.",
                features: ["Complete purchase history", "Payment behavior tracking", "Customer portal access", "Automated SMS/Email alerts"],
                color: "blue",
              },
              {
                icon: "\uD83D\uDCB0",
                title: "Payment Collections",
                desc: "Dispatch debt collectors with real-time GPS-like tracking. Confirm payments instantly. Know who paid, how much, and when &mdash; no disputes, no guesswork.",
                features: ["Real-time collection tracking", "Payment confirmation flow", "Collector performance stats", "Daily collection reports"],
                color: "green",
              },
              {
                icon: "\uD83E\uDDFE",
                title: "POS System",
                desc: "Process cash sales alongside hire purchase transactions from the same terminal. Full point-of-sale with receipts, tax calculations, discounts, and daily reconciliation.",
                features: ["Cash & HP sales", "Receipt generation", "Tax calculation", "Daily reconciliation"],
                color: "cyan",
              },
              {
                icon: "\uD83D\uDCC4",
                title: "Automated Invoicing",
                desc: "Generate professional invoices, waybills, and receipts automatically. Send them via SMS or Email. Customize with your business branding and logo.",
                features: ["Auto-generated invoices", "SMS & Email delivery", "Custom branding", "Waybill generation"],
                color: "amber",
              },
              {
                icon: "\uD83D\uDCCA",
                title: "Real-Time Analytics",
                desc: "Live dashboards showing revenue, collections, outstanding debts, staff performance, and business health. Make data-driven decisions with beautiful charts and reports.",
                features: ["Revenue dashboards", "Staff performance", "Collection analytics", "Export to CSV/PDF"],
                color: "pink",
              },
            ].map((f) => {
              const colors: Record<string, { card: string; icon: string }> = {
                purple: { card: "hover:border-purple-500/30", icon: "from-purple-500/20 to-purple-500/10 border-purple-500/30" },
                blue: { card: "hover:border-blue-500/30", icon: "from-blue-500/20 to-blue-500/10 border-blue-500/30" },
                green: { card: "hover:border-green-500/30", icon: "from-green-500/20 to-green-500/10 border-green-500/30" },
                cyan: { card: "hover:border-cyan-500/30", icon: "from-cyan-500/20 to-cyan-500/10 border-cyan-500/30" },
                amber: { card: "hover:border-amber-500/30", icon: "from-amber-500/20 to-amber-500/10 border-amber-500/30" },
                pink: { card: "hover:border-pink-500/30", icon: "from-pink-500/20 to-pink-500/10 border-pink-500/30" },
              }
              return (
                <div key={f.title} className={`glass-card p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1.5 ${colors[f.color].card}`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center mb-6 text-2xl ${colors[f.color].icon}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5">{f.desc}</p>
                  <ul className="space-y-2">
                    {f.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-slate-300">
                        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== ACCOUNTING MODULE — DETAILED ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-emerald-600/10 via-teal-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs sm:text-sm text-emerald-300 font-medium mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Accounting Module
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
              Complete <span className="text-gradient-emerald">Financial Management</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              A built-in accounting suite designed specifically for hire purchase businesses. No spreadsheets, no separate tools &mdash; everything in one place.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "\uD83D\uDCCA",
                title: "Financial Statements",
                desc: "Auto-generated balance sheets, income statements, and cash flow statements. Get a comprehensive view of your business&apos;s financial health at any time.",
                features: ["Balance sheet generation", "Income statement reports", "Cash flow statements", "Period comparison"],
                color: "emerald",
              },
              {
                icon: "\uD83D\uDCB5",
                title: "Cash Flow Management",
                desc: "Track every cedi coming in and going out. Visualize cash flow patterns, identify trends, and forecast future cash positions with confidence.",
                features: ["Real-time cash tracking", "Inflow/outflow analysis", "Trend visualization", "Cash position forecasting"],
                color: "teal",
              },
              {
                icon: "\uD83D\uDCC8",
                title: "Profit Analysis",
                desc: "Understand your true margins. Analyze profitability by product, shop, time period, or customer segment to make smarter business decisions.",
                features: ["Gross & net profit tracking", "Per-product profit margins", "Shop-level profitability", "Trend analysis"],
                color: "green",
              },
              {
                icon: "\uD83E\uDDFE",
                title: "Expense Management",
                desc: "Categorize and track all business expenses. Set budgets, monitor spending, and identify areas where you can cut costs and improve margins.",
                features: ["Expense categorization", "Budget setting & tracking", "Spending alerts", "Vendor management"],
                color: "blue",
              },
              {
                icon: "\uD83D\uDCB0",
                title: "Tax Reports",
                desc: "Automated tax report generation ready for filing. No more scrambling during tax season &mdash; your numbers are always up to date and audit-ready.",
                features: ["Auto tax calculations", "Filing-ready reports", "Tax period summaries", "Compliance tracking"],
                color: "amber",
              },
              {
                icon: "\uD83D\uDCCB",
                title: "Audit Trail & Compliance",
                desc: "Every financial action is logged with timestamps, user info, and before/after values. Full transparency for audits, disputes, or compliance reviews.",
                features: ["Complete action logging", "User attribution", "Before/after snapshots", "Export audit logs"],
                color: "purple",
              },
            ].map((f) => {
              const colors: Record<string, { card: string; icon: string }> = {
                emerald: { card: "hover:border-emerald-500/30", icon: "from-emerald-500/20 to-emerald-500/10 border-emerald-500/30" },
                teal: { card: "hover:border-teal-500/30", icon: "from-teal-500/20 to-teal-500/10 border-teal-500/30" },
                green: { card: "hover:border-green-500/30", icon: "from-green-500/20 to-green-500/10 border-green-500/30" },
                blue: { card: "hover:border-blue-500/30", icon: "from-blue-500/20 to-blue-500/10 border-blue-500/30" },
                amber: { card: "hover:border-amber-500/30", icon: "from-amber-500/20 to-amber-500/10 border-amber-500/30" },
                purple: { card: "hover:border-purple-500/30", icon: "from-purple-500/20 to-purple-500/10 border-purple-500/30" },
              }
              return (
                <div key={f.title} className={`glass-card p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1.5 ${colors[f.color].card}`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center mb-6 text-2xl ${colors[f.color].icon}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5">{f.desc}</p>
                  <ul className="space-y-2">
                    {f.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-slate-300">
                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Additional accounting features strip */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: "\uD83D\uDCC9", label: "Aging Reports" },
              { icon: "\uD83C\uDFE6", label: "Bad Debt Tracking" },
              { icon: "\uD83D\uDCB3", label: "Commission Calc" },
              { icon: "\uD83D\uDD04", label: "Refund Management" },
              { icon: "\uD83D\uDCCA", label: "Revenue Categories" },
              { icon: "\uD83D\uDCC5", label: "Cash Summaries" },
              { icon: "\uD83D\uDCE4", label: "Data Exports" },
              { icon: "\uD83D\uDCC9", label: "Collection Efficiency" },
              { icon: "\uD83D\uDC65", label: "Staff Performance" },
              { icon: "\uD83D\uDCCA", label: "Budget Planning" },
              { icon: "\uD83D\uDCB0", label: "Dispute Tracking" },
              { icon: "\u26A1", label: "Real-time Sync" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-colors">
                <span className="text-base">{item.icon}</span>
                <span className="text-[11px] text-slate-400 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ADDITIONAL FEATURES ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">And So Much More</h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">Every detail, covered.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: "\uD83D\uDD10", label: "Role-Based Access" },
              { icon: "\uD83D\uDCF1", label: "Mobile Responsive" },
              { icon: "\uD83D\uDCB3", label: "Wallet System" },
              { icon: "\uD83D\uDEE1\uFE0F", label: "Secure & Encrypted" },
              { icon: "\uD83D\uDCC8", label: "Profit Tracking" },
              { icon: "\uD83D\uDD14", label: "Payment Reminders" },
              { icon: "\uD83E\uDDEE", label: "Interest Calculation" },
              { icon: "\uD83D\uDCCB", label: "Inventory Management" },
              { icon: "\uD83D\uDC77", label: "Staff Management" },
              { icon: "\uD83C\uDFF7\uFE0F", label: "Product Categories" },
              { icon: "\uD83D\uDD04", label: "Multi-Product Purchase" },
              { icon: "\uD83D\uDCC9", label: "Low Stock Alerts" },
              { icon: "\uD83D\uDDC2\uFE0F", label: "Document Storage" },
              { icon: "\uD83D\uDD50", label: "Payment Schedules" },
              { icon: "\uD83D\uDCDE", label: "Customer Portal" },
              { icon: "\uD83C\uDF0D", label: "Works Offline" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-lg sm:text-xl">{item.icon}</span>
                <span className="text-xs sm:text-sm text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BUSINESS VS CUSTOMER ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for <span className="text-gradient-hero">Everyone</span>
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">
              Powerful tools for business owners. A simple, transparent experience for customers.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Business */}
            <div className="glass-card p-6 sm:p-8 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl">{"\uD83C\uDFE2"}</div>
                <div>
                  <h3 className="text-xl font-semibold text-white">For Business Owners</h3>
                  <p className="text-xs text-slate-500">Everything to manage your HP business</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "Multi-shop dashboard with real-time stats",
                  "Create & manage hire purchase agreements",
                  "Dispatch and track debt collectors",
                  "Confirm and verify payments instantly",
                  "Generate invoices, receipts, waybills",
                  "View profit margins and cost prices",
                  "Staff role management",
                  "Inventory with low stock alerts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Accountant */}
            <div className="glass-card p-6 sm:p-8 hover:border-emerald-500/20 transition-colors ring-1 ring-emerald-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl">{"\uD83E\uDDEE"}</div>
                <div>
                  <h3 className="text-xl font-semibold text-white">For Accountants</h3>
                  <p className="text-xs text-emerald-400/60">Full financial management suite</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "Financial statements & balance sheets",
                  "Cash flow tracking & forecasting",
                  "Profit analysis by product or shop",
                  "Expense categorization & budgets",
                  "Tax report generation",
                  "Complete audit trail",
                  "Aging & bad debt reports",
                  "Commission & refund tracking",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer */}
            <div className="glass-card p-6 sm:p-8 hover:border-blue-500/20 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl">{"\uD83D\uDC64"}</div>
                <div>
                  <h3 className="text-xl font-semibold text-white">For Customers</h3>
                  <p className="text-xs text-slate-500">Transparent and easy to use</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "View all purchases and payment plans",
                  "Check outstanding balance anytime",
                  "See payment history and upcoming dues",
                  "Receive SMS/Email payment reminders",
                  "Track payment progress visually",
                  "Access from any device",
                  "Download receipts and invoices",
                  "Multiple shop accounts in one place",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE COMPARISON TABLE ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Feature Comparison</h2>
            <p className="text-base text-slate-400">See what&apos;s included in each plan.</p>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 font-medium">Feature</th>
                    <th className="text-center p-4 text-slate-400 font-medium">Starter</th>
                    <th className="text-center p-4 text-purple-300 font-medium">Professional</th>
                    <th className="text-center p-4 text-slate-400 font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Shops", starter: "1", pro: "5", enterprise: "Unlimited" },
                    { feature: "Customers", starter: "50", pro: "Unlimited", enterprise: "Unlimited" },
                    { feature: "Staff Accounts", starter: "3", pro: "20", enterprise: "Unlimited" },
                    { feature: "POS System", starter: true, pro: true, enterprise: true },
                    { feature: "Hire Purchase", starter: true, pro: true, enterprise: true },
                    { feature: "Basic Reports", starter: true, pro: true, enterprise: true },
                    { feature: "Debt Collection Tracking", starter: false, pro: true, enterprise: true },
                    { feature: "Accounting Module", starter: false, pro: true, enterprise: true },
                    { feature: "Financial Statements", starter: false, pro: true, enterprise: true },
                    { feature: "Cash Flow & Budgets", starter: false, pro: true, enterprise: true },
                    { feature: "Tax Reports", starter: false, pro: true, enterprise: true },
                    { feature: "Advanced Analytics", starter: false, pro: true, enterprise: true },
                    { feature: "Custom Branding", starter: false, pro: true, enterprise: true },
                    { feature: "API Access", starter: false, pro: false, enterprise: true },
                    { feature: "Dedicated Support", starter: false, pro: false, enterprise: true },
                    { feature: "SLA Guarantee", starter: false, pro: false, enterprise: true },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 text-white">{row.feature}</td>
                      {[row.starter, row.pro, row.enterprise].map((val, i) => (
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
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:-translate-y-0.5">
              View Pricing Plans &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to See It in Action?</h2>
              <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
                Sign up for free and start managing your hire purchase business with built-in accounting today.
              </p>
              <Link href="/register" className="group inline-flex px-10 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 relative overflow-hidden">
                <span className="relative z-10">Get Started Free &rarr;</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}