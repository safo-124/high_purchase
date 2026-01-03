import { requireSalesStaffForShop } from "@/lib/auth"
import { getAllDeliveries, getSalesStaffDashboard } from "../../actions"
import { DeliveriesTable } from "./deliveries-table"
import { SalesStaffNavbar } from "../components/sales-staff-navbar"

interface DeliveriesPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function DeliveriesPage({ params }: DeliveriesPageProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const [dashboard, deliveries] = await Promise.all([
    getSalesStaffDashboard(shopSlug),
    getAllDeliveries(shopSlug),
  ])

  const pending = deliveries.filter((d) => d.deliveryStatus === "PENDING").length
  const scheduled = deliveries.filter((d) => d.deliveryStatus === "SCHEDULED").length
  const inTransit = deliveries.filter((d) => d.deliveryStatus === "IN_TRANSIT").length
  const delivered = deliveries.filter((d) => d.deliveryStatus === "DELIVERED").length

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
      </div>

      <SalesStaffNavbar
        shopSlug={shopSlug}
        shopName={dashboard.shopName}
        staffName={dashboard.staffName}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Pending</p>
            <p className="text-2xl font-bold text-slate-400">{pending}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Scheduled</p>
            <p className="text-2xl font-bold text-blue-400">{scheduled}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">In Transit</p>
            <p className="text-2xl font-bold text-amber-400">{inTransit}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase mb-1">Delivered</p>
            <p className="text-2xl font-bold text-green-400">{delivered}</p>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">All Deliveries</h2>
          </div>
          <DeliveriesTable deliveries={deliveries} shopSlug={shopSlug} />
        </div>
      </main>
    </div>
  )
}
