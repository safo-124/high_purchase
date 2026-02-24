"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "../../lib/auth"
import { Role } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// ============================================================================
// BONUS RULE TYPES
// ============================================================================

export interface BonusRuleData {
  id: string
  name: string
  description: string | null
  targetRole: string
  shopId: string | null
  shopName: string | null
  triggerType: string
  calculationType: string
  value: number
  minimumThreshold: number | null
  maximumCap: number | null
  targetAmount: number | null
  tiers: string | null
  period: string
  isActive: boolean
  createdAt: Date
  totalBonusesPaid: number
  totalBonusAmount: number
  activeRecords: number
}

export interface BonusRecordData {
  id: string
  bonusRuleId: string
  bonusRuleName: string
  staffMemberId: string
  staffUserId: string
  staffName: string
  staffRole: string
  shopName: string
  triggerType: string
  sourceId: string | null
  sourceRef: string | null
  baseAmount: number
  rate: number | null
  amount: number
  periodStart: Date
  periodEnd: Date
  status: string
  approvedAt: Date | null
  approvedByName: string | null
  paidAt: Date | null
  paidByName: string | null
  paymentRef: string | null
  notes: string | null
  createdAt: Date
}

export interface BonusSummaryStats {
  totalRules: number
  activeRules: number
  pendingBonuses: number
  pendingAmount: number
  approvedBonuses: number
  approvedAmount: number
  paidBonuses: number
  paidAmount: number
  totalBonusesThisMonth: number
  totalAmountThisMonth: number
}

// ============================================================================
// BONUS RULES CRUD
// ============================================================================

export async function getBonusRules(businessSlug: string): Promise<BonusRuleData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const rules = await prisma.bonusRule.findMany({
    where: { businessId: business.id },
    include: {
      shop: { select: { name: true } },
      bonusRecords: {
        select: { amount: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    targetRole: r.targetRole,
    shopId: r.shopId,
    shopName: r.shop?.name || null,
    triggerType: r.triggerType,
    calculationType: r.calculationType,
    value: Number(r.value),
    minimumThreshold: r.minimumThreshold ? Number(r.minimumThreshold) : null,
    maximumCap: r.maximumCap ? Number(r.maximumCap) : null,
    targetAmount: r.targetAmount ? Number(r.targetAmount) : null,
    tiers: r.tiers,
    period: r.period,
    isActive: r.isActive,
    createdAt: r.createdAt,
    totalBonusesPaid: r.bonusRecords.filter((b) => b.status === "PAID").length,
    totalBonusAmount: r.bonusRecords.filter((b) => b.status === "PAID").reduce((s, b) => s + Number(b.amount), 0),
    activeRecords: r.bonusRecords.filter((b) => b.status === "PENDING" || b.status === "APPROVED").length,
  }))
}

export async function createBonusRule(
  businessSlug: string,
  data: {
    name: string
    description?: string
    targetRole: string
    shopId?: string
    triggerType: string
    calculationType: string
    value: number
    minimumThreshold?: number
    maximumCap?: number
    targetAmount?: number
    tiers?: string
    period: string
  }
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    if (!data.name.trim()) {
      return { success: false, error: "Bonus name is required" }
    }
    if (data.value <= 0) {
      return { success: false, error: "Bonus value must be greater than 0" }
    }

    const rule = await prisma.bonusRule.create({
      data: {
        businessId: business.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        targetRole: data.targetRole as Role,
        shopId: data.shopId || null,
        triggerType: data.triggerType as any,
        calculationType: data.calculationType as any,
        value: data.value,
        minimumThreshold: data.minimumThreshold || null,
        maximumCap: data.maximumCap || null,
        targetAmount: data.targetAmount || null,
        tiers: data.tiers || null,
        period: data.period as any,
        createdById: user.id,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BONUS_RULE_CREATED",
      entityType: "BonusRule",
      entityId: rule.id,
      metadata: {
        name: data.name,
        targetRole: data.targetRole,
        triggerType: data.triggerType,
        calculationType: data.calculationType,
        value: data.value,
        period: data.period,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/bonuses`)
    return { success: true, data: { id: rule.id } }
  } catch (error) {
    console.error("Error creating bonus rule:", error)
    return { success: false, error: "Failed to create bonus rule" }
  }
}

export async function updateBonusRule(
  businessSlug: string,
  ruleId: string,
  data: {
    name?: string
    description?: string
    targetRole?: string
    shopId?: string | null
    triggerType?: string
    calculationType?: string
    value?: number
    minimumThreshold?: number | null
    maximumCap?: number | null
    targetAmount?: number | null
    tiers?: string | null
    period?: string
    isActive?: boolean
  }
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const rule = await prisma.bonusRule.findFirst({
      where: { id: ruleId, businessId: business.id },
    })

    if (!rule) {
      return { success: false, error: "Bonus rule not found" }
    }

    await prisma.bonusRule.update({
      where: { id: ruleId },
      data: {
        name: data.name?.trim(),
        description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
        targetRole: data.targetRole ? (data.targetRole as Role) : undefined,
        shopId: data.shopId !== undefined ? data.shopId : undefined,
        triggerType: data.triggerType ? (data.triggerType as any) : undefined,
        calculationType: data.calculationType ? (data.calculationType as any) : undefined,
        value: data.value,
        minimumThreshold: data.minimumThreshold !== undefined ? data.minimumThreshold : undefined,
        maximumCap: data.maximumCap !== undefined ? data.maximumCap : undefined,
        targetAmount: data.targetAmount !== undefined ? data.targetAmount : undefined,
        tiers: data.tiers !== undefined ? data.tiers : undefined,
        period: data.period ? (data.period as any) : undefined,
        isActive: data.isActive,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BONUS_RULE_UPDATED",
      entityType: "BonusRule",
      entityId: ruleId,
      metadata: { changes: data },
    })

    revalidatePath(`/business-admin/${businessSlug}/bonuses`)
    return { success: true }
  } catch (error) {
    console.error("Error updating bonus rule:", error)
    return { success: false, error: "Failed to update bonus rule" }
  }
}

export async function deleteBonusRule(businessSlug: string, ruleId: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const rule = await prisma.bonusRule.findFirst({
      where: { id: ruleId, businessId: business.id },
      include: { _count: { select: { bonusRecords: true } } },
    })

    if (!rule) {
      return { success: false, error: "Bonus rule not found" }
    }

    if (rule._count.bonusRecords > 0) {
      // Soft-delete: just deactivate
      await prisma.bonusRule.update({
        where: { id: ruleId },
        data: { isActive: false },
      })
    } else {
      await prisma.bonusRule.delete({ where: { id: ruleId } })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "BONUS_RULE_DELETED",
      entityType: "BonusRule",
      entityId: ruleId,
      metadata: { name: rule.name, hadRecords: rule._count.bonusRecords > 0 },
    })

    revalidatePath(`/business-admin/${businessSlug}/bonuses`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting bonus rule:", error)
    return { success: false, error: "Failed to delete bonus rule" }
  }
}

// ============================================================================
// BONUS RECORDS
// ============================================================================

export async function getBonusRecords(
  businessSlug: string,
  filters?: {
    status?: string
    staffMemberId?: string
    shopId?: string
    triggerType?: string
    startDate?: string
    endDate?: string
  }
): Promise<BonusRecordData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const where: any = { businessId: business.id }

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status
  }
  if (filters?.staffMemberId) {
    where.staffMemberId = filters.staffMemberId
  }
  if (filters?.shopId && filters.shopId !== "all") {
    where.shopId = filters.shopId
  }
  if (filters?.triggerType && filters.triggerType !== "all") {
    where.triggerType = filters.triggerType
  }
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate)
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate + "T23:59:59Z")
  }

  const records = await prisma.bonusRecord.findMany({
    where,
    include: {
      bonusRule: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  // Get shop names
  const shopIds = [...new Set(records.map((r) => r.shopId))]
  const shops = await prisma.shop.findMany({
    where: { id: { in: shopIds } },
    select: { id: true, name: true },
  })
  const shopMap = new Map(shops.map((s) => [s.id, s.name]))

  return records.map((r) => ({
    id: r.id,
    bonusRuleId: r.bonusRuleId,
    bonusRuleName: r.bonusRule.name,
    staffMemberId: r.staffMemberId,
    staffUserId: r.staffUserId,
    staffName: r.staffName,
    staffRole: r.staffRole,
    shopName: shopMap.get(r.shopId) || "Unknown",
    triggerType: r.triggerType,
    sourceId: r.sourceId,
    sourceRef: r.sourceRef,
    baseAmount: Number(r.baseAmount),
    rate: r.rate ? Number(r.rate) : null,
    amount: Number(r.amount),
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    status: r.status,
    approvedAt: r.approvedAt,
    approvedByName: r.approvedByName,
    paidAt: r.paidAt,
    paidByName: r.paidByName,
    paymentRef: r.paymentRef,
    notes: r.notes,
    createdAt: r.createdAt,
  }))
}

export async function getBonusSummary(businessSlug: string): Promise<BonusSummaryStats> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [rules, allRecords, monthRecords] = await Promise.all([
    prisma.bonusRule.findMany({
      where: { businessId: business.id },
      select: { isActive: true },
    }),
    prisma.bonusRecord.findMany({
      where: { businessId: business.id },
      select: { status: true, amount: true },
    }),
    prisma.bonusRecord.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: { amount: true },
    }),
  ])

  const pending = allRecords.filter((r) => r.status === "PENDING")
  const approved = allRecords.filter((r) => r.status === "APPROVED")
  const paid = allRecords.filter((r) => r.status === "PAID")

  return {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.isActive).length,
    pendingBonuses: pending.length,
    pendingAmount: pending.reduce((s, r) => s + Number(r.amount), 0),
    approvedBonuses: approved.length,
    approvedAmount: approved.reduce((s, r) => s + Number(r.amount), 0),
    paidBonuses: paid.length,
    paidAmount: paid.reduce((s, r) => s + Number(r.amount), 0),
    totalBonusesThisMonth: monthRecords.length,
    totalAmountThisMonth: monthRecords.reduce((s, r) => s + Number(r.amount), 0),
  }
}

// ============================================================================
// BONUS RECORD STATUS MANAGEMENT
// ============================================================================

export async function approveBonusRecords(
  businessSlug: string,
  recordIds: string[]
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    await prisma.bonusRecord.updateMany({
      where: {
        id: { in: recordIds },
        businessId: business.id,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: user.id,
        approvedByName: user.name,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BONUS_RECORDS_APPROVED",
      entityType: "BonusRecord",
      entityId: recordIds.join(","),
      metadata: { count: recordIds.length },
    })

    revalidatePath(`/business-admin/${businessSlug}/bonuses`)
    return { success: true }
  } catch (error) {
    console.error("Error approving bonus records:", error)
    return { success: false, error: "Failed to approve bonuses" }
  }
}

export async function markBonusesPaid(
  businessSlug: string,
  recordIds: string[],
  paymentRef?: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    await prisma.bonusRecord.updateMany({
      where: {
        id: { in: recordIds },
        businessId: business.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidById: user.id,
        paidByName: user.name,
        paymentRef: paymentRef || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BONUS_RECORDS_PAID",
      entityType: "BonusRecord",
      entityId: recordIds.join(","),
      metadata: { count: recordIds.length, paymentRef },
    })

    revalidatePath(`/business-admin/${businessSlug}/bonuses`)
    return { success: true }
  } catch (error) {
    console.error("Error marking bonuses as paid:", error)
    return { success: false, error: "Failed to mark bonuses as paid" }
  }
}

export async function rejectBonusRecords(
  businessSlug: string,
  recordIds: string[],
  reason?: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    await prisma.bonusRecord.updateMany({
      where: {
        id: { in: recordIds },
        businessId: business.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
      data: {
        status: "REJECTED",
        notes: reason ? `Rejected: ${reason}` : "Rejected by admin",
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BONUS_RECORDS_REJECTED",
      entityType: "BonusRecord",
      entityId: recordIds.join(","),
      metadata: { count: recordIds.length, reason },
    })

    revalidatePath(`/business-admin/${businessSlug}/bonuses`)
    return { success: true }
  } catch (error) {
    console.error("Error rejecting bonus records:", error)
    return { success: false, error: "Failed to reject bonuses" }
  }
}

// ============================================================================
// BONUS TRIGGER ENGINE - Called from payment/sale/customer actions
// ============================================================================

/**
 * Calculate and create bonus records when a triggering event occurs.
 * Called from recordPayment, recordPaymentAsBusinessAdmin, new sale creation, customer creation.
 */
export async function triggerBonusCalculation(params: {
  businessId: string
  shopId: string
  triggerType: string
  staffMemberId: string
  staffUserId: string
  staffName: string
  staffRole: Role
  sourceId: string
  sourceRef?: string
  amount: number // The base amount (payment amount, sale amount, etc.)
}): Promise<void> {
  try {
    // Find all active rules matching this trigger
    const rules = await prisma.bonusRule.findMany({
      where: {
        businessId: params.businessId,
        triggerType: params.triggerType as any,
        isActive: true,
        targetRole: params.staffRole,
        OR: [
          { shopId: null }, // Applies to all shops
          { shopId: params.shopId }, // Specific to this shop
        ],
      },
    })

    if (rules.length === 0) return

    const now = new Date()

    for (const rule of rules) {
      // Calculate period boundaries
      const { periodStart, periodEnd } = getPeriodBounds(rule.period as any, now)

      // Check minimum threshold
      if (rule.minimumThreshold && params.amount < Number(rule.minimumThreshold)) {
        continue
      }

      // Calculate bonus amount
      let bonusAmount: number
      if (rule.calculationType === "PERCENTAGE") {
        bonusAmount = params.amount * (Number(rule.value) / 100)
      } else {
        bonusAmount = Number(rule.value)
      }

      // Handle tiered bonuses
      if (rule.tiers) {
        try {
          const tiers = JSON.parse(rule.tiers) as { min: number; max: number; value: number }[]
          const matchedTier = tiers.find(
            (t) => params.amount >= t.min && (t.max === 0 || params.amount <= t.max)
          )
          if (matchedTier) {
            if (rule.calculationType === "PERCENTAGE") {
              bonusAmount = params.amount * (matchedTier.value / 100)
            } else {
              bonusAmount = matchedTier.value
            }
          }
        } catch {
          // Invalid tiers JSON, use default calculation
        }
      }

      // Check maximum cap for the period
      if (rule.maximumCap) {
        const existingTotal = await prisma.bonusRecord.aggregate({
          where: {
            bonusRuleId: rule.id,
            staffMemberId: params.staffMemberId,
            periodStart,
            periodEnd,
            status: { in: ["PENDING", "APPROVED", "PAID"] },
          },
          _sum: { amount: true },
        })

        const currentTotal = Number(existingTotal._sum.amount || 0)
        const cap = Number(rule.maximumCap)
        if (currentTotal >= cap) continue // Already at cap
        bonusAmount = Math.min(bonusAmount, cap - currentTotal) // Cap the remaining
      }

      if (bonusAmount <= 0) continue

      // Create the bonus record
      await prisma.bonusRecord.create({
        data: {
          businessId: params.businessId,
          shopId: params.shopId,
          bonusRuleId: rule.id,
          staffMemberId: params.staffMemberId,
          staffUserId: params.staffUserId,
          staffName: params.staffName,
          staffRole: params.staffRole,
          triggerType: params.triggerType as any,
          sourceId: params.sourceId,
          sourceRef: params.sourceRef,
          baseAmount: params.amount,
          rate: rule.calculationType === "PERCENTAGE" ? rule.value : null,
          amount: Math.round(bonusAmount * 100) / 100,
          periodStart,
          periodEnd,
          status: "PENDING",
        },
      })
    }
  } catch (error) {
    console.error("Error in bonus trigger calculation:", error)
    // Don't throw - bonus calculation failure should not break the main action
  }
}

/**
 * Check and trigger target-based bonuses at end of period.
 * This can be called manually or via a cron job.
 */
export async function calculateTargetBonuses(businessSlug: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const now = new Date()
    const rules = await prisma.bonusRule.findMany({
      where: {
        businessId: business.id,
        triggerType: { in: ["TARGET_HIT", "ZERO_DEFAULT", "SHOP_PERFORMANCE"] },
        isActive: true,
      },
    })

    let bonusesCreated = 0

    for (const rule of rules) {
      const { periodStart, periodEnd } = getPeriodBounds(rule.period as any, now)

      // Get all eligible staff members
      const staffMembers = await prisma.shopMember.findMany({
        where: {
          shop: { businessId: business.id },
          role: rule.targetRole,
          isActive: true,
          ...(rule.shopId ? { shopId: rule.shopId } : {}),
        },
        include: {
          user: { select: { name: true, id: true } },
          shop: { select: { id: true, name: true } },
        },
      })

      for (const member of staffMembers) {
        // Check if bonus already exists for this period
        const existing = await prisma.bonusRecord.findFirst({
          where: {
            bonusRuleId: rule.id,
            staffMemberId: member.id,
            periodStart,
            periodEnd,
          },
        })
        if (existing) continue

        let qualifies = false
        let baseAmount = 0

        if (rule.triggerType === "TARGET_HIT" && rule.targetAmount) {
          // Calculate total collections/sales in period
          if (rule.targetRole === "DEBT_COLLECTOR") {
            const collections = await prisma.payment.aggregate({
              where: {
                collectorId: member.id,
                isConfirmed: true,
                confirmedAt: { gte: periodStart, lte: periodEnd },
              },
              _sum: { amount: true },
            })
            baseAmount = Number(collections._sum.amount || 0)
          } else if (rule.targetRole === "SALES_STAFF") {
            const sales = await prisma.purchase.aggregate({
              where: {
                customer: { shopId: member.shopId },
                createdAt: { gte: periodStart, lte: periodEnd },
              },
              _sum: { totalAmount: true },
            })
            baseAmount = Number(sales._sum.totalAmount || 0)
          }

          qualifies = baseAmount >= Number(rule.targetAmount)
        }

        if (rule.triggerType === "ZERO_DEFAULT") {
          // Check if any customers assigned to this collector defaulted
          const defaults = await prisma.purchase.count({
            where: {
              customer: { assignedCollectorId: member.id },
              status: "DEFAULTED",
              updatedAt: { gte: periodStart, lte: periodEnd },
            },
          })
          qualifies = defaults === 0
          baseAmount = 1 // Just for reference
        }

        if (qualifies) {
          let bonusAmount: number
          if (rule.calculationType === "PERCENTAGE") {
            bonusAmount = baseAmount * (Number(rule.value) / 100)
          } else {
            bonusAmount = Number(rule.value)
          }

          if (rule.maximumCap && bonusAmount > Number(rule.maximumCap)) {
            bonusAmount = Number(rule.maximumCap)
          }

          if (bonusAmount > 0) {
            await prisma.bonusRecord.create({
              data: {
                businessId: business.id,
                shopId: member.shopId,
                bonusRuleId: rule.id,
                staffMemberId: member.id,
                staffUserId: member.user.id,
                staffName: member.user.name || "Unknown",
                staffRole: member.role,
                triggerType: rule.triggerType as any,
                sourceId: null,
                sourceRef: `${rule.period} target: ${periodStart.toISOString().split("T")[0]} - ${periodEnd.toISOString().split("T")[0]}`,
                baseAmount,
                rate: rule.calculationType === "PERCENTAGE" ? rule.value : null,
                amount: Math.round(bonusAmount * 100) / 100,
                periodStart,
                periodEnd,
                status: "PENDING",
              },
            })
            bonusesCreated++
          }
        }
      }
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "TARGET_BONUSES_CALCULATED",
      entityType: "BonusRecord",
      entityId: "batch",
      metadata: { bonusesCreated },
    })

    revalidatePath(`/business-admin/${businessSlug}/bonuses`)
    return { success: true, data: { bonusesCreated } }
  } catch (error) {
    console.error("Error calculating target bonuses:", error)
    return { success: false, error: "Failed to calculate target bonuses" }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getPeriodBounds(period: string, referenceDate: Date): { periodStart: Date; periodEnd: Date } {
  const d = new Date(referenceDate)
  
  switch (period) {
    case "DAILY":
      return {
        periodStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        periodEnd: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
      }
    case "WEEKLY": {
      const dayOfWeek = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      monday.setHours(0, 0, 0, 0)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      return { periodStart: monday, periodEnd: sunday }
    }
    case "MONTHLY":
      return {
        periodStart: new Date(d.getFullYear(), d.getMonth(), 1),
        periodEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      }
    case "QUARTERLY": {
      const quarter = Math.floor(d.getMonth() / 3)
      return {
        periodStart: new Date(d.getFullYear(), quarter * 3, 1),
        periodEnd: new Date(d.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59),
      }
    }
    case "YEARLY":
      return {
        periodStart: new Date(d.getFullYear(), 0, 1),
        periodEnd: new Date(d.getFullYear(), 11, 31, 23, 59, 59),
      }
    case "ONE_TIME":
    default:
      // For one-time, use "all time" range
      return {
        periodStart: new Date(2020, 0, 1),
        periodEnd: new Date(2099, 11, 31, 23, 59, 59),
      }
  }
}
