"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  toggleStaffActive,
} from "../../actions"
import { CollectorDetailsModal } from "./collector-details-modal"

interface StaffMember {
  id: string
  userId: string
  userName: string | null
  userEmail: string
  role: string
  isActive: boolean
  shopName: string
  shopSlug: string
  createdAt: Date
}

interface Shop {
  id: string
  name: string
  shopSlug: string
}

interface StaffContentProps {
  staff: StaffMember[]
  shops: Shop[]
  businessSlug: string
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  SHOP_ADMIN: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  SALES_STAFF: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  DEBT_COLLECTOR: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
}

const roleLabels: Record<string, string> = {
  SHOP_ADMIN: "Shop Admin",
  SALES_STAFF: "Sales Staff",
  DEBT_COLLECTOR: "Collector",
}

type ModalMode = "create" | "edit" | null

export function StaffContent({ staff, shops, businessSlug }: StaffContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<"all" | "SHOP_ADMIN" | "SALES_STAFF" | "DEBT_COLLECTOR">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  
  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedCollectorId, setSelectedCollectorId] = useState<string | null>(null)
  
  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES_STAFF" as "SHOP_ADMIN" | "SALES_STAFF" | "DEBT_COLLECTOR",
    shopId: "",
    isActive: true,
  })

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = 
      member.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesShop = shopFilter === "all" || member.shopSlug === shopFilter
    const matchesRole = roleFilter === "all" || member.role === roleFilter
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && member.isActive) ||
      (statusFilter === "inactive" && !member.isActive)
    
    return matchesSearch && matchesShop && matchesRole && matchesStatus
  })

  // Group by shop for display
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    const shopCompare = a.shopName.localeCompare(b.shopName)
    if (shopCompare !== 0) return shopCompare
    const roleOrder = { SHOP_ADMIN: 0, SALES_STAFF: 1, DEBT_COLLECTOR: 2 }
    return (roleOrder[a.role as keyof typeof roleOrder] || 9) - (roleOrder[b.role as keyof typeof roleOrder] || 9)
  })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const openCreateModal = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "SALES_STAFF",
      shopId: shops[0]?.id || "",
      isActive: true,
    })
    setFormError(null)
    setModalMode("create")
  }

  const openEditModal = (member: StaffMember) => {
    const shop = shops.find(s => s.shopSlug === member.shopSlug)
    setEditingMember(member)
    setFormData({
      name: member.userName || "",
      email: member.userEmail,
      password: "",
      role: member.role as "SHOP_ADMIN" | "SALES_STAFF" | "DEBT_COLLECTOR",
      shopId: shop?.id || "",
      isActive: member.isActive,
    })
    setFormError(null)
    setModalMode("edit")
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingMember(null)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const form = new FormData()
    form.set("name", formData.name)
    form.set("email", formData.email)
    form.set("password", formData.password)
    form.set("role", formData.role)
    form.set("shopId", formData.shopId)
    form.set("isActive", formData.isActive.toString())

    startTransition(async () => {
      let result
      if (modalMode === "create") {
        result = await createStaffMember(businessSlug, form)
      } else if (modalMode === "edit" && editingMember) {
        result = await updateStaffMember(businessSlug, editingMember.id, form)
      }

      if (result?.success) {
        closeModal()
        router.refresh()
      } else {
        setFormError(result?.error || "An error occurred")
      }
    })
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    startTransition(async () => {
      const result = await deleteStaffMember(businessSlug, deleteConfirm.id)
      if (result.success) {
        setDeleteConfirm(null)
        router.refresh()
      } else {
        setFormError(result.error || "Failed to delete")
      }
    })
  }

  const handleToggleActive = async (member: StaffMember) => {
    startTransition(async () => {
      await toggleStaffActive(businessSlug, member.id)
      router.refresh()
    })
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
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
                placeholder="Search by name or email..."
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

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Roles</option>
              <option value="SHOP_ADMIN">Shop Admins</option>
              <option value="SALES_STAFF">Sales Staff</option>
              <option value="DEBT_COLLECTOR">Collectors</option>
            </select>

            {/* Status Filter */}
            <div className="flex gap-2">
              {(["all", "active", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    statusFilter === status
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Add Staff Button */}
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Staff
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
          <p className="text-sm text-slate-400">
            Showing {sortedStaff.length} of {staff.length} staff members
          </p>
        </div>

        {/* Staff List */}
        {sortedStaff.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No staff found</h3>
            <p className="text-slate-400 mb-4">Try adjusting your search or filters</p>
            {shops.length > 0 && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add your first staff member
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedStaff.map((member) => {
                  const colors = roleColors[member.role] || roleColors.SALES_STAFF
                  const isCollector = member.role === "DEBT_COLLECTOR"
                  return (
                    <tr 
                      key={member.id} 
                      className={`hover:bg-white/[0.02] transition-colors ${isCollector ? "cursor-pointer" : ""}`}
                      onClick={() => isCollector && setSelectedCollectorId(member.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                            <span className={`text-sm font-semibold ${colors.text}`}>
                              {(member.userName || member.userEmail).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{member.userName || "No Name"}</p>
                              {isCollector && (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-medium">
                                  Click to view
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{member.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {roleLabels[member.role] || member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                          {member.shopName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(member)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                            member.isActive
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? "bg-green-400" : "bg-red-400"}`} />
                          {member.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-400">{formatDate(member.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {isCollector && (
                            <button
                              onClick={() => setSelectedCollectorId(member.id)}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                              title="View Transaction Sheet"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(member)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6">
              {modalMode === "create" ? "Add New Staff Member" : "Edit Staff Member"}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Password {modalMode === "edit" && "(leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  minLength={modalMode === "create" ? 6 : 0}
                  required={modalMode === "create"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="SHOP_ADMIN">Shop Admin</option>
                    <option value="SALES_STAFF">Sales Staff</option>
                    <option value="DEBT_COLLECTOR">Collector</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Shop</label>
                  <select
                    value={formData.shopId}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  >
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {modalMode === "edit" && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-300">
                    Active (can log in and use the system)
                  </label>
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
                  {isPending ? "Saving..." : modalMode === "create" ? "Add Staff" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-md glass-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Staff Member</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to remove <strong className="text-white">{deleteConfirm.userName || deleteConfirm.userEmail}</strong> from <strong className="text-white">{deleteConfirm.shopName}</strong>?
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collector Details Modal */}
      {selectedCollectorId && (
        <CollectorDetailsModal
          collectorId={selectedCollectorId}
          businessSlug={businessSlug}
          onClose={() => setSelectedCollectorId(null)}
        />
      )}
    </>
  )
}
