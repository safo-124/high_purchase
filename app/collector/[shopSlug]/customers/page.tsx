import Link from "next/link"
import { requireCollectorForShop } from "@/lib/auth"
import { getAssignedCustomers } from "../../actions"
import { CreateCustomerDialog } from "./create-customer-dialog"

interface CollectorCustomersPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorCustomersPage({ params }: CollectorCustomersPageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const customers = await getAssignedCustomers(shopSlug)

  // Sort by outstanding balance (highest first)
  const sortedCustomers = [...customers].sort((a, b) => b.totalOwed - a.totalOwed)

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

        {/* Customers List */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {customers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No customers assigned</h3>
              <p className="text-slate-400 text-sm mb-6">Create your first customer to get started</p>
              <CreateCustomerDialog shopSlug={shopSlug} />
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-white/5">
                {sortedCustomers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/collector/${shopSlug}/customers/${customer.id}`}
                    className="block p-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold flex-shrink-0">
                        {customer.firstName[0]}{customer.lastName[0]}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">
                            {customer.firstName} {customer.lastName}
                          </h3>
                          {customer.activePurchases > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-xs flex-shrink-0">
                              {customer.activePurchases}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-400 mb-2">{customer.phone}</p>
                        
                        {/* Financial Info */}
                        <div className="flex items-center gap-4 text-sm">
                          {customer.totalOwed > 0 ? (
                            <span className="font-medium text-orange-400">
                              Owes: GHS {customer.totalOwed.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-500">No debt</span>
                          )}
                          <span className="text-emerald-400">
                            Paid: GHS {customer.totalPaid.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                      <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Active Loans</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Paid</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                              {customer.firstName[0]}{customer.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {customer.firstName} {customer.lastName}
                              </p>
                              {customer.address && (
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">{customer.address}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-white">{customer.phone}</p>
                            {customer.email && (
                              <p className="text-xs text-slate-400">{customer.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {customer.activePurchases > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-sm">
                              {customer.activePurchases}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {customer.totalOwed > 0 ? (
                            <span className="text-sm font-medium text-orange-400">
                              GHS {customer.totalOwed.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">GHS 0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-emerald-400">
                            GHS {customer.totalPaid.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/collector/${shopSlug}/customers/${customer.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
    </div>
  )
}
