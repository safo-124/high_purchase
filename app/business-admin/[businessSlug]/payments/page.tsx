import { getBusinessPaymentsWithStatus, getBusinessPaymentStats, getBusinessShops } from "../../actions"
import { PaymentsContent } from "./payments-content"

interface Props {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{ tab?: string; startDate?: string; endDate?: string }>
}

export default async function BusinessPaymentsPage({ params, searchParams }: Props) {
  const { businessSlug } = await params
  const { tab, startDate, endDate } = await searchParams

  // Parse dates
  const parsedStartDate = startDate ? new Date(startDate) : undefined
  const parsedEndDate = endDate ? new Date(endDate) : undefined

  // Determine active tab
  const activeTab = (tab === "confirmed" || tab === "rejected" || tab === "pending") ? tab : "pending"

  // Fetch payments, stats, and shops
  const [payments, stats, shops] = await Promise.all([
    getBusinessPaymentsWithStatus(businessSlug, {
      status: activeTab,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    }),
    getBusinessPaymentStats(businessSlug, parsedStartDate, parsedEndDate),
    getBusinessShops(businessSlug),
  ])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Payment Management</h1>
        <p className="text-slate-400">View and manage all payments collected across your business</p>
      </div>

      {/* Payments Content */}
      <PaymentsContent 
        payments={payments} 
        businessSlug={businessSlug}
        stats={stats}
        shops={shops.map(s => ({ name: s.name, shopSlug: s.shopSlug }))}
        initialTab={activeTab}
        startDate={startDate || ""}
        endDate={endDate || ""}
      />
    </div>
  )
}
