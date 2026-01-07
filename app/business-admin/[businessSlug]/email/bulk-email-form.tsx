"use client"

import { useState, useTransition } from "react"
import { sendBulkEmailAction } from "../../email-actions"

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  shopId: string
}

interface Shop {
  id: string
  name: string
}

interface BulkEmailFormProps {
  businessSlug: string
  fromEmail: string
  fromName: string
  customers: Customer[]
  shops: Shop[]
  isEnabled: boolean
}

export function BulkEmailForm({
  businessSlug,
  fromEmail,
  fromName,
  customers,
  shops,
  isEnabled,
}: BulkEmailFormProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [recipientType, setRecipientType] = useState<"all" | "shop" | "selected">("all")
  const [selectedShopId, setSelectedShopId] = useState<string>("")
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)

  // Get recipient count based on selection
  const getRecipientCount = () => {
    if (recipientType === "all") return customers.length
    if (recipientType === "shop" && selectedShopId) {
      return customers.filter((c) => c.shopId === selectedShopId).length
    }
    if (recipientType === "selected") return selectedCustomers.length
    return 0
  }

  async function handleSubmit(formData: FormData) {
    setMessage(null)

    if (!isEnabled) {
      setMessage({ type: "error", text: "Email sending is disabled. Enable it in settings." })
      return
    }

    if (getRecipientCount() === 0) {
      setMessage({ type: "error", text: "No recipients selected" })
      return
    }

    // Add recipient info to form data
    formData.set("recipientType", recipientType)
    if (recipientType === "shop") {
      formData.set("shopId", selectedShopId)
    }
    if (recipientType === "selected") {
      formData.set("selectedCustomerIds", JSON.stringify(selectedCustomers))
    }

    startTransition(async () => {
      const result = await sendBulkEmailAction(businessSlug, formData)
      if (result.success) {
        const data = result.data as { sentCount: number; failedCount: number }
        setMessage({
          type: "success",
          text: `Successfully sent ${data.sentCount} email${data.sentCount !== 1 ? "s" : ""}${data.failedCount > 0 ? ` (${data.failedCount} failed)` : ""}`,
        })
        // Reset form
        setSelectedCustomers([])
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send emails" })
      }
    })
  }

  function toggleCustomer(customerId: string) {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    )
  }

  function selectAllCustomers() {
    setSelectedCustomers(customers.map((c) => c.id))
  }

  function deselectAllCustomers() {
    setSelectedCustomers([])
  }

  return (
    <form action={handleSubmit} className="glass-card p-6 space-y-6">
      <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Compose Email
      </h3>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {message.text}
        </div>
      )}

      {!isEnabled && (
        <div className="p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm">
          Email sending is currently disabled. Enable it in the settings to send emails.
        </div>
      )}

      {/* From Info (read-only) */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">From</label>
        <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300">
          {fromName} &lt;{fromEmail}&gt;
        </div>
      </div>

      {/* Recipients */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Recipients</label>
        
        <div className="space-y-3">
          {/* Recipient type selector */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRecipientType("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                recipientType === "all"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              All Customers ({customers.length})
            </button>
            
            {shops.length > 1 && (
              <button
                type="button"
                onClick={() => setRecipientType("shop")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  recipientType === "shop"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                By Shop
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                setRecipientType("selected")
                setShowCustomerPicker(true)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                recipientType === "selected"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              Select Specific ({selectedCustomers.length})
            </button>
          </div>

          {/* Shop selector */}
          {recipientType === "shop" && (
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="">Select a shop...</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} ({customers.filter((c) => c.shopId === shop.id).length} customers)
                </option>
              ))}
            </select>
          )}

          {/* Selected customers display */}
          {recipientType === "selected" && selectedCustomers.length > 0 && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">
                  {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? "s" : ""} selected
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomerPicker(true)}
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Edit Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm text-slate-400 mb-2">
          Subject <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          placeholder="Enter email subject..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="body" className="block text-sm text-slate-400 mb-2">
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={10}
          placeholder="Enter your message... (HTML is supported)"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none"
        />
        <p className="mt-2 text-xs text-slate-500">
          You can use HTML tags for formatting (e.g., &lt;b&gt;, &lt;p&gt;, &lt;a&gt;)
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <p className="text-sm text-slate-400">
          Sending to <span className="font-bold text-white">{getRecipientCount()}</span> recipient{getRecipientCount() !== 1 ? "s" : ""}
        </p>
        <button
          type="submit"
          disabled={isPending || !isEnabled || getRecipientCount() === 0}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Email
            </>
          )}
        </button>
      </div>

      {/* Customer Picker Modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Select Recipients</h3>
              <button
                type="button"
                onClick={() => setShowCustomerPicker(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <button
                type="button"
                onClick={selectAllCustomers}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Select All
              </button>
              <span className="text-slate-500">|</span>
              <button
                type="button"
                onClick={deselectAllCustomers}
                className="text-sm text-slate-400 hover:text-white"
              >
                Deselect All
              </button>
              <span className="flex-1" />
              <span className="text-sm text-slate-400">
                {selectedCustomers.length} selected
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {customers.map((customer) => (
                  <label
                    key={customer.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => toggleCustomer(customer.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{customer.email}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {shops.find((s) => s.id === customer.shopId)?.name}
                    </span>
                  </label>
                ))}

                {customers.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No customers with email addresses found.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCustomerPicker(false)}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
