import { requireShopAdminForShop } from "@/lib/auth"
import { getAllShopPayments, getPaymentStats } from "../../actions"
import { PaymentsContent } from "./payments-content"

interface PaymentsPageProps {
  params: Promise<{ shopSlug: string }>
  searchParams: Promise<{ tab?: string; startDate?: string; endDate?: string }>
}

export default async function PaymentsPage({ params, searchParams }: PaymentsPageProps) {
  const { shopSlug } = await params
  const { tab, startDate, endDate } = await searchParams
  const { user, shop } = await requireShopAdminForShop(shopSlug)

  // Parse dates
  const parsedStartDate = startDate ? new Date(startDate) : undefined
  const parsedEndDate = endDate ? new Date(endDate) : undefined

  // Determine active tab
  const activeTab = (tab === "confirmed" || tab === "rejected" || tab === "pending") ? tab : "pending"

  // Fetch payments and stats
  const [payments, stats] = await Promise.all([
    getAllShopPayments(shopSlug, {
      status: activeTab,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    }),
    getPaymentStats(shopSlug, parsedStartDate, parsedEndDate),
  ])

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Payment Management</h2>
        <p className="text-slate-400 mt-1">
          View and manage all payments collected by debt collectors
        </p>
      </div>

      {/* Payments Content */}
      <PaymentsContent
        payments={payments}
        shopSlug={shopSlug}
        stats={stats}
        initialTab={activeTab}
        startDate={startDate || ""}
        endDate={endDate || ""}
      />
    </div>
  )
}
