import { requireSalesStaffForShop } from "@/lib/auth"
import { getProductsForSale } from "../../actions"
import { ProductsContent } from "./products-content"

interface ProductsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function SalesStaffProductsPage({ params }: ProductsPageProps) {
  const { shopSlug } = await params
  await requireSalesStaffForShop(shopSlug)

  const products = await getProductsForSale(shopSlug)

  return <ProductsContent products={products} shopSlug={shopSlug} />
}
