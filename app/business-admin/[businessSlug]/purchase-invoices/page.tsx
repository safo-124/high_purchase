import { requireBusinessAdmin } from "../../../../lib/auth"
import { PurchaseInvoicesContent } from "./purchase-invoices-content"
import { getBusinessPurchaseInvoices } from "../../actions"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function PurchaseInvoicesPage({ params }: Props) {
  const { businessSlug } = await params
  const { user, business } = await requireBusinessAdmin(businessSlug)

  const invoices = await getBusinessPurchaseInvoices(businessSlug)

  return (
    <PurchaseInvoicesContent
      businessSlug={businessSlug}
      businessName={business.name}
      invoices={invoices}
    />
  )
}
