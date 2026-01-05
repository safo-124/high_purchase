import { requireSalesStaffForShop } from "@/lib/auth"
import { getFullCustomers, getDebtCollectorsForAssignment } from "../../actions"
import { CustomersTable } from "./customers-table"
import { CreateCustomerDialog } from "./create-customer-dialog"

interface CustomersPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function SalesStaffCustomersPage({ params }: CustomersPageProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const [customers, collectors] = await Promise.all([
    getFullCustomers(shopSlug),
    getDebtCollectorsForAssignment(shopSlug),
  ])

  const activeCustomers = customers.filter((c) => c.isActive).length
  const totalOutstanding = customers.reduce((sum, c) => sum + c.totalOutstanding, 0)

  return (
    <div className="p-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Customers</h1>
          <p className="text-slate-400">Manage your customer accounts</p>
        </div>
        <CreateCustomerDialog shopSlug={shopSlug} collectors={collectors} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-white">{customers.length}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">Active</p>
          <p className="text-2xl font-bold text-green-400">{activeCustomers}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">With Collector</p>
          <p className="text-2xl font-bold text-blue-400">
            {customers.filter((c) => c.assignedCollectorId).length}
          </p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-amber-400">
            GHS {totalOutstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Customers Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">All Customers</h2>
        </div>
        <CustomersTable customers={customers} collectors={collectors} shopSlug={shopSlug} />
      </div>
    </div>
  )
}
