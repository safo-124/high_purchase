import { requireShopAdminForShop } from "@/lib/auth"
import {
  getVisibleCustomersForWallet,
  canStaffLoadWallet,
  getShopPendingDeposits,
  getShopWalletStats,
} from "../../wallet-actions"
import { ShopWalletContent } from "./wallet-content"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function ShopWalletPage({ params }: Props) {
  const { shopSlug } = await params
  await requireShopAdminForShop(shopSlug)
  
  const [customers, canLoad, pendingDeposits, stats] = await Promise.all([
    getVisibleCustomersForWallet(shopSlug),
    canStaffLoadWallet(shopSlug),
    getShopPendingDeposits(shopSlug),
    getShopWalletStats(shopSlug),
  ])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Customer Wallets</h1>
        <p className="text-slate-400">Load and manage customer wallet balances</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Balance</p>
          <p className="text-2xl font-bold text-green-400">
            GHS {stats.totalBalance.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{stats.customersWithBalance} customers</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending Deposits</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pendingDeposits}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting confirmation</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Today&apos;s Deposits</p>
          <p className="text-2xl font-bold text-cyan-400">
            GHS {stats.todayDeposits.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Confirmed today</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Access</p>
          <p className={`text-2xl font-bold ${stats.canLoadWallet ? "text-green-400" : "text-red-400"}`}>
            {stats.canLoadWallet ? "Active" : "No Access"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.isShopAdmin ? "Shop Admin" : "Staff"}
          </p>
        </div>
      </div>

      <ShopWalletContent
        shopSlug={shopSlug}
        customers={customers}
        canLoadWallet={canLoad}
        pendingDeposits={pendingDeposits}
        isShopAdmin={stats.isShopAdmin}
      />
    </div>
  )
}
