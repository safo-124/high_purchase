import { redirect } from "next/navigation"
import { getCustomerReceipts, checkCustomerSession, getCustomerDashboard } from "../../actions"
import { CustomerNavbar } from "../components/customer-navbar"
import { ReceiptsContent } from "./receipts-content"

export default async function CustomerReceiptsPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const session = await checkCustomerSession()

  if (!session) {
    redirect(`/customer/${shopSlug}/login`)
  }

  const [receipts, dashboardData] = await Promise.all([
    getCustomerReceipts(),
    getCustomerDashboard()
  ])

  if (!dashboardData) {
    redirect(`/customer/${shopSlug}/login`)
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[90px]" />
      </div>

      {/* Content */}
      <div className="relative">
        <CustomerNavbar
          shopSlug={shopSlug}
          shopName={dashboardData.shop.name}
          customerName={`${dashboardData.customer.firstName} ${dashboardData.customer.lastName}`}
          unreadCount={dashboardData.notifications.length}
          businessName={dashboardData.shop.businessName}
          businessLogoUrl={dashboardData.shop.businessLogoUrl}
        />
        
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <ReceiptsContent receipts={receipts} shopSlug={shopSlug} />
        </main>
      </div>
    </div>
  )
}
