import { requireShopAdminForShop } from "../../../../lib/auth"
import { getSalesStaff } from "../../actions"
import { StaffTable } from "./staff-table"

export default async function StaffPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)
  const staff = await getSalesStaff(shopSlug)

  // Stats
  const totalStaff = staff.length
  const activeStaff = staff.filter((s) => s.isActive).length

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">
            Sales Staff
          </h2>
          <p className="text-slate-400">
            View your sales team members and their performance.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Total Staff */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Staff</p>
              <p className="text-2xl font-bold text-white">{totalStaff}</p>
            </div>
          </div>
        </div>

        {/* Active Staff */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-white">{activeStaff}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <StaffTable staff={staff} />
      </div>
    </div>
  )
}
