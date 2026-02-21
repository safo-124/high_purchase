import { getCollectorInvoices } from "../../actions"
import { ReceiptsContent } from "./receipts-content"

export default async function CollectorReceiptsPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const receipts = await getCollectorInvoices(shopSlug)

  return <ReceiptsContent receipts={receipts} shopSlug={shopSlug} />
}
