import {
  getAllWalletTransactions,
  getPendingWalletTransactions,
  getCustomersWithWallets,
  getStaffWalletPermissions,
  getWalletSummary,
} from "../../wallet-actions"
import { WalletContent } from "./wallet-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function WalletPage({ params }: Props) {
  const { businessSlug } = await params
  
  const [summary, pendingTransactions, customers, staffPermissions, allTransactions] = await Promise.all([
    getWalletSummary(businessSlug),
    getPendingWalletTransactions(businessSlug),
    getCustomersWithWallets(businessSlug),
    getStaffWalletPermissions(businessSlug),
    getAllWalletTransactions(businessSlug),
  ])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Customer Wallets</h1>
        <p className="text-slate-400">Manage customer wallet balances, deposits, and staff permissions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Wallet Balance</p>
          <p className={`text-2xl font-bold ${summary.totalWalletBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
            GHS {summary.totalWalletBalance.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{summary.customersWithBalance} customer{summary.customersWithBalance !== 1 ? "s" : ""} with balance</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Deposits</p>
          <p className="text-2xl font-bold text-amber-400">
            GHS {summary.totalDeposits.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{summary.totalTransactions} transactions</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending Confirmations</p>
          <p className="text-2xl font-bold text-purple-400">{summary.pendingTransactions}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Today&apos;s Deposits</p>
          <p className="text-2xl font-bold text-cyan-400">
            GHS {summary.todayDeposits.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Confirmed today</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Staff with Access</p>
          <p className="text-2xl font-bold text-purple-400">
            {staffPermissions.filter(s => s.canLoadWallet).length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Can load wallets</p>
        </div>
      </div>

      <WalletContent
        businessSlug={businessSlug}
        pendingTransactions={pendingTransactions}
        customers={customers}
        staffPermissions={staffPermissions}
        allTransactions={allTransactions}
      />
    </div>
  )
}
