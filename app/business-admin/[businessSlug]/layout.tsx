import { requireBusinessAdmin } from "../../../lib/auth"
import { BusinessAdminSidebar } from "./business-admin-sidebar"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAdminLayout({ children, params }: LayoutProps) {
  const { businessSlug } = await params
  const { user, business } = await requireBusinessAdmin(businessSlug)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Animated Background Orbs - Cyan/Blue theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 70%)",
            animationDuration: "8s"
          }}
        />
        <div 
          className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 70%)",
            animationDuration: "10s",
            animationDelay: "2s"
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 70%)",
            animationDuration: "12s",
            animationDelay: "4s"
          }}
        />
      </div>

      {/* Grid Pattern */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Sidebar */}
      <BusinessAdminSidebar 
        businessSlug={businessSlug}
        businessName={business.name}
        userName={user.name || "Admin"}
        userEmail={user.email}
      />

      {/* Main Content Area */}
      <main className="lg:ml-64 min-h-screen relative z-10 pt-16 lg:pt-0 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
