import { SuperAdminShell } from "../super-admin-shell"
import { getInvoices } from "../billing-actions"
import { InvoicesList } from "./invoices-client"

export default async function InvoicesPage() {
  const { invoices } = await getInvoices()

  return (
    <SuperAdminShell activeHref="/super-admin/invoices">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Subscription Invoices</h2>
        <p className="text-slate-400">Generate and manage subscription invoices</p>
      </div>
      <InvoicesList invoices={invoices} />
    </SuperAdminShell>
  )
}
