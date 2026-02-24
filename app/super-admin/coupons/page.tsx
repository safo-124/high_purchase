import { SuperAdminShell } from "../super-admin-shell"
import { getCoupons } from "../billing-actions"
import { CouponsList } from "./coupons-client"

export default async function CouponsPage() {
  const { coupons } = await getCoupons()

  return (
    <SuperAdminShell activeHref="/super-admin/coupons">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Coupons & Promo Codes</h2>
        <p className="text-slate-400">Create and manage discount codes for subscriptions</p>
      </div>
      <CouponsList coupons={coupons} />
    </SuperAdminShell>
  )
}
