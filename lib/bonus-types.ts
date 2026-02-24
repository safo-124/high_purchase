/**
 * Shared bonus types and utility functions used across client and server components.
 */

export interface StaffBonusRule {
  id: string
  name: string
  description: string | null
  triggerType: string
  calculationType: string
  value: number
  minimumThreshold: number | null
  maximumCap: number | null
  targetAmount?: number | null
  period: string
}

export interface StaffBonusRecord {
  id: string
  ruleName: string
  triggerType: string
  sourceRef: string | null
  baseAmount: number
  rate: number | null
  amount: number
  status: string
  createdAt: Date
  periodStart: Date | null
  periodEnd: Date | null
  paidAt: Date | null
  paymentRef: string | null
}

export interface StaffBonusSummary {
  activeRules: StaffBonusRule[]
  records: StaffBonusRecord[]
  totalEarned: number
  totalPending: number
  totalApproved: number
  totalPaid: number
  thisMonthEarned: number
  hasActiveBonuses: boolean
}

const TRIGGER_LABELS: Record<string, string> = {
  COLLECTION: "Payment Collection",
  SALE: "Sale Made",
  CUSTOMER_CREATED: "Customer Created",
  FULL_PAYMENT: "Full Payment",
  ON_TIME_COLLECTION: "On-time Collection",
  RECOVERY: "Debt Recovery",
  TARGET_HIT: "Target Achieved",
  SHOP_PERFORMANCE: "Shop Performance",
  ZERO_DEFAULT: "Zero Default",
}

export function getTriggerLabel(type: string): string {
  return TRIGGER_LABELS[type] || type.replace(/_/g, " ")
}
