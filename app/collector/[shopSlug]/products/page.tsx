import { requireCollectorForShop } from "@/lib/auth"
import { getProductsForCollector, getCollectorDashboard } from "../../actions"
import { ProductsContent } from "./products-content"
import { redirect } from "next/navigation"

interface ProductsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorProductsPage({ params }: ProductsPageProps) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)

  // Check if collector has permission to sell products
  const dashboard = await getCollectorDashboard(shopSlug)
  
  if (!dashboard.canSellProducts) {
    redirect(`/collector/${shopSlug}/dashboard`)
  }

  const products = await getProductsForCollector(shopSlug)

  return <ProductsContent products={products} shopSlug={shopSlug} />
}
