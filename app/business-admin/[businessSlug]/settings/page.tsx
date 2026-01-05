import { requireBusinessAdmin } from "../../../../lib/auth"
import prisma from "../../../../lib/prisma"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessSettingsPage({ params }: Props) {
  const { businessSlug } = await params
  const { user, business } = await requireBusinessAdmin(businessSlug)

  // Get business details with first admin (as owner)
  const businessDetails = await prisma.business.findUnique({
    where: { id: business.id },
    include: {
      members: {
        where: { role: "BUSINESS_ADMIN", isActive: true },
        include: { user: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: {
        select: { shops: true },
      },
    },
  })

  const owner = businessDetails?.members[0]?.user

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Business Settings</h1>
        <p className="text-slate-400">Manage your business configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Business Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Business Name</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  {business.name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Business Slug</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-mono">
                  {business.businessSlug}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Country</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  {business.country}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Created</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300">
                  {new Date(business.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Business Owner
            </h3>
            
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-xl font-bold text-purple-300">
                  {owner?.name?.charAt(0).toUpperCase() || "O"}
                </span>
              </div>
              <div>
                <p className="font-medium text-white text-lg">{owner?.name || "Unknown"}</p>
                <p className="text-slate-400">{owner?.email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Current User */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your Account
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Name</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  {user.name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Email</label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300">
                  {user.email}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Role</label>
                <span className="inline-flex px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-sm font-medium">
                  Business Admin
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-slate-400">Total Shops</span>
                <span className="text-xl font-bold text-white">{businessDetails?._count.shops || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-slate-400">Status</span>
                <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href={`/business-admin/${businessSlug}/shops`}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium group-hover:text-cyan-300 transition-colors">Manage Shops</p>
                  <p className="text-xs text-slate-500">Create and manage shops</p>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              
              <a
                href={`/business-admin/${businessSlug}/staff`}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium group-hover:text-purple-300 transition-colors">View Staff</p>
                  <p className="text-xs text-slate-500">All team members</p>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              
              <a
                href={`/business-admin/${businessSlug}/reports`}
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium group-hover:text-green-300 transition-colors">View Reports</p>
                  <p className="text-xs text-slate-500">Analytics & insights</p>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Help & Support */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Need Help?</h3>
            <p className="text-sm text-slate-400 mb-4">
              Contact our support team for assistance with your business setup.
            </p>
            <button className="w-full px-4 py-3 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-xl text-sm font-medium hover:bg-cyan-500/20 transition-all">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
