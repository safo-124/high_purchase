import { getBusinessDeliveries, getBusinessReadyForDelivery, getBusinessDeliveryStats, getBusinessShops } from "../../actions"
import { DeliveriesTable } from "./deliveries-table"
import { ReadyForDeliveryTable } from "./ready-for-delivery-table"

interface DeliveriesPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessDeliveriesPage({ params }: DeliveriesPageProps) {
  const { businessSlug } = await params

  const [deliveries, readyForDelivery, stats, shops] = await Promise.all([
    getBusinessDeliveries(businessSlug),
    getBusinessReadyForDelivery(businessSlug),
    getBusinessDeliveryStats(businessSlug),
    getBusinessShops(businessSlug),
  ])

  const shopOptions = shops.map(s => ({ name: s.name, shopSlug: s.shopSlug }))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Deliveries</h1>
        <p className="text-slate-400">Manage deliveries across all your shops</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4 rounded-2xl border-2 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs text-green-400 uppercase font-medium">Ready to Deliver</p>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.readyForDelivery}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">Pending</p>
          <p className="text-2xl font-bold text-slate-400">{stats.pending}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">Scheduled</p>
          <p className="text-2xl font-bold text-blue-400">{stats.scheduled}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">In Transit</p>
          <p className="text-2xl font-bold text-amber-400">{stats.inTransit}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">Delivered</p>
          <p className="text-2xl font-bold text-green-400">{stats.delivered}</p>
        </div>
      </div>

      {/* Ready for Delivery Section - Highlighted */}
      {readyForDelivery.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden mb-8 border-2 border-green-500/30">
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-green-500/10 to-emerald-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Ready for Delivery</h2>
                <p className="text-sm text-green-400/80">Fully paid orders with waybills generated</p>
              </div>
            </div>
          </div>
          <ReadyForDeliveryTable deliveries={readyForDelivery} businessSlug={businessSlug} />
        </div>
      )}

      {/* All Deliveries Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">All Deliveries</h2>
        </div>
        <DeliveriesTable deliveries={deliveries} businessSlug={businessSlug} shops={shopOptions} />
      </div>
    </div>
  )
}
