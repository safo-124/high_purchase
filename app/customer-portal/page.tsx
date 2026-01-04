import prisma from "@/lib/prisma"
import Link from "next/link"
import { Store, ArrowRight, Zap } from "lucide-react"

export default async function CustomerPortalPage() {
  // Get all active shops
  const shops = await prisma.shop.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      shopSlug: true,
      country: true,
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mesh p-4 overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main Content */}
      <div className="w-full max-w-2xl relative z-10">
        {/* Glow Effect Behind Card */}
        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-2xl opacity-60" />
        
        <div className="relative glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Customer Portal
            </h1>
            <p className="text-slate-400 text-sm">
              Select your shop to sign in
            </p>
          </div>

          {/* Shop List */}
          <div className="space-y-3">
            {shops.length === 0 ? (
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">No shops available at the moment</p>
              </div>
            ) : (
              shops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/customer/${shop.shopSlug}/login`}
                  className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <Store className="h-6 w-6 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {shop.name}
                        </h3>
                        <p className="text-sm text-slate-400">{shop.country}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Back to Admin Login */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link 
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Staff Login
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Branding */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-center z-10">
        <p className="text-xs text-slate-600">
          © 2025 High Purchase • Buy Now, Pay Later Platform
        </p>
      </div>
    </div>
  )
}
