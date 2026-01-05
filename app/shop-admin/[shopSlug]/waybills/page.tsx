import { requireShopAdminForShop } from "../../../../lib/auth"
import { getWaybills, getWaybillStats } from "../../actions"
import { WaybillsTable } from "./waybills-table"

interface WaybillsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function WaybillsPage({ params }: WaybillsPageProps) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)

  const [waybills, stats] = await Promise.all([
    getWaybills(shopSlug),
    getWaybillStats(shopSlug),
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Waybills & Deliveries</h2>
        <p className="text-slate-400 mt-1">
          Track delivery documents for completed purchases
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Waybills</p>
              <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Pending Delivery</p>
              <p className="text-2xl font-bold text-blue-400">{stats.pendingDelivery}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/15 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">In Transit</p>
              <p className="text-2xl font-bold text-amber-400">{stats.inTransit}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Delivered</p>
              <p className="text-2xl font-bold text-green-400">{stats.delivered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {stats.pendingDelivery > 0 && (
        <div className="glass-card rounded-2xl p-4 border border-blue-500/30 bg-blue-500/5 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-blue-400">Waybills Ready for Delivery</p>
              <p className="text-sm text-slate-400 mt-1">
                {stats.pendingDelivery} waybill(s) have been generated for fully paid purchases. 
                Sales staff can view these and coordinate deliveries.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Waybills Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">All Waybills</h3>
        </div>
        <WaybillsTable waybills={waybills} shopSlug={shopSlug} />
      </div>
    </div>
  )
}
