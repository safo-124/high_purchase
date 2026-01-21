import { getShopInvoices } from "../../actions"
import { ReceiptsContent } from "./receipts-content"

interface ReceiptsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function ReceiptsPage({ params }: ReceiptsPageProps) {
  const { shopSlug } = await params
  const receipts = await getShopInvoices(shopSlug)

  return <ReceiptsContent receipts={receipts} shopSlug={shopSlug} />
}
