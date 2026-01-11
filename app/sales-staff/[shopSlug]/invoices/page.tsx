import { getSalesStaffInvoices } from "../../actions"
import { InvoicesContent } from "./invoices-content"

interface InvoicesPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function InvoicesPage({ params }: InvoicesPageProps) {
  const { shopSlug } = await params
  const invoices = await getSalesStaffInvoices(shopSlug)

  return <InvoicesContent invoices={invoices} shopSlug={shopSlug} />
}
