import { redirect } from "next/navigation"
import { checkCustomerSession, getCustomerDashboard, getCustomerNotifications } from "@/app/customer/actions"
import { CustomerNavbar } from "../components/customer-navbar"
import { NotificationsContent } from "./notifications-content"

interface CustomerNotificationsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CustomerNotificationsPage({ params }: CustomerNotificationsPageProps) {
  const { shopSlug } = await params
  
  // Check authentication
  const session = await checkCustomerSession()
  if (!session) {
    redirect(`/customer/${shopSlug}/login`)
  }

  // Get data
  const [dashboardData, notifications] = await Promise.all([
    getCustomerDashboard(),
    getCustomerNotifications()
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
          <NotificationsContent notifications={notifications} />
        </main>
      </div>
    </div>
  )
}
