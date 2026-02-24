"use server"

import prisma from "../lib/prisma"
import type { StaffBonusRule, StaffBonusRecord, StaffBonusSummary } from "../lib/bonus-types"

/**
 * Get active bonus rules and earned records for a specific staff member
 */
export async function getStaffBonusSummary(params: {
  businessId: string
  shopId: string
  staffMemberId: string
  staffRole: string
}): Promise<StaffBonusSummary> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [rules, records] = await Promise.all([
    prisma.bonusRule.findMany({
      where: {
        businessId: params.businessId,
        targetRole: params.staffRole as any,
        isActive: true,
        OR: [
          { shopId: null },
          { shopId: params.shopId },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bonusRecord.findMany({
      where: {
        businessId: params.businessId,
        staffMemberId: params.staffMemberId,
      },
      include: {
        bonusRule: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  const pending = records.filter(r => r.status === "PENDING")
  const approved = records.filter(r => r.status === "APPROVED")
  const paid = records.filter(r => r.status === "PAID")
  const monthRecords = records.filter(r => r.createdAt >= monthStart && r.createdAt <= monthEnd)

  return {
    activeRules: rules.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      triggerType: r.triggerType,
      calculationType: r.calculationType,
      value: Number(r.value),
      minimumThreshold: r.minimumThreshold ? Number(r.minimumThreshold) : null,
      maximumCap: r.maximumCap ? Number(r.maximumCap) : null,
      targetAmount: r.targetAmount ? Number(r.targetAmount) : null,
      period: r.period,
    })),
    records: records.map(r => ({
      id: r.id,
      ruleName: r.bonusRule.name,
      triggerType: r.triggerType,
      sourceRef: r.sourceRef,
      baseAmount: Number(r.baseAmount),
      rate: r.rate ? Number(r.rate) : null,
      amount: Number(r.amount),
      status: r.status,
      createdAt: r.createdAt,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      paidAt: r.paidAt,
      paymentRef: r.paymentRef,
    })),
    totalEarned: records.reduce((s, r) => s + Number(r.amount), 0),
    totalPending: pending.reduce((s, r) => s + Number(r.amount), 0),
    totalApproved: approved.reduce((s, r) => s + Number(r.amount), 0),
    totalPaid: paid.reduce((s, r) => s + Number(r.amount), 0),
    thisMonthEarned: monthRecords.reduce((s, r) => s + Number(r.amount), 0),
    hasActiveBonuses: rules.length > 0,
  }
}

/**
 * Get bonus summary for ALL staff in a shop (for shop admin view)
 */
export async function getShopBonusSummary(params: {
  businessId: string
  shopId: string
}): Promise<{
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
}> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [rules, records] = await Promise.all([
    prisma.bonusRule.count({
      where: {
        businessId: params.businessId,
        isActive: true,
        OR: [
          { shopId: null },
          { shopId: params.shopId },
        ],
      },
    }),
    prisma.bonusRecord.findMany({
      where: {
        businessId: params.businessId,
        shopId: params.shopId,
      },
      include: {
        bonusRule: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ])

  const pending = records.filter(r => r.status === "PENDING")
  const approved = records.filter(r => r.status === "APPROVED")
  const paid = records.filter(r => r.status === "PAID")
  const monthRecords = records.filter(r => r.createdAt >= monthStart && r.createdAt <= monthEnd)

  // Group by staff
  const staffMap = new Map<string, { staffName: string; staffRole: string; pending: number; pendingAmount: number; paid: number; paidAmount: number }>()
  records.forEach(r => {
    const key = r.staffMemberId
    if (!staffMap.has(key)) {
      staffMap.set(key, { staffName: r.staffName, staffRole: r.staffRole, pending: 0, pendingAmount: 0, paid: 0, paidAmount: 0 })
    }
    const entry = staffMap.get(key)!
    if (r.status === "PENDING" || r.status === "APPROVED") {
      entry.pending++
      entry.pendingAmount += Number(r.amount)
    }
    if (r.status === "PAID") {
      entry.paid++
      entry.paidAmount += Number(r.amount)
    }
  })

  return {
    activeRules: rules,
    totalPending: pending.length,
    totalPendingAmount: pending.reduce((s, r) => s + Number(r.amount), 0),
    totalApproved: approved.length,
    totalApprovedAmount: approved.reduce((s, r) => s + Number(r.amount), 0),
    totalPaid: paid.length,
    totalPaidAmount: paid.reduce((s, r) => s + Number(r.amount), 0),
    thisMonthAmount: monthRecords.reduce((s, r) => s + Number(r.amount), 0),
    staffBonuses: Array.from(staffMap.values()).sort((a, b) => b.pendingAmount - a.pendingAmount),
    recentRecords: records.slice(0, 10).map(r => ({
      id: r.id,
      ruleName: r.bonusRule.name,
      triggerType: r.triggerType,
      sourceRef: r.sourceRef,
      baseAmount: Number(r.baseAmount),
      rate: r.rate ? Number(r.rate) : null,
      amount: Number(r.amount),
      status: r.status,
      createdAt: r.createdAt,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      paidAt: r.paidAt,
      paymentRef: r.paymentRef,
    })),
    hasActiveBonuses: rules > 0,
  }
}
