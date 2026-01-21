"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BusinessProfileData, updateBusinessProfile, updateBusinessLogo } from "../../../actions"
import { Building2, Upload, X, Save, Globe, Phone, Mail, MapPin, Type } from "lucide-react"

interface BusinessProfileFormProps {
  profile: BusinessProfileData
  businessSlug: string
}

export function BusinessProfileForm({ profile, businessSlug }: BusinessProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: profile.name,
    tagline: profile.tagline || "",
    address: profile.address || "",
    phone: profile.phone || "",
    email: profile.email || "",
    website: profile.website || "",
  })
  
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl || "")
  const [logoPreview, setLogoPreview] = useState(profile.logoUrl || "")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setSuccess(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB")
      return
    }

    setUploadingLogo(true)
    setError(null)

    try {
      // Convert to base64 for preview and storage
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        setLogoPreview(base64)
        setLogoUrl(base64)
        
        // Save logo immediately
        const result = await updateBusinessLogo(businessSlug, base64)
        if (!result.success) {
          setError(result.error || "Failed to upload logo")
        }
        setUploadingLogo(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError("Failed to upload logo")
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    setLogoPreview("")
    setLogoUrl("")
    const result = await updateBusinessLogo(businessSlug, null)
    if (!result.success) {
      setError(result.error || "Failed to remove logo")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateBusinessProfile(businessSlug, {
        name: formData.name,
        tagline: formData.tagline || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        logoUrl: logoUrl || null,
      })

      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error || "Failed to update profile")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Logo Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          Business Logo
        </h3>
        
        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="relative">
            {logoPreview ? (
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20">
                <Image
                  src={logoPreview}
                  alt="Business logo"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-dashed border-white/20 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-slate-500" />
              </div>
            )}
          </div>
          
          {/* Upload Button */}
          <div className="flex-1">
            <label className="block">
              <span className="sr-only">Choose logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="block w-full text-sm text-slate-400
                  file:mr-4 file:py-3 file:px-6
                  file:rounded-xl file:border-0
                  file:text-sm file:font-medium
                  file:bg-cyan-500/20 file:text-cyan-400
                  hover:file:bg-cyan-500/30
                  file:cursor-pointer cursor-pointer
                  file:transition-colors"
              />
            </label>
            <p className="mt-3 text-sm text-slate-500">
              Recommended: Square image, at least 200x200px. Max 2MB.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Supports: PNG, JPG, GIF, WebP
            </p>
            {uploadingLogo && (
              <p className="mt-2 text-sm text-cyan-400 flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></span>
                Uploading...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-400" />
          Business Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Business Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                placeholder="Your business name"
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tagline / Slogan
            </label>
            <div className="relative">
              <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleInputChange}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                placeholder="Your business tagline"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">This will be displayed below your business name</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                placeholder="+233 XX XXX XXXX"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Business Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                placeholder="info@business.com"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                placeholder="https://www.business.com"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Business Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                placeholder="Business address"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Read-only Info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-500 uppercase mb-1">Business Slug</p>
            <p className="text-white font-mono">{profile.businessSlug}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-500 uppercase mb-1">Country</p>
            <p className="text-white">{profile.country}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-500 uppercase mb-1">Created</p>
            <p className="text-white">
              {new Date(profile.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-green-400 text-sm">Business profile updated successfully!</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
        >
          {loading ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  )
}
