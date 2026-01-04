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
import { updateProduct, ProductData, CategoryData } from "../../actions"
import { toast } from "sonner"

interface EditProductDialogProps {
  product: ProductData
  shopSlug: string
  categories: CategoryData[]
}

export function EditProductDialog({ product, shopSlug, categories }: EditProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description || "")
  const [sku, setSku] = useState(product.sku || "")
  const [cashPrice, setCashPrice] = useState(product.cashPrice?.toString() || "0")
  const [layawayPrice, setLayawayPrice] = useState(product.layawayPrice?.toString() || "0")
  const [creditPrice, setCreditPrice] = useState(product.creditPrice?.toString() || "0")
  const [stockQuantity, setStockQuantity] = useState(product.stockQuantity.toString())
  const [imageUrl, setImageUrl] = useState(product.imageUrl || "")
  const [categoryId, setCategoryId] = useState(product.categoryId || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await updateProduct(shopSlug, product.id, {
      name,
      description: description || null,
      sku: sku || null,
      cashPrice: parseFloat(cashPrice) || 0,
      layawayPrice: parseFloat(layawayPrice) || 0,
      creditPrice: parseFloat(creditPrice) || 0,
      stockQuantity: parseInt(stockQuantity) || 0,
      imageUrl: imageUrl || null,
      categoryId: categoryId || null,
    })

    if (result.success) {
      toast.success(`Product "${name}" updated successfully!`)
      setOpen(false)
    } else {
      toast.error(result.error || "Failed to update product")
    }

    setIsLoading(false)
  }

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(product.name)
      setDescription(product.description || "")
      setSku(product.sku || "")
      setCashPrice(product.cashPrice?.toString() || "0")
      setLayawayPrice(product.layawayPrice?.toString() || "0")
      setCreditPrice(product.creditPrice?.toString() || "0")
      setStockQuantity(product.stockQuantity.toString())
      setImageUrl(product.imageUrl || "")
      setCategoryId(product.categoryId || "")
    }
    setOpen(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          title="Edit product"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900/95 backdrop-blur-xl border border-white/10 sm:max-w-lg rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-600/20 via-cyan-600/10 to-transparent pointer-events-none" />
        
        <div className="relative p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Edit Product</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Update product details
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Product Name */}
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-name"
                type="text"
                placeholder="Samsung Galaxy S24 Ultra"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Description
              </label>
              <textarea
                id="edit-description"
                placeholder="Brief product description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label htmlFor="edit-category" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Category
              </label>
              <select
                id="edit-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="" className="bg-slate-900">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-slate-900">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <label htmlFor="edit-sku" className="text-sm font-medium text-slate-200">
                SKU
              </label>
              <input
                id="edit-sku"
                type="text"
                placeholder="SGS24U-256"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
              />
            </div>

            {/* 3-Tier Pricing */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pricing Tiers (GHS) <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Cash Price */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-cashPrice" className="text-xs font-medium text-green-400">
                    Cash Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/60 text-sm">₵</span>
                    <input
                      id="edit-cashPrice"
                      type="number"
                      placeholder="0.00"
                      value={cashPrice}
                      onChange={(e) => setCashPrice(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-7 pr-2 py-2.5 bg-green-500/5 border border-green-500/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Full payment</p>
                </div>

                {/* Layaway Price */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-layawayPrice" className="text-xs font-medium text-blue-400">
                    Layaway Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/60 text-sm">₵</span>
                    <input
                      id="edit-layawayPrice"
                      type="number"
                      placeholder="0.00"
                      value={layawayPrice}
                      onChange={(e) => setLayawayPrice(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-7 pr-2 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Before pickup</p>
                </div>

                {/* Credit Price */}
                <div className="space-y-1.5">
                  <label htmlFor="edit-creditPrice" className="text-xs font-medium text-amber-400">
                    Credit Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 text-sm">₵</span>
                    <input
                      id="edit-creditPrice"
                      type="number"
                      placeholder="0.00"
                      value={creditPrice}
                      onChange={(e) => setCreditPrice(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-7 pr-2 py-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">BNPL</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Cash ≤ Layaway ≤ Credit (higher risk = higher price)</p>
            </div>

            {/* Stock Quantity */}
            <div className="space-y-2">
              <label htmlFor="edit-stockQuantity" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                Stock Quantity
              </label>
              <input
                id="edit-stockQuantity"
                type="number"
                placeholder="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                min="0"
                step="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p className="text-xs text-slate-500">
                Number of units available in stock
              </p>
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <label htmlFor="edit-imageUrl" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image URL
              </label>
              <input
                id="edit-imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
            </div>

            {/* Preview */}
            {name && cashPrice && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                <p className="text-xs text-blue-400/80 font-medium mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-sm font-semibold text-purple-300">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{name}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-400">Cash: ₵{parseFloat(cashPrice || "0").toLocaleString()}</span>
                      <span className="text-blue-400">Layaway: ₵{parseFloat(layawayPrice || "0").toLocaleString()}</span>
                      <span className="text-amber-400">Credit: ₵{parseFloat(creditPrice || "0").toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
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
