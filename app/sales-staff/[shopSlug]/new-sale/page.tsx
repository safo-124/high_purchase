import { requireSalesStaffForShop } from "@/lib/auth"
import { getProductsForSale, getCustomersForSale, getSalesStaffDashboard, getCollectorsForDropdown } from "../../actions"
import { NewSaleForm } from "./new-sale-form"
import { SalesStaffNavbar } from "../components/sales-staff-navbar"

interface NewSalePageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function NewSalePage({ params }: NewSalePageProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const [dashboard, products, customers, collectors] = await Promise.all([
    getSalesStaffDashboard(shopSlug),
    getProductsForSale(shopSlug),
    getCustomersForSale(shopSlug),
    getCollectorsForDropdown(shopSlug),
  ])

  // Only show products in stock
  const availableProducts = products.filter((p) => p.stockQuantity > 0)

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
      </div>

      <SalesStaffNavbar
        shopSlug={shopSlug}
        shopName={dashboard.shopName}
        staffName={dashboard.staffName}
      />

      <main className="relative z-10 w-full px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <NewSaleForm 
            shopSlug={shopSlug} 
            products={availableProducts} 
            customers={customers}
            collectors={collectors}
          />
        </div>
      </main>
    </div>
  )
}
