"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createCustomerAsCollector } from "../../actions"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  address: string | null
  activePurchases: number
  totalOwed: number
  totalPaid: number
}

interface CustomersContentProps {
  customers: Customer[]
  shopSlug: string
  canCreateCustomers: boolean
}

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Northern", "Western",
  "Volta", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo",
  "Western North", "Oti", "North East", "Savannah",
]

const ID_TYPES = ["Ghana Card", "Voter ID", "Passport", "Driver's License", "NHIS Card", "SSNIT Card"]

export function CustomersContent({ customers: initialCustomers, shopSlug, canCreateCustomers }: CustomersContentProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState(initialCustomers)
  const [searchQuery, setSearchQuery] = useState("")
  
  // New customer modal state
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerLoading, setNewCustomerLoading] = useState(false)
  const [newFirstName, setNewFirstName] = useState("")
  const [newLastName, setNewLastName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newIdType, setNewIdType] = useState("")
  const [newIdNumber, setNewIdNumber] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newCity, setNewCity] = useState("")
  const [newRegion, setNewRegion] = useState("")

  // Filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.address?.toLowerCase().includes(query)
    )
  })

  // Sort by outstanding balance (highest first)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => b.totalOwed - a.totalOwed)

  const resetNewCustomerForm = () => {
    setNewFirstName(""); setNewLastName(""); setNewPhone(""); setNewEmail("")
    setNewIdType(""); setNewIdNumber(""); setNewAddress(""); setNewCity(""); setNewRegion("")
  }

  const handleNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewCustomerLoading(true)

    const result = await createCustomerAsCollector(shopSlug, {
      firstName: newFirstName,
      lastName: newLastName,
      phone: newPhone,
      email: newEmail || undefined,
      idType: newIdType || undefined,
      idNumber: newIdNumber || undefined,
      address: newAddress || undefined,
      city: newCity || undefined,
      region: newRegion || undefined,
    })

    if (result.success && result.data) {
      const data = result.data as { id: string; firstName: string; lastName: string; phone: string }
      toast.success(`Customer "${data.firstName} ${data.lastName}" created!`)
      
      // Add new customer to list
      setCustomers([...customers, {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: newEmail || null,
        address: newAddress || null,
        activePurchases: 0,
        totalOwed: 0,
        totalPaid: 0,
      }])
      
      setShowNewCustomer(false)
      resetNewCustomerForm()
      router.refresh()
    } else {
      toast.error(result.error || "Failed to create customer")
    }

    setNewCustomerLoading(false)
  }

  return (
    <>
      {/* Search Bar with New Customer Button */}
      <div className="glass-card p-4 rounded-xl mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, email, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {canCreateCustomers && (
            <button
              onClick={() => setShowNewCustomer(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              New Customer
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-slate-400 mt-2">
            Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
          </p>
        )}
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
            <p className="text-slate-400 text-sm mb-4">Ask your shop admin to assign customers to you</p>
            {canCreateCustomers && (
              <button
                onClick={() => setShowNewCustomer(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create New Customer
              </button>
            )}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500/20 to-slate-500/10 border border-slate-500/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your search query</p>
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

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create New Customer</h3>
              <button
                onClick={() => { setShowNewCustomer(false); resetNewCustomerForm() }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleNewCustomer} className="p-6 space-y-4">
              {/* Required Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  placeholder="0XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  placeholder="john@example.com"
                />
              </div>

              {/* ID Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">ID Type</label>
                  <select
                    value={newIdType}
                    onChange={(e) => setNewIdType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value="">Select ID Type</option>
                    {ID_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    placeholder="GHA-XXXXXXXXX-X"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    placeholder="Accra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Region</label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value="">Select Region</option>
                    {GHANA_REGIONS.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowNewCustomer(false); resetNewCustomerForm() }}
                  className="flex-1 px-4 py-2.5 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCustomerLoading || !newFirstName || !newLastName || !newPhone}
                  className="flex-1 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {newCustomerLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
