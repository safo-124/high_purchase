import { getBusinessInvoices, getBusinessShops } from "../../actions"
import { ReceiptsContent } from "./receipts-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessReceiptsPage({ params }: Props) {
  const { businessSlug } = await params
  const [invoices, shops] = await Promise.all([
    getBusinessInvoices(businessSlug),
    getBusinessShops(businessSlug),
  ])

  // Calculate stats
  const totalReceipts = invoices.length
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paymentAmount, 0)
  const completedPurchases = invoices.filter((inv) => inv.isPurchaseCompleted).length
  const waybillsGenerated = invoices.filter((inv) => inv.waybillGenerated).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Payment Receipts</h1>
        <p className="text-slate-400">Receipts generated for each payment made by customers</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Receipts</p>
          <p className="text-2xl font-bold text-white">{totalReceipts}</p>
          <p className="text-xs text-slate-500 mt-1">Payment records</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-green-400">₵{totalCollected.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">From payments</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Completed</p>
          <p className="text-2xl font-bold text-blue-400">{completedPurchases}</p>
          <p className="text-xs text-slate-500 mt-1">Fully paid purchases</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Waybills</p>
          <p className="text-2xl font-bold text-purple-400">{waybillsGenerated}</p>
          <p className="text-xs text-slate-500 mt-1">Ready for delivery</p>
        </div>
      </div>

      {/* Receipts Table */}
      <ReceiptsContent 
        invoices={invoices} 
        shops={shops.map(s => ({ name: s.name, shopSlug: s.shopSlug }))}
        businessSlug={businessSlug}
      />
    </div>
  )
}
