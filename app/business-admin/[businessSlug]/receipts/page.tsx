import { getBusinessInvoices, getBusinessShops, getBusinessWalletDepositReceipts } from "../../actions"
import { ReceiptsContent } from "./receipts-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessReceiptsPage({ params }: Props) {
  const { businessSlug } = await params
  const [invoices, shops, walletDeposits] = await Promise.all([
    getBusinessInvoices(businessSlug),
    getBusinessShops(businessSlug),
    getBusinessWalletDepositReceipts(businessSlug),
  ])

  // Calculate stats
  const totalPaymentReceipts = invoices.length
  const totalWalletReceipts = walletDeposits.length
  const totalReceipts = totalPaymentReceipts + totalWalletReceipts
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paymentAmount, 0)
  const totalWalletDeposited = walletDeposits.reduce((sum, wd) => sum + wd.amount, 0)
  const completedPurchases = invoices.filter((inv) => inv.isPurchaseCompleted).length
  const waybillsGenerated = invoices.filter((inv) => inv.waybillGenerated).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Payment Receipts</h1>
        <p className="text-slate-400">All receipts from payments and wallet deposits</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Receipts</p>
          <p className="text-2xl font-bold text-white">{totalReceipts}</p>
          <p className="text-xs text-slate-500 mt-1">{totalPaymentReceipts} payments, {totalWalletReceipts} wallet</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Payments Collected</p>
          <p className="text-2xl font-bold text-green-400">₵{totalCollected.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">From payment receipts</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Wallet Deposits</p>
          <p className="text-2xl font-bold text-cyan-400">₵{totalWalletDeposited.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Confirmed deposits</p>
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
        walletDeposits={walletDeposits}
        shops={shops.map(s => ({ name: s.name, shopSlug: s.shopSlug }))}
        businessSlug={businessSlug}
      />
    </div>
  )
}
