import { getShopInvoices, getShopWalletDepositReceipts } from "../../actions"
import { ReceiptsContent } from "./receipts-content"

interface ReceiptsPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function ReceiptsPage({ params }: ReceiptsPageProps) {
  const { shopSlug } = await params
  const [receipts, walletDeposits] = await Promise.all([
    getShopInvoices(shopSlug),
    getShopWalletDepositReceipts(shopSlug),
  ])

  return <ReceiptsContent receipts={receipts} walletDeposits={walletDeposits} shopSlug={shopSlug} />
}
