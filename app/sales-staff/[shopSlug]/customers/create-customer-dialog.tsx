"use client"

import { useState } from "react"
import { createFullCustomer, CollectorOption, CreateCustomerPayload } from "../../actions"
import { PaymentPreference } from "@/app/generated/prisma/client"
import { toast } from "sonner"

interface CreateCustomerDialogProps {
  shopSlug: string
  collectors: CollectorOption[]
}

export function CreateCustomerDialog({ shopSlug, collectors }: CreateCustomerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [idType, setIdType] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [preferredPayment, setPreferredPayment] = useState<PaymentPreference>("BOTH")
  const [assignedCollectorId, setAssignedCollectorId] = useState("")

  function resetForm() {
    setFirstName("")
    setLastName("")
    setPhone("")
    setEmail("")
    setIdType("")
    setIdNumber("")
    setAddress("")
    setCity("")
    setRegion("")
    setPreferredPayment("BOTH")
    setAssignedCollectorId("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload: CreateCustomerPayload = {
        firstName,
        lastName,
        phone,
        email: email || null,
        idType: idType || null,
        idNumber: idNumber || null,
        address: address || null,
        city: city || null,
        region: region || null,
        preferredPayment,
        assignedCollectorId: assignedCollectorId || null,
      }

      const result = await createFullCustomer(shopSlug, payload)

      if (result.success) {
        toast.success("Customer created successfully")
        resetForm()
        setOpen(false)
      } else {
        toast.error(result.error || "Failed to create customer")
      }
    } catch {
      toast.error("Failed to create customer")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
      >
        Add Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add New Customer</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 uppercase mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 uppercase mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="0201234567"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* ID Info */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 uppercase mb-3">Identification</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">ID Type</label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="">Select ID Type</option>
                      <option value="Ghana Card">Ghana Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Passport">Passport</option>
                      <option value="Driver License">Driver License</option>
                      <option value="NHIS Card">NHIS Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">ID Number</label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="GHA-123456789-0"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 uppercase mb-3">Address</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Street Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main Street, Osu"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Accra"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Region</label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                      >
                        <option value="">Select Region</option>
                        <option value="Greater Accra">Greater Accra</option>
                        <option value="Ashanti">Ashanti</option>
                        <option value="Western">Western</option>
                        <option value="Eastern">Eastern</option>
                        <option value="Central">Central</option>
                        <option value="Northern">Northern</option>
                        <option value="Volta">Volta</option>
                        <option value="Bono">Bono</option>
                        <option value="Bono East">Bono East</option>
                        <option value="Ahafo">Ahafo</option>
                        <option value="Upper East">Upper East</option>
                        <option value="Upper West">Upper West</option>
                        <option value="North East">North East</option>
                        <option value="Savannah">Savannah</option>
                        <option value="Oti">Oti</option>
                        <option value="Western North">Western North</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment & Collector */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 uppercase mb-3">Payment Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Preferred Payment</label>
                    <select
                      value={preferredPayment}
                      onChange={(e) => setPreferredPayment(e.target.value as PaymentPreference)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="BOTH">Both (Online & Collector)</option>
                      <option value="ONLINE">Online Only</option>
                      <option value="DEBT_COLLECTOR">Debt Collector Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Assign Collector</label>
                    <select
                      value={assignedCollectorId}
                      onChange={(e) => setAssignedCollectorId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="">No collector</option>
                      {collectors.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 transition-all"
                >
                  {isLoading ? "Creating..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
