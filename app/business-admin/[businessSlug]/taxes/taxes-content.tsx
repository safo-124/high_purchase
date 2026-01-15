"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createTax,
  updateTax,
  deleteTax,
  assignTaxToProducts,
  assignTaxToCategories,
  assignTaxToBrands,
  assignTaxToShops,
  getTaxAssignments,
} from "../../actions"
import { toast } from "sonner"

interface Tax {
  id: string
  name: string
  description: string | null
  rate: number
  isCompound: boolean
  isActive: boolean
  createdAt: Date
  productCount: number
  categoryCount: number
  brandCount: number
  shopCount: number
}

interface Product {
  id: string
  name: string
  sku: string | null
  category: string | null
  brand: string | null
  isActive: boolean
}

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  productCount: number
}

interface Brand {
  id: string
  name: string
  description: string | null
  isActive: boolean
  productCount: number
}

interface Shop {
  id: string
  name: string
  shopSlug: string
  isActive: boolean
}

interface TaxesContentProps {
  businessSlug: string
  taxes: Tax[]
  products: Product[]
  categories: Category[]
  brands: Brand[]
  shops: Shop[]
}

type ModalMode = "create" | "edit" | "delete" | "assign" | null
type AssignTab = "products" | "categories" | "brands" | "shops"

export function TaxesContent({
  businessSlug,
  taxes,
  products,
  categories,
  brands,
  shops,
}: TaxesContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Tax form
  const [taxForm, setTaxForm] = useState({
    name: "",
    description: "",
    rate: 0,
    isCompound: false,
    isActive: true,
  })

  // Assignment state
  const [assignTab, setAssignTab] = useState<AssignTab>("products")
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Open modals
  const openCreateModal = () => {
    setSelectedTax(null)
    setTaxForm({ name: "", description: "", rate: 0, isCompound: false, isActive: true })
    setFormError(null)
    setModalMode("create")
  }

  const openEditModal = (tax: Tax) => {
    setSelectedTax(tax)
    setTaxForm({
      name: tax.name,
      description: tax.description || "",
      rate: tax.rate,
      isCompound: tax.isCompound,
      isActive: tax.isActive,
    })
    setFormError(null)
    setModalMode("edit")
  }

  const openDeleteModal = (tax: Tax) => {
    setSelectedTax(tax)
    setFormError(null)
    setModalMode("delete")
  }

  const openAssignModal = async (tax: Tax) => {
    setSelectedTax(tax)
    setFormError(null)
    setAssignTab("products")
    setSearchQuery("")
    
    // Load current assignments
    const assignments = await getTaxAssignments(businessSlug, tax.id)
    if (assignments) {
      setSelectedProductIds(assignments.productIds)
      setSelectedCategoryIds(assignments.categoryIds)
      setSelectedBrandIds(assignments.brandIds)
      setSelectedShopIds(assignments.shopIds)
    } else {
      setSelectedProductIds([])
      setSelectedCategoryIds([])
      setSelectedBrandIds([])
      setSelectedShopIds([])
    }
    
    setModalMode("assign")
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedTax(null)
    setFormError(null)
    setSearchQuery("")
  }

  // CRUD handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const result = await createTax(businessSlug, taxForm)
      if (result.success) {
        toast.success(`Tax "${taxForm.name}" created`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to create tax")
      }
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTax) return
    setFormError(null)

    startTransition(async () => {
      const result = await updateTax(businessSlug, selectedTax.id, taxForm)
      if (result.success) {
        toast.success(`Tax "${taxForm.name}" updated`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to update tax")
      }
    })
  }

  const handleDelete = async () => {
    if (!selectedTax) return
    setFormError(null)

    startTransition(async () => {
      const result = await deleteTax(businessSlug, selectedTax.id)
      if (result.success) {
        toast.success(`Tax "${selectedTax.name}" deleted`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to delete tax")
      }
    })
  }

  // Assignment handlers
  const handleSaveAssignments = async () => {
    if (!selectedTax) return
    setFormError(null)

    startTransition(async () => {
      try {
        // Save all assignments
        const [productRes, categoryRes, brandRes, shopRes] = await Promise.all([
          assignTaxToProducts(businessSlug, selectedTax.id, selectedProductIds),
          assignTaxToCategories(businessSlug, selectedTax.id, selectedCategoryIds),
          assignTaxToBrands(businessSlug, selectedTax.id, selectedBrandIds),
          assignTaxToShops(businessSlug, selectedTax.id, selectedShopIds),
        ])

        // Check for any errors
        const errors = [productRes, categoryRes, brandRes, shopRes]
          .filter(r => !r.success)
          .map(r => r.error)

        if (errors.length > 0) {
          setFormError(errors.join(", "))
        } else {
          toast.success("Tax assignments updated")
          closeModal()
          router.refresh()
        }
      } catch {
        setFormError("Failed to save assignments")
      }
    })
  }

  // Toggle selection
  const toggleProductId = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  const toggleCategoryId = (id: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  const toggleBrandId = (id: string) => {
    setSelectedBrandIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  const toggleShopId = (id: string) => {
    setSelectedShopIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Filter items by search
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredShops = shops.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Taxes</h2>
              <p className="text-sm text-slate-400">
                Create taxes and optionally assign them to products, categories, brands, or shops
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Tax
            </button>
          </div>
        </div>

        {/* Tax List */}
        {taxes.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No taxes yet</h3>
            <p className="text-slate-400 mb-4">Create your first tax to apply to products</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-emerald-400 hover:text-emerald-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Tax
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {taxes.map((tax) => (
              <div
                key={tax.id}
                className="p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-white">{tax.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tax.rate}%
                      </span>
                      {tax.isCompound && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Compound
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          tax.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {tax.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {tax.description && (
                      <p className="text-sm text-slate-400 mb-2">{tax.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {tax.productCount} product{tax.productCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {tax.categoryCount} categor{tax.categoryCount !== 1 ? "ies" : "y"}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {tax.brandCount} brand{tax.brandCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {tax.shopCount} shop{tax.shopCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openAssignModal(tax)}
                      className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                      title="Assign Tax"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(tax)}
                      className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                      title="Edit Tax"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openDeleteModal(tax)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Tax"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white">
                {modalMode === "create" ? "Create Tax" : "Edit Tax"}
              </h3>
            </div>
            <form onSubmit={modalMode === "create" ? handleCreate : handleUpdate}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{formError}</p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tax Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxForm.name}
                    onChange={(e) => setTaxForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., VAT, Sales Tax"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
                    required
                  />
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tax Rate (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={taxForm.rate}
                    onChange={(e) => setTaxForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={taxForm.description}
                    onChange={(e) => setTaxForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description"
                    rows={2}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 resize-none"
                  />
                </div>

                {/* Compound */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isCompound"
                    checked={taxForm.isCompound}
                    onChange={(e) => setTaxForm(f => ({ ...f, isCompound: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/40"
                  />
                  <label htmlFor="isCompound" className="text-sm text-slate-300">
                    Compound Tax
                  </label>
                  <span className="text-xs text-slate-500">
                    (calculated on subtotal + other taxes)
                  </span>
                </div>

                {/* Active */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={taxForm.isActive}
                    onChange={(e) => setTaxForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/40"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-300">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Saving..." : modalMode === "create" ? "Create Tax" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modalMode === "delete" && selectedTax && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white">Delete Tax</h3>
            </div>
            <div className="p-6">
              {formError && (
                <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{formError}</p>
                </div>
              )}
              <p className="text-slate-300">
                Are you sure you want to delete <span className="font-medium text-white">{selectedTax.name}</span>?
              </p>
              <p className="text-sm text-slate-400 mt-2">
                This will remove the tax from all assigned products, categories, brands, and shops.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-red-500/20 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete Tax"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {modalMode === "assign" && selectedTax && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white">
                Assign Tax: {selectedTax.name}
              </h3>
              <p className="text-sm text-slate-400">
                Select which products, categories, brands, or shops this tax applies to
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => { setAssignTab("products"); setSearchQuery("") }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  assignTab === "products"
                    ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Products ({selectedProductIds.length})
              </button>
              <button
                onClick={() => { setAssignTab("categories"); setSearchQuery("") }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  assignTab === "categories"
                    ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/5"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Categories ({selectedCategoryIds.length})
              </button>
              <button
                onClick={() => { setAssignTab("brands"); setSearchQuery("") }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  assignTab === "brands"
                    ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Brands ({selectedBrandIds.length})
              </button>
              <button
                onClick={() => { setAssignTab("shops"); setSearchQuery("") }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  assignTab === "shops"
                    ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Shops ({selectedShopIds.length})
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-white/5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {formError && (
                <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{formError}</p>
                </div>
              )}

              {/* Products Tab */}
              {assignTab === "products" && (
                <>
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No products found</p>
                  ) : (
                    filteredProducts.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleProductId(product.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/40"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{product.name}</p>
                          <p className="text-xs text-slate-500">
                            {product.sku && `SKU: ${product.sku} • `}
                            {product.category || "No category"} • {product.brand || "No brand"}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}

              {/* Categories Tab */}
              {assignTab === "categories" && (
                <>
                  {filteredCategories.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No categories found</p>
                  ) : (
                    filteredCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(category.id)}
                          onChange={() => toggleCategoryId(category.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/40"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{category.name}</p>
                          <p className="text-xs text-slate-500">
                            {category.productCount} product{category.productCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}

              {/* Brands Tab */}
              {assignTab === "brands" && (
                <>
                  {filteredBrands.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No brands found</p>
                  ) : (
                    filteredBrands.map((brand) => (
                      <label
                        key={brand.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrandIds.includes(brand.id)}
                          onChange={() => toggleBrandId(brand.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/40"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{brand.name}</p>
                          <p className="text-xs text-slate-500">
                            {brand.productCount} product{brand.productCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}

              {/* Shops Tab */}
              {assignTab === "shops" && (
                <>
                  {filteredShops.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No shops found</p>
                  ) : (
                    filteredShops.map((shop) => (
                      <label
                        key={shop.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedShopIds.includes(shop.id)}
                          onChange={() => toggleShopId(shop.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/40"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{shop.name}</p>
                          <p className="text-xs text-slate-500">{shop.shopSlug}</p>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={isPending}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
