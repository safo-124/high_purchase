import { redirect } from "next/navigation"
import { getCustomerReceipts, checkCustomerSession } from "../../actions"
import { ReceiptsContent } from "./receipts-content"

export default async function CustomerReceiptsPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const session = await checkCustomerSession()

  if (!session) {
    redirect(`/customer/${shopSlug}/login`)
  }

  const receipts = await getCustomerReceipts()

  return <ReceiptsContent receipts={receipts} shopSlug={shopSlug} />
}
