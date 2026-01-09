import { requireCollectorForShop } from "@/lib/auth"
import { getCollectorDashboard } from "../actions"
import { CollectorSidebar } from "./collector-sidebar"

interface CollectorLayoutProps {
  children: React.ReactNode
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorLayout({ children, params }: CollectorLayoutProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const dashboard = await getCollectorDashboard(shopSlug)

  return (
    <div className="min-h-screen bg-mesh flex">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-teal-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[90px]" />
      </div>

      {/* Sidebar */}
      <CollectorSidebar 
        shopSlug={shopSlug} 
        shopName={dashboard.shopName} 
        collectorName={dashboard.collectorName} 
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 relative z-10 pt-16 lg:pt-0 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
