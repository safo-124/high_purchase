import { requireCollectorForShop } from "@/lib/auth"
import { getProductsForCollector, getCustomersForCollectorSale, getCollectorsForDropdown } from "../../actions"
import { CollectorSaleForm } from "./collector-sale-form"

interface CollectorNewSalePageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorNewSalePage({ params }: CollectorNewSalePageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const [products, customers, collectors] = await Promise.all([
    getProductsForCollector(shopSlug),
    getCustomersForCollectorSale(shopSlug),
    getCollectorsForDropdown(shopSlug),
  ])

  // Only show products in stock
  const availableProducts = products.filter((p) => p.stockQuantity > 0)

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">New Sale</h1>
        <p className="text-sm sm:text-base text-slate-400">Create a new sale for a customer</p>
      </div>

      <div className="max-w-4xl">
        <CollectorSaleForm 
          shopSlug={shopSlug} 
          products={availableProducts} 
          customers={customers}
          collectors={collectors}
        />
      </div>
    </div>
  )
}
