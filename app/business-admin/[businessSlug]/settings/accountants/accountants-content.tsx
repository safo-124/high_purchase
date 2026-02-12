"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createAccountant,
  updateAccountantPermissions,
  deleteAccountant,
  toggleAccountantActive,
} from "../../../actions"

interface Accountant {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  isActive: boolean
  canConfirmPayments: boolean
  canExportData: boolean
  canViewProfitMargins: boolean
  canRecordExpenses: boolean
  createdAt: Date
}

interface Props {
  accountants: Accountant[]
  businessSlug: string
}

export function AccountantsContent({ accountants, businessSlug }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAccountant, setEditingAccountant] = useState<Accountant | null>(null)
  const [deletingAccountant, setDeletingAccountant] = useState<Accountant | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    canConfirmPayments: false,
    canExportData: true,
    canViewProfitMargins: true,
    canRecordExpenses: false,
  })

  // Edit form state (permissions only)
  const [editForm, setEditForm] = useState({
    canConfirmPayments: false,
    canExportData: true,
    canViewProfitMargins: true,
    canRecordExpenses: false,
  })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const openCreateModal = () => {
    setCreateForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      canConfirmPayments: false,
      canExportData: true,
      canViewProfitMargins: true,
      canRecordExpenses: false,
    })
    setFormError(null)
    setShowCreateModal(true)
  }

  const openEditModal = (accountant: Accountant) => {
    setEditingAccountant(accountant)
    setEditForm({
      canConfirmPayments: accountant.canConfirmPayments,
      canExportData: accountant.canExportData,
      canViewProfitMargins: accountant.canViewProfitMargins,
      canRecordExpenses: accountant.canRecordExpenses,
    })
    setFormError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const form = new FormData()
    form.set("name", createForm.name)
    form.set("email", createForm.email)
    form.set("password", createForm.password)
    form.set("phone", createForm.phone)
    form.set("canConfirmPayments", createForm.canConfirmPayments.toString())
    form.set("canExportData", createForm.canExportData.toString())
    form.set("canViewProfitMargins", createForm.canViewProfitMargins.toString())
    form.set("canRecordExpenses", createForm.canRecordExpenses.toString())

    startTransition(async () => {
      const result = await createAccountant(businessSlug, form)
      if (result.success) {
        setShowCreateModal(false)
        router.refresh()
      } else {
        setFormError(result.error || "Failed to create accountant")
      }
    })
  }

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAccountant) return
    setFormError(null)

    startTransition(async () => {
      const result = await updateAccountantPermissions(
        businessSlug,
        editingAccountant.id,
        editForm
      )
      if (result.success) {
        setEditingAccountant(null)
        router.refresh()
      } else {
        setFormError(result.error || "Failed to update permissions")
      }
    })
  }

  const handleDelete = async () => {
    if (!deletingAccountant) return

    startTransition(async () => {
      const result = await deleteAccountant(businessSlug, deletingAccountant.id)
      if (result.success) {
        setDeletingAccountant(null)
        router.refresh()
      } else {
        setFormError(result.error || "Failed to delete accountant")
      }
    })
  }

  const handleToggleActive = async (accountant: Accountant) => {
    startTransition(async () => {
      await toggleAccountantActive(businessSlug, accountant.id)
      router.refresh()
    })
  }

  return (
    <>
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Total Accountants</p>
          <p className="text-2xl font-bold text-white">{accountants.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Active</p>
          <p className="text-2xl font-bold text-emerald-400">
            {accountants.filter((a) => a.isActive).length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400">Can Confirm Payments</p>
          <p className="text-2xl font-bold text-cyan-400">
            {accountants.filter((a) => a.canConfirmPayments).length}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Accountant Staff</h2>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Accountant
          </button>
        </div>

        {accountants.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No accountants yet</h3>
            <p className="text-slate-400 mb-4">
              Add accountants to give them view-only access to financial data and reports
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add your first accountant
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Accountant
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accountants.map((accountant) => (
                  <tr key={accountant.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <span className="font-medium text-emerald-300">
                            {accountant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{accountant.name}</p>
                          <p className="text-sm text-slate-400">{accountant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {accountant.canConfirmPayments && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            Confirm
                          </span>
                        )}
                        {accountant.canExportData && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Export
                          </span>
                        )}
                        {accountant.canViewProfitMargins && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Profits
                          </span>
                        )}
                        {accountant.canRecordExpenses && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Expenses
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(accountant)}
                        disabled={isPending}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                          accountant.isActive
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {accountant.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(accountant.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(accountant)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Edit permissions"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingAccountant(accountant)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white">Add New Accountant</h3>
              <p className="text-sm text-slate-400 mt-1">
                Create a new user with accountant access to this business
              </p>
            </div>

            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Password *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-sm font-medium text-white mb-3">Permissions</h4>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.canExportData}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, canExportData: e.target.checked })
                        }
                        className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                      />
                      <div>
                        <span className="text-sm text-white">Export Data</span>
                        <span className="block text-xs text-slate-500">
                          Download payment, customer, and report data as CSV
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.canViewProfitMargins}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, canViewProfitMargins: e.target.checked })
                        }
                        className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                      />
                      <div>
                        <span className="text-sm text-white">View Profit Margins</span>
                        <span className="block text-xs text-slate-500">
                          Access product costs and profit analysis reports
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.canConfirmPayments}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, canConfirmPayments: e.target.checked })
                        }
                        className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                      />
                      <div>
                        <span className="text-sm text-white">Confirm Payments</span>
                        <span className="block text-xs text-slate-500">
                          Approve and confirm pending payment records
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.canRecordExpenses}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, canRecordExpenses: e.target.checked })
                        }
                        className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                      />
                      <div>
                        <span className="text-sm text-white">Record Expenses</span>
                        <span className="block text-xs text-slate-500">
                          Add and manage business expense entries
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Create Accountant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingAccountant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white">Edit Permissions</h3>
              <p className="text-sm text-slate-400 mt-1">
                Update permissions for {editingAccountant.name}
              </p>
            </div>

            <form onSubmit={handleUpdatePermissions}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.canExportData}
                      onChange={(e) =>
                        setEditForm({ ...editForm, canExportData: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                    />
                    <div>
                      <span className="text-sm text-white">Export Data</span>
                      <span className="block text-xs text-slate-500">
                        Download payment, customer, and report data as CSV
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.canViewProfitMargins}
                      onChange={(e) =>
                        setEditForm({ ...editForm, canViewProfitMargins: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                    />
                    <div>
                      <span className="text-sm text-white">View Profit Margins</span>
                      <span className="block text-xs text-slate-500">
                        Access product costs and profit analysis reports
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.canConfirmPayments}
                      onChange={(e) =>
                        setEditForm({ ...editForm, canConfirmPayments: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                    />
                    <div>
                      <span className="text-sm text-white">Confirm Payments</span>
                      <span className="block text-xs text-slate-500">
                        Approve and confirm pending payment records
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.canRecordExpenses}
                      onChange={(e) =>
                        setEditForm({ ...editForm, canRecordExpenses: e.target.checked })
                      }
                      className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500"
                    />
                    <div>
                      <span className="text-sm text-white">Record Expenses</span>
                      <span className="block text-xs text-slate-500">
                        Add and manage business expense entries
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAccountant(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAccountant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white text-center mb-2">Remove Accountant</h3>
              <p className="text-slate-400 text-center text-sm">
                Are you sure you want to remove <strong className="text-white">{deletingAccountant.name}</strong> from this business? They will lose all access to financial data.
              </p>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={() => setDeletingAccountant(null)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {isPending ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
