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
  
  // Customer portal account fields
  const [createAccount, setCreateAccount] = useState(false)
  const [accountEmail, setAccountEmail] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

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
    setCreateAccount(false)
    setAccountEmail("")
    setAccountPassword("")
    setConfirmPassword("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    // Validate passwords if creating account
    if (createAccount) {
      if (accountPassword !== confirmPassword) {
        toast.error("Passwords do not match")
        setIsLoading(false)
        return
      }
      if (accountPassword.length < 8) {
        toast.error("Password must be at least 8 characters")
        setIsLoading(false)
        return
      }
    }

    try {
      const payload: CreateCustomerPayload = {
        firstName,
        lastName,
        phone,
        email: createAccount ? undefined : (email || null),
        idType: idType || null,
        idNumber: idNumber || null,
        address: address || null,
        city: city || null,
        region: region || null,
        preferredPayment,
        assignedCollectorId: assignedCollectorId || null,
        createAccount,
        accountEmail: createAccount ? accountEmail : undefined,
        accountPassword: createAccount ? accountPassword : undefined,
      }

      const result = await createFullCustomer(shopSlug, payload)

      if (result.success) {
        const data = result.data as { hasAccount?: boolean }
        if (data?.hasAccount) {
          toast.success("Customer created with portal account!")
        } else {
          toast.success("Customer created successfully")
        }
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
                      <option value="" className="bg-slate-900 text-white">Select ID Type</option>
                      <option value="Ghana Card" className="bg-slate-900 text-white">Ghana Card</option>
                      <option value="Voter ID" className="bg-slate-900 text-white">Voter ID</option>
                      <option value="Passport" className="bg-slate-900 text-white">Passport</option>
                      <option value="Driver License" className="bg-slate-900 text-white">Driver License</option>
                      <option value="NHIS Card" className="bg-slate-900 text-white">NHIS Card</option>
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
                        <option value="" className="bg-slate-900 text-white">Select Region</option>
                        <option value="Greater Accra" className="bg-slate-900 text-white">Greater Accra</option>
                        <option value="Ashanti" className="bg-slate-900 text-white">Ashanti</option>
                        <option value="Western" className="bg-slate-900 text-white">Western</option>
                        <option value="Eastern" className="bg-slate-900 text-white">Eastern</option>
                        <option value="Central" className="bg-slate-900 text-white">Central</option>
                        <option value="Northern" className="bg-slate-900 text-white">Northern</option>
                        <option value="Volta" className="bg-slate-900 text-white">Volta</option>
                        <option value="Bono" className="bg-slate-900 text-white">Bono</option>
                        <option value="Bono East" className="bg-slate-900 text-white">Bono East</option>
                        <option value="Ahafo" className="bg-slate-900 text-white">Ahafo</option>
                        <option value="Upper East" className="bg-slate-900 text-white">Upper East</option>
                        <option value="Upper West" className="bg-slate-900 text-white">Upper West</option>
                        <option value="North East" className="bg-slate-900 text-white">North East</option>
                        <option value="Savannah" className="bg-slate-900 text-white">Savannah</option>
                        <option value="Oti" className="bg-slate-900 text-white">Oti</option>
                        <option value="Western North" className="bg-slate-900 text-white">Western North</option>
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
                      <option value="BOTH" className="bg-slate-900 text-white">Both (Online & Collector)</option>
                      <option value="ONLINE" className="bg-slate-900 text-white">Online Only</option>
                      <option value="DEBT_COLLECTOR" className="bg-slate-900 text-white">Debt Collector Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Assign Collector</label>
                    <select
                      value={assignedCollectorId}
                      onChange={(e) => setAssignedCollectorId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="" className="bg-slate-900 text-white">No collector</option>
                      {collectors.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Portal Access */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <h3 className="text-sm font-medium text-slate-400 uppercase">Customer Portal Access</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateAccount(!createAccount)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      createAccount ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        createAccount ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                
                {createAccount && (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-4">
                    <p className="text-xs text-indigo-300">
                      Create login credentials for customer to access their portal and view purchases.
                    </p>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Account Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        required={createAccount}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Password <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          required={createAccount}
                          minLength={8}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Confirm Password <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required={createAccount}
                          minLength={8}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>
                    
                    {accountPassword && confirmPassword && accountPassword !== confirmPassword && (
                      <p className="text-xs text-red-400">Passwords do not match</p>
                    )}
                    {accountPassword && accountPassword.length > 0 && accountPassword.length < 8 && (
                      <p className="text-xs text-amber-400">Password must be at least 8 characters</p>
                    )}
                  </div>
                )}
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
