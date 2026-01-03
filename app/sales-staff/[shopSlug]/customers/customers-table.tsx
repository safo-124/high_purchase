"use client"

import { useState } from "react"
import Link from "next/link"
import { FullCustomerData, CollectorOption, assignCollectorToCustomer } from "../../actions"
import { toast } from "sonner"

interface CustomersTableProps {
  customers: FullCustomerData[]
  collectors: CollectorOption[]
  shopSlug: string
}

export function CustomersTable({ customers, collectors, shopSlug }: CustomersTableProps) {
  const [search, setSearch] = useState("")
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const filteredCustomers = customers.filter((c) => {
    const searchLower = search.toLowerCase()
    return (
      c.firstName.toLowerCase().includes(searchLower) ||
      c.lastName.toLowerCase().includes(searchLower) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(searchLower)
    )
  })

  async function handleAssignCollector(customerId: string, collectorId: string | null) {
    setAssigningId(customerId)
    try {
      const result = await assignCollectorToCustomer(shopSlug, customerId, collectorId)
      if (result.success) {
        toast.success(collectorId ? "Collector assigned" : "Collector removed")
      } else {
        toast.error(result.error || "Failed to assign collector")
      }
    } catch {
      toast.error("Failed to assign collector")
    } finally {
      setAssigningId(null)
    }
  }

  if (customers.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">No customers yet</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="p-4 border-b border-white/5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full max-w-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Customer</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Contact</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">ID</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Collector</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Purchases</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Outstanding</th>
              <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-linear-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-400">
                        {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {customer.firstName} {customer.lastName}
                      </p>
                      {customer.address && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{customer.address}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">{customer.phone}</p>
                  {customer.email && (
                    <p className="text-xs text-slate-400">{customer.email}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {customer.idType ? (
                    <div>
                      <p className="text-xs text-slate-400">{customer.idType}</p>
                      <p className="text-sm text-white">{customer.idNumber}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={customer.assignedCollectorId || ""}
                    onChange={(e) => handleAssignCollector(customer.id, e.target.value || null)}
                    disabled={assigningId === customer.id}
                    className="text-sm bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                  >
                    <option value="">No collector</option>
                    {collectors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-white">{customer.totalPurchases}</span>
                </td>
                <td className="px-4 py-3">
                  {customer.totalOutstanding > 0 ? (
                    <span className="text-sm font-medium text-amber-400">
                      GHS {customer.totalOutstanding.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-sm text-green-400">Cleared</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/sales-staff/${shopSlug}/customers/${customer.id}`}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                      title="View details"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <Link
                      href={`/sales-staff/${shopSlug}/new-sale?customer=${customer.id}`}
                      className="p-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 hover:text-indigo-300 transition-all"
                      title="New sale"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCustomers.length === 0 && search && (
        <div className="p-8 text-center">
          <p className="text-slate-400">No customers match your search</p>
        </div>
      )}
    </div>
  )
}
