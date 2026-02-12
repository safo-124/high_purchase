import { getBusinessStaff, getBusinessShops, getBusinessAccountants } from "../../actions"
import { StaffContent } from "./staff-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessStaffPage({ params }: Props) {
  const { businessSlug } = await params
  const [shopStaff, shops, accountants] = await Promise.all([
    getBusinessStaff(businessSlug),
    getBusinessShops(businessSlug),
    getBusinessAccountants(businessSlug),
  ])

  // Merge shop staff and accountants
  const staff = [...shopStaff, ...accountants]

  // Calculate totals by role
  const shopAdmins = staff.filter(s => s.role === "SHOP_ADMIN")
  const salesStaff = staff.filter(s => s.role === "SALES_STAFF")
  const collectors = staff.filter(s => s.role === "DEBT_COLLECTOR")
  const accountantCount = accountants.length
  const activeStaff = staff.filter(s => s.isActive)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Staff Directory</h1>
          <p className="text-slate-400">Manage all team members across your shops</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Staff</p>
          <p className="text-2xl font-bold text-white">{staff.length}</p>
          <p className="text-xs text-green-400 mt-1">{activeStaff.length} active</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Shop Admins</p>
          <p className="text-2xl font-bold text-purple-400">{shopAdmins.length}</p>
          <p className="text-xs text-slate-500 mt-1">Managing shops</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sales Staff</p>
          <p className="text-2xl font-bold text-cyan-400">{salesStaff.length}</p>
          <p className="text-xs text-slate-500 mt-1">Processing sales</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Collectors</p>
          <p className="text-2xl font-bold text-amber-400">{collectors.length}</p>
          <p className="text-xs text-slate-500 mt-1">Collecting payments</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Accountants</p>
          <p className="text-2xl font-bold text-teal-400">{accountantCount}</p>
          <p className="text-xs text-slate-500 mt-1">Financial access</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Shops</p>
          <p className="text-2xl font-bold text-blue-400">{shops.length}</p>
          <p className="text-xs text-slate-500 mt-1">Locations</p>
        </div>
      </div>

      {/* Staff Table */}
      <StaffContent 
        staff={staff} 
        shops={shops.map(s => ({ id: s.id, name: s.name, shopSlug: s.shopSlug }))}
        businessSlug={businessSlug}
      />
    </div>
  )
}
