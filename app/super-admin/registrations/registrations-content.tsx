"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { approveRegistration, rejectRegistration } from "../platform-actions"

type Registration = {
  id: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  businessName: string
  businessType: string | null
  city: string | null
  address: string | null
  numberOfShops: number
  numberOfStaff: number
  monthlyRevenue: string | null
  howHeard: string | null
  message: string | null
  status: string
  reviewedByName: string | null
  rejectionReason: string | null
  createdAt: string | Date
}

type Props = {
  data: { registrations: Registration[]; total: number; totalPages: number }
  currentStatus: string
  currentSearch: string
  currentPage: number
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/10 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
}

export function RegistrationsContent({ data, currentStatus, currentSearch, currentPage }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Registration | null>(null)
  const [processing, setProcessing] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const handleApprove = async () => {
    if (!selected) return
    setProcessing(true)
    setResult(null)
    try {
      const res = await approveRegistration(selected.id)
      if (res.success) {
        setResult({ type: "success", msg: `Business approved! Credentials sent to ${selected.ownerEmail}.` })
        setTimeout(() => { setSelected(null); setResult(null); router.refresh() }, 3000)
      } else {
        setResult({ type: "error", msg: res.error || "Failed to approve." })
      }
    } catch {
      setResult({ type: "error", msg: "Something went wrong." })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selected || !rejectionReason.trim()) return
    setProcessing(true)
    setResult(null)
    try {
      const res = await rejectRegistration(selected.id, rejectionReason)
      if (res.success) {
        setResult({ type: "success", msg: "Registration rejected." })
        setTimeout(() => { setSelected(null); setResult(null); setRejectMode(false); setRejectionReason(""); router.refresh() }, 2000)
      } else {
        setResult({ type: "error", msg: res.error || "Failed to reject." })
      }
    } catch {
      setResult({ type: "error", msg: "Something went wrong." })
    } finally {
      setProcessing(false)
    }
  }

  const nav = (status?: string, search?: string, page?: number) => {
    const p = new URLSearchParams()
    if (status) p.set("status", status)
    if (search) p.set("search", search)
    if (page && page > 1) p.set("page", String(page))
    router.push(`/super-admin/registrations?${p.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Business Registrations</h2>
          <p className="text-sm text-slate-400 mt-1">{data.total} registration{data.total !== 1 ? "s" : ""} found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {["PENDING", "APPROVED", "REJECTED", ""].map(s => (
          <button
            key={s || "ALL"}
            onClick={() => nav(s, currentSearch)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentStatus === s
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "text-slate-400 hover:text-white border border-white/10 hover:border-white/20"
            }`}
          >
            {s || "All"}
          </button>
        ))}

        <div className="flex-1 min-w-[200px] max-w-sm ml-auto">
          <input
            type="text"
            placeholder="Search by name or email..."
            defaultValue={currentSearch}
            onKeyDown={e => { if (e.key === "Enter") nav(currentStatus, (e.target as HTMLInputElement).value) }}
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {data.registrations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">No registrations found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{r.businessName}</p>
                      <p className="text-xs text-slate-500">{r.numberOfShops} shop{r.numberOfShops !== 1 ? "s" : ""} · {r.numberOfStaff} staff</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{r.ownerName}</p>
                      <p className="text-xs text-slate-500">{r.ownerEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{r.businessType || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{r.city || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_STYLES[r.status] || "text-slate-400"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setSelected(r); setRejectMode(false); setResult(null) }}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => nav(currentStatus, currentSearch, p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === currentPage
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-slate-500 hover:text-white border border-white/10 hover:border-white/20"
              }`}>{p}</button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setSelected(null)}>
          <div className="w-full max-w-lg glass-card rounded-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.businessName}</h3>
                <span className={`inline-flex mt-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_STYLES[selected.status]}`}>
                  {selected.status}
                </span>
              </div>
              <button onClick={() => !processing && setSelected(null)} className="text-slate-500 hover:text-white text-xl">&times;</button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Owner</p>
                  <p className="text-sm text-white">{selected.ownerName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-sm text-white">{selected.ownerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="text-sm text-white">{selected.ownerPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Business Type</p>
                  <p className="text-sm text-white">{selected.businessType || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">City</p>
                  <p className="text-sm text-white">{selected.city || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Address</p>
                  <p className="text-sm text-white">{selected.address || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Shops</p>
                  <p className="text-sm text-white">{selected.numberOfShops}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Staff</p>
                  <p className="text-sm text-white">{selected.numberOfStaff}</p>
                </div>
              </div>

              {selected.monthlyRevenue && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Estimated Monthly Revenue</p>
                  <p className="text-sm text-white">{selected.monthlyRevenue}</p>
                </div>
              )}
              {selected.howHeard && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">How They Heard About Us</p>
                  <p className="text-sm text-white">{selected.howHeard}</p>
                </div>
              )}
              {selected.message && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Additional Message</p>
                  <p className="text-sm text-slate-300">{selected.message}</p>
                </div>
              )}
              {selected.rejectionReason && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-300">{selected.rejectionReason}</p>
                </div>
              )}
              {selected.reviewedByName && (
                <p className="text-xs text-slate-500">Reviewed by: {selected.reviewedByName}</p>
              )}
            </div>

            {/* Result message */}
            {result && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${result.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>{result.msg}</div>
            )}

            {/* Actions for PENDING */}
            {selected.status === "PENDING" && !result?.type && (
              <>
                {!rejectMode ? (
                  <div className="flex gap-3">
                    <button onClick={handleApprove} disabled={processing}
                      className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50">
                      {processing ? "Approving..." : "Approve & Create Business"}
                    </button>
                    <button onClick={() => setRejectMode(true)} disabled={processing}
                      className="px-6 py-3 text-sm font-medium text-red-400 rounded-xl border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/30 resize-none"
                    />
                    <div className="flex gap-3">
                      <button onClick={handleReject} disabled={processing || !rejectionReason.trim()}
                        className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-500 transition-all disabled:opacity-50">
                        {processing ? "Rejecting..." : "Confirm Rejection"}
                      </button>
                      <button onClick={() => { setRejectMode(false); setRejectionReason("") }}
                        className="px-6 py-3 text-sm font-medium text-slate-400 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
