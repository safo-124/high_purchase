import { requireSalesStaffForShop } from "@/lib/auth"
import { getProductsForSale, getCustomersForSale, getCollectorsForDropdown } from "../../actions"
import { NewSaleForm } from "./new-sale-form"

interface NewSalePageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function NewSalePage({ params }: NewSalePageProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const [products, customers, collectors] = await Promise.all([
    getProductsForSale(shopSlug),
    getCustomersForSale(shopSlug),
    getCollectorsForDropdown(shopSlug),
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
          collectors={collectors}
        />
      </div>
    </div>
  )
}
