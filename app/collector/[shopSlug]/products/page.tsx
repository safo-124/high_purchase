import { requireCollectorForShop } from "@/lib/auth"
import { getProductsForCollector } from "../../actions"
import { ProductsContent } from "./products-content"

interface CollectorProductsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorProductsPage({ params }: CollectorProductsPageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  const products = await getProductsForCollector(shopSlug)

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Products</h1>
        <p className="text-slate-400">View available products and their stock levels</p>
      </div>

      <ProductsContent products={products} />
    </div>
  )
}
