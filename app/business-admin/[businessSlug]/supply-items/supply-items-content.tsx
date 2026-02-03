"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createSupplyItem,
  updateSupplyItem,
  deleteSupplyItem,
  updateSupplyItemStock,
  type SupplyItemData,
} from "../../actions"

interface Supplier {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  color: string | null
}

interface SupplyItemsContentProps {
  items: SupplyItemData[]
  suppliers: Supplier[]
  categories: Category[]
  businessSlug: string
}

type ModalMode = "create" | "edit" | "stock" | null

export function SupplyItemsContent({ items, suppliers, categories, businessSlug }: SupplyItemsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all")
  
  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingItem, setEditingItem] = useState<SupplyItemData | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<SupplyItemData | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Stock adjustment
  const [stockAdjustment, setStockAdjustment] = useState(0)
  const [stockReason, setStockReason] = useState("")
  
  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    unit: "piece",
    unitPrice: "",
    stockQuantity: "",
    reorderLevel: "",
    leadTimeDays: "",
    description: "",
    imageUrl: "",
    isActive: true,
    supplierId: "",
    categoryId: "",
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "inactive" && !item.isActive)
    
    const matchesCategory = categoryFilter === "all" || item.category?.id === categoryFilter
    const matchesSupplier = supplierFilter === "all" || item.supplier?.id === supplierFilter
    
    const matchesStock = 
      stockFilter === "all" ||
      (stockFilter === "low" && item.reorderLevel && item.stockQuantity <= item.reorderLevel && item.stockQuantity > 0) ||
      (stockFilter === "out" && item.stockQuantity === 0)
    
    return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesStock
  })

  const openCreateModal = () => {
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      unit: "piece",
      unitPrice: "",
      stockQuantity: "0",
      reorderLevel: "",
      leadTimeDays: "",
      description: "",
      imageUrl: "",
      isActive: true,
      supplierId: "",
      categoryId: "",
    })
    setFormError(null)
    setModalMode("create")
  }

  const openEditModal = (item: SupplyItemData) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      sku: item.sku || "",
      barcode: item.barcode || "",
      unit: item.unit || "piece",
      unitPrice: item.unitPrice.toString(),
      stockQuantity: item.stockQuantity.toString(),
      reorderLevel: item.reorderLevel?.toString() || "",
      leadTimeDays: item.leadTimeDays?.toString() || "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      isActive: item.isActive,
      supplierId: item.supplier?.id || "",
      categoryId: item.category?.id || "",
    })
    setFormError(null)
    setModalMode("edit")
  }

  const openStockModal = (item: SupplyItemData) => {
    setEditingItem(item)
    setStockAdjustment(0)
    setStockReason("")
    setFormError(null)
    setModalMode("stock")
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingItem(null)
    setFormError(null)
    setStockAdjustment(0)
    setStockReason("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || null,
      barcode: formData.barcode.trim() || null,
      unit: formData.unit,
      unitPrice: parseFloat(formData.unitPrice) || 0,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : undefined,
      leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : null,
      description: formData.description.trim() || null,
      imageUrl: formData.imageUrl.trim() || null,
      isActive: formData.isActive,
      supplierId: formData.supplierId || null,
      categoryId: formData.categoryId || null,
    }

    startTransition(async () => {
      const result = modalMode === "create"
        ? await createSupplyItem(businessSlug, payload)
        : await updateSupplyItem(businessSlug, editingItem!.id, payload)

      if (!result.success) {
        setFormError(result.error || "Operation failed")
        return
      }

      closeModal()
      router.refresh()
    })
  }

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || stockAdjustment === 0) return

    startTransition(async () => {
      const result = await updateSupplyItemStock(businessSlug, editingItem.id, stockAdjustment, stockReason)

      if (!result.success) {
        setFormError(result.error || "Failed to update stock")
        return
      }

      closeModal()
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    startTransition(async () => {
      const result = await deleteSupplyItem(businessSlug, deleteConfirm.id)

      if (!result.success) {
        setFormError(result.error || "Failed to delete item")
        return
      }

      setDeleteConfirm(null)
      router.refresh()
    })
  }

  const getStockStatus = (item: SupplyItemData) => {
    if (item.stockQuantity === 0) {
      return { label: "Out of Stock", color: "bg-red-500/10 text-red-400" }
    }
    if (item.reorderLevel && item.stockQuantity <= item.reorderLevel) {
      return { label: "Low Stock", color: "bg-amber-500/10 text-amber-400" }
    }
    return { label: "In Stock", color: "bg-green-500/10 text-green-400" }
  }

  return (
    <>
      {/* Filters Bar */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, SKU, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-sm"
                />
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as "all" | "low" | "out")}
              className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Item</th>
                <th className="text-left py-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                <th className="text-left py-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Supplier</th>
                <th className="text-right py-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Price</th>
                <th className="text-right py-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="text-left py-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-4 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <p className="text-slate-400">No items found</p>
                      <button
                        onClick={openCreateModal}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Add your first item
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item)
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.sku && (
                              <span className="text-xs text-slate-500">SKU: {item.sku}</span>
                            )}
                            {item.barcode && (
                              <span className="text-xs text-slate-500">• {item.barcode}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {item.category ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                            style={{
                              backgroundColor: item.category.color ? `${item.category.color}15` : 'rgba(139, 92, 246, 0.15)',
                              color: item.category.color || '#8b5cf6',
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.category.color || '#8b5cf6' }}
                            />
                            {item.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Uncategorized</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {item.supplier ? (
                          <span className="text-sm text-slate-300">{item.supplier.name}</span>
                        ) : (
                          <span className="text-xs text-slate-500">No supplier</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-white font-medium">{formatCurrency(item.unitPrice)}</span>
                        <span className="text-slate-500 text-xs ml-1">/{item.unit}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => openStockModal(item)}
                          className="group hover:bg-white/5 px-2 py-1 rounded transition-colors"
                        >
                          <span className="text-white font-medium">{item.stockQuantity}</span>
                          {item.reorderLevel && (
                            <span className="text-slate-500 text-xs ml-1">/ {item.reorderLevel}</span>
                          )}
                          <svg className="w-3 h-3 inline ml-1.5 text-slate-500 group-hover:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(item)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {modalMode === "create" ? "Add Supply Item" : "Edit Supply Item"}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Item Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="Enter item name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="Stock keeping unit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Barcode</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="UPC/EAN code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Unit Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="piece">Piece</option>
                      <option value="kg">Kilogram</option>
                      <option value="g">Gram</option>
                      <option value="liter">Liter</option>
                      <option value="ml">Milliliter</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="carton">Carton</option>
                      <option value="meter">Meter</option>
                      <option value="roll">Roll</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Reorder Level</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="Minimum before reorder"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier</label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Lead Time (days)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.leadTimeDays}
                      onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="Days to receive"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                      placeholder="Item description"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Image URL</label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-purple-600 transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                      <span className="text-sm text-slate-300">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isPending && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {modalMode === "create" ? "Add Item" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {modalMode === "stock" && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Adjust Stock</h2>
                <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-white/5 rounded-lg">
                <p className="text-white font-medium">{editingItem.name}</p>
                <p className="text-slate-400 text-sm mt-1">
                  Current stock: <span className="text-white font-medium">{editingItem.stockQuantity}</span> {editingItem.unit}s
                </p>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleStockAdjustment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Adjustment</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStockAdjustment(prev => prev - 1)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      value={stockAdjustment}
                      onChange={(e) => setStockAdjustment(parseInt(e.target.value) || 0)}
                      className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-center font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setStockAdjustment(prev => prev + 1)}
                      className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    New stock: <span className={`font-medium ${
                      editingItem.stockQuantity + stockAdjustment < 0 
                        ? "text-red-400" 
                        : "text-white"
                    }`}>
                      {Math.max(0, editingItem.stockQuantity + stockAdjustment)}
                    </span> {editingItem.unit}s
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Reason</label>
                  <input
                    type="text"
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="e.g., Stock count, Received shipment, Damaged"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || stockAdjustment === 0 || (editingItem.stockQuantity + stockAdjustment < 0)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isPending && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    Update Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Delete Item</h3>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to delete <span className="text-white font-medium">{deleteConfirm.name}</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setDeleteConfirm(null)
                  setFormError(null)
                }}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isPending && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
