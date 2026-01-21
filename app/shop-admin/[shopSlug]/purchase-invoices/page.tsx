import { getShopPurchaseInvoices } from "../../actions"
import { PurchaseInvoicesContent } from "./purchase-invoices-content"

interface PurchaseInvoicesPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function PurchaseInvoicesPage({ params }: PurchaseInvoicesPageProps) {
  const { shopSlug } = await params
  const invoices = await getShopPurchaseInvoices(shopSlug)

  return <PurchaseInvoicesContent invoices={invoices} shopSlug={shopSlug} />
}
