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
import { updateProduct, ProductData } from "../../actions"
import { toast } from "sonner"

interface UpdateStockDialogProps {
  product: ProductData
  shopSlug: string
}

export function UpdateStockDialog({ product, shopSlug }: UpdateStockDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stockQuantity, setStockQuantity] = useState(product.stockQuantity.toString())
  const [adjustmentType, setAdjustmentType] = useState<"set" | "add" | "subtract">("set")
  const [adjustmentAmount, setAdjustmentAmount] = useState("")

  const calculateNewStock = () => {
    if (adjustmentType === "set") {
      return parseInt(stockQuantity) || 0
    }
    const amount = parseInt(adjustmentAmount) || 0
    if (adjustmentType === "add") {
      return product.stockQuantity + amount
    }
    return Math.max(0, product.stockQuantity - amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const newStock = calculateNewStock()

    const result = await updateProduct(shopSlug, product.id, {
      stockQuantity: newStock,
    })

    if (result.success) {
      toast.success(`Stock updated to ${newStock} units`)
      setOpen(false)
    } else {
      toast.error(result.error || "Failed to update stock")
    }

    setIsLoading(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setStockQuantity(product.stockQuantity.toString())
      setAdjustmentType("set")
      setAdjustmentAmount("")
    }
    setOpen(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="p-2 rounded-lg text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all"
          title="Update stock"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900/95 backdrop-blur-xl border border-white/10 sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Header Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-cyan-600/20 via-blue-600/10 to-transparent pointer-events-none" />
        
        <div className="relative p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Update Stock</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  {product.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Current Stock Display */}
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-slate-400 mb-1">Current Stock</p>
            <p className={`text-2xl font-bold ${
              product.stockQuantity === 0
                ? "text-red-400"
                : product.stockQuantity <= product.lowStockThreshold
                ? "text-amber-400"
                : "text-green-400"
            }`}>
              {product.stockQuantity} units
            </p>
            {product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0 && (
              <p className="text-xs text-amber-400 mt-1">⚠️ Below low stock threshold ({product.lowStockThreshold})</p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Adjustment Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Adjustment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "set", label: "Set To", icon: "=" },
                  { value: "add", label: "Add", icon: "+" },
                  { value: "subtract", label: "Subtract", icon: "−" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setAdjustmentType(type.value as typeof adjustmentType)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      adjustmentType === type.value
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Input */}
            <div className="space-y-2">
              <label htmlFor="stock-input" className="text-sm font-medium text-slate-200">
                {adjustmentType === "set" ? "New Stock Quantity" : "Amount"}
              </label>
              <input
                id="stock-input"
                type="number"
                min="0"
                placeholder="0"
                value={adjustmentType === "set" ? stockQuantity : adjustmentAmount}
                onChange={(e) => {
                  if (adjustmentType === "set") {
                    setStockQuantity(e.target.value)
                  } else {
                    setAdjustmentAmount(e.target.value)
                  }
                }}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-medium placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all text-center"
              />
            </div>

            {/* Preview */}
            {adjustmentType !== "set" && adjustmentAmount && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-sm text-slate-400 mb-1">New Stock Will Be</p>
                <p className="text-xl font-bold text-cyan-400">
                  {calculateNewStock()} units
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Stock
                </>
              )}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
