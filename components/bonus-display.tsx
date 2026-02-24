"use client"

import type { StaffBonusSummary, StaffBonusRule, StaffBonusRecord } from "@/lib/bonus-types"
import { getTriggerLabel } from "@/lib/bonus-types"

// ============================================================================
// STATUS STYLES
// ============================================================================

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/30" },
  APPROVED: { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30" },
  PAID: { bg: "bg-green-500/15", text: "text-green-300", border: "border-green-500/30" },
  REJECTED: { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30" },
  CANCELLED: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30" },
}

const PERIOD_LABELS: Record<string, string> = {
  ONE_TIME: "Per Transaction",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
}

// ============================================================================
// STAFF BONUS SECTION (for collector & sales-staff dashboards)
// ============================================================================

export function StaffBonusSection({
  bonusSummary,
  currency = "GHS",
}: {
  bonusSummary: StaffBonusSummary
  currency?: string
}) {
  if (!bonusSummary.hasActiveBonuses && bonusSummary.records.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/15 border border-amber-500/30 flex items-center justify-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm sm:text-lg font-semibold text-white">My Bonuses</h2>
          <p className="text-[10px] sm:text-xs text-slate-400">{bonusSummary.activeRules.length} active bonus program{bonusSummary.activeRules.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-base sm:text-xl font-bold text-amber-400">{currency} {bonusSummary.thisMonthEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-base sm:text-xl font-bold text-yellow-400">{currency} {bonusSummary.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1">Approved</p>
          <p className="text-base sm:text-xl font-bold text-blue-400">{currency} {bonusSummary.totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1">Paid Out</p>
          <p className="text-base sm:text-xl font-bold text-green-400">{currency} {bonusSummary.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Active Bonus Rules */}
      {bonusSummary.activeRules.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/5">
            <h3 className="text-xs sm:text-sm font-semibold text-white">Active Bonus Programs</h3>
          </div>
          <div className="divide-y divide-white/5">
            {bonusSummary.activeRules.map((rule) => (
              <BonusRuleCard key={rule.id} rule={rule} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Bonus Records */}
      {bonusSummary.records.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/5">
            <h3 className="text-xs sm:text-sm font-semibold text-white">Recent Bonuses Earned</h3>
          </div>
          <div className="divide-y divide-white/5">
            {bonusSummary.records.slice(0, 10).map((record) => (
              <BonusRecordRow key={record.id} record={record} currency={currency} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SHOP ADMIN BONUS OVERVIEW (for shop-admin dashboard)
// ============================================================================

export function ShopBonusOverview({
  bonusData,
  currency = "GHS",
}: {
  bonusData: {
    activeRules: number
    totalPending: number
    totalPendingAmount: number
    totalApproved: number
    totalApprovedAmount: number
    totalPaid: number
    totalPaidAmount: number
    thisMonthAmount: number
    staffBonuses: {
      staffName: string
      staffRole: string
      pending: number
      pendingAmount: number
      paid: number
      paidAmount: number
    }[]
    recentRecords: StaffBonusRecord[]
    hasActiveBonuses: boolean
  }
  currency?: string
}) {
  if (!bonusData.hasActiveBonuses && bonusData.recentRecords.length === 0) {
    return null
  }

  const ROLE_LABELS: Record<string, string> = {
    DEBT_COLLECTOR: "Collector",
    SALES_STAFF: "Sales",
    SHOP_ADMIN: "Admin",
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-sm sm:text-lg font-semibold text-white">Staff Bonuses</h2>
        </div>
        <span className="text-[10px] sm:text-xs text-slate-500">{bonusData.activeRules} active rule{bonusData.activeRules !== 1 ? "s" : ""}</span>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-0 border-b border-white/5">
        <div className="p-3 sm:p-4 text-center border-r border-white/5">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">This Month</p>
          <p className="text-sm sm:text-lg font-bold text-amber-400">{currency} {bonusData.thisMonthAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="p-3 sm:p-4 text-center border-r border-white/5">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Pending</p>
          <p className="text-sm sm:text-lg font-bold text-yellow-400">{bonusData.totalPending}</p>
          <p className="text-[10px] text-yellow-400/70">{currency} {bonusData.totalPendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="p-3 sm:p-4 text-center border-r border-white/5">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Approved</p>
          <p className="text-sm sm:text-lg font-bold text-blue-400">{bonusData.totalApproved}</p>
          <p className="text-[10px] text-blue-400/70">{currency} {bonusData.totalApprovedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="p-3 sm:p-4 text-center">
          <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Paid</p>
          <p className="text-sm sm:text-lg font-bold text-green-400">{bonusData.totalPaid}</p>
          <p className="text-[10px] text-green-400/70">{currency} {bonusData.totalPaidAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Staff Breakdown */}
      {bonusData.staffBonuses.length > 0 && (
        <div className="divide-y divide-white/5">
          {bonusData.staffBonuses.slice(0, 5).map((staff, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-slate-300">{staff.staffName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white truncate">{staff.staffName}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">{ROLE_LABELS[staff.staffRole] || staff.staffRole}</p>
              </div>
              <div className="text-right shrink-0">
                {staff.pendingAmount > 0 && (
                  <p className="text-[10px] sm:text-xs text-yellow-400">{currency} {staff.pendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending</p>
                )}
                {staff.paidAmount > 0 && (
                  <p className="text-[10px] sm:text-xs text-green-400">{currency} {staff.paidAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} paid</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {bonusData.staffBonuses.length === 0 && bonusData.recentRecords.length === 0 && (
        <div className="p-6 text-center">
          <p className="text-xs sm:text-sm text-slate-500">No bonus activity yet. Staff will earn bonuses as they collect payments, make sales, and create customers.</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function BonusRuleCard({ rule, currency }: { rule: StaffBonusRule; currency: string }) {
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-white truncate">{rule.name}</p>
          {rule.description && (
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">{rule.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 text-[10px] sm:text-xs bg-cyan-500/15 text-cyan-300 rounded-md border border-cyan-500/20">
              {getTriggerLabel(rule.triggerType)}
            </span>
            <span className="px-2 py-0.5 text-[10px] sm:text-xs bg-slate-500/15 text-slate-300 rounded-md border border-slate-500/20">
              {PERIOD_LABELS[rule.period] || rule.period}
            </span>
            {rule.maximumCap !== null && (
              <span className="px-2 py-0.5 text-[10px] sm:text-xs bg-slate-500/15 text-slate-400 rounded-md border border-slate-500/20">
                Cap: {currency} {rule.maximumCap.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm sm:text-base font-bold text-amber-400">
            {rule.calculationType === "PERCENTAGE" ? `${rule.value}%` : `${currency} ${rule.value.toLocaleString()}`}
          </p>
          {rule.minimumThreshold !== null && (
            <p className="text-[10px] text-slate-500">Min: {currency} {rule.minimumThreshold.toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function BonusRecordRow({ record, currency }: { record: StaffBonusRecord; currency: string }) {
  const style = STATUS_STYLES[record.status] || STATUS_STYLES.PENDING

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
        {record.status === "PAID" ? (
          <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${style.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : record.status === "PENDING" ? (
          <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${style.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${style.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] sm:text-sm font-medium text-white truncate">{record.ruleName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] sm:text-xs text-slate-500">{getTriggerLabel(record.triggerType)}</span>
          {record.sourceRef && (
            <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{record.sourceRef}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs sm:text-sm font-bold text-green-400">{currency} {record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full ${style.bg} ${style.text} border ${style.border}`}>
          {record.status.toLowerCase()}
        </span>
      </div>
    </div>
  )
}
