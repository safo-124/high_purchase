import { requireCollectorForShop } from "@/lib/auth"
import { getAssignedCustomers } from "../../actions"
import { CreateCustomerDialog } from "./create-customer-dialog"
import { CustomersContent } from "./customers-content"

interface CollectorCustomersPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorCustomersPage({ params }: CollectorCustomersPageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const customers = await getAssignedCustomers(shopSlug)

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">My Customers</h1>
          <p className="text-sm sm:text-base text-slate-400">Manage and view your assigned customers</p>
        </div>
        <CreateCustomerDialog shopSlug={shopSlug} />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{customers.length}</p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">With Loans</p>
            <p className="text-2xl font-bold text-blue-400">
              {customers.filter((c) => c.activePurchases > 0).length}
            </p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Outstanding</p>
            <p className="text-xl font-bold text-orange-400">
              GHS {customers.reduce((sum, c) => sum + c.totalOwed, 0).toLocaleString()}
            </p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Collected</p>
            <p className="text-xl font-bold text-green-400">
              GHS {customers.reduce((sum, c) => sum + c.totalPaid, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Customers List with Search */}
        <CustomersContent customers={customers} shopSlug={shopSlug} />
    </div>
  )
}
