"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin } from "../../lib/auth"
import { Prisma } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export async function logBusinessActivity(
  businessId: string,
  userId: string | null,
  userName: string | null,
  action: string,
  description: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.businessActivity.create({
      data: {
        businessId,
        userId,
        userName,
        action,
        description,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    })
  } catch {
    // Silently fail - activity logging should not block main operations
  }
}

export async function getBusinessActivities(businessSlug: string, page = 1, limit = 30, entityType?: string): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const skip = (page - 1) * limit
    const where: Prisma.BusinessActivityWhereInput = {
      businessId: business.id,
      ...(entityType ? { entityType } : {}),
    }
    const [activities, total] = await Promise.all([
      prisma.businessActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.businessActivity.count({ where }),
    ])
    return { success: true, data: { activities, total, pages: Math.ceil(total / limit) } }
  } catch {
    return { success: false, error: "Failed to fetch activities" }
  }
}

// ============================================================================
// NOTIFICATION CENTER
// ============================================================================

export async function getBusinessNotifications(businessSlug: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)
    const notifications = await prisma.businessNotification.findMany({
      where: {
        businessId: business.id,
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    const unreadCount = notifications.filter(n => !n.isRead).length
    return { success: true, data: { notifications, unreadCount } }
  } catch {
    return { success: false, error: "Failed to fetch notifications" }
  }
}

export async function markNotificationRead(businessSlug: string, notificationId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    await prisma.businessNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
    revalidatePath(`/business-admin/${businessSlug}`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to mark as read" }
  }
}

export async function markAllNotificationsRead(businessSlug: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)
    await prisma.businessNotification.updateMany({
      where: {
        businessId: business.id,
        OR: [{ userId: user.id }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true },
    })
    revalidatePath(`/business-admin/${businessSlug}`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to mark all as read" }
  }
}

// ============================================================================
// CUSTOMER SEGMENTS
// ============================================================================

export async function getCustomerSegments(businessSlug: string): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const segments = await prisma.customerSegment.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: segments }
  } catch {
    return { success: false, error: "Failed to fetch segments" }
  }
}

export async function createCustomerSegment(
  businessSlug: string,
  data: { name: string; description?: string; color: string; criteria: Record<string, unknown>[]; autoAssign: boolean }
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Count matching customers based on criteria
    const shops = await prisma.shop.findMany({ where: { businessId: business.id }, select: { id: true } })
    const shopIds = shops.map(s => s.id)
    const allCustomers = await prisma.customer.findMany({
      where: { shopId: { in: shopIds } },
      include: { purchases: { select: { totalAmount: true, status: true } } },
    })

    const matchingIds = filterCustomersByCriteria(allCustomers, data.criteria)

    const segment = await prisma.customerSegment.create({
      data: {
        businessId: business.id,
        name: data.name,
        description: data.description,
        color: data.color,
        criteria: data.criteria as unknown as Prisma.InputJsonValue,
        autoAssign: data.autoAssign,
        customerCount: matchingIds.length,
        customerIds: matchingIds as unknown as Prisma.InputJsonValue,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/segments`)
    return { success: true, data: segment }
  } catch {
    return { success: false, error: "Failed to create segment" }
  }
}

export async function deleteCustomerSegment(businessSlug: string, segmentId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    await prisma.customerSegment.delete({ where: { id: segmentId } })
    revalidatePath(`/business-admin/${businessSlug}/segments`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete segment" }
  }
}

function filterCustomersByCriteria(
  customers: Array<{ id: string; firstName: string; lastName: string; createdAt: Date; isActive: boolean; purchases: Array<{ totalAmount: Prisma.Decimal; status: string }> }>,
  criteria: Record<string, unknown>[]
): string[] {
  return customers
    .filter(customer => {
      return criteria.every(rule => {
        const field = rule.field as string
        const operator = rule.operator as string
        const value = rule.value as string | number

        let fieldValue: unknown
        if (field === "totalPurchases") {
          fieldValue = customer.purchases.length
        } else if (field === "totalSpent") {
          fieldValue = customer.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
        } else if (field === "activePurchases") {
          fieldValue = customer.purchases.filter(p => p.status === "ACTIVE").length
        } else if (field === "daysSinceCreation") {
          fieldValue = Math.floor((Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        } else if (field === "isActive") {
          fieldValue = customer.isActive
        } else {
          return true
        }

        const numValue = Number(value)
        const numField = Number(fieldValue)
        switch (operator) {
          case "greater_than": return numField > numValue
          case "less_than": return numField < numValue
          case "equals": return numField === numValue
          case "greater_than_or_equal": return numField >= numValue
          case "less_than_or_equal": return numField <= numValue
          default: return true
        }
      })
    })
    .map(c => c.id)
}

// ============================================================================
// ALERT RULES
// ============================================================================

export async function getAlertRules(businessSlug: string): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const rules = await prisma.alertRule.findMany({
      where: { businessId: business.id },
      include: { alerts: { where: { isRead: false }, select: { id: true } } },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: rules }
  } catch {
    return { success: false, error: "Failed to fetch alert rules" }
  }
}

export async function createAlertRule(
  businessSlug: string,
  data: { name: string; type: string; field: string; condition: string; threshold: number; notifyEmail: boolean; notifySms: boolean }
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const rule = await prisma.alertRule.create({
      data: {
        businessId: business.id,
        name: data.name,
        type: data.type as "LOW_STOCK" | "OVERDUE_PAYMENT" | "HIGH_OUTSTANDING" | "LOW_COLLECTION_RATE" | "REVENUE_DROP" | "CUSTOM",
        field: data.field,
        condition: data.condition as "LESS_THAN" | "GREATER_THAN" | "EQUALS" | "LESS_THAN_OR_EQUAL" | "GREATER_THAN_OR_EQUAL",
        threshold: data.threshold,
        notifyEmail: data.notifyEmail,
        notifySms: data.notifySms,
      },
    })
    revalidatePath(`/business-admin/${businessSlug}/alerts`)
    return { success: true, data: rule }
  } catch {
    return { success: false, error: "Failed to create alert rule" }
  }
}

export async function toggleAlertRule(businessSlug: string, ruleId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    const rule = await prisma.alertRule.findUnique({ where: { id: ruleId } })
    if (!rule) return { success: false, error: "Rule not found" }
    await prisma.alertRule.update({ where: { id: ruleId }, data: { isActive: !rule.isActive } })
    revalidatePath(`/business-admin/${businessSlug}/alerts`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to toggle alert rule" }
  }
}

export async function deleteAlertRule(businessSlug: string, ruleId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    await prisma.alertRule.delete({ where: { id: ruleId } })
    revalidatePath(`/business-admin/${businessSlug}/alerts`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete alert rule" }
  }
}

export async function getBusinessAlerts(businessSlug: string, unreadOnly = false): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const alerts = await prisma.businessAlert.findMany({
      where: {
        businessId: business.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: { alertRule: { select: { name: true, type: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return { success: true, data: alerts }
  } catch {
    return { success: false, error: "Failed to fetch alerts" }
  }
}

export async function markAlertRead(businessSlug: string, alertId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    await prisma.businessAlert.update({ where: { id: alertId }, data: { isRead: true } })
    revalidatePath(`/business-admin/${businessSlug}/alerts`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to mark alert read" }
  }
}

// ============================================================================
// SALES GOALS & TARGETS
// ============================================================================

export async function getSalesGoals(businessSlug: string): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const goals = await prisma.salesGoal.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: goals }
  } catch {
    return { success: false, error: "Failed to fetch goals" }
  }
}

export async function createSalesGoal(
  businessSlug: string,
  data: { name: string; type: string; targetAmount: number; period: string; startDate: string; endDate: string; shopId?: string; staffId?: string }
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Calculate current amount based on type
    const shops = await prisma.shop.findMany({ where: { businessId: business.id }, select: { id: true } })
    const shopIds = data.shopId ? [data.shopId] : shops.map(s => s.id)
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)

    let currentAmount = 0
    const customers = await prisma.customer.findMany({
      where: { shopId: { in: shopIds } },
      select: { id: true },
    })
    const customerIds = customers.map(c => c.id)

    if (data.type === "REVENUE" || data.type === "COLLECTIONS") {
      const purchases = await prisma.purchase.findMany({
        where: {
          customerId: { in: customerIds },
          createdAt: { gte: start, lte: end },
        },
        select: { totalAmount: true, amountPaid: true },
      })
      currentAmount = data.type === "REVENUE"
        ? purchases.reduce((s, p) => s + Number(p.totalAmount), 0)
        : purchases.reduce((s, p) => s + Number(p.amountPaid), 0)
    } else if (data.type === "NEW_CUSTOMERS") {
      currentAmount = await prisma.customer.count({
        where: { shopId: { in: shopIds }, createdAt: { gte: start, lte: end } },
      })
    } else if (data.type === "NEW_SALES") {
      currentAmount = await prisma.purchase.count({
        where: { customerId: { in: customerIds }, createdAt: { gte: start, lte: end } },
      })
    }

    const goal = await prisma.salesGoal.create({
      data: {
        businessId: business.id,
        name: data.name,
        type: data.type as "REVENUE" | "COLLECTIONS" | "NEW_CUSTOMERS" | "NEW_SALES" | "UNITS_SOLD",
        targetAmount: data.targetAmount,
        currentAmount,
        period: data.period as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
        startDate: start,
        endDate: end,
        shopId: data.shopId || null,
        staffId: data.staffId || null,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/goals`)
    return { success: true, data: goal }
  } catch {
    return { success: false, error: "Failed to create goal" }
  }
}

export async function deleteSalesGoal(businessSlug: string, goalId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    await prisma.salesGoal.delete({ where: { id: goalId } })
    revalidatePath(`/business-admin/${businessSlug}/goals`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete goal" }
  }
}

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export async function getStockMovements(businessSlug: string, productId?: string, page = 1, limit = 30): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const skip = (page - 1) * limit
    const where: Prisma.StockMovementWhereInput = {
      businessId: business.id,
      ...(productId ? { productId } : {}),
    }
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ])
    return { success: true, data: { movements, total, pages: Math.ceil(total / limit) } }
  } catch {
    return { success: false, error: "Failed to fetch stock movements" }
  }
}

export async function createStockAdjustment(
  businessSlug: string,
  data: { productId: string; shopId?: string; type: string; quantity: number; reason: string }
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get current stock
    let previousQty = 0
    if (data.shopId) {
      const shopProduct = await prisma.shopProduct.findUnique({
        where: { shopId_productId: { shopId: data.shopId, productId: data.productId } },
      })
      previousQty = shopProduct?.stockQuantity ?? 0
    } else {
      const product = await prisma.product.findUnique({ where: { id: data.productId } })
      previousQty = product?.stockQuantity ?? 0
    }

    const adjustedQty = data.type === "RESTOCK" || data.type === "RETURN" ? data.quantity : -data.quantity
    const newQty = Math.max(0, previousQty + adjustedQty)

    // Update stock
    if (data.shopId) {
      await prisma.shopProduct.update({
        where: { shopId_productId: { shopId: data.shopId, productId: data.productId } },
        data: { stockQuantity: newQty },
      })
    } else {
      await prisma.product.update({
        where: { id: data.productId },
        data: { stockQuantity: newQty },
      })
    }

    // Log movement
    await prisma.stockMovement.create({
      data: {
        businessId: business.id,
        productId: data.productId,
        shopId: data.shopId || null,
        type: data.type as "SALE" | "RETURN" | "ADJUSTMENT" | "TRANSFER" | "RESTOCK" | "DAMAGE",
        quantity: data.quantity,
        previousQty,
        newQty,
        reason: data.reason,
        userId: user.id,
        userName: user.name,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/inventory-log`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to create stock adjustment" }
  }
}

// ============================================================================
// RETURN & REFUND WORKFLOW
// ============================================================================

export async function getReturnRequests(businessSlug: string, status?: string): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const shops = await prisma.shop.findMany({ where: { businessId: business.id }, select: { id: true } })
    const shopIds = shops.map(s => s.id)
    const customers = await prisma.customer.findMany({
      where: { shopId: { in: shopIds } },
      select: { id: true },
    })
    const customerIds = customers.map(c => c.id)

    const returns = await prisma.returnRequest.findMany({
      where: {
        businessId: business.id,
        ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "PARTIALLY_REFUNDED" } : {}),
      },
      orderBy: { createdAt: "desc" },
    })

    // Enrich with purchase and customer info
    const enrichedReturns = await Promise.all(
      returns.map(async (ret) => {
        const purchase = await prisma.purchase.findUnique({
          where: { id: ret.purchaseId },
          select: { purchaseNumber: true, totalAmount: true },
        })
        const customer = customerIds.includes(ret.customerId)
          ? await prisma.customer.findUnique({
              where: { id: ret.customerId },
              select: { firstName: true, lastName: true, phone: true },
            })
          : null
        return { ...ret, purchase, customer }
      })
    )

    return { success: true, data: enrichedReturns }
  } catch {
    return { success: false, error: "Failed to fetch return requests" }
  }
}

export async function createReturnRequest(
  businessSlug: string,
  data: { purchaseId: string; customerId: string; reason: string; items: Array<{ productName: string; quantity: number; unitPrice: number }>; refundAmount: number }
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const returnNumber = `RTN-${Date.now().toString(36).toUpperCase()}`

    const ret = await prisma.returnRequest.create({
      data: {
        businessId: business.id,
        purchaseId: data.purchaseId,
        customerId: data.customerId,
        returnNumber,
        reason: data.reason,
        refundAmount: data.refundAmount,
        items: data.items as unknown as Prisma.InputJsonValue,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/returns`)
    return { success: true, data: ret }
  } catch {
    return { success: false, error: "Failed to create return request" }
  }
}

export async function processReturnRequest(
  businessSlug: string,
  returnId: string,
  action: "approve" | "reject",
  adminNotes?: string,
  refundMethod?: string
): Promise<ActionResult> {
  try {
    const { user } = await requireBusinessAdmin(businessSlug)

    const ret = await prisma.returnRequest.findUnique({ where: { id: returnId } })
    if (!ret) return { success: false, error: "Return request not found" }

    if (action === "approve") {
      await prisma.returnRequest.update({
        where: { id: returnId },
        data: {
          status: "APPROVED",
          refundMethod: refundMethod || "wallet",
          adminNotes,
          processedById: user.id,
          processedAt: new Date(),
        },
      })

      // If refund to wallet, credit the customer
      if (refundMethod === "wallet" && ret.refundAmount) {
        await prisma.customer.update({
          where: { id: ret.customerId },
          data: { walletBalance: { increment: ret.refundAmount } },
        })
        await prisma.returnRequest.update({
          where: { id: returnId },
          data: { status: "REFUNDED" },
        })
      }
    } else {
      await prisma.returnRequest.update({
        where: { id: returnId },
        data: {
          status: "REJECTED",
          adminNotes,
          processedById: user.id,
          processedAt: new Date(),
        },
      })
    }

    revalidatePath(`/business-admin/${businessSlug}/returns`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to process return" }
  }
}

// ============================================================================
// PROMOTIONS
// ============================================================================

export async function getPromotions(businessSlug: string): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const promotions = await prisma.promotion.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: promotions }
  } catch {
    return { success: false, error: "Failed to fetch promotions" }
  }
}

export async function createPromotion(
  businessSlug: string,
  data: {
    name: string; description?: string; type: string; value: number;
    minPurchase?: number; maxDiscount?: number; validFrom: string; validUntil: string;
    usageLimit: number; applicableTo?: string; shopIds?: string[]
  }
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const promotion = await prisma.promotion.create({
      data: {
        businessId: business.id,
        name: data.name,
        description: data.description,
        type: data.type as "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "BUY_X_GET_Y" | "FREE_DELIVERY",
        value: data.value,
        minPurchase: data.minPurchase || null,
        maxDiscount: data.maxDiscount || null,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        usageLimit: data.usageLimit,
        applicableTo: data.applicableTo || null,
        shopIds: data.shopIds ? (data.shopIds as unknown as Prisma.InputJsonValue) : undefined,
      },
    })
    revalidatePath(`/business-admin/${businessSlug}/promotions`)
    return { success: true, data: promotion }
  } catch {
    return { success: false, error: "Failed to create promotion" }
  }
}

export async function togglePromotion(businessSlug: string, promotionId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    const promo = await prisma.promotion.findUnique({ where: { id: promotionId } })
    if (!promo) return { success: false, error: "Promotion not found" }
    await prisma.promotion.update({ where: { id: promotionId }, data: { isActive: !promo.isActive } })
    revalidatePath(`/business-admin/${businessSlug}/promotions`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to toggle promotion" }
  }
}

export async function deletePromotion(businessSlug: string, promotionId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    await prisma.promotion.delete({ where: { id: promotionId } })
    revalidatePath(`/business-admin/${businessSlug}/promotions`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete promotion" }
  }
}

// ============================================================================
// SCHEDULED REPORTS
// ============================================================================

export async function getScheduledReports(businessSlug: string): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)
    const reports = await prisma.scheduledReport.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: reports }
  } catch {
    return { success: false, error: "Failed to fetch scheduled reports" }
  }
}

export async function createScheduledReport(
  businessSlug: string,
  data: { name: string; reportType: string; frequency: string; recipients: string[] }
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Calculate next run
    const now = new Date()
    let nextRunAt = new Date()
    switch (data.frequency) {
      case "DAILY_REPORT": nextRunAt.setDate(now.getDate() + 1); nextRunAt.setHours(8, 0, 0, 0); break
      case "WEEKLY_REPORT": nextRunAt.setDate(now.getDate() + (7 - now.getDay())); nextRunAt.setHours(8, 0, 0, 0); break
      case "MONTHLY_REPORT": nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0); break
      case "QUARTERLY_REPORT": nextRunAt = new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 1, 8, 0, 0); break
    }

    const report = await prisma.scheduledReport.create({
      data: {
        businessId: business.id,
        name: data.name,
        reportType: data.reportType as "SALES_SUMMARY" | "COLLECTION_REPORT" | "INVENTORY_STATUS" | "CUSTOMER_ANALYSIS" | "STAFF_PERFORMANCE" | "FINANCIAL_OVERVIEW",
        frequency: data.frequency as "DAILY_REPORT" | "WEEKLY_REPORT" | "MONTHLY_REPORT" | "QUARTERLY_REPORT",
        recipients: data.recipients as unknown as Prisma.InputJsonValue,
        nextRunAt,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/scheduled-reports`)
    return { success: true, data: report }
  } catch {
    return { success: false, error: "Failed to create scheduled report" }
  }
}

export async function toggleScheduledReport(businessSlug: string, reportId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    const report = await prisma.scheduledReport.findUnique({ where: { id: reportId } })
    if (!report) return { success: false, error: "Report not found" }
    await prisma.scheduledReport.update({ where: { id: reportId }, data: { isActive: !report.isActive } })
    revalidatePath(`/business-admin/${businessSlug}/scheduled-reports`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to toggle scheduled report" }
  }
}

export async function deleteScheduledReport(businessSlug: string, reportId: string): Promise<ActionResult> {
  try {
    await requireBusinessAdmin(businessSlug)
    await prisma.scheduledReport.delete({ where: { id: reportId } })
    revalidatePath(`/business-admin/${businessSlug}/scheduled-reports`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete scheduled report" }
  }
}

// ============================================================================
// DASHBOARD CONFIG
// ============================================================================

export async function getDashboardConfig(businessSlug: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)
    let config = await prisma.dashboardConfig.findUnique({
      where: { businessId_userId: { businessId: business.id, userId: user.id } },
    })
    if (!config) {
      config = await prisma.dashboardConfig.create({
        data: { businessId: business.id, userId: user.id },
      })
    }
    return { success: true, data: config }
  } catch {
    return { success: false, error: "Failed to fetch dashboard config" }
  }
}

export async function updateDashboardConfig(
  businessSlug: string,
  data: { dateRange?: string; theme?: string; widgetOrder?: string[]; hiddenWidgets?: string[] }
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)
    await prisma.dashboardConfig.upsert({
      where: { businessId_userId: { businessId: business.id, userId: user.id } },
      create: {
        businessId: business.id,
        userId: user.id,
        dateRange: data.dateRange || "30d",
        theme: data.theme || "dark",
        widgetOrder: data.widgetOrder ? (data.widgetOrder as unknown as Prisma.InputJsonValue) : undefined,
        hiddenWidgets: data.hiddenWidgets ? (data.hiddenWidgets as unknown as Prisma.InputJsonValue) : undefined,
      },
      update: {
        ...(data.dateRange ? { dateRange: data.dateRange } : {}),
        ...(data.theme ? { theme: data.theme } : {}),
        ...(data.widgetOrder ? { widgetOrder: data.widgetOrder as unknown as Prisma.InputJsonValue } : {}),
        ...(data.hiddenWidgets ? { hiddenWidgets: data.hiddenWidgets as unknown as Prisma.InputJsonValue } : {}),
      },
    })
    revalidatePath(`/business-admin/${businessSlug}`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to update dashboard config" }
  }
}

// ============================================================================
// ADVANCED REPORTS DATA
// ============================================================================

export async function getAdvancedReportData(
  businessSlug: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = dateTo ? new Date(dateTo) : new Date()
    endDate.setHours(23, 59, 59, 999)

    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
    })
    const shopIds = shops.map(s => s.id)

    const customers = await prisma.customer.findMany({
      where: { shopId: { in: shopIds } },
      select: { id: true, shopId: true, firstName: true, lastName: true, createdAt: true },
    })
    const customerIds = customers.map(c => c.id)

    const [purchases, payments, products] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          customerId: { in: customerIds },
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          items: { select: { productName: true, quantity: true, totalPrice: true } },
          customer: { select: { firstName: true, lastName: true, shopId: true } },
        },
      }),
      prisma.payment.findMany({
        where: {
          purchase: { customerId: { in: customerIds } },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { amount: true, paymentMethod: true, createdAt: true, status: true },
      }),
      prisma.product.findMany({
        where: { businessId: business.id },
        select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true, costPrice: true, price: true },
      }),
    ])

    // Revenue metrics
    const totalRevenue = purchases.reduce((s, p) => s + Number(p.totalAmount), 0)
    const totalCollected = purchases.reduce((s, p) => s + Number(p.amountPaid), 0)
    const totalOutstanding = purchases.reduce((s, p) => s + Number(p.outstandingBalance), 0)
    const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0

    // Purchase type breakdown
    const cashSales = purchases.filter(p => p.purchaseType === "CASH")
    const layawaySales = purchases.filter(p => p.purchaseType === "LAYAWAY")
    const creditSales = purchases.filter(p => p.purchaseType === "CREDIT")

    // Monthly trends (for charts)
    const monthlyData: Record<string, { revenue: number; collected: number; purchases: number; customers: number }> = {}
    purchases.forEach(p => {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`
      if (!monthlyData[key]) monthlyData[key] = { revenue: 0, collected: 0, purchases: 0, customers: 0 }
      monthlyData[key].revenue += Number(p.totalAmount)
      monthlyData[key].collected += Number(p.amountPaid)
      monthlyData[key].purchases += 1
    })

    // New customers per month
    customers.forEach(c => {
      if (c.createdAt >= startDate && c.createdAt <= endDate) {
        const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`
        if (!monthlyData[key]) monthlyData[key] = { revenue: 0, collected: 0, purchases: 0, customers: 0 }
        monthlyData[key].customers += 1
      }
    })

    const monthlyTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))

    // Payment method breakdown
    const methodBreakdown: Record<string, number> = {}
    payments.forEach(p => {
      const method = p.paymentMethod || "OTHER"
      methodBreakdown[method] = (methodBreakdown[method] || 0) + Number(p.amount)
    })

    // Shop performance
    const shopPerformance = shops.map(shop => {
      const shopCustomers = customers.filter(c => c.shopId === shop.id)
      const shopCustomerIds = shopCustomers.map(c => c.id)
      const shopPurchases = purchases.filter(p => shopCustomerIds.includes(p.customerId))
      return {
        name: shop.name,
        revenue: shopPurchases.reduce((s, p) => s + Number(p.totalAmount), 0),
        collected: shopPurchases.reduce((s, p) => s + Number(p.amountPaid), 0),
        outstanding: shopPurchases.reduce((s, p) => s + Number(p.outstandingBalance), 0),
        purchases: shopPurchases.length,
        customers: shopCustomers.length,
      }
    })

    // Top products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
    purchases.forEach(p => {
      p.items.forEach(item => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = { name: item.productName, quantity: 0, revenue: 0 }
        }
        productSales[item.productName].quantity += item.quantity
        productSales[item.productName].revenue += Number(item.totalPrice)
      })
    })
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    // Low stock products
    const lowStockProducts = products
      .filter(p => p.stockQuantity <= p.lowStockThreshold)
      .map(p => ({ name: p.name, stock: p.stockQuantity, threshold: p.lowStockThreshold }))

    // Status breakdown
    const statusBreakdown = {
      PENDING: purchases.filter(p => p.status === "PENDING").length,
      ACTIVE: purchases.filter(p => p.status === "ACTIVE").length,
      COMPLETED: purchases.filter(p => p.status === "COMPLETED").length,
      OVERDUE: purchases.filter(p => p.status === "OVERDUE").length,
      DEFAULTED: purchases.filter(p => p.status === "DEFAULTED").length,
    }

    return {
      success: true,
      data: {
        summary: { totalRevenue, totalCollected, totalOutstanding, collectionRate, totalPurchases: purchases.length, totalCustomers: customers.length },
        purchaseTypes: {
          cash: { count: cashSales.length, value: cashSales.reduce((s, p) => s + Number(p.totalAmount), 0) },
          layaway: { count: layawaySales.length, value: layawaySales.reduce((s, p) => s + Number(p.totalAmount), 0) },
          credit: { count: creditSales.length, value: creditSales.reduce((s, p) => s + Number(p.totalAmount), 0) },
        },
        monthlyTrends,
        methodBreakdown,
        shopPerformance,
        topProducts,
        lowStockProducts,
        statusBreakdown,
      },
    }
  } catch {
    return { success: false, error: "Failed to fetch report data" }
  }
}

// ============================================================================
// TOP PERFORMERS
// ============================================================================

export async function getTopPerformers(businessSlug: string, dateRange = "30d"): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }
    const days = daysMap[dateRange] || 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true },
    })
    const shopIds = shops.map(s => s.id)

    // Top staff by collections
    const staffMembers = await prisma.shopMember.findMany({
      where: { shopId: { in: shopIds }, isActive: true },
      include: {
        user: { select: { name: true, email: true } },
        collectedPayments: {
          where: { createdAt: { gte: since }, isConfirmed: true },
          select: { amount: true },
        },
        shop: { select: { name: true } },
      },
    })

    const topCollectors = staffMembers
      .map(m => ({
        name: m.user.name || m.user.email,
        shop: m.shop.name,
        role: m.role,
        collections: m.collectedPayments.reduce((s, p) => s + Number(p.amount), 0),
        transactionCount: m.collectedPayments.length,
      }))
      .filter(m => m.collections > 0)
      .sort((a, b) => b.collections - a.collections)
      .slice(0, 10)

    // Top shops by revenue
    const customers = await prisma.customer.findMany({
      where: { shopId: { in: shopIds } },
      select: { id: true, shopId: true },
    })

    const topShops = shops.map(shop => {
      const shopCustomerIds = customers.filter(c => c.shopId === shop.id).map(c => c.id)
      return { shopId: shop.id, customerIds: shopCustomerIds }
    })

    const shopPerf = await Promise.all(
      topShops.map(async (s) => {
        const shop = await prisma.shop.findUnique({ where: { id: s.shopId }, select: { name: true } })
        const purchases = await prisma.purchase.findMany({
          where: { customerId: { in: s.customerIds }, createdAt: { gte: since } },
          select: { totalAmount: true, amountPaid: true },
        })
        return {
          name: shop?.name || "Unknown",
          revenue: purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0),
          collected: purchases.reduce((sum, p) => sum + Number(p.amountPaid), 0),
          purchases: purchases.length,
        }
      })
    )

    const topShopsSorted = shopPerf.sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    // Top customers by purchase value
    const topCustomers = await Promise.all(
      customers.slice(0, 100).map(async (c) => {
        const customer = await prisma.customer.findUnique({
          where: { id: c.id },
          select: { firstName: true, lastName: true, phone: true },
        })
        const purchases = await prisma.purchase.findMany({
          where: { customerId: c.id, createdAt: { gte: since } },
          select: { totalAmount: true, amountPaid: true },
        })
        return {
          name: `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim(),
          phone: customer?.phone || "",
          totalSpent: purchases.reduce((s, p) => s + Number(p.totalAmount), 0),
          totalPaid: purchases.reduce((s, p) => s + Number(p.amountPaid), 0),
          purchases: purchases.length,
        }
      })
    )

    const topCustomersSorted = topCustomers
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    return {
      success: true,
      data: { topCollectors, topShops: topShopsSorted, topCustomers: topCustomersSorted },
    }
  } catch {
    return { success: false, error: "Failed to fetch top performers" }
  }
}

// ============================================================================
// EXPORT DATA HELPER
// ============================================================================

export async function exportBusinessData(
  businessSlug: string,
  dataType: "customers" | "purchases" | "payments" | "products" | "staff"
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
    })
    const shopIds = shops.map(s => s.id)

    let csvContent = ""

    if (dataType === "customers") {
      const customers = await prisma.customer.findMany({
        where: { shopId: { in: shopIds } },
        include: { shop: { select: { name: true } } },
      })
      csvContent = "Name,Phone,Email,Shop,Wallet Balance,Status,Created\n"
      customers.forEach(c => {
        csvContent += `"${c.firstName} ${c.lastName}","${c.phone}","${c.email || ""}","${c.shop.name}",${Number(c.walletBalance)},"${c.isActive ? "Active" : "Inactive"}","${c.createdAt.toISOString()}"\n`
      })
    } else if (dataType === "purchases") {
      const customers = await prisma.customer.findMany({ where: { shopId: { in: shopIds } }, select: { id: true } })
      const purchases = await prisma.purchase.findMany({
        where: { customerId: { in: customers.map(c => c.id) } },
        include: { customer: { select: { firstName: true, lastName: true } } },
      })
      csvContent = "Purchase #,Customer,Type,Status,Total,Paid,Outstanding,Due Date,Created\n"
      purchases.forEach(p => {
        csvContent += `"${p.purchaseNumber}","${p.customer.firstName} ${p.customer.lastName}","${p.purchaseType}","${p.status}",${Number(p.totalAmount)},${Number(p.amountPaid)},${Number(p.outstandingBalance)},"${p.dueDate.toISOString()}","${p.createdAt.toISOString()}"\n`
      })
    } else if (dataType === "payments") {
      const customers = await prisma.customer.findMany({ where: { shopId: { in: shopIds } }, select: { id: true } })
      const payments = await prisma.payment.findMany({
        where: { purchase: { customerId: { in: customers.map(c => c.id) } } },
        include: { purchase: { select: { purchaseNumber: true, customer: { select: { firstName: true, lastName: true } } } } },
      })
      csvContent = "Purchase #,Customer,Amount,Method,Status,Confirmed,Date\n"
      payments.forEach(p => {
        csvContent += `"${p.purchase.purchaseNumber}","${p.purchase.customer.firstName} ${p.purchase.customer.lastName}",${Number(p.amount)},"${p.paymentMethod}","${p.status}","${p.isConfirmed ? "Yes" : "No"}","${p.createdAt.toISOString()}"\n`
      })
    } else if (dataType === "products") {
      const products = await prisma.product.findMany({
        where: { businessId: business.id },
        include: { category: { select: { name: true } }, brand: { select: { name: true } } },
      })
      csvContent = "Name,SKU,Category,Brand,Cost Price,Cash Price,Credit Price,Stock,Status\n"
      products.forEach(p => {
        csvContent += `"${p.name}","${p.sku || ""}","${p.category?.name || ""}","${p.brand?.name || ""}",${Number(p.costPrice)},${Number(p.cashPrice)},${Number(p.creditPrice)},${p.stockQuantity},"${p.isActive ? "Active" : "Inactive"}"\n`
      })
    } else if (dataType === "staff") {
      const members = await prisma.shopMember.findMany({
        where: { shopId: { in: shopIds } },
        include: { user: { select: { name: true, email: true, phone: true } }, shop: { select: { name: true } } },
      })
      csvContent = "Name,Email,Phone,Shop,Role,POS Access,Status\n"
      members.forEach(m => {
        csvContent += `"${m.user.name || ""}","${m.user.email}","${m.user.phone || ""}","${m.shop.name}","${m.role}","${m.posAccess ? "Yes" : "No"}","${m.isActive ? "Active" : "Inactive"}"\n`
      })
    }

    return { success: true, data: { csv: csvContent, filename: `${dataType}-export-${new Date().toISOString().split("T")[0]}.csv` } }
  } catch {
    return { success: false, error: "Failed to export data" }
  }
}
