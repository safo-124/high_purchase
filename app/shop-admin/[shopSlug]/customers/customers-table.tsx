"use client"

import { useState } from "react"
import { CustomerSummary, DebtCollectorData, ProductData, toggleCustomerStatus } from "../../actions"
import { CreatePurchaseDialog } from "./create-purchase-dialog"
import { toast } from "sonner"
import Link from "next/link"

interface CustomersTableProps {
  customers: CustomerSummary[]
  shopSlug: string
  collectors: DebtCollectorData[]
  products: ProductData[]
}

export function CustomersTable({ customers, shopSlug, collectors, products }: CustomersTableProps) {
  const [customerList, setCustomerList] = useState(customers)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggleStatus = async (customerId: string) => {
    setTogglingId(customerId)
    const result = await toggleCustomerStatus(shopSlug, customerId)
    
    if (result.success) {
      setCustomerList(prev => 
        prev.map(c => c.id === customerId ? { ...c, isActive: !c.isActive } : c)
      )
      toast.success("Customer status updated")
    } else {
      toast.error(result.error || "Failed to update status")
    }
    setTogglingId(null)
  }

  if (customerList.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No customers yet</h3>
        <p className="text-slate-400 text-sm">Add your first customer to start managing their accounts</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Active Loans</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Total Paid</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {customerList.map((customer) => {
                return (
                  <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-semibold text-sm">
                          {customer.firstName[0]}{customer.lastName[0]}
                        </div>
                        <div>
                          <Link 
                            href={`/shop-admin/${shopSlug}/customers/${customer.id}`}
                            className="text-sm font-medium text-white hover:text-violet-400 transition-colors"
                          >
                            {customer.firstName} {customer.lastName}
                          </Link>
                          {customer.assignedCollectorName && (
                            <p className="text-xs text-slate-500">Collector: {customer.assignedCollectorName}</p>
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
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(customer.id)}
                        disabled={togglingId === customer.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          customer.isActive
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        } ${togglingId === customer.id ? "opacity-50 cursor-wait" : ""}`}
                      >
                        {togglingId === customer.id ? (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : customer.isActive ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {customer.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* New Purchase Button */}
                        <CreatePurchaseDialog
                          customer={customer}
                          shopSlug={shopSlug}
                          products={products}
                        />
                        {/* View Details */}
                        <Link
                          href={`/shop-admin/${shopSlug}/customers/${customer.id}`}
                          className="p-2 rounded-lg bg-white/5 hover:bg-violet-500/20 text-slate-400 hover:text-violet-400 transition-all"
                          title="View details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
