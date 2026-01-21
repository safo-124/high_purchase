"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getBusinessShops, updateShopPaymentConfig, ShopData } from "../../../actions"

export default function PaymentSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const businessSlug = params.businessSlug as string
  
  const [shops, setShops] = useState<ShopData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingShop, setEditingShop] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Form state for editing
  const [formData, setFormData] = useState({
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankBranch: "",
    mobileMoneyProvider: "",
    mobileMoneyNumber: "",
    mobileMoneyName: "",
  })

  useEffect(() => {
    loadShops()
  }, [businessSlug])

  async function loadShops() {
    try {
      const data = await getBusinessShops(businessSlug)
      setShops(data)
    } catch (error) {
      console.error("Failed to load shops:", error)
    } finally {
      setLoading(false)
    }
  }

  function startEditing(shop: ShopData) {
    setEditingShop(shop.id)
    setFormData({
      bankName: shop.bankName || "",
      bankAccountNumber: shop.bankAccountNumber || "",
      bankAccountName: shop.bankAccountName || "",
      bankBranch: shop.bankBranch || "",
      mobileMoneyProvider: shop.mobileMoneyProvider || "",
      mobileMoneyNumber: shop.mobileMoneyNumber || "",
      mobileMoneyName: shop.mobileMoneyName || "",
    })
    setMessage(null)
  }

  function cancelEditing() {
    setEditingShop(null)
    setFormData({
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
      bankBranch: "",
      mobileMoneyProvider: "",
      mobileMoneyNumber: "",
      mobileMoneyName: "",
    })
  }

  async function handleSave(shopId: string) {
    setSaving(shopId)
    setMessage(null)
    
    try {
      const result = await updateShopPaymentConfig(businessSlug, shopId, {
        bankName: formData.bankName || null,
        bankAccountNumber: formData.bankAccountNumber || null,
        bankAccountName: formData.bankAccountName || null,
        bankBranch: formData.bankBranch || null,
        mobileMoneyProvider: formData.mobileMoneyProvider || null,
        mobileMoneyNumber: formData.mobileMoneyNumber || null,
        mobileMoneyName: formData.mobileMoneyName || null,
      })

      if (result.success) {
        setMessage({ type: "success", text: "Payment configuration saved successfully!" })
        await loadShops()
        setEditingShop(null)
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save configuration" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while saving" })
    } finally {
      setSaving(null)
    }
  }

  const mobileMoneyProviders = [
    "MTN Mobile Money",
    "Vodafone Cash",
    "AirtelTigo Money",
    "G-Money",
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <Link href={`/business-admin/${businessSlug}/settings`} className="hover:text-cyan-400">
            Settings
          </Link>
          <span>/</span>
          <span>Payment Configuration</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Configuration</h1>
        <p className="text-slate-400">
          Configure bank and mobile money details for each shop. These details will appear on invoices and receipts.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl ${
          message.type === "success" 
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" 
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Shops List */}
      <div className="space-y-6">
        {shops.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-400">No shops found. Create a shop first to configure payment settings.</p>
          </div>
        ) : (
          shops.map((shop) => (
            <div key={shop.id} className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {shop.name}
                  </h3>
                  <p className="text-sm text-slate-400">/{shop.shopSlug}</p>
                </div>
                {editingShop !== shop.id && (
                  <button
                    onClick={() => startEditing(shop)}
                    className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                  >
                    {shop.bankName || shop.mobileMoneyProvider ? "Edit" : "Configure"}
                  </button>
                )}
              </div>

              {editingShop === shop.id ? (
                /* Edit Mode */
                <div className="space-y-6">
                  {/* Bank Details */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Bank Transfer Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Bank Name</label>
                        <input
                          type="text"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          placeholder="e.g., GCB Bank"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Branch</label>
                        <input
                          type="text"
                          value={formData.bankBranch}
                          onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                          placeholder="e.g., Accra Main Branch"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Account Name</label>
                        <input
                          type="text"
                          value={formData.bankAccountName}
                          onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                          placeholder="e.g., Shop Name Ltd"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Account Number</label>
                        <input
                          type="text"
                          value={formData.bankAccountNumber}
                          onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                          placeholder="e.g., 1234567890"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mobile Money Details */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Mobile Money Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Provider</label>
                        <select
                          value={formData.mobileMoneyProvider}
                          onChange={(e) => setFormData({ ...formData, mobileMoneyProvider: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
                        >
                          <option value="">Select Provider</option>
                          {mobileMoneyProviders.map((provider) => (
                            <option key={provider} value={provider}>{provider}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Account Name</label>
                        <input
                          type="text"
                          value={formData.mobileMoneyName}
                          onChange={(e) => setFormData({ ...formData, mobileMoneyName: e.target.value })}
                          placeholder="e.g., John Doe"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                        <input
                          type="text"
                          value={formData.mobileMoneyNumber}
                          onChange={(e) => setFormData({ ...formData, mobileMoneyNumber: e.target.value })}
                          placeholder="e.g., 024XXXXXXX"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 bg-white/5 text-slate-300 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(shop.id)}
                      disabled={saving === shop.id}
                      className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving === shop.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        "Save Configuration"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bank Details */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Bank Transfer
                    </h4>
                    {shop.bankName ? (
                      <div className="space-y-2 text-sm">
                        <p className="text-white"><span className="text-slate-400">Bank:</span> {shop.bankName}</p>
                        {shop.bankBranch && <p className="text-white"><span className="text-slate-400">Branch:</span> {shop.bankBranch}</p>}
                        {shop.bankAccountName && <p className="text-white"><span className="text-slate-400">Account Name:</span> {shop.bankAccountName}</p>}
                        {shop.bankAccountNumber && <p className="text-white"><span className="text-slate-400">Account No:</span> {shop.bankAccountNumber}</p>}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">Not configured</p>
                    )}
                  </div>

                  {/* Mobile Money Details */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Mobile Money
                    </h4>
                    {shop.mobileMoneyProvider ? (
                      <div className="space-y-2 text-sm">
                        <p className="text-white"><span className="text-slate-400">Provider:</span> {shop.mobileMoneyProvider}</p>
                        {shop.mobileMoneyName && <p className="text-white"><span className="text-slate-400">Name:</span> {shop.mobileMoneyName}</p>}
                        {shop.mobileMoneyNumber && <p className="text-white"><span className="text-slate-400">Number:</span> {shop.mobileMoneyNumber}</p>}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">Not configured</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
