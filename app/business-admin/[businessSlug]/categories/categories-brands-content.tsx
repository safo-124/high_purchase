"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createBusinessCategory,
  updateBusinessCategory,
  deleteBusinessCategory,
  createBusinessBrand,
  updateBusinessBrand,
  deleteBusinessBrand,
} from "../../actions"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  description: string | null
  color: string | null
  isActive: boolean
  productCount: number
  createdAt: Date
}

interface Brand {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  isActive: boolean
  productCount: number
  createdAt: Date
}

interface CategoriesBrandsContentProps {
  categories: Category[]
  brands: Brand[]
  businessSlug: string
}

type ModalMode = "createCategory" | "editCategory" | "deleteCategory" | "createBrand" | "editBrand" | "deleteBrand" | null

export function CategoriesBrandsContent({ categories, brands, businessSlug }: CategoriesBrandsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories")
  
  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    isActive: true,
  })

  // Brand form
  const [brandForm, setBrandForm] = useState({
    name: "",
    description: "",
    logoUrl: "",
    isActive: true,
  })

  // Category handlers
  const openCreateCategoryModal = () => {
    setSelectedCategory(null)
    setCategoryForm({ name: "", description: "", color: "#6366f1", isActive: true })
    setFormError(null)
    setModalMode("createCategory")
  }

  const openEditCategoryModal = (category: Category) => {
    setSelectedCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      color: category.color || "#6366f1",
      isActive: category.isActive,
    })
    setFormError(null)
    setModalMode("editCategory")
  }

  const openDeleteCategoryModal = (category: Category) => {
    setSelectedCategory(category)
    setFormError(null)
    setModalMode("deleteCategory")
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const result = await createBusinessCategory(businessSlug, categoryForm)
      if (result.success) {
        toast.success(`Category "${categoryForm.name}" created`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to create category")
      }
    })
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return
    setFormError(null)

    startTransition(async () => {
      const result = await updateBusinessCategory(businessSlug, selectedCategory.id, categoryForm)
      if (result.success) {
        toast.success(`Category "${categoryForm.name}" updated`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to update category")
      }
    })
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return
    setFormError(null)

    startTransition(async () => {
      const result = await deleteBusinessCategory(businessSlug, selectedCategory.id)
      if (result.success) {
        toast.success(`Category "${selectedCategory.name}" deleted`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to delete category")
      }
    })
  }

  // Brand handlers
  const openCreateBrandModal = () => {
    setSelectedBrand(null)
    setBrandForm({ name: "", description: "", logoUrl: "", isActive: true })
    setFormError(null)
    setModalMode("createBrand")
  }

  const openEditBrandModal = (brand: Brand) => {
    setSelectedBrand(brand)
    setBrandForm({
      name: brand.name,
      description: brand.description || "",
      logoUrl: brand.logoUrl || "",
      isActive: brand.isActive,
    })
    setFormError(null)
    setModalMode("editBrand")
  }

  const openDeleteBrandModal = (brand: Brand) => {
    setSelectedBrand(brand)
    setFormError(null)
    setModalMode("deleteBrand")
  }

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const result = await createBusinessBrand(businessSlug, brandForm)
      if (result.success) {
        toast.success(`Brand "${brandForm.name}" created`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to create brand")
      }
    })
  }

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrand) return
    setFormError(null)

    startTransition(async () => {
      const result = await updateBusinessBrand(businessSlug, selectedBrand.id, brandForm)
      if (result.success) {
        toast.success(`Brand "${brandForm.name}" updated`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to update brand")
      }
    })
  }

  const handleDeleteBrand = async () => {
    if (!selectedBrand) return
    setFormError(null)

    startTransition(async () => {
      const result = await deleteBusinessBrand(businessSlug, selectedBrand.id)
      if (result.success) {
        toast.success(`Brand "${selectedBrand.name}" deleted`)
        closeModal()
        router.refresh()
      } else {
        setFormError(result.error || "Failed to delete brand")
      }
    })
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedCategory(null)
    setSelectedBrand(null)
    setFormError(null)
  }

  const colorOptions = [
    { value: "#6366f1", label: "Indigo" },
    { value: "#22c55e", label: "Green" },
    { value: "#ef4444", label: "Red" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#3b82f6", label: "Blue" },
    { value: "#a855f7", label: "Purple" },
    { value: "#ec4899", label: "Pink" },
    { value: "#06b6d4", label: "Cyan" },
  ]

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("brands")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "brands"
                ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/5"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Brands ({brands.length})
          </button>
        </div>

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Product Categories</h2>
                <p className="text-sm text-slate-400">Organize your products into categories</p>
              </div>
              <button
                onClick={openCreateCategoryModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Category
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h3 className="text-lg font-semibold text-white mb-2">No categories yet</h3>
                <p className="text-slate-400 mb-4">Create your first category to organize products</p>
                <button
                  onClick={openCreateCategoryModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-cyan-400 hover:text-cyan-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Category
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || "#6366f1" }}
                        />
                        <h3 className="font-medium text-white">{category.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          category.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{category.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {category.productCount} product{category.productCount !== 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditCategoryModal(category)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteCategoryModal(category)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
        )}

        {/* Brands Tab */}
        {activeTab === "brands" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Product Brands</h2>
                <p className="text-sm text-slate-400">Manage the brands for your products</p>
              </div>
              <button
                onClick={openCreateBrandModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Brand
              </button>
            </div>

            {brands.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-lg font-semibold text-white mb-2">No brands yet</h3>
                <p className="text-slate-400 mb-4">Create your first brand to organize products</p>
                <button
                  onClick={openCreateBrandModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-purple-400 hover:text-purple-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Brand
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {brand.logoUrl ? (
                          <img
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <span className="text-purple-400 font-bold text-sm">
                              {brand.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <h3 className="font-medium text-white">{brand.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          brand.isActive
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {brand.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {brand.description && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{brand.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {brand.productCount} product{brand.productCount !== 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditBrandModal(brand)}
                          className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteBrandModal(brand)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
        )}
      </div>

      {/* Create/Edit Category Modal */}
      {(modalMode === "createCategory" || modalMode === "editCategory") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6">
              {modalMode === "createCategory" ? "Create Category" : "Edit Category"}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={modalMode === "createCategory" ? handleCreateCategory : handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, color: color.value })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        categoryForm.color === color.value
                          ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="categoryIsActive"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="categoryIsActive" className="text-sm text-slate-300">
                  Category is active
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
                  {isPending ? "Saving..." : modalMode === "createCategory" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {modalMode === "deleteCategory" && selectedCategory && (
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
                <h3 className="text-lg font-bold text-white">Delete Category</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{selectedCategory.name}</strong>?
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
                onClick={handleDeleteCategory}
                disabled={isPending}
                className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Brand Modal */}
      {(modalMode === "createBrand" || modalMode === "editBrand") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6">
              {modalMode === "createBrand" ? "Create Brand" : "Edit Brand"}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={modalMode === "createBrand" ? handleCreateBrand : handleUpdateBrand} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Brand Name *</label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <textarea
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Logo URL</label>
                <input
                  type="url"
                  value={brandForm.logoUrl}
                  onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="brandIsActive"
                  checked={brandForm.isActive}
                  onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="brandIsActive" className="text-sm text-slate-300">
                  Brand is active
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Saving..." : modalMode === "createBrand" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Brand Modal */}
      {modalMode === "deleteBrand" && selectedBrand && (
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
                <h3 className="text-lg font-bold text-white">Delete Brand</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{selectedBrand.name}</strong>?
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
                onClick={handleDeleteBrand}
                disabled={isPending}
                className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
