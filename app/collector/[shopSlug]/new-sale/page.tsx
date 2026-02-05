import { requireCollectorForShop } from "@/lib/auth"
import { getProductsForCollector, getCustomersForCollectorSale, getCollectorDashboard } from "../../actions"
import { NewSaleForm } from "./new-sale-form"
import { redirect } from "next/navigation"

interface NewSalePageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorNewSalePage({ params }: NewSalePageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  // Check if collector has permission to sell products
  const dashboard = await getCollectorDashboard(shopSlug)
  
  if (!dashboard.canSellProducts) {
    redirect(`/collector/${shopSlug}/dashboard`)
  }

  const [products, customers] = await Promise.all([
    getProductsForCollector(shopSlug),
    getCustomersForCollectorSale(shopSlug),
  ])

  // Only show products in stock
  const availableProducts = products.filter((p) => p.stockQuantity > 0)

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <NewSaleForm 
          shopSlug={shopSlug} 
          products={availableProducts} 
          customers={customers}
          canCreateCustomers={dashboard.canCreateCustomers}
        />
      </div>
    </div>
  )
}
