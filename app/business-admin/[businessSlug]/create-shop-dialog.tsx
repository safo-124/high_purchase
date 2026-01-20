"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createShop } from "../actions"
import { toast } from "sonner"

interface CreateShopDialogProps {
  businessSlug: string
}

export function CreateShopDialog({ businessSlug }: CreateShopDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [shopSlug, setShopSlug] = useState("")
  
  // Shop Admin fields
  const [createAdmin, setCreateAdmin] = useState(true)
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [adminPhone, setAdminPhone] = useState("")
  const [adminGender, setAdminGender] = useState<"" | "MALE" | "FEMALE" | "OTHER">("")
  const [adminIdCardType, setAdminIdCardType] = useState<"" | "GHANA_CARD" | "VOTER_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "OTHER">("")
  const [adminIdCardNumber, setAdminIdCardNumber] = useState("")
  const [adminGuarantorName, setAdminGuarantorName] = useState("")
  const [adminGuarantorPhone, setAdminGuarantorPhone] = useState("")
  const [adminGuarantorRelationship, setAdminGuarantorRelationship] = useState("")
  const [adminAddress, setAdminAddress] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData()
    formData.append("name", name)
    formData.append("shopSlug", shopSlug)
    formData.append("createAdmin", createAdmin.toString())
    
    if (createAdmin) {
      formData.append("adminName", adminName)
      formData.append("adminEmail", adminEmail)
      formData.append("adminPassword", adminPassword)
      formData.append("adminPhone", adminPhone)
      formData.append("adminGender", adminGender)
      formData.append("adminIdCardType", adminIdCardType)
      formData.append("adminIdCardNumber", adminIdCardNumber)
      formData.append("adminGuarantorName", adminGuarantorName)
      formData.append("adminGuarantorPhone", adminGuarantorPhone)
      formData.append("adminGuarantorRelationship", adminGuarantorRelationship)
      formData.append("adminAddress", adminAddress)
    }

    const result = await createShop(businessSlug, formData)

    if (result.success) {
      const data = result.data as { shop: { name: string }; shopAdmin: { email: string } | null }
      if (data.shopAdmin) {
        toast.success(`Shop "${data.shop.name}" created with admin ${data.shopAdmin.email}!`)
      } else {
        toast.success("Shop created successfully!")
      }
      setOpen(false)
      resetForm()
    } else {
      toast.error(result.error || "Failed to create shop")
    }

    setIsLoading(false)
  }

  const resetForm = () => {
    setName("")
    setShopSlug("")
    setCreateAdmin(true)
    setAdminName("")
    setAdminEmail("")
    setAdminPassword("")
    setAdminPhone("")
    setAdminGender("")
    setAdminIdCardType("")
    setAdminIdCardNumber("")
    setAdminGuarantorName("")
    setAdminGuarantorPhone("")
    setAdminGuarantorRelationship("")
    setAdminAddress("")
  }

  const handleNameChange = (value: string) => {
    setName(value)
    // Auto-generate slug from name
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
    setShopSlug(slug)
  }

  // Auto-generate admin email from shop slug
  const handleSlugChange = (value: string) => {
    const normalizedSlug = value.toLowerCase()
    setShopSlug(normalizedSlug)
    if (createAdmin && !adminEmail) {
      setAdminEmail(`admin@${normalizedSlug || "shop"}.com`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Shop
          <svg className="w-4 h-4 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900/95 backdrop-blur-xl border border-white/10 sm:max-w-lg rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-transparent pointer-events-none" />
        
        <div className="relative p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Create New Shop</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Add a new shop to your business
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Shop Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
                Shop Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Osu Branch"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
            
            {/* Shop Slug */}
            <div className="space-y-2">
              <label htmlFor="shopSlug" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Shop Slug
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">highpurchase.com/</span>
                <input
                  id="shopSlug"
                  type="text"
                  placeholder="osu-branch"
                  value={shopSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  pattern="^[a-z0-9-]+$"
                  className="w-full pl-[140px] pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-900 px-3 text-xs text-slate-500">Shop Admin</span>
              </div>
            </div>

            {/* Create Admin Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Create Shop Admin</p>
                  <p className="text-xs text-slate-400">Add an admin user for this shop</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateAdmin(!createAdmin)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  createAdmin ? "bg-emerald-500" : "bg-slate-600"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  createAdmin ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Admin Fields (Conditional) */}
            {createAdmin && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                {/* Basic Info Section */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Basic Information</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Admin Name */}
                  <div className="space-y-2">
                    <label htmlFor="adminName" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Full Name *
                    </label>
                    <input
                      id="adminName"
                      type="text"
                      placeholder="Kofi Asante"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  {/* Admin Phone */}
                  <div className="space-y-2">
                    <label htmlFor="adminPhone" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Phone *
                    </label>
                    <input
                      id="adminPhone"
                      type="tel"
                      placeholder="0241234567"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Admin Email */}
                  <div className="space-y-2">
                    <label htmlFor="adminEmail" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email *
                    </label>
                    <input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@shop.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  {/* Admin Gender */}
                  <div className="space-y-2">
                    <label htmlFor="adminGender" className="text-sm font-medium text-slate-200">Gender *</label>
                    <select
                      id="adminGender"
                      value={adminGender}
                      onChange={(e) => setAdminGender(e.target.value as typeof adminGender)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="" className="bg-slate-800 text-white">Select Gender</option>
                      <option value="MALE" className="bg-slate-800 text-white">Male</option>
                      <option value="FEMALE" className="bg-slate-800 text-white">Female</option>
                      <option value="OTHER" className="bg-slate-800 text-white">Other</option>
                    </select>
                  </div>
                </div>

                {/* Admin Password */}
                <div className="space-y-2">
                  <label htmlFor="adminPassword" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="adminPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required={createAdmin}
                      minLength={8}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878l4.242 4.242M15 12a3 3 0 00-3-3m6 0a9 9 0 01-1.657 5.657L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label htmlFor="adminAddress" className="text-sm font-medium text-slate-200">Address</label>
                  <input
                    id="adminAddress"
                    type="text"
                    placeholder="123 Main Street, Accra"
                    value={adminAddress}
                    onChange={(e) => setAdminAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                {/* ID Card Section */}
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">ID Card Information</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* ID Card Type */}
                  <div className="space-y-2">
                    <label htmlFor="adminIdCardType" className="text-sm font-medium text-slate-200">ID Card Type *</label>
                    <select
                      id="adminIdCardType"
                      value={adminIdCardType}
                      onChange={(e) => setAdminIdCardType(e.target.value as typeof adminIdCardType)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="" className="bg-slate-800 text-white">Select ID Type</option>
                      <option value="GHANA_CARD" className="bg-slate-800 text-white">Ghana Card</option>
                      <option value="VOTER_ID" className="bg-slate-800 text-white">Voter ID</option>
                      <option value="PASSPORT" className="bg-slate-800 text-white">Passport</option>
                      <option value="DRIVERS_LICENSE" className="bg-slate-800 text-white">Driver&apos;s License</option>
                      <option value="OTHER" className="bg-slate-800 text-white">Other</option>
                    </select>
                  </div>

                  {/* ID Card Number */}
                  <div className="space-y-2">
                    <label htmlFor="adminIdCardNumber" className="text-sm font-medium text-slate-200">ID Card Number *</label>
                    <input
                      id="adminIdCardNumber"
                      type="text"
                      placeholder="GHA-123456789-0"
                      value={adminIdCardNumber}
                      onChange={(e) => setAdminIdCardNumber(e.target.value)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Guarantor Section */}
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Guarantor Information</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Guarantor Name */}
                  <div className="space-y-2">
                    <label htmlFor="adminGuarantorName" className="text-sm font-medium text-slate-200">Guarantor Name *</label>
                    <input
                      id="adminGuarantorName"
                      type="text"
                      placeholder="Jane Doe"
                      value={adminGuarantorName}
                      onChange={(e) => setAdminGuarantorName(e.target.value)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  {/* Guarantor Phone */}
                  <div className="space-y-2">
                    <label htmlFor="adminGuarantorPhone" className="text-sm font-medium text-slate-200">Guarantor Phone *</label>
                    <input
                      id="adminGuarantorPhone"
                      type="tel"
                      placeholder="0201234567"
                      value={adminGuarantorPhone}
                      onChange={(e) => setAdminGuarantorPhone(e.target.value)}
                      required={createAdmin}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Guarantor Relationship */}
                <div className="space-y-2">
                  <label htmlFor="adminGuarantorRelationship" className="text-sm font-medium text-slate-200">Relationship</label>
                  <input
                    id="adminGuarantorRelationship"
                    type="text"
                    placeholder="Parent, Spouse, Friend, etc."
                    value={adminGuarantorRelationship}
                    onChange={(e) => setAdminGuarantorRelationship(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Shop...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Shop
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
