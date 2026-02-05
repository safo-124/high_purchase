import { requireCollectorForShop } from "@/lib/auth"
import {
  getCollectorCustomersForWallet,
  canCollectorLoadWallet,
  getCollectorPendingDeposits,
  getCollectorWalletStats,
} from "../../wallet-actions"
import { CollectorWalletContent } from "./wallet-content"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function CollectorWalletPage({ params }: Props) {
  const { shopSlug } = await params
  await requireCollectorForShop(shopSlug)
  
  const [customers, canLoad, pendingDeposits, stats] = await Promise.all([
    getCollectorCustomersForWallet(shopSlug),
    canCollectorLoadWallet(shopSlug),
    getCollectorPendingDeposits(shopSlug),
    getCollectorWalletStats(shopSlug),
  ])

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Customer Wallets</h1>
        <p className="text-sm text-slate-400">Load wallet balances for your assigned customers</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Assigned</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{stats.assignedCustomers}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stats.customersWithBalance} with balance</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Balance</p>
          <p className="text-xl sm:text-2xl font-bold text-green-400">
            GHS {stats.totalBalance.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-400">{stats.pendingDeposits}</p>
          <p className="text-xs text-slate-500 mt-0.5">Awaiting confirmation</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Today</p>
          <p className="text-xl sm:text-2xl font-bold text-cyan-400">
            GHS {stats.todayDeposits.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Confirmed</p>
        </div>
      </div>

      <CollectorWalletContent
        shopSlug={shopSlug}
        customers={customers}
        canLoadWallet={canLoad}
        pendingDeposits={pendingDeposits}
      />
    </div>
  )
}
