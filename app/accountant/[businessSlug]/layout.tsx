import { requireAccountant } from "../../../lib/auth"
import { AccountantSidebar } from "./accountant-sidebar"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}

export default async function AccountantLayout({ children, params }: LayoutProps) {
  const { businessSlug } = await params
  const { user, business, membership } = await requireAccountant(businessSlug)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Animated Background Orbs - Emerald/Teal theme for accountant */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(20, 184, 166, 0.2) 50%, transparent 70%)",
            animationDuration: "8s"
          }}
        />
        <div 
          className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, rgba(16, 185, 129, 0.2) 50%, transparent 70%)",
            animationDuration: "10s",
            animationDelay: "2s"
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl animate-pulse"
          style={{ 
            background: "radial-gradient(circle, rgba(52, 211, 153, 0.3) 0%, rgba(20, 184, 166, 0.1) 50%, transparent 70%)",
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
      <AccountantSidebar 
        businessSlug={businessSlug}
        businessName={business.name}
        businessLogoUrl={business.logoUrl ?? null}
        userName={user.name || "Accountant"}
        userEmail={user.email}
        permissions={{
          canConfirmPayments: membership.canConfirmPayments,
          canExportData: membership.canExportData,
          canViewProfitMargins: membership.canViewProfitMargins,
          canRecordExpenses: membership.canRecordExpenses,
        }}
      />

      {/* Main Content Area */}
      <main className="lg:ml-72 min-h-screen relative z-10 pt-16 lg:pt-0 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
