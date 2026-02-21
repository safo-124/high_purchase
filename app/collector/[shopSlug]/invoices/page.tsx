import { getCollectorPurchaseInvoices } from "../../actions"
import { InvoicesContent } from "./invoices-content"

export default async function CollectorInvoicesPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const invoices = await getCollectorPurchaseInvoices(shopSlug)

  return <InvoicesContent invoices={invoices} shopSlug={shopSlug} />
}
