import { requireShopAdminForShop } from "@/lib/auth"
import { ShopAdminSidebar } from "./shop-admin-sidebar"
import prisma from "@/lib/prisma"

interface ShopAdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ shopSlug: string }>
}

export default async function ShopAdminLayout({ children, params }: ShopAdminLayoutProps) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)

  // Fetch business details for logo
  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
    select: { name: true, logoUrl: true },
  })

  return (
    <div className="min-h-screen bg-mesh flex">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[90px]" />
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
      <ShopAdminSidebar 
        shopSlug={shopSlug} 
        shopName={shop.name} 
        userName={user.name || 'Admin'}
        userEmail={user.email}
        businessName={business?.name || 'Business'}
        businessLogoUrl={business?.logoUrl || null}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 relative z-10 pt-16 lg:pt-0 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
