import { requireSalesStaffForShop } from "@/lib/auth"
import { getFullCustomers, getDebtCollectorsForAssignment, getSalesStaffDashboard } from "../../actions"
import { CustomersTable } from "./customers-table"
import { CreateCustomerDialog } from "./create-customer-dialog"
import { SalesStaffNavbar } from "../components/sales-staff-navbar"

interface CustomersPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function SalesStaffCustomersPage({ params }: CustomersPageProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const [dashboard, customers, collectors] = await Promise.all([
    getSalesStaffDashboard(shopSlug),
    getFullCustomers(shopSlug),
    getDebtCollectorsForAssignment(shopSlug),
  ])

  const activeCustomers = customers.filter((c) => c.isActive).length
  const totalOutstanding = customers.reduce((sum, c) => sum + c.totalOutstanding, 0)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
      </div>

      <SalesStaffNavbar
        shopSlug={shopSlug}
        shopName={dashboard.shopName}
        staffName={dashboard.staffName}
        rightContent={<CreateCustomerDialog shopSlug={shopSlug} collectors={collectors} />}
      />

      <main className="relative z-10 w-full px-6 py-8">
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
      </main>
    </div>
  )
}
