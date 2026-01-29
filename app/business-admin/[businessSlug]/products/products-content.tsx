"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  createBusinessProduct,
  createBusinessProductMultiShop,
  updateBusinessProduct,
  deleteBusinessProduct,
  toggleBusinessProductStatus,
  assignProductToShop,
  updateShopProductStock,
  removeProductFromShop,
} from "../../actions"
import { toast } from "sonner"

interface ShopAssignment {
  shopId: string
  shopName: string
  shopSlug: string
  stockQuantity: number
  lowStockThreshold: number
  isActive: boolean
  hasCustomPricing: boolean
  // Custom shop-specific prices (null = use default product price)
  costPrice: number | null
  cashPrice: number | null
  layawayPrice: number | null
  creditPrice: number | null
}

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  categoryId: string | null
  category: string | null
  brandId: string | null
  brand: string | null
  costPrice: number
  cashPrice: number
  layawayPrice: number
  creditPrice: number
  hpPrice: number
  // Profit calculations
  cashProfit: number
  layawayProfit: number
  creditProfit: number
  stockQuantity: number // Total stock across all shops
  lowStockThreshold: number
  isActive: boolean
  // Shop assignments (replaces shopName/shopSlug)
  shopNames: string[]
  shopCount: number
  shopAssignments: ShopAssignment[]
  purchaseCount: number
  createdAt: Date
}

interface Shop {
  id: string
  name: string
  shopSlug: string
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface ProductsContentProps {
  products: Product[]
  shops: Shop[]
  categories: Category[]
  brands: Brand[]
  categoryNames: string[]
  businessSlug: string
}

type ModalMode = "create" | "edit" | "delete" | "stock" | "assign" | null

export function ProductsContent({ products, shops, categories, brands, categoryNames, businessSlug }: ProductsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "lowStock" | "outOfStock">("all")
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "sales">("name")

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Create/Edit form data
  const [selectedShopSlug, setSelectedShopSlug] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    categoryId: "",
    brandId: "",
    costPrice: "0",
    cashPrice: "0",
    layawayPrice: "0",
    creditPrice: "0",
    stockQuantity: "0",
    lowStockThreshold: "5",
    isActive: true,
  })

  // Stock adjustment
  const [stockAdjustmentType, setStockAdjustmentType] = useState<"set" | "add" | "subtract">("set")
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState("")

  // Shop assignment state (for assign modal)
  const [shopAssignments, setShopAssignments] = useState<{[shopId: string]: { 
    selected: boolean
    stockQuantity: string
    lowStockThreshold: string
    useCustomPricing: boolean
    costPrice: string
    cashPrice: string
    layawayPrice: string
    creditPrice: string
  }}>({})
  const [assigningShopId, setAssigningShopId] = useState<string | null>(null)

  // Create modal shop assignments (for multi-shop creation)
  const [createShopAssignments, setCreateShopAssignments] = useState<{[shopId: string]: { selected: boolean; stockQuantity: string; lowStockThreshold: string }}>({})

  // Edit modal shop stock state (per-shop stock, threshold, and pricing editing)
  const [editShopStocks, setEditShopStocks] = useState<{[shopId: string]: { 
    stockQuantity: string
    lowStockThreshold: string
    useCustomPricing: boolean
    costPrice: string
    cashPrice: string
    layawayPrice: string
    creditPrice: string
  }}>({})

  // Inline stock editing state
  const [editingStock, setEditingStock] = useState<{ productId: string; shopId: string } | null>(null)
  const [editingStockValue, setEditingStockValue] = useState("")

  // Excel import/export state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Excel export handler
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/business-admin/${businessSlug}/products/export`)
      if (!response.ok) {
        throw new Error("Failed to export products")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const contentDisposition = response.headers.get("Content-Disposition")
      const filename = contentDisposition?.split("filename=")[1]?.replace(/"/g, "") || "products.xlsx"
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Products exported successfully!")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export products")
    } finally {
      setIsExporting(false)
    }
  }

  // Excel import handler
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/business-admin/${businessSlug}/products/import`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to import products")
      }

      if (data.results.errors?.length > 0) {
        toast.warning(`Import completed with ${data.results.errors.length} errors. Check console for details.`)
        console.warn("Import errors:", data.results.errors)
      } else {
        toast.success(data.message)
      }
      
      router.refresh()
    } catch (error) {
      console.error("Import error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import products")
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Match shop by checking if product is assigned to the selected shop
    const matchesShop = shopFilter === "all" || product.shopAssignments.some(sa => sa.shopSlug === shopFilter)
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    
    let matchesStock = true
    if (stockFilter === "inStock") matchesStock = product.stockQuantity > product.lowStockThreshold
    else if (stockFilter === "lowStock") matchesStock = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold
    else if (stockFilter === "outOfStock") matchesStock = product.stockQuantity === 0
    
    return matchesSearch && matchesShop && matchesCategory && matchesStock
  })

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return b.hpPrice - a.hpPrice
      case "stock":
        return b.stockQuantity - a.stockQuantity
      case "sales":
        return b.purchaseCount - a.purchaseCount
      default:
        return a.name.localeCompare(b.name)
    }
  })

  const openCreateModal = () => {
    setSelectedProduct(null)
    setSelectedShopSlug(shops.length > 0 ? shops[0].shopSlug : "")
    setFormData({
      name: "",
      description: "",
      sku: "",
      categoryId: "",
      brandId: "",
      costPrice: "0",
      cashPrice: "0",
      layawayPrice: "0",
      creditPrice: "0",
      stockQuantity: "0",
      lowStockThreshold: "5",
      isActive: true,
    })
    // Initialize create shop assignments - all unselected with default values
    const initialAssignments: {[shopId: string]: { selected: boolean; stockQuantity: string; lowStockThreshold: string }} = {}
    shops.forEach(shop => {
      initialAssignments[shop.id] = {
        selected: false,
        stockQuantity: "0",
        lowStockThreshold: "5"
      }
    })
    setCreateShopAssignments(initialAssignments)
    setFormError(null)
    setModalMode("create")
  }

  const openEditModal = (product: Product) => {
    setSelectedProduct(product)
    // Use the first shop assignment's slug, or empty if none
    setSelectedShopSlug(product.shopAssignments[0]?.shopSlug || "")
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      categoryId: product.categoryId || "",
      brandId: product.brandId || "",
      costPrice: product.costPrice.toString(),
      cashPrice: product.cashPrice.toString(),
      layawayPrice: product.layawayPrice.toString(),
      creditPrice: product.creditPrice.toString(),
      stockQuantity: product.stockQuantity.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      isActive: product.isActive,
    })
    // Initialize per-shop stock and pricing editing state
    const shopStocks: {[shopId: string]: { 
      stockQuantity: string
      lowStockThreshold: string
      useCustomPricing: boolean
      costPrice: string
      cashPrice: string
      layawayPrice: string
      creditPrice: string
    }} = {}
    product.shopAssignments.forEach(sa => {
      shopStocks[sa.shopId] = {
        stockQuantity: sa.stockQuantity.toString(),
        lowStockThreshold: sa.lowStockThreshold.toString(),
        useCustomPricing: sa.hasCustomPricing || false,
        costPrice: sa.costPrice?.toString() || product.costPrice.toString(),
        cashPrice: sa.cashPrice?.toString() || product.cashPrice.toString(),
        layawayPrice: sa.layawayPrice?.toString() || product.layawayPrice.toString(),
        creditPrice: sa.creditPrice?.toString() || product.creditPrice.toString(),
      }
    })
    setEditShopStocks(shopStocks)
    setFormError(null)
    setModalMode("edit")
  }

  const openStockModal = (product: Product) => {
    setSelectedProduct(product)
    setStockAdjustmentType("set")
    setStockAdjustmentAmount(product.stockQuantity.toString())
    setFormError(null)
    setModalMode("stock")
  }

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product)
    setFormError(null)
    setModalMode("delete")
  }

  const openAssignModal = (product: Product) => {
    setSelectedProduct(product)
    // Initialize shop assignments based on current state
    const assignments: {[shopId: string]: { 
      selected: boolean
      stockQuantity: string
      lowStockThreshold: string
      useCustomPricing: boolean
      costPrice: string
      cashPrice: string
      layawayPrice: string
      creditPrice: string
    }} = {}
    shops.forEach(shop => {
      const existingAssignment = product.shopAssignments.find(sa => sa.shopId === shop.id)
      assignments[shop.id] = {
        selected: !!existingAssignment,
        stockQuantity: existingAssignment?.stockQuantity?.toString() || "0",
        lowStockThreshold: existingAssignment?.lowStockThreshold?.toString() || "5",
        useCustomPricing: existingAssignment?.hasCustomPricing || false,
        costPrice: existingAssignment?.costPrice?.toString() || product.costPrice.toString(),
        cashPrice: existingAssignment?.cashPrice?.toString() || product.cashPrice.toString(),
        layawayPrice: existingAssignment?.layawayPrice?.toString() || product.layawayPrice.toString(),
        creditPrice: existingAssignment?.creditPrice?.toString() || product.creditPrice.toString(),
      }
    })
    setShopAssignments(assignments)
    setFormError(null)
    setModalMode("assign")
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedProduct(null)
    setFormError(null)
  }

  const calculateNewStock = () => {
    if (!selectedProduct) return 0
    const amount = parseInt(stockAdjustmentAmount) || 0
    if (stockAdjustmentType === "set") return amount
    if (stockAdjustmentType === "add") return selectedProduct.stockQuantity + amount
    return Math.max(0, selectedProduct.stockQuantity - amount)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    setFormError(null)

    startTransition(async () => {
      const result = await updateBusinessProduct(businessSlug, selectedProduct.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim() || null,
        categoryId: formData.categoryId || null,
        brandId: formData.brandId || null,
        costPrice: parseFloat(formData.costPrice) || 0,
        cashPrice: parseFloat(formData.cashPrice) || 0,
        layawayPrice: parseFloat(formData.layawayPrice) || 0,
        creditPrice: parseFloat(formData.creditPrice) || 0,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
        isActive: formData.isActive,
      })

      if (!result.success) {
        setFormError(result.error || "Failed to update product")
        return
      }

      // Update per-shop stock, threshold, and pricing
      for (const shopId of Object.keys(editShopStocks)) {
        const shopStock = editShopStocks[shopId]
        const existingAssignment = selectedProduct.shopAssignments.find(sa => sa.shopId === shopId)
        
        if (existingAssignment) {
          // Prepare pricing data (null if not using custom pricing)
          const pricingData = shopStock.useCustomPricing ? {
            costPrice: parseFloat(shopStock.costPrice) || null,
            cashPrice: parseFloat(shopStock.cashPrice) || null,
            layawayPrice: parseFloat(shopStock.layawayPrice) || null,
            creditPrice: parseFloat(shopStock.creditPrice) || null,
          } : {
            costPrice: null,
            cashPrice: null,
            layawayPrice: null,
            creditPrice: null,
          }
          
          const stockResult = await updateShopProductStock(businessSlug, selectedProduct.id, shopId, {
            stockQuantity: parseInt(shopStock.stockQuantity) || 0,
            lowStockThreshold: parseInt(shopStock.lowStockThreshold) || 5,
            ...pricingData,
          })
          if (!stockResult.success) {
            setFormError(`Failed to update shop: ${stockResult.error}`)
            return
          }
        }
      }

      toast.success(`Product "${formData.name}" updated successfully`)
      closeModal()
      router.refresh()
    })
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get selected shops
    const selectedShops = Object.entries(createShopAssignments)
      .filter(([_, assignment]) => assignment.selected)
      .map(([shopId, assignment]) => ({
        shopId,
        stockQuantity: parseInt(assignment.stockQuantity) || 0,
        lowStockThreshold: parseInt(assignment.lowStockThreshold) || 5,
      }))
    
    if (selectedShops.length === 0) {
      setFormError("Please assign the product to at least one shop")
      return
    }
    setFormError(null)

    startTransition(async () => {
      const result = await createBusinessProductMultiShop(businessSlug, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim() || null,
        categoryId: formData.categoryId || null,
        brandId: formData.brandId || null,
        costPrice: parseFloat(formData.costPrice) || 0,
        cashPrice: parseFloat(formData.cashPrice) || 0,
        layawayPrice: parseFloat(formData.layawayPrice) || 0,
        creditPrice: parseFloat(formData.creditPrice) || 0,
        stockQuantity: 0, // Not used for multi-shop
        lowStockThreshold: 5, // Not used for multi-shop
        isActive: formData.isActive,
      }, selectedShops)

      if (result.success) {
        const data = result.data as { name: string; shopCount: number; totalStock: number }
        toast.success(`Product "${data.name}" created in ${data.shopCount} shop(s) with ${data.totalStock} total stock`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to create product")
      }
    })
  }

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    setFormError(null)

    const newStock = calculateNewStock()

    startTransition(async () => {
      const result = await updateBusinessProduct(businessSlug, selectedProduct.id, {
        stockQuantity: newStock,
      })

      if (result.success) {
        toast.success(`Stock updated to ${newStock} units`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to update stock")
      }
    })
  }

  const handleDelete = async () => {
    if (!selectedProduct) return
    setFormError(null)

    startTransition(async () => {
      const result = await deleteBusinessProduct(businessSlug, selectedProduct.id)

      if (result.success) {
        toast.success(`Product "${selectedProduct.name}" deleted`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to delete product")
      }
    })
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    setFormError(null)

    startTransition(async () => {
      try {
        // Process each shop assignment
        for (const shop of shops) {
          const assignment = shopAssignments[shop.id]
          const existingAssignment = selectedProduct.shopAssignments.find(sa => sa.shopId === shop.id)
          
          // Prepare pricing data (null if not using custom pricing)
          const pricingData = assignment.useCustomPricing ? {
            costPrice: parseFloat(assignment.costPrice) || null,
            cashPrice: parseFloat(assignment.cashPrice) || null,
            layawayPrice: parseFloat(assignment.layawayPrice) || null,
            creditPrice: parseFloat(assignment.creditPrice) || null,
          } : {
            costPrice: null,
            cashPrice: null,
            layawayPrice: null,
            creditPrice: null,
          }
          
          if (assignment.selected && !existingAssignment) {
            // Assign to new shop with stock and pricing
            setAssigningShopId(shop.id)
            const result = await assignProductToShop(businessSlug, selectedProduct.id, shop.id, {
              stockQuantity: parseInt(assignment.stockQuantity) || 0,
              lowStockThreshold: parseInt(assignment.lowStockThreshold) || 5,
              ...pricingData,
            })
            if (!result.success) {
              setFormError(`Failed to assign to ${shop.name}: ${result.error}`)
              return
            }
          } else if (assignment.selected && existingAssignment) {
            // Update existing assignment (stock, threshold, and pricing)
            setAssigningShopId(shop.id)
            const result = await updateShopProductStock(businessSlug, selectedProduct.id, shop.id, {
              stockQuantity: parseInt(assignment.stockQuantity) || 0,
              lowStockThreshold: parseInt(assignment.lowStockThreshold) || 5,
              ...pricingData,
            })
            if (!result.success) {
              setFormError(`Failed to update ${shop.name}: ${result.error}`)
              return
            }
          } else if (!assignment.selected && existingAssignment) {
            // Remove from shop
            setAssigningShopId(shop.id)
            const result = await removeProductFromShop(businessSlug, selectedProduct.id, shop.id)
            if (!result.success) {
              setFormError(`Failed to remove from ${shop.name}: ${result.error}`)
              return
            }
          }
        }
        
        setAssigningShopId(null)
        toast.success(`Shop assignments updated for "${selectedProduct.name}"`)
        closeModal()
        router.refresh()
      } catch (error) {
        setAssigningShopId(null)
        setFormError("An unexpected error occurred")
      }
    })
  }

  // Inline stock editing handlers
  const startEditingStock = (productId: string, shopId: string, currentStock: number) => {
    setEditingStock({ productId, shopId })
    setEditingStockValue(currentStock.toString())
  }

  const cancelEditingStock = () => {
    setEditingStock(null)
    setEditingStockValue("")
  }

  const saveInlineStock = async (productId: string, shopId: string) => {
    const newStock = parseInt(editingStockValue) || 0
    if (newStock < 0) {
      toast.error("Stock cannot be negative")
      return
    }

    startTransition(async () => {
      const result = await updateShopProductStock(businessSlug, productId, shopId, {
        stockQuantity: newStock,
      })

      if (result.success) {
        toast.success("Stock updated")
        setEditingStock(null)
        setEditingStockValue("")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update stock")
      }
    })
  }

  const handleInlineStockKeyDown = (e: React.KeyboardEvent, productId: string, shopId: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveInlineStock(productId, shopId)
    } else if (e.key === "Escape") {
      cancelEditingStock()
    }
  }

  const handleToggleStatus = async (product: Product) => {
    startTransition(async () => {
      const result = await toggleBusinessProductStatus(businessSlug, product.id)

      if (result.success) {
        const newStatus = (result.data as { isActive: boolean }).isActive
        toast.success(`"${product.name}" ${newStatus ? "activated" : "deactivated"}`)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  return (
    <>
      {/* Hidden file input for Excel import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />

      <div className="glass-card overflow-hidden">
        {/* Header with Create Button and Excel Actions */}
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Products Inventory</h2>
            <p className="text-sm text-slate-400">Manage products across all your shops</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Export Excel Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium rounded-xl hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {isExporting ? "Exporting..." : "Export Excel"}
            </button>

            {/* Import Excel Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium rounded-xl hover:bg-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              {isImporting ? "Importing..." : "Import Excel"}
            </button>

            {/* Create Product Button */}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Product
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-6 border-b border-white/5">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            {/* Shop Filter */}
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.shopSlug} value={shop.shopSlug}>
                  {shop.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Categories</option>
              {categoryNames.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Stock</option>
              <option value="inStock">In Stock</option>
              <option value="lowStock">Low Stock</option>
              <option value="outOfStock">Out of Stock</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="stock">Sort by Stock</option>
              <option value="sales">Sort by Sales</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
          <p className="text-sm text-slate-400">
            Showing {sortedProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products List */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
            <p className="text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-rose-400 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Selling</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-emerald-400 uppercase tracking-wider">Profit</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          product.isActive
                            ? "bg-cyan-500/20 border border-cyan-500/30"
                            : "bg-slate-500/20 border border-slate-500/30"
                        }`}>
                          <svg className={`w-5 h-5 ${product.isActive ? "text-cyan-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-white">{product.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{product.sku || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.category ? (
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {product.shopCount > 0 ? (
                        <div className="flex flex-col gap-1">
                          {product.shopNames.slice(0, 2).map((name, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-slate-300">
                              {name}
                            </span>
                          ))}
                          {product.shopCount > 2 && (
                            <span className="text-xs text-slate-500">+{product.shopCount - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        // Show shop-specific cost if filtering by shop
                        const shopAssignment = shopFilter !== "all" 
                          ? product.shopAssignments.find(sa => sa.shopSlug === shopFilter)
                          : null
                        const costPrice = shopAssignment?.costPrice ?? product.costPrice
                        const hasCustomPrice = shopAssignment?.hasCustomPricing
                        return (
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-rose-400">₵{costPrice.toLocaleString()}</p>
                            {hasCustomPrice && (
                              <span className="text-[9px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">custom</span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        // Show shop-specific prices if filtering by shop
                        const shopAssignment = shopFilter !== "all" 
                          ? product.shopAssignments.find(sa => sa.shopSlug === shopFilter)
                          : null
                        const cashPrice = shopAssignment?.cashPrice ?? product.cashPrice
                        const layawayPrice = shopAssignment?.layawayPrice ?? product.layawayPrice
                        const creditPrice = shopAssignment?.creditPrice ?? product.creditPrice
                        const hasCustomPrice = shopAssignment?.hasCustomPricing
                        return (
                          <div className="flex flex-col gap-0.5 text-xs">
                            {hasCustomPrice && (
                              <span className="text-[9px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded w-fit mb-0.5">custom pricing</span>
                            )}
                            <span className="text-green-400">Cash: ₵{cashPrice.toLocaleString()}</span>
                            <span className="text-blue-400">Layaway: ₵{layawayPrice.toLocaleString()}</span>
                            <span className="text-amber-400">Credit: ₵{creditPrice.toLocaleString()}</span>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        // Calculate shop-specific profits if filtering by shop
                        const shopAssignment = shopFilter !== "all" 
                          ? product.shopAssignments.find(sa => sa.shopSlug === shopFilter)
                          : null
                        const costPrice = shopAssignment?.costPrice ?? product.costPrice
                        const cashPrice = shopAssignment?.cashPrice ?? product.cashPrice
                        const layawayPrice = shopAssignment?.layawayPrice ?? product.layawayPrice
                        const creditPrice = shopAssignment?.creditPrice ?? product.creditPrice
                        const cashProfit = cashPrice - costPrice
                        const layawayProfit = layawayPrice - costPrice
                        const creditProfit = creditPrice - costPrice
                        return (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className={cashProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                              Cash: ₵{cashProfit.toLocaleString()}
                            </span>
                            <span className={layawayProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                              Layaway: ₵{layawayProfit.toLocaleString()}
                            </span>
                            <span className={creditProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                              Credit: ₵{creditProfit.toLocaleString()}
                            </span>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {shopFilter === "all" ? (
                          // Show total stock when "All Shops" is selected
                          product.shopAssignments.length > 0 ? (
                            <div className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                              product.stockQuantity === 0
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : product.stockQuantity <= product.lowStockThreshold
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-green-500/10 text-green-400 border border-green-500/20"
                            }`}>
                              <span>{product.stockQuantity}</span>
                              <span className="text-xs opacity-70">units</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">Not assigned</span>
                          )
                        ) : (
                          // Show only the filtered shop's stock
                          (() => {
                            const filteredShopAssignment = product.shopAssignments.find(sa => sa.shopSlug === shopFilter)
                            if (!filteredShopAssignment) {
                              return <span className="text-slate-500 text-xs">Not in shop</span>
                            }
                            const isEditing = editingStock?.productId === product.id && editingStock?.shopId === filteredShopAssignment.shopId
                            return (
                              <div 
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm ${
                                  filteredShopAssignment.stockQuantity === 0
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : filteredShopAssignment.stockQuantity <= filteredShopAssignment.lowStockThreshold
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                                }`}
                              >
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={editingStockValue}
                                    onChange={(e) => setEditingStockValue(e.target.value)}
                                    onBlur={() => saveInlineStock(product.id, filteredShopAssignment.shopId)}
                                    onKeyDown={(e) => handleInlineStockKeyDown(e, product.id, filteredShopAssignment.shopId)}
                                    autoFocus
                                    className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm text-center focus:outline-none focus:border-cyan-500/50"
                                    disabled={isPending}
                                  />
                                ) : (
                                  <button
                                    onClick={() => startEditingStock(product.id, filteredShopAssignment.shopId, filteredShopAssignment.stockQuantity)}
                                    className="font-medium whitespace-nowrap hover:bg-white/10 px-2 py-1 rounded transition-colors cursor-pointer"
                                    title="Click to edit"
                                  >
                                    {filteredShopAssignment.stockQuantity} <span className="text-xs opacity-70">units</span>
                                  </button>
                                )}
                              </div>
                            )
                          })()
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          product.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? "bg-green-400" : "bg-slate-400"}`} />
                        {product.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit product"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openAssignModal(product)}
                          className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                          title="Assign to shops"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(product)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete product"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      {modalMode === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg glass-card p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Create New Product</h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="" className="bg-slate-800 text-white">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-800 text-white">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Brand</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="" className="bg-slate-800 text-white">No brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id} className="bg-slate-800 text-white">
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cost Price */}
              <div>
                <label className="text-sm text-rose-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Cost Price (₵)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 focus:outline-none focus:border-rose-500/50"
                />
                <p className="text-xs text-slate-500 mt-1">Purchase/cost price for profit calculation</p>
              </div>

              {/* Selling Prices */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selling Prices (₵)
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Cash Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cashPrice}
                    onChange={(e) => setFormData({ ...formData, cashPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Layaway Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.layawayPrice}
                    onChange={(e) => setFormData({ ...formData, layawayPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Credit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditPrice}
                    onChange={(e) => setFormData({ ...formData, creditPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>
              </div>

              {/* Multi-Shop Assignment Section */}
              <div className="space-y-3">
                <label className="text-sm text-purple-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Assign to Shops *
                </label>
                <p className="text-xs text-slate-500 -mt-1">Select shops and set initial stock for each</p>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {shops.map((shop) => {
                    const assignment = createShopAssignments[shop.id] || { selected: false, stockQuantity: "0", lowStockThreshold: "5" }
                    return (
                      <div 
                        key={shop.id}
                        className={`p-3 rounded-xl border transition-all ${
                          assignment.selected
                            ? "bg-purple-500/10 border-purple-500/30"
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={assignment.selected}
                            onChange={(e) => setCreateShopAssignments(prev => ({
                              ...prev,
                              [shop.id]: { ...prev[shop.id], selected: e.target.checked }
                            }))}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/20"
                          />
                          <span className="text-sm font-medium text-white flex-1">{shop.name}</span>
                        </div>
                        {assignment.selected && (
                          <div className="grid grid-cols-2 gap-3 mt-3 pl-7">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Initial Stock</label>
                              <input
                                type="number"
                                min="0"
                                value={assignment.stockQuantity}
                                onChange={(e) => setCreateShopAssignments(prev => ({
                                  ...prev,
                                  [shop.id]: { ...prev[shop.id], stockQuantity: e.target.value }
                                }))}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-amber-400 mb-1">Low Stock Alert</label>
                              <input
                                type="number"
                                min="0"
                                value={assignment.lowStockThreshold}
                                onChange={(e) => setCreateShopAssignments(prev => ({
                                  ...prev,
                                  [shop.id]: { ...prev[shop.id], lowStockThreshold: e.target.value }
                                }))}
                                className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm focus:outline-none focus:border-amber-500/50"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Total preview */}
                {Object.values(createShopAssignments).some(a => a.selected) && (
                  <div className="text-xs text-slate-500 pt-1 border-t border-white/10">
                    Total initial stock: <span className="text-white font-medium">
                      {Object.values(createShopAssignments)
                        .filter(a => a.selected)
                        .reduce((sum, a) => sum + (parseInt(a.stockQuantity) || 0), 0)}
                    </span> units across <span className="text-purple-400 font-medium">
                      {Object.values(createShopAssignments).filter(a => a.selected).length}
                    </span> shop(s)
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="createIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="createIsActive" className="text-sm text-slate-300">
                  Product is active and available for sale
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modalMode === "edit" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg glass-card p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Edit Product</h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="" className="bg-slate-800 text-white">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-800 text-white">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Brand</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="" className="bg-slate-800 text-white">No brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id} className="bg-slate-800 text-white">
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cost Price */}
              <div>
                <label className="text-sm text-rose-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Cost Price (₵)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 focus:outline-none focus:border-rose-500/50"
                />
                <p className="text-xs text-slate-500 mt-1">Purchase/cost price for profit calculation</p>
              </div>

              {/* Selling Prices */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selling Prices (₵)
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Cash Price (₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cashPrice}
                    onChange={(e) => setFormData({ ...formData, cashPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Layaway Price (₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.layawayPrice}
                    onChange={(e) => setFormData({ ...formData, layawayPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                <label className="block text-sm text-slate-400 mb-2">Credit Price (₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditPrice}
                    onChange={(e) => setFormData({ ...formData, creditPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Per-Shop Inventory Section */}
              {selectedProduct.shopAssignments.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm text-purple-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Shop Inventory & Pricing
                  </label>
                  <p className="text-xs text-slate-500 -mt-1">Set stock, alerts, and custom pricing per shop</p>
                  
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {selectedProduct.shopAssignments.map((sa) => {
                      const shopStock = editShopStocks[sa.shopId] || { 
                        stockQuantity: "0", 
                        lowStockThreshold: "5",
                        useCustomPricing: false,
                        costPrice: formData.costPrice,
                        cashPrice: formData.cashPrice,
                        layawayPrice: formData.layawayPrice,
                        creditPrice: formData.creditPrice,
                      }
                      const currentStock = parseInt(shopStock.stockQuantity) || 0
                      const threshold = parseInt(shopStock.lowStockThreshold) || 5
                      
                      return (
                        <div 
                          key={sa.shopId}
                          className={`p-3 rounded-xl border ${
                            currentStock === 0
                              ? "bg-red-500/10 border-red-500/30"
                              : currentStock <= threshold
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-green-500/10 border-green-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">{sa.shopName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              currentStock === 0
                                ? "bg-red-500/20 text-red-400"
                                : currentStock <= threshold
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-green-500/20 text-green-400"
                            }`}>
                              {currentStock === 0 ? "Out of Stock" : currentStock <= threshold ? "Low Stock" : "In Stock"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Stock Qty</label>
                              <input
                                type="number"
                                min="0"
                                value={shopStock.stockQuantity}
                                onChange={(e) => setEditShopStocks(prev => ({
                                  ...prev,
                                  [sa.shopId]: { ...prev[sa.shopId], stockQuantity: e.target.value }
                                }))}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-amber-400 mb-1">Low Stock Alert</label>
                              <input
                                type="number"
                                min="0"
                                value={shopStock.lowStockThreshold}
                                onChange={(e) => setEditShopStocks(prev => ({
                                  ...prev,
                                  [sa.shopId]: { ...prev[sa.shopId], lowStockThreshold: e.target.value }
                                }))}
                                className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm focus:outline-none focus:border-amber-500/50"
                              />
                            </div>
                          </div>

                          {/* Custom Pricing Toggle */}
                          <div className="mt-3 pt-2 border-t border-white/10">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={shopStock.useCustomPricing}
                                onChange={(e) => setEditShopStocks(prev => ({
                                  ...prev,
                                  [sa.shopId]: { ...prev[sa.shopId], useCustomPricing: e.target.checked }
                                }))}
                                className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/20"
                              />
                              <span className="text-xs text-slate-300">Custom pricing for this shop</span>
                            </label>
                          </div>

                          {/* Custom Pricing Fields */}
                          {shopStock.useCustomPricing && (
                            <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                              <div>
                                <label className="block text-[10px] text-rose-400 mb-1">Cost (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={shopStock.costPrice}
                                  onChange={(e) => setEditShopStocks(prev => ({
                                    ...prev,
                                    [sa.shopId]: { ...prev[sa.shopId], costPrice: e.target.value }
                                  }))}
                                  placeholder={formData.costPrice}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-green-400 mb-1">Cash (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={shopStock.cashPrice}
                                  onChange={(e) => setEditShopStocks(prev => ({
                                    ...prev,
                                    [sa.shopId]: { ...prev[sa.shopId], cashPrice: e.target.value }
                                  }))}
                                  placeholder={formData.cashPrice}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-blue-400 mb-1">Layaway (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={shopStock.layawayPrice}
                                  onChange={(e) => setEditShopStocks(prev => ({
                                    ...prev,
                                    [sa.shopId]: { ...prev[sa.shopId], layawayPrice: e.target.value }
                                  }))}
                                  placeholder={formData.layawayPrice}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-amber-400 mb-1">Credit (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={shopStock.creditPrice}
                                  onChange={(e) => setEditShopStocks(prev => ({
                                    ...prev,
                                    [sa.shopId]: { ...prev[sa.shopId], creditPrice: e.target.value }
                                  }))}
                                  placeholder={formData.creditPrice}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="text-xs text-slate-500 pt-1 border-t border-white/10">
                    Total across all shops: <span className="text-white font-medium">
                      {Object.values(editShopStocks).reduce((sum, s) => sum + (parseInt(s.stockQuantity) || 0), 0)}
                    </span> units
                  </div>
                </div>
              )}

              {selectedProduct.shopAssignments.length === 0 && (
                <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
                  <p className="text-sm text-slate-400">This product is not assigned to any shops yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeModal()
                      setTimeout(() => openAssignModal(selectedProduct), 100)
                    }}
                    className="text-sm text-purple-400 hover:text-purple-300 mt-2"
                  >
                    Assign to shops →
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">
                  Product is active and available for sale
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {modalMode === "stock" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-2">Update Stock</h3>
            <p className="text-slate-400 mb-6">{selectedProduct.name}</p>

            {/* Current Stock */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-slate-400 mb-1">Current Stock</p>
              <p className={`text-2xl font-bold ${
                selectedProduct.stockQuantity === 0
                  ? "text-red-400"
                  : selectedProduct.stockQuantity <= selectedProduct.lowStockThreshold
                  ? "text-amber-400"
                  : "text-green-400"
              }`}>
                {selectedProduct.stockQuantity} units
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleStockSubmit} className="space-y-4">
              {/* Adjustment Type */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "set", label: "Set To", icon: "=" },
                  { value: "add", label: "Add", icon: "+" },
                  { value: "subtract", label: "Subtract", icon: "−" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setStockAdjustmentType(type.value as typeof stockAdjustmentType)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      stockAdjustmentType === type.value
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  {stockAdjustmentType === "set" ? "New Stock Quantity" : "Amount"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockAdjustmentAmount}
                  onChange={(e) => setStockAdjustmentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-medium text-center focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              {/* Preview */}
              {stockAdjustmentType !== "set" && stockAdjustmentAmount && (
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-sm text-slate-400 mb-1">New Stock Will Be</p>
                  <p className="text-xl font-bold text-cyan-400">{calculateNewStock()} units</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Updating..." : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === "delete" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md glass-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Product</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{selectedProduct.name}</strong>?
              {selectedProduct.shopCount > 0 && (
                <span className="block mt-1 text-sm text-amber-400">
                  This will remove the product from all {selectedProduct.shopCount} shop(s).
                </span>
              )}
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Shops Modal */}
      {modalMode === "assign" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg glass-card p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Assign to Shops</h3>
                <p className="text-sm text-slate-400">{selectedProduct.name}</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <p className="text-sm text-slate-400 mb-2">
                Select shops where this product should be available and set stock quantities:
              </p>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {shops.map((shop) => {
                  const assignment = shopAssignments[shop.id]
                  return (
                    <div
                      key={shop.id}
                      className={`p-4 rounded-xl border transition-all ${
                        assignment?.selected
                          ? "bg-purple-500/10 border-purple-500/30"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={assignment?.selected || false}
                            onChange={(e) =>
                              setShopAssignments((prev) => ({
                                ...prev,
                                [shop.id]: {
                                  ...prev[shop.id],
                                  selected: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/20"
                          />
                          <div>
                            <span className="text-white font-medium">{shop.name}</span>
                            {assigningShopId === shop.id && (
                              <span className="ml-2 text-xs text-purple-400">Updating...</span>
                            )}
                          </div>
                        </label>
                      </div>
                      {assignment?.selected && (
                        <div className="mt-3 pl-7 space-y-3">
                          {/* Stock Settings Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Stock Qty</label>
                              <input
                                type="number"
                                min="0"
                                value={assignment.stockQuantity}
                                onChange={(e) =>
                                  setShopAssignments((prev) => ({
                                    ...prev,
                                    [shop.id]: {
                                      ...prev[shop.id],
                                      stockQuantity: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500/50"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-amber-400 mb-1">Low Stock Alert</label>
                              <input
                                type="number"
                                min="0"
                                value={assignment.lowStockThreshold}
                                onChange={(e) =>
                                  setShopAssignments((prev) => ({
                                    ...prev,
                                    [shop.id]: {
                                      ...prev[shop.id],
                                      lowStockThreshold: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm text-center focus:outline-none focus:border-amber-500/50"
                              />
                            </div>
                          </div>

                          {/* Custom Pricing Toggle */}
                          <div className="pt-2 border-t border-white/10">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assignment.useCustomPricing}
                                onChange={(e) =>
                                  setShopAssignments((prev) => ({
                                    ...prev,
                                    [shop.id]: {
                                      ...prev[shop.id],
                                      useCustomPricing: e.target.checked,
                                    },
                                  }))
                                }
                                className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/20"
                              />
                              <span className="text-xs text-slate-300">Use custom pricing for this shop</span>
                            </label>
                          </div>

                          {/* Custom Pricing Fields */}
                          {assignment.useCustomPricing && (
                            <div className="grid grid-cols-2 gap-2 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                              <div>
                                <label className="block text-[10px] text-rose-400 mb-1">Cost Price (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={assignment.costPrice}
                                  onChange={(e) =>
                                    setShopAssignments((prev) => ({
                                      ...prev,
                                      [shop.id]: {
                                        ...prev[shop.id],
                                        costPrice: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={selectedProduct.costPrice.toString()}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-green-400 mb-1">Cash Price (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={assignment.cashPrice}
                                  onChange={(e) =>
                                    setShopAssignments((prev) => ({
                                      ...prev,
                                      [shop.id]: {
                                        ...prev[shop.id],
                                        cashPrice: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={selectedProduct.cashPrice.toString()}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-blue-400 mb-1">Layaway Price (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={assignment.layawayPrice}
                                  onChange={(e) =>
                                    setShopAssignments((prev) => ({
                                      ...prev,
                                      [shop.id]: {
                                        ...prev[shop.id],
                                        layawayPrice: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={selectedProduct.layawayPrice.toString()}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-amber-400 mb-1">Credit Price (₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={assignment.creditPrice}
                                  onChange={(e) =>
                                    setShopAssignments((prev) => ({
                                      ...prev,
                                      [shop.id]: {
                                        ...prev[shop.id],
                                        creditPrice: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={selectedProduct.creditPrice.toString()}
                                  className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-cyan-500/50"
                                />
                              </div>
                              <div className="col-span-2 mt-1">
                                <p className="text-[10px] text-slate-500">
                                  Default: Cost ₵{selectedProduct.costPrice.toLocaleString()}, Cash ₵{selectedProduct.cashPrice.toLocaleString()}, Layaway ₵{selectedProduct.layawayPrice.toLocaleString()}, Credit ₵{selectedProduct.creditPrice.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {shops.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No shops available. Create a shop first.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || shops.length === 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Assignments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
