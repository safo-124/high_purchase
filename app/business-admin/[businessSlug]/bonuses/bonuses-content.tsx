"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  createBonusRule,
  updateBonusRule,
  deleteBonusRule,
  approveBonusRecords,
  markBonusesPaid,
  rejectBonusRecords,
  calculateTargetBonuses,
} from "../../bonus-actions"
import type { BonusRuleData, BonusRecordData, BonusSummaryStats } from "../../bonus-actions"

// ============================================================================
// CONSTANTS
// ============================================================================

const TRIGGER_TYPES = [
  { value: "COLLECTION", label: "Payment Collection", desc: "When a collector collects a payment" },
  { value: "SALE", label: "New Sale", desc: "When a sale is made" },
  { value: "CUSTOMER_CREATED", label: "Customer Created", desc: "When a new customer is registered" },
  { value: "FULL_PAYMENT", label: "Full Payment", desc: "When a purchase is fully paid off" },
  { value: "ON_TIME_COLLECTION", label: "On-Time Collection", desc: "When collections are made on schedule" },
  { value: "RECOVERY", label: "Debt Recovery", desc: "When an overdue/defaulted account pays" },
  { value: "TARGET_HIT", label: "Target Achievement", desc: "When a periodic target is reached" },
  { value: "SHOP_PERFORMANCE", label: "Shop Performance", desc: "When shop meets performance targets" },
  { value: "ZERO_DEFAULT", label: "Zero Default", desc: "When no customers default in a period" },
]

const ROLE_OPTIONS = [
  { value: "DEBT_COLLECTOR", label: "Debt Collector" },
  { value: "SALES_STAFF", label: "Sales Staff" },
  { value: "SHOP_ADMIN", label: "Shop Admin" },
]

const PERIOD_OPTIONS = [
  { value: "ONE_TIME", label: "Per Transaction" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
]

const CALC_TYPES = [
  { value: "PERCENTAGE", label: "Percentage (%)" },
  { value: "FIXED_AMOUNT", label: "Fixed Amount" },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  APPROVED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  PAID: "bg-green-500/20 text-green-300 border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-300 border-red-500/30",
  CANCELLED: "bg-slate-500/20 text-slate-300 border-slate-500/30",
}

// ============================================================================
// TYPES
// ============================================================================

interface BonusesContentProps {
  businessSlug: string
  rules: BonusRuleData[]
  summary: BonusSummaryStats
  records: BonusRecordData[]
  shops: { id: string; name: string }[]
}

type TabType = "rules" | "records"

// ============================================================================
// COMPONENT
// ============================================================================

export function BonusesContent({ businessSlug, rules, summary, records, shops }: BonusesContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>("rules")
  const [showCreateRule, setShowCreateRule] = useState(false)
  const [editingRule, setEditingRule] = useState<BonusRuleData | null>(null)
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTrigger, setFilterTrigger] = useState("all")
  const [filterShop, setFilterShop] = useState("all")
  const [loading, setLoading] = useState(false)

  // ============================================================================
  // RULE ACTIONS
  // ============================================================================

  async function handleCreateRule(formData: FormData) {
    setLoading(true)
    const tiersRaw = formData.get("tiers") as string
    let tiersJson: string | undefined
    if (tiersRaw?.trim()) {
      try {
        JSON.parse(tiersRaw)
        tiersJson = tiersRaw
      } catch {
        toast.error("Invalid tiers JSON format")
        setLoading(false)
        return
      }
    }

    const result = await createBonusRule(businessSlug, {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      targetRole: formData.get("targetRole") as string,
      shopId: (formData.get("shopId") as string) || undefined,
      triggerType: formData.get("triggerType") as string,
      calculationType: formData.get("calculationType") as string,
      value: parseFloat(formData.get("value") as string),
      minimumThreshold: formData.get("minimumThreshold")
        ? parseFloat(formData.get("minimumThreshold") as string)
        : undefined,
      maximumCap: formData.get("maximumCap")
        ? parseFloat(formData.get("maximumCap") as string)
        : undefined,
      targetAmount: formData.get("targetAmount")
        ? parseFloat(formData.get("targetAmount") as string)
        : undefined,
      tiers: tiersJson,
      period: formData.get("period") as string,
    })

    setLoading(false)
    if (result.success) {
      toast.success("Bonus rule created!")
      setShowCreateRule(false)
    } else {
      toast.error(result.error || "Failed to create rule")
    }
  }

  async function handleUpdateRule(ruleId: string, formData: FormData) {
    setLoading(true)
    const tiersRaw = formData.get("tiers") as string
    let tiersJson: string | null = null
    if (tiersRaw?.trim()) {
      try {
        JSON.parse(tiersRaw)
        tiersJson = tiersRaw
      } catch {
        toast.error("Invalid tiers JSON format")
        setLoading(false)
        return
      }
    }

    const result = await updateBonusRule(businessSlug, ruleId, {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      targetRole: formData.get("targetRole") as string,
      shopId: (formData.get("shopId") as string) || null,
      triggerType: formData.get("triggerType") as string,
      calculationType: formData.get("calculationType") as string,
      value: parseFloat(formData.get("value") as string),
      minimumThreshold: formData.get("minimumThreshold")
        ? parseFloat(formData.get("minimumThreshold") as string)
        : null,
      maximumCap: formData.get("maximumCap")
        ? parseFloat(formData.get("maximumCap") as string)
        : null,
      targetAmount: formData.get("targetAmount")
        ? parseFloat(formData.get("targetAmount") as string)
        : null,
      tiers: tiersJson,
      period: formData.get("period") as string,
    })

    setLoading(false)
    if (result.success) {
      toast.success("Bonus rule updated!")
      setEditingRule(null)
    } else {
      toast.error(result.error || "Failed to update rule")
    }
  }

  async function handleToggleRule(rule: BonusRuleData) {
    const result = await updateBonusRule(businessSlug, rule.id, { isActive: !rule.isActive })
    if (result.success) {
      toast.success(rule.isActive ? "Rule deactivated" : "Rule activated")
    } else {
      toast.error(result.error || "Failed to toggle rule")
    }
  }

  async function handleDeleteRule(rule: BonusRuleData) {
    if (!confirm(`Delete bonus rule "${rule.name}"? ${rule.activeRecords > 0 ? "It has active records and will be deactivated instead." : ""}`)) return
    const result = await deleteBonusRule(businessSlug, rule.id)
    if (result.success) {
      toast.success("Rule deleted")
    } else {
      toast.error(result.error || "Failed to delete rule")
    }
  }

  // ============================================================================
  // RECORD ACTIONS
  // ============================================================================

  async function handleApprove() {
    if (selectedRecords.length === 0) return
    setLoading(true)
    const result = await approveBonusRecords(businessSlug, selectedRecords)
    setLoading(false)
    if (result.success) {
      toast.success(`${selectedRecords.length} bonus(es) approved`)
      setSelectedRecords([])
    } else {
      toast.error(result.error || "Failed to approve")
    }
  }

  async function handleMarkPaid() {
    if (selectedRecords.length === 0) return
    const ref = prompt("Payment reference (optional):")
    setLoading(true)
    const result = await markBonusesPaid(businessSlug, selectedRecords, ref || undefined)
    setLoading(false)
    if (result.success) {
      toast.success(`${selectedRecords.length} bonus(es) marked as paid`)
      setSelectedRecords([])
    } else {
      toast.error(result.error || "Failed to mark as paid")
    }
  }

  async function handleReject() {
    if (selectedRecords.length === 0) return
    const reason = prompt("Rejection reason (optional):")
    setLoading(true)
    const result = await rejectBonusRecords(businessSlug, selectedRecords, reason || undefined)
    setLoading(false)
    if (result.success) {
      toast.success(`${selectedRecords.length} bonus(es) rejected`)
      setSelectedRecords([])
    } else {
      toast.error(result.error || "Failed to reject")
    }
  }

  async function handleCalculateTargets() {
    setLoading(true)
    const result = await calculateTargetBonuses(businessSlug)
    setLoading(false)
    if (result.success) {
      const data = result.data as { bonusesCreated: number }
      toast.success(`Calculated target bonuses: ${data.bonusesCreated} new records`)
    } else {
      toast.error(result.error || "Failed to calculate targets")
    }
  }

  function toggleRecordSelection(id: string) {
    setSelectedRecords((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  function toggleSelectAll() {
    const filtered = filteredRecords
    if (selectedRecords.length === filtered.length) {
      setSelectedRecords([])
    } else {
      setSelectedRecords(filtered.map((r) => r.id))
    }
  }

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false
    if (filterTrigger !== "all" && r.triggerType !== filterTrigger) return false
    if (filterShop !== "all" && r.shopName !== filterShop) return false
    return true
  })

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bonus Management</h1>
          <p className="text-slate-400">Design and manage staff incentive programs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCalculateTargets}
            disabled={loading}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-all"
          >
            Calculate Targets
          </button>
          <button
            onClick={() => setShowCreateRule(true)}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-all"
          >
            + New Bonus Rule
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Rules</p>
          <p className="text-2xl font-bold text-cyan-400">{summary.activeRules}</p>
          <p className="text-xs text-slate-500 mt-1">{summary.totalRules} total</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{summary.pendingBonuses}</p>
          <p className="text-xs text-yellow-400/80 mt-1">
            {summary.pendingAmount.toLocaleString("en", { style: "currency", currency: "ZAR" })}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Approved</p>
          <p className="text-2xl font-bold text-blue-400">{summary.approvedBonuses}</p>
          <p className="text-xs text-blue-400/80 mt-1">
            {summary.approvedAmount.toLocaleString("en", { style: "currency", currency: "ZAR" })}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Paid Out</p>
          <p className="text-2xl font-bold text-green-400">{summary.paidBonuses}</p>
          <p className="text-xs text-green-400/80 mt-1">
            {summary.paidAmount.toLocaleString("en", { style: "currency", currency: "ZAR" })}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-bold text-purple-400">{summary.totalBonusesThisMonth}</p>
          <p className="text-xs text-purple-400/80 mt-1">
            {summary.totalAmountThisMonth.toLocaleString("en", { style: "currency", currency: "ZAR" })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800/50 backdrop-blur-sm rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "rules"
              ? "bg-cyan-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          Bonus Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "records"
              ? "bg-cyan-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          Bonus Records ({records.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "rules" && (
        <RulesTab
          rules={rules}
          shops={shops}
          onToggle={handleToggleRule}
          onEdit={setEditingRule}
          onDelete={handleDeleteRule}
        />
      )}

      {activeTab === "records" && (
        <RecordsTab
          records={filteredRecords}
          selectedRecords={selectedRecords}
          filterStatus={filterStatus}
          filterTrigger={filterTrigger}
          filterShop={filterShop}
          shops={shops}
          loading={loading}
          onFilterStatus={setFilterStatus}
          onFilterTrigger={setFilterTrigger}
          onFilterShop={setFilterShop}
          onToggleSelect={toggleRecordSelection}
          onToggleSelectAll={toggleSelectAll}
          onApprove={handleApprove}
          onMarkPaid={handleMarkPaid}
          onReject={handleReject}
        />
      )}

      {/* Create Rule Modal */}
      {showCreateRule && (
        <RuleFormModal
          shops={shops}
          onClose={() => setShowCreateRule(false)}
          onSubmit={handleCreateRule}
          loading={loading}
        />
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <RuleFormModal
          rule={editingRule}
          shops={shops}
          onClose={() => setEditingRule(null)}
          onSubmit={(formData) => handleUpdateRule(editingRule.id, formData)}
          loading={loading}
        />
      )}
    </div>
  )
}

// ============================================================================
// RULES TAB
// ============================================================================

function RulesTab({
  rules,
  shops,
  onToggle,
  onEdit,
  onDelete,
}: {
  rules: BonusRuleData[]
  shops: { id: string; name: string }[]
  onToggle: (rule: BonusRuleData) => void
  onEdit: (rule: BonusRuleData) => void
  onDelete: (rule: BonusRuleData) => void
}) {
  if (rules.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Bonus Rules Yet</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Create your first bonus rule to start incentivizing your team. You can configure bonuses for collectors,
          sales staff, and shop admins based on various triggers.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {rules.map((rule) => {
        const trigger = TRIGGER_TYPES.find((t) => t.value === rule.triggerType)
        const role = ROLE_OPTIONS.find((r) => r.value === rule.targetRole)
        const period = PERIOD_OPTIONS.find((p) => p.value === rule.period)

        return (
          <div key={rule.id} className={`glass-card p-5 ${!rule.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white truncate">{rule.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full border ${
                      rule.isActive
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }`}
                  >
                    {rule.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {rule.description && <p className="text-sm text-slate-400 mb-3">{rule.description}</p>}

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2.5 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30">
                    {role?.label || rule.targetRole}
                  </span>
                  <span className="px-2.5 py-1 text-xs bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-500/30">
                    {trigger?.label || rule.triggerType}
                  </span>
                  <span className="px-2.5 py-1 text-xs bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
                    {rule.calculationType === "PERCENTAGE" ? `${rule.value}%` : `R${rule.value.toFixed(2)}`}
                  </span>
                  <span className="px-2.5 py-1 text-xs bg-slate-500/20 text-slate-300 rounded-lg border border-slate-500/30">
                    {period?.label || rule.period}
                  </span>
                  {rule.shopName && (
                    <span className="px-2.5 py-1 text-xs bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30">
                      {rule.shopName}
                    </span>
                  )}
                </div>

                <div className="flex gap-6 text-xs text-slate-500">
                  {rule.minimumThreshold !== null && <span>Min: R{rule.minimumThreshold.toFixed(2)}</span>}
                  {rule.maximumCap !== null && <span>Cap: R{rule.maximumCap.toFixed(2)}</span>}
                  {rule.targetAmount !== null && <span>Target: R{rule.targetAmount.toFixed(2)}</span>}
                  <span>Paid: {rule.totalBonusesPaid}x (R{rule.totalBonusAmount.toFixed(2)})</span>
                  {rule.activeRecords > 0 && (
                    <span className="text-yellow-400">{rule.activeRecords} pending/approved</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggle(rule)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    rule.isActive ? "bg-cyan-600" : "bg-slate-600"
                  }`}
                  title={rule.isActive ? "Deactivate" : "Activate"}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      rule.isActive ? "left-5.5" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  onClick={() => onEdit(rule)}
                  className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-all"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(rule)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// RECORDS TAB
// ============================================================================

function RecordsTab({
  records,
  selectedRecords,
  filterStatus,
  filterTrigger,
  filterShop,
  shops,
  loading,
  onFilterStatus,
  onFilterTrigger,
  onFilterShop,
  onToggleSelect,
  onToggleSelectAll,
  onApprove,
  onMarkPaid,
  onReject,
}: {
  records: BonusRecordData[]
  selectedRecords: string[]
  filterStatus: string
  filterTrigger: string
  filterShop: string
  shops: { id: string; name: string }[]
  loading: boolean
  onFilterStatus: (s: string) => void
  onFilterTrigger: (s: string) => void
  onFilterShop: (s: string) => void
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onApprove: () => void
  onMarkPaid: () => void
  onReject: () => void
}) {
  return (
    <div>
      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={filterTrigger}
          onChange={(e) => onFilterTrigger(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Triggers</option>
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={filterShop}
          onChange={(e) => onFilterShop(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Shops</option>
          {shops.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {selectedRecords.length > 0 && (
          <div className="flex gap-2 ml-auto">
            <span className="text-sm text-slate-400 self-center">{selectedRecords.length} selected</span>
            <button
              onClick={onApprove}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={onMarkPaid}
              disabled={loading}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            >
              Mark Paid
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Records Table */}
      {records.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Bonus Records</h3>
          <p className="text-slate-400 text-sm">
            Bonuses will appear here as they are earned by staff members through active rules.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-3">
                    <input
                      type="checkbox"
                      checked={selectedRecords.length === records.length && records.length > 0}
                      onChange={onToggleSelectAll}
                      className="rounded bg-slate-700 border-slate-600"
                    />
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Staff</th>
                  <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Rule</th>
                  <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Trigger</th>
                  <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                  <th className="text-right p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Base</th>
                  <th className="text-right p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Bonus</th>
                  <th className="text-center p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {records.map((record) => {
                  const trigger = TRIGGER_TYPES.find((t) => t.value === record.triggerType)
                  return (
                    <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={() => onToggleSelect(record.id)}
                          className="rounded bg-slate-700 border-slate-600"
                        />
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-medium text-white">{record.staffName}</p>
                        <p className="text-xs text-slate-500">{record.staffRole.replace("_", " ")}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-slate-300">{record.bonusRuleName}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-cyan-400">{trigger?.label || record.triggerType}</span>
                        {record.sourceRef && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[120px]">{record.sourceRef}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-slate-400">{record.shopName}</span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm text-slate-300">R{record.baseAmount.toFixed(2)}</span>
                        {record.rate && (
                          <p className="text-xs text-slate-500">×{Number(record.rate)}%</p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm font-semibold text-green-400">R{record.amount.toFixed(2)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[record.status] || STATUS_COLORS.PENDING}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-slate-400">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// RULE FORM MODAL
// ============================================================================

function RuleFormModal({
  rule,
  shops,
  onClose,
  onSubmit,
  loading,
}: {
  rule?: BonusRuleData
  shops: { id: string; name: string }[]
  onClose: () => void
  onSubmit: (formData: FormData) => void
  loading: boolean
}) {
  const [triggerType, setTriggerType] = useState(rule?.triggerType || "COLLECTION")
  const [calcType, setCalcType] = useState(rule?.calculationType || "PERCENTAGE")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{rule ? "Edit Bonus Rule" : "Create Bonus Rule"}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(new FormData(e.currentTarget))
          }}
          className="space-y-5"
        >
          {/* Name & Description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Rule Name *</label>
              <input
                name="name"
                defaultValue={rule?.name}
                required
                placeholder="e.g., Collection Commission 5%"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea
                name="description"
                defaultValue={rule?.description || ""}
                rows={2}
                placeholder="Describe what this bonus rewards..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Target Role & Shop */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Role *</label>
              <select
                name="targetRole"
                defaultValue={rule?.targetRole || "DEBT_COLLECTOR"}
                required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Shop (optional)</label>
              <select
                name="shopId"
                defaultValue={rule?.shopId || ""}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500"
              >
                <option value="">All Shops</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Trigger Type *</label>
            <select
              name="triggerType"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — {t.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Calculation Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Calculation Type *</label>
              <select
                name="calculationType"
                value={calcType}
                onChange={(e) => setCalcType(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500"
              >
                {CALC_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Value * {calcType === "PERCENTAGE" ? "(% of base amount)" : "(fixed Rand amount)"}
              </label>
              <input
                name="value"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={rule?.value || ""}
                required
                placeholder={calcType === "PERCENTAGE" ? "e.g., 5" : "e.g., 50.00"}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Period *</label>
            <select
              name="period"
              defaultValue={rule?.period || "ONE_TIME"}
              required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              &ldquo;Per Transaction&rdquo; means a bonus is earned on each qualifying event. Period-based options cap and
              group bonuses within that timeframe.
            </p>
          </div>

          {/* Thresholds & Caps */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Minimum Threshold</label>
              <input
                name="minimumThreshold"
                type="number"
                step="0.01"
                min="0"
                defaultValue={rule?.minimumThreshold || ""}
                placeholder="R0.00"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Min amount to qualify</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Maximum Cap</label>
              <input
                name="maximumCap"
                type="number"
                step="0.01"
                min="0"
                defaultValue={rule?.maximumCap || ""}
                placeholder="No cap"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Max bonus per period</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Amount</label>
              <input
                name="targetAmount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={rule?.targetAmount || ""}
                placeholder="For target-based"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">For target triggers</p>
            </div>
          </div>

          {/* Tiers (Advanced) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Tiered Values (Advanced, optional)
            </label>
            <textarea
              name="tiers"
              rows={3}
              defaultValue={rule?.tiers || ""}
              placeholder={`[{"min": 0, "max": 10000, "value": 3}, {"min": 10001, "max": 50000, "value": 5}, {"min": 50001, "max": 0, "value": 7}]`}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              JSON array of tiers. Each tier: {`{min, max, value}`}. Set max=0 for unlimited. Value is percentage or
              fixed based on calc type.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-700/50 rounded-xl text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
