"use client"

import { useState } from "react"
import { CategoryData, createCategory, updateCategory, deleteCategory } from "../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CategoriesSectionProps {
  categories: CategoryData[]
  shopSlug: string
}

const colorOptions = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#6b7280", label: "Gray" },
]

export function CategoriesSection({ categories, shopSlug }: CategoriesSectionProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState({ name: "", description: "", color: "#6366f1" })
  const [editCategory, setEditCategory] = useState({ name: "", description: "", color: "#6366f1" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Category name is required")
      return
    }

    setIsSubmitting(true)
    const result = await createCategory(shopSlug, newCategory)
    
    if (result.success) {
      toast.success("Category created successfully!")
      setNewCategory({ name: "", description: "", color: "#6366f1" })
      setIsCreating(false)
      router.refresh()
    } else {
      toast.error(result.error || "Failed to create category")
    }
    setIsSubmitting(false)
  }

  const handleUpdate = async (categoryId: string) => {
    if (!editCategory.name.trim()) {
      toast.error("Category name is required")
      return
    }

    setIsSubmitting(true)
    const result = await updateCategory(shopSlug, categoryId, editCategory)
    
    if (result.success) {
      toast.success("Category updated successfully!")
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(result.error || "Failed to update category")
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Delete "${categoryName}"? Products in this category will become uncategorized.`)) {
      return
    }

    const result = await deleteCategory(shopSlug, categoryId)
    
    if (result.success) {
      toast.success("Category deleted successfully!")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to delete category")
    }
  }

  const startEditing = (cat: CategoryData) => {
    setEditingId(cat.id)
    setEditCategory({
      name: cat.name,
      description: cat.description || "",
      color: cat.color || "#6366f1",
    })
  }

  return (
    <div className="glass-card rounded-2xl mb-8 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Categories</h3>
            <p className="text-sm text-slate-400">
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} • Organize your products
            </p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/5 p-6">
          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                {editingId === cat.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editCategory.name}
                      onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Category name"
                    />
                    <input
                      type="text"
                      value={editCategory.description}
                      onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Description (optional)"
                    />
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditCategory({ ...editCategory, color: c.value })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            editCategory.color === c.value ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        disabled={isSubmitting}
                        className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{cat.name}</p>
                        <p className="text-xs text-slate-400">
                          {cat.productCount} product{cat.productCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(cat)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Edit category"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete category"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add New Category Card */}
            {isCreating ? (
              <div className="bg-white/[0.02] border border-purple-500/30 rounded-xl p-4 space-y-3">
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Category name"
                  autoFocus
                />
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Description (optional)"
                />
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, color: c.value })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        newCategory.color === c.value ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNewCategory({ name: "", description: "", color: "#6366f1" })
                    }}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="border-2 border-dashed border-white/10 hover:border-purple-500/50 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-purple-400 transition-all min-h-[80px]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium">Add Category</span>
              </button>
            )}
          </div>

          {categories.length === 0 && !isCreating && (
            <p className="text-center text-slate-500 text-sm py-4">
              No categories yet. Create categories to organize your products.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
