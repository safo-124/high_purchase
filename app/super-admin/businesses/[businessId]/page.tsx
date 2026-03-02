import Link from "next/link"
import { SuperAdminShell } from "../../super-admin-shell"
import { getBusinessUsage } from "../../actions"
import { notFound } from "next/navigation"

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params

  let data: Awaited<ReturnType<typeof getBusinessUsage>>
  try {
    data = await getBusinessUsage(businessId)
  } catch {
    notFound()
  }

  const { business, admins, shops, counts, financials, activity, teamMembers, recentActivityFeed } = data

  const formatGHS = (n: number) =>
    `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const timeAgo = (date: Date | null) => {
    if (!date) return "Never"
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return d.toLocaleDateString("en-GH", { dateStyle: "medium" })
  }

  // Usage breakdown for the storage/records chart
  const usageBreakdown = [
    { label: "Customers", count: counts.customers.total, color: "bg-blue-500" },
    { label: "Products", count: counts.products.total, color: "bg-purple-500" },
    { label: "Shop Products", count: counts.shopProducts, color: "bg-violet-500" },
    { label: "Purchases", count: counts.purchases.total, color: "bg-green-500" },
    { label: "Purchase Items", count: counts.purchaseItems, color: "bg-emerald-500" },
    { label: "Payments", count: counts.payments, color: "bg-cyan-500" },
    { label: "Invoices", count: counts.invoices + counts.purchaseInvoices, color: "bg-teal-500" },
    { label: "Waybills", count: counts.waybills, color: "bg-lime-500" },
    { label: "POS Transactions", count: counts.posTransactions, color: "bg-amber-500" },
    { label: "Email Logs", count: counts.emailLogs, color: "bg-orange-500" },
    { label: "SMS Logs", count: counts.smsLogs, color: "bg-pink-500" },
    { label: "Conversations", count: counts.conversations, color: "bg-rose-500" },
    { label: "Messages", count: counts.inAppMessages, color: "bg-red-500" },
    { label: "Daily Reports", count: counts.dailyReports, color: "bg-indigo-500" },
    { label: "Wallet Txns", count: counts.walletTransactions, color: "bg-sky-500" },
    { label: "Staff Members", count: counts.staff, color: "bg-slate-500" },
    { label: "Categories", count: counts.categories, color: "bg-fuchsia-500" },
    { label: "Brands", count: counts.brands, color: "bg-yellow-500" },
    { label: "Taxes", count: counts.taxes, color: "bg-stone-500" },
    { label: "Suppliers", count: counts.suppliers, color: "bg-zinc-500" },
    { label: "Supply Items", count: counts.supplyItems + counts.supplyCategories, color: "bg-neutral-500" },
  ].filter((item) => item.count > 0)

  const maxCount = Math.max(...usageBreakdown.map((u) => u.count), 1)

  return (
    <SuperAdminShell activeHref="/super-admin/businesses">
        {/* Breadcrumb + Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link href="/super-admin" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/super-admin/businesses" className="hover:text-white transition-colors">Businesses</Link>
            <span>/</span>
            <span className="text-slate-300">{business.name}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${
                business.isActive
                  ? "bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 text-purple-300"
                  : "bg-gradient-to-br from-slate-500/20 to-slate-500/10 border border-slate-500/30 text-slate-400"
              }`}>
                {business.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{business.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-sm text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg">{business.businessSlug}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    business.isActive
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${business.isActive ? "bg-green-400" : "bg-orange-400"}`} />
                    {business.isActive ? "Active" : "Suspended"}
                  </span>
                  {business.posEnabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">POS</span>
                  )}
                  {business.supplyCatalogEnabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Supply</span>
                  )}
                </div>
              </div>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              <Link
                href="/super-admin/businesses"
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                ← Back to Businesses
              </Link>
            </div>
          </div>
        </div>

        {/* Business Info Bar */}
        <div className="glass-card p-4 mb-8">
          <div className="flex flex-wrap gap-6 text-sm">
            {business.email && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-slate-300">{business.email}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-slate-300">{business.phone}</span>
              </div>
            )}
            {business.address && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-slate-300">{business.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-slate-300">Created {new Date(business.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              <span className="text-slate-300">{business.country}</span>
            </div>
            <div className="flex items-center gap-3">
              {business.hasPolicy && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Policy ✓</span>}
              {business.hasEmailSettings && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Email ✓</span>}
              {business.hasSmsSettings && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">SMS ✓</span>}
            </div>
          </div>
        </div>

        {/* ===== Financial Summary ===== */}
        <div className="mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Financial Summary</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <div className="glass-card p-5">
            <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-white">{formatGHS(financials.totalRevenue)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-slate-500 mb-1">Total Collected</p>
            <p className="text-xl font-bold text-green-400">{formatGHS(financials.totalCollected)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-slate-500 mb-1">Outstanding</p>
            <p className="text-xl font-bold text-orange-400">{formatGHS(financials.totalOutstanding)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-slate-500 mb-1">POS Revenue</p>
            <p className="text-xl font-bold text-cyan-400">{formatGHS(financials.posRevenue)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-slate-500 mb-1">Wallet Balances</p>
            <p className="text-xl font-bold text-violet-400">{formatGHS(financials.walletBalance)}</p>
          </div>
        </div>

        {/* ===== Total Records + Key Counts ===== */}
        <div className="mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Database Usage</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Total Records Card */}
          <div className="glass-card p-6 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{counts.totalRecords.toLocaleString()}</p>
            <p className="text-sm text-slate-400">Total Records</p>
            <p className="text-xs text-slate-500 mt-2">Across all tables</p>
          </div>

          {/* Quick Counts Grid */}
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Record Counts</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Shops", value: counts.shops, icon: "🏪" },
                { label: "Staff", value: counts.staff, icon: "👥" },
                { label: "Customers", value: counts.customers.total, sub: `${counts.customers.active} active`, icon: "👤" },
                { label: "Products", value: counts.products.total, sub: `${counts.products.active} active`, icon: "📦" },
                { label: "Purchases", value: counts.purchases.total, sub: `${counts.purchases.active} active`, icon: "🛒" },
                { label: "Payments", value: counts.payments, icon: "💰" },
                { label: "POS Txns", value: counts.posTransactions, icon: "🧾" },
                { label: "Invoices", value: counts.invoices + counts.purchaseInvoices, icon: "📄" },
                { label: "Emails Sent", value: counts.emailLogs, icon: "📧" },
                { label: "SMS Sent", value: counts.smsLogs, icon: "📱" },
                { label: "Conversations", value: counts.conversations, icon: "💬" },
                { label: "Messages", value: counts.inAppMessages, icon: "✉️" },
                { label: "Daily Reports", value: counts.dailyReports, icon: "📊" },
                { label: "Wallet Txns", value: counts.walletTransactions, icon: "💳" },
                { label: "Waybills", value: counts.waybills, icon: "🚚" },
                { label: "Suppliers", value: counts.suppliers, icon: "🏭" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <p className="text-lg font-bold text-white">{item.value.toLocaleString()}</p>
                  {item.sub && <p className="text-xs text-slate-500">{item.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Storage Usage Breakdown Bar Chart ===== */}
        <div className="glass-card p-6 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Records by Table</h3>
              <p className="text-xs text-slate-400">Breakdown of all database records for this business</p>
            </div>
          </div>

          {usageBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No records yet</div>
          ) : (
            <div className="space-y-2.5">
              {usageBreakdown
                .sort((a, b) => b.count - a.count)
                .map((item) => {
                  const pct = (item.count / maxCount) * 100
                  return (
                    <div key={item.label} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300">{item.label}</span>
                        <span className="text-sm font-medium text-white">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-5 bg-white/[0.03] rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full ${item.color} opacity-70 group-hover:opacity-100 transition-opacity`}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* ===== Purchase Breakdown ===== */}
        <div className="mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Purchase Analysis</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-white">{counts.purchases.total}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{counts.purchases.active}</p>
            <p className="text-xs text-slate-400">Active</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{counts.purchases.completed}</p>
            <p className="text-xs text-slate-400">Completed</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{counts.purchases.overdue}</p>
            <p className="text-xs text-slate-400">Overdue</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{counts.purchases.defaulted}</p>
            <p className="text-xs text-slate-400">Defaulted</p>
          </div>
        </div>

        {/* ===== Shops + Admins + Activity ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Shops */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span>🏪</span> Shops ({shops.length})
            </h3>
            {shops.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No shops created yet</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {shops.map((shop) => (
                  <div key={shop.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">{shop.name}</p>
                      <span className={`w-2 h-2 rounded-full ${shop.isActive ? "bg-green-400" : "bg-orange-400"}`} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono mb-2">{shop.shopSlug}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Customers</p>
                        <p className="text-white font-medium">{shop._count.customers}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Staff</p>
                        <p className="text-white font-medium">{shop._count.members}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Products</p>
                        <p className="text-white font-medium">{shop._count.shopProducts}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admins */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span>👑</span> Business Admins ({admins.length})
            </h3>
            {admins.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No admins</p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-purple-300">{admin.name?.charAt(0).toUpperCase() || "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{admin.name || "No name"}</p>
                      <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          admin.lastSeenAt && (new Date().getTime() - new Date(admin.lastSeenAt).getTime()) < 86400000
                            ? "bg-green-400"
                            : "bg-slate-600"
                        }`} />
                        <span className="text-xs text-slate-500">{timeAgo(admin.lastSeenAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity Summary */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Activity</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Purchase</span>
                  <span className="text-white">{timeAgo(activity.lastPurchaseAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Payment</span>
                  <span className="text-white">{timeAgo(activity.lastPaymentAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span>📋</span> Recent Activity
            </h3>
            {activity.recentLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {activity.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500">{log.actorName}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {new Date(log.createdAt).toLocaleString("en-GH", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Team Members & Online Status ===== */}
        <div className="mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Team Members & Online Status</h3>
        </div>
        <div className="glass-card p-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">All Team Members</h3>
                <p className="text-xs text-slate-400">
                  {teamMembers.filter(m => m.lastSeenAt && (new Date().getTime() - new Date(m.lastSeenAt).getTime()) < 300000).length} online now · {teamMembers.length} total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-slate-400">Online (≤5min)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400">Recent (≤1hr)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span className="text-slate-400">Offline</span>
              </div>
            </div>
          </div>
          
          {teamMembers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No team members found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(() => {
                // Deduplicate by user id (a user may appear as both business admin and shop member)
                const seen = new Set<string>()
                const unique = teamMembers.filter(m => {
                  if (seen.has(m.id)) return false
                  seen.add(m.id)
                  return true
                })
                // Sort: online first, then by lastSeenAt desc
                const sorted = unique.sort((a, b) => {
                  const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0
                  const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0
                  return bTime - aTime
                })
                return sorted.map((member) => {
                  const now = new Date().getTime()
                  const lastSeen = member.lastSeenAt ? new Date(member.lastSeenAt).getTime() : 0
                  const diffMs = now - lastSeen
                  const isOnline = member.lastSeenAt && diffMs < 300000 // 5 min
                  const isRecent = member.lastSeenAt && diffMs < 3600000 // 1 hr
                  const roleLabel = member.role === "BUSINESS_ADMIN" ? "Business Admin"
                    : member.role === "SHOP_ADMIN" ? "Shop Admin"
                    : member.role === "SALES_STAFF" ? "Sales Staff"
                    : member.role === "DEBT_COLLECTOR" ? "Debt Collector"
                    : member.role
                  const roleColor = member.role === "BUSINESS_ADMIN" ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                    : member.role === "SHOP_ADMIN" ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                    : member.role === "SALES_STAFF" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                    : member.role === "DEBT_COLLECTOR" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                  const avatarGradient = member.role === "BUSINESS_ADMIN" ? "from-purple-500/30 to-violet-500/20 border-purple-500/30"
                    : member.role === "SHOP_ADMIN" ? "from-blue-500/30 to-indigo-500/20 border-blue-500/30"
                    : member.role === "SALES_STAFF" ? "from-cyan-500/30 to-teal-500/20 border-cyan-500/30"
                    : "from-amber-500/30 to-orange-500/20 border-amber-500/30"

                  return (
                    <div key={`${member.id}-${member.role}-${member.shopName}`} className={`p-3.5 rounded-xl border transition-all ${
                      isOnline
                        ? "bg-green-500/[0.03] border-green-500/20"
                        : isRecent
                        ? "bg-amber-500/[0.02] border-amber-500/10"
                        : "bg-white/[0.02] border-white/5"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} border flex items-center justify-center`}>
                            <span className="text-sm font-semibold text-white/80">{member.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e1b2e] ${
                            isOnline ? "bg-green-400 animate-pulse" : isRecent ? "bg-amber-400" : "bg-slate-600"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          <p className="text-xs text-slate-500 truncate">{member.shopName}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${roleColor}`}>
                          {roleLabel}
                        </span>
                        <span className={`text-[10px] ${isOnline ? "text-green-400 font-medium" : "text-slate-500"}`}>
                          {isOnline ? "● Online" : timeAgo(member.lastSeenAt)}
                        </span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

        {/* ===== Full Recent Activity Feed ===== */}
        <div className="mb-3">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recent Activity Feed</h3>
        </div>
        <div className="glass-card p-6 mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Activity Timeline</h3>
              <p className="text-xs text-slate-400">Payments, purchases, wallet deposits & daily reports</p>
            </div>
          </div>

          {recentActivityFeed.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-transparent" />
              
              <div className="space-y-1">
                {recentActivityFeed.map((item, idx) => {
                  const iconConfig = item.type === "PAYMENT"
                    ? { bg: "bg-green-500/15 border-green-500/30", color: "text-green-400", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /> }
                    : item.type === "PURCHASE"
                    ? { bg: "bg-blue-500/15 border-blue-500/30", color: "text-blue-400", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> }
                    : item.type === "WALLET"
                    ? { bg: "bg-cyan-500/15 border-cyan-500/30", color: "text-cyan-400", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" /> }
                    : { bg: "bg-purple-500/15 border-purple-500/30", color: "text-purple-400", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> }

                  const typeBadge = item.type === "PAYMENT"
                    ? { label: "Payment", cls: "text-green-400 bg-green-500/10 border-green-500/20" }
                    : item.type === "PURCHASE"
                    ? { label: "Purchase", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" }
                    : item.type === "WALLET"
                    ? { label: "Wallet", cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" }
                    : { label: "Report", cls: "text-purple-400 bg-purple-500/10 border-purple-500/20" }

                  // Show date dividers
                  const currentDate = new Date(item.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })
                  const prevDate = idx > 0 ? new Date(recentActivityFeed[idx - 1].createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" }) : null
                  const showDateLabel = idx === 0 || currentDate !== prevDate

                  return (
                    <div key={item.id}>
                      {showDateLabel && (
                        <div className="flex items-center gap-3 py-2 ml-11">
                          <span className="text-xs font-medium text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                            {currentDate}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                        <div className={`w-9 h-9 rounded-xl ${iconConfig.bg} border flex items-center justify-center flex-shrink-0 z-10`}>
                          <svg className={`w-4 h-4 ${iconConfig.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {iconConfig.icon}
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm text-white">{item.description}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                {item.customerName && (
                                  <span className="text-xs text-slate-400">
                                    <span className="text-slate-600">Customer:</span> {item.customerName}
                                  </span>
                                )}
                                {item.staffName && (
                                  <span className="text-xs text-slate-400">
                                    <span className="text-slate-600">By:</span> {item.staffName}
                                  </span>
                                )}
                                <span className="text-xs text-slate-500">{item.shopName}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${typeBadge.cls}`}>
                                {typeBadge.label}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(item.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===== Monthly Activity (if data exists) ===== */}
        {activity.monthlyActivity.length > 0 && (
          <div className="glass-card p-6 mb-10">
            <h3 className="text-sm font-semibold text-white mb-4">Monthly Purchase Activity (Last 6 Months)</h3>
            <div className="flex items-end gap-2 h-40">
              {activity.monthlyActivity.map((m) => {
                const maxPurchases = Math.max(...activity.monthlyActivity.map((x) => x.purchases), 1)
                const heightPct = (m.purchases / maxPurchases) * 100
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-white font-medium">{m.purchases}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-purple-600/80 to-blue-500/60 min-h-[4px]"
                        style={{ height: `${Math.max(heightPct, 3)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{m.month}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===== Config Checklist ===== */}
        <div className="glass-card p-6 mb-10">
          <h3 className="text-sm font-semibold text-white mb-4">Setup Checklist</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Business Policy", done: business.hasPolicy },
              { label: "Email Settings", done: business.hasEmailSettings },
              { label: "SMS Settings", done: business.hasSmsSettings },
              { label: "At least 1 Shop", done: shops.length > 0 },
              { label: "At least 1 Product", done: counts.products.total > 0 },
              { label: "At least 1 Customer", done: counts.customers.total > 0 },
              { label: "First Purchase", done: counts.purchases.total > 0 },
              { label: "First Payment", done: counts.payments > 0 },
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                item.done
                  ? "bg-green-500/5 border-green-500/20 text-green-400"
                  : "bg-white/[0.02] border-white/5 text-slate-500"
              }`}>
                {item.done ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
    </SuperAdminShell>
  )
}
