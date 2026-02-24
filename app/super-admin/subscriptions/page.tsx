import { getSubscriptionPlans, getBusinessSubscriptions } from "../platform-actions"
import { SubscriptionsContent } from "./subscriptions-content"
import { SuperAdminShell } from "../super-admin-shell"

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const params = await searchParams
  const tab = params.tab || "plans"
  const page = parseInt(params.page || "1")

  const [plans, subscriptions] = await Promise.all([
    getSubscriptionPlans(),
    tab === "subscriptions" ? getBusinessSubscriptions({ page, pageSize: 20 }) : Promise.resolve({ subscriptions: [] as never[], total: 0, totalPages: 0 }),
  ])

  return (
    <SuperAdminShell activeHref="/super-admin/subscriptions">
      <SubscriptionsContent plans={plans} subscriptions={subscriptions} currentTab={tab} currentPage={page} />
    </SuperAdminShell>
  )
}
