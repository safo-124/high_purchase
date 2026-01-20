"use client"

import { SalesStaffData } from "../../actions"

interface StaffTableProps {
  staff: SalesStaffData[]
}

export function StaffTable({ staff }: StaffTableProps) {

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No sales staff yet</h3>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Sales staff members are managed by the business admin.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
              Staff Member
            </th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
              Email
            </th>
            <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {staff.map((member) => (
            <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
              {/* Staff Info */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-indigo-300">
                      {member.name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{member.name || "Unnamed"}</p>
                    <p className="text-xs text-slate-400">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </td>

              {/* Email */}
              <td className="px-6 py-4">
                <span className="text-sm text-slate-300">
                  {member.email}
                </span>
              </td>

              {/* Status - View Only */}
              <td className="px-6 py-4 text-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    member.isActive
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? "bg-green-400" : "bg-slate-400"}`} />
                  {member.isActive ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
