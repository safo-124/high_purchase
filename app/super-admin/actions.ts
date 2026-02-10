"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireSuperAdmin, createAuditLog } from "../../lib/auth"
import { sendAccountCreationEmail } from "../../lib/email"

// Validation regex for business slug: lowercase, alphanumeric, hyphens only
const SLUG_REGEX = /^[a-z0-9-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface BusinessData {
  id: string
  name: string
  businessSlug: string
  country: string
  posEnabled: boolean
  supplyCatalogEnabled: boolean
  isActive: boolean
  createdAt: Date
  shopCount: number
  admins: Array<{
    id: string
    name: string | null
    email: string
  }>
  // For backwards compatibility
  adminName: string | null
  adminEmail: string | null
}

/**
 * Get all businesses with stats
 */
export async function getBusinesses(): Promise<BusinessData[]> {
  await requireSuperAdmin()

  const businesses = await prisma.business.findMany({
    include: {
      _count: {
        select: { shops: true },
      },
      members: {
        where: { role: "BUSINESS_ADMIN", isActive: true },
        include: { user: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return businesses.map((b) => ({
    id: b.id,
    name: b.name,
    businessSlug: b.businessSlug,
    country: b.country,
    posEnabled: b.posEnabled,
    supplyCatalogEnabled: b.supplyCatalogEnabled,
    isActive: b.isActive,
    createdAt: b.createdAt,
    shopCount: b._count.shops,
    admins: b.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    })),
    adminName: b.members[0]?.user.name || null,
    adminEmail: b.members[0]?.user.email || null,
  }))
}

/**
 * Create a new business with optional business admin
 */
export async function createBusiness(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const name = formData.get("name") as string
    const businessSlug = formData.get("businessSlug") as string
    const posEnabled = formData.get("posEnabled") === "true"
    const supplyCatalogEnabled = formData.get("supplyCatalogEnabled") === "true"
    
    // Business Admin fields
    const adminName = formData.get("adminName") as string | null
    const adminEmail = formData.get("adminEmail") as string | null
    const adminPassword = formData.get("adminPassword") as string | null

    // Validation
    if (!name || name.trim().length === 0) {
      return { success: false, error: "Business name is required" }
    }

    if (!businessSlug || businessSlug.trim().length === 0) {
      return { success: false, error: "Business slug is required" }
    }

    const normalizedSlug = businessSlug.toLowerCase().trim()

    if (!SLUG_REGEX.test(normalizedSlug)) {
      return {
        success: false,
        error: "Business slug must contain only lowercase letters, numbers, and hyphens",
      }
    }

    // Check if slug already exists
    const existingBusiness = await prisma.business.findUnique({
      where: { businessSlug: normalizedSlug },
    })

    if (existingBusiness) {
      return { success: false, error: "A business with this slug already exists" }
    }

    // Validate business admin fields (required)
    if (!adminName || adminName.trim().length === 0) {
      return { success: false, error: "Business admin name is required" }
    }
    if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) {
      return { success: false, error: "Valid business admin email is required" }
    }
    if (!adminPassword || adminPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" }
    }
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase().trim() },
    })
    if (existingUser) {
      return { success: false, error: "A user with this email already exists" }
    }

    // Create business
    const business = await prisma.business.create({
      data: {
        name: name.trim(),
        businessSlug: normalizedSlug,
        posEnabled,
        supplyCatalogEnabled,
      },
    })

    // Create business admin user
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    
    const businessAdmin = await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        name: adminName.trim(),
        passwordHash,
        role: "BUSINESS_ADMIN",
        mustChangePassword: true, // Force password change on first login
        businessMemberships: {
          create: {
            businessId: business.id,
            role: "BUSINESS_ADMIN",
            isActive: true,
          },
        },
      },
    })

    // Audit log for business creation
    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_CREATED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        adminEmail: businessAdmin.email,
      },
    })

    // Send account creation email
    await sendAccountCreationEmail({
      businessId: business.id,
      recipientEmail: businessAdmin.email,
      recipientName: adminName.trim(),
      businessName: business.name,
      accountEmail: businessAdmin.email,
      temporaryPassword: adminPassword,
      role: "BUSINESS_ADMIN",
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { 
      success: true, 
      data: { 
        business, 
        businessAdmin: { 
          email: businessAdmin.email, 
          name: businessAdmin.name 
        }
      } 
    }
  } catch (error) {
    console.error("Error creating business:", error)
    return { success: false, error: "Failed to create business" }
  }
}

/**
 * Add an additional business admin to an existing business
 */
export async function addBusinessAdmin(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const businessId = formData.get("businessId") as string
    const adminName = formData.get("adminName") as string
    const adminEmail = formData.get("adminEmail") as string
    const adminPassword = formData.get("adminPassword") as string

    // Validation
    if (!businessId) {
      return { success: false, error: "Business ID is required" }
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    if (!adminName || adminName.trim().length === 0) {
      return { success: false, error: "Admin name is required" }
    }
    if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) {
      return { success: false, error: "Valid admin email is required" }
    }
    if (!adminPassword || adminPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase().trim() },
    })
    if (existingUser) {
      return { success: false, error: "A user with this email already exists" }
    }

    // Create business admin user
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    
    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        name: adminName.trim(),
        passwordHash,
        role: "BUSINESS_ADMIN",
        businessMemberships: {
          create: {
            businessId: business.id,
            role: "BUSINESS_ADMIN",
            isActive: true,
          },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_ADMIN_ADDED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        newAdminEmail: newAdmin.email,
        newAdminName: newAdmin.name,
      },
    })

    // Send account creation email
    await sendAccountCreationEmail({
      businessId: business.id,
      recipientEmail: newAdmin.email,
      recipientName: adminName.trim(),
      businessName: business.name,
      accountEmail: newAdmin.email,
      temporaryPassword: adminPassword,
      role: "BUSINESS_ADMIN",
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { 
      success: true, 
      data: { 
        admin: { 
          id: newAdmin.id,
          email: newAdmin.email, 
          name: newAdmin.name 
        }
      } 
    }
  } catch (error) {
    console.error("Error adding business admin:", error)
    return { success: false, error: "Failed to add business admin" }
  }
}

/**
 * Remove a business admin from a business
 */
export async function removeBusinessAdmin(
  businessId: string,
  adminUserId: string
): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        members: {
          where: { role: "BUSINESS_ADMIN", isActive: true },
        },
      },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    // Check there's at least one other admin remaining
    if (business.members.length <= 1) {
      return { success: false, error: "Cannot remove the last business admin. Add another admin first." }
    }

    const membership = business.members.find((m) => m.userId === adminUserId)
    if (!membership) {
      return { success: false, error: "Admin not found for this business" }
    }

    // Get admin info for audit log
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
    })

    // Deactivate the membership (soft delete)
    await prisma.businessMember.update({
      where: { id: membership.id },
      data: { isActive: false },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_ADMIN_REMOVED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        removedAdminEmail: adminUser?.email,
        removedAdminName: adminUser?.name,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { success: true }
  } catch (error) {
    console.error("Error removing business admin:", error)
    return { success: false, error: "Failed to remove business admin" }
  }
}

/**
 * Toggle business active status
 */
export async function setBusinessActive(
  businessId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: { isActive },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: isActive ? "BUSINESS_ACTIVATED" : "BUSINESS_SUSPENDED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        previousStatus: business.isActive,
        newStatus: isActive,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { success: true, data: updatedBusiness }
  } catch (error) {
    console.error("Error updating business status:", error)
    return { success: false, error: "Failed to update business status" }
  }
}

/**
 * Delete a business (and all its shops)
 */
export async function deleteBusiness(businessId: string): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        _count: { select: { shops: true } },
      },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    // Delete the business (cascades to shops)
    await prisma.business.delete({
      where: { id: businessId },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_DELETED",
      entityType: "Business",
      entityId: businessId,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        shopsDeleted: business._count.shops,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { success: true }
  } catch (error) {
    console.error("Error deleting business:", error)
    return { success: false, error: "Failed to delete business" }
  }
}

/**
 * Toggle POS system for a business
 */
export async function toggleBusinessPOS(businessId: string, enabled: boolean): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: { posEnabled: enabled },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: enabled ? "POS_ENABLED" : "POS_DISABLED",
      entityType: "Business",
      entityId: businessId,
      metadata: {
        businessName: business.name,
        posEnabled: enabled,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath(`/business-admin/${business.businessSlug}`)

    return { success: true, data: updatedBusiness }
  } catch (error) {
    console.error("Error toggling POS:", error)
    return { success: false, error: "Failed to toggle POS" }
  }
}

/**
 * Toggle Supply Catalog for a business
 */
export async function toggleBusinessSupplyCatalog(businessId: string, enabled: boolean): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: { supplyCatalogEnabled: enabled },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: enabled ? "SUPPLY_CATALOG_ENABLED" : "SUPPLY_CATALOG_DISABLED",
      entityType: "Business",
      entityId: businessId,
      metadata: {
        businessName: business.name,
        supplyCatalogEnabled: enabled,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath(`/business-admin/${business.businessSlug}`)

    return { success: true, data: updatedBusiness }
  } catch (error) {
    console.error("Error toggling Supply Catalog:", error)
    return { success: false, error: "Failed to toggle Supply Catalog" }
  }
}

/**
 * Get comprehensive dashboard stats for super admin
 */
export async function getSuperAdminStats() {
  await requireSuperAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    businessCount,
    activeBusinesses,
    shopCount,
    userCount,
    customerCount,
    newUsersThisMonth,
    newCustomersThisMonth,
    activeUsers,
    // Purchase stats
    totalPurchases,
    cashPurchases,
    layawayPurchases,
    creditPurchases,
    activePurchases,
    completedPurchases,
    overduePurchases,
    defaultedPurchases,
    pendingPurchases,
    // Payment stats
    pendingPayments,
    // Financial aggregates
    revenueAgg,
    collectedAgg,
    outstandingAgg,
    thisMonthRevenueAgg,
    lastMonthRevenueAgg,
    // POS
    posTransactionCount,
    posRevenueAgg,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isActive: true } }),
    prisma.shop.count(),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.customer.count(),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" }, createdAt: { gte: startOfMonth } } }),
    prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" }, lastSeenAt: { gte: thirtyDaysAgo } } }),
    // Purchases
    prisma.purchase.count(),
    prisma.purchase.count({ where: { purchaseType: "CASH" } }),
    prisma.purchase.count({ where: { purchaseType: "LAYAWAY" } }),
    prisma.purchase.count({ where: { purchaseType: "CREDIT" } }),
    prisma.purchase.count({ where: { status: "ACTIVE" } }),
    prisma.purchase.count({ where: { status: "COMPLETED" } }),
    prisma.purchase.count({ where: { status: "OVERDUE" } }),
    prisma.purchase.count({ where: { status: "DEFAULTED" } }),
    prisma.purchase.count({ where: { status: "PENDING" } }),
    // Pending payments
    prisma.payment.count({ where: { status: "PENDING" } }),
    // Revenue = total amount from all purchases
    prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
    // Collected = total confirmed payments
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    // Outstanding
    prisma.purchase.aggregate({ _sum: { outstandingBalance: true }, where: { status: { in: ["ACTIVE", "OVERDUE"] } } }),
    // This month revenue
    prisma.purchase.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: startOfMonth } } }),
    // Last month revenue
    prisma.purchase.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    // POS
    prisma.posTransaction.count({ where: { status: "COMPLETED" } }),
    prisma.posTransaction.aggregate({ _sum: { totalAmount: true }, where: { status: "COMPLETED" } }),
  ])

  const totalRevenue = Number(revenueAgg._sum.totalAmount || 0)
  const totalCollected = Number(collectedAgg._sum.amount || 0)
  const totalOutstanding = Number(outstandingAgg._sum.outstandingBalance || 0)
  const thisMonthRevenue = Number(thisMonthRevenueAgg._sum.totalAmount || 0)
  const lastMonthRevenue = Number(lastMonthRevenueAgg._sum.totalAmount || 0)
  const posRevenue = Number(posRevenueAgg._sum.totalAmount || 0)

  const revenueGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : thisMonthRevenue > 0 ? 100 : 0

  const totalActive = activePurchases + overduePurchases
  const defaultRate = totalActive > 0 ? (overduePurchases / totalActive) * 100 : 0
  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0

  return {
    totalBusinesses: businessCount,
    activeBusinesses,
    suspendedBusinesses: businessCount - activeBusinesses,
    totalShops: shopCount,
    totalUsers: userCount,
    totalCustomers: customerCount,
    newUsersThisMonth,
    newCustomersThisMonth,
    activeUsers,
    totalPurchases,
    purchasesByType: { cash: cashPurchases, layaway: layawayPurchases, credit: creditPurchases },
    purchasesByStatus: { pending: pendingPurchases, active: activePurchases, completed: completedPurchases, overdue: overduePurchases, defaulted: defaultedPurchases },
    pendingPayments,
    totalRevenue,
    totalCollected,
    totalOutstanding,
    thisMonthRevenue,
    lastMonthRevenue,
    revenueGrowth,
    defaultRate,
    collectionRate,
    posTransactions: posTransactionCount,
    posRevenue,
  }
}

/**
 * Get monthly revenue data for last 12 months (for chart)
 */
export async function getRevenueChartData() {
  await requireSuperAdmin()

  const months: { month: string; revenue: number; payments: number; purchases: number }[] = []
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

    const [revenueAgg, paymentsAgg, purchaseCount] = await Promise.all([
      prisma.purchase.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: start, lte: end } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", createdAt: { gte: start, lte: end } } }),
      prisma.purchase.count({ where: { createdAt: { gte: start, lte: end } } }),
    ])

    months.push({
      month: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      revenue: Number(revenueAgg._sum.totalAmount || 0),
      payments: Number(paymentsAgg._sum.amount || 0),
      purchases: purchaseCount,
    })
  }

  return months
}

/**
 * Get top businesses ranked by revenue
 */
export async function getTopBusinesses() {
  await requireSuperAdmin()

  const businesses = await prisma.business.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { shops: true } },
      shops: {
        include: {
          customers: { select: { id: true } },
          _count: { select: { customers: true } },
        },
      },
    },
  })

  const businessStats = await Promise.all(
    businesses.map(async (biz) => {
      const shopIds = biz.shops.map((s) => s.id)
      const customerIds = biz.shops.flatMap((s) => s.customers.map((c) => c.id))

      const [revenueAgg, collectedAgg, activePurchases, overduePurchases] = await Promise.all([
        customerIds.length > 0
          ? prisma.purchase.aggregate({ _sum: { totalAmount: true }, where: { customerId: { in: customerIds } } })
          : { _sum: { totalAmount: null } },
        customerIds.length > 0
          ? prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", purchase: { customerId: { in: customerIds } } } })
          : { _sum: { amount: null } },
        customerIds.length > 0
          ? prisma.purchase.count({ where: { customerId: { in: customerIds }, status: "ACTIVE" } })
          : 0,
        customerIds.length > 0
          ? prisma.purchase.count({ where: { customerId: { in: customerIds }, status: "OVERDUE" } })
          : 0,
      ])

      const revenue = Number(revenueAgg._sum.totalAmount || 0)
      const collected = Number(collectedAgg._sum.amount || 0)
      const totalCustomers = biz.shops.reduce((sum, s) => sum + s._count.customers, 0)
      const collectionRate = revenue > 0 ? (collected / revenue) * 100 : 0

      return {
        id: biz.id,
        name: biz.name,
        slug: biz.businessSlug,
        shopCount: biz._count.shops,
        totalCustomers,
        revenue,
        collected,
        activePurchases,
        overduePurchases,
        collectionRate,
      }
    })
  )

  return businessStats.sort((a, b) => b.revenue - a.revenue).slice(0, 10)
}

/**
 * Get platform health metrics
 */
export async function getPlatformHealth() {
  await requireSuperAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    newBusinessesThisMonth,
    emailsSent,
    emailsFailed,
    smsSent,
    smsFailed,
    posTotal,
    customersByRegion,
  ] = await Promise.all([
    prisma.business.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.emailLog.count({ where: { status: "SENT" } }),
    prisma.emailLog.count({ where: { status: "FAILED" } }),
    prisma.smsLog.count({ where: { status: { in: ["SENT", "DELIVERED"] } } }),
    prisma.smsLog.count({ where: { status: "FAILED" } }),
    prisma.posTransaction.count({ where: { status: "COMPLETED" } }),
    prisma.customer.groupBy({ by: ["region"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
  ])

  const regionData = customersByRegion
    .filter((r) => r.region)
    .map((r) => ({ region: r.region || "Unknown", count: r._count.id }))
    .slice(0, 10)

  return {
    newBusinessesThisMonth,
    emailStats: { sent: emailsSent, failed: emailsFailed, total: emailsSent + emailsFailed },
    smsStats: { sent: smsSent, failed: smsFailed, total: smsSent + smsFailed },
    posTransactions: posTotal,
    customersByRegion: regionData,
  }
}

/**
 * Get platform alerts (businesses/accounts needing attention)
 */
export async function getPlatformAlerts() {
  await requireSuperAdmin()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Businesses with overdue purchases
  const businessesWithOverdue = await prisma.business.findMany({
    where: {
      isActive: true,
      shops: {
        some: {
          customers: {
            some: {
              purchases: {
                some: { status: "OVERDUE" },
              },
            },
          },
        },
      },
    },
    include: {
      shops: {
        include: {
          customers: {
            include: {
              purchases: {
                where: { status: "OVERDUE" },
                select: { id: true, outstandingBalance: true },
              },
            },
          },
        },
      },
    },
  })

  const overdueAlerts = businessesWithOverdue.map((biz) => {
    const overduePurchases = biz.shops.flatMap((s) =>
      s.customers.flatMap((c) => c.purchases)
    )
    const overdueAmount = overduePurchases.reduce(
      (sum, p) => sum + Number(p.outstandingBalance),
      0
    )
    return {
      id: biz.id,
      name: biz.name,
      slug: biz.businessSlug,
      overdueCount: overduePurchases.length,
      overdueAmount,
    }
  }).filter((a) => a.overdueCount > 0).sort((a, b) => b.overdueAmount - a.overdueAmount).slice(0, 5)

  // Inactive businesses (no new purchases in 30 days)
  const allActiveBusinesses = await prisma.business.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      businessSlug: true,
      shops: {
        select: {
          customers: {
            select: {
              purchases: {
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  const inactiveBusinesses = allActiveBusinesses
    .filter((biz) => {
      const hasRecentPurchase = biz.shops.some((s) =>
        s.customers.some((c) => c.purchases.length > 0)
      )
      return !hasRecentPurchase
    })
    .map((biz) => ({ id: biz.id, name: biz.name, slug: biz.businessSlug }))

  // Inactive staff (not logged in for 30+ days)
  const inactiveStaff = await prisma.user.findMany({
    where: {
      role: { in: ["BUSINESS_ADMIN", "SHOP_ADMIN", "SALES_STAFF", "DEBT_COLLECTOR"] },
      OR: [
        { lastSeenAt: { lt: thirtyDaysAgo } },
        { lastSeenAt: null },
      ],
    },
    select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
    orderBy: { lastSeenAt: { sort: "asc", nulls: "first" } },
    take: 10,
  })

  return { overdueAlerts, inactiveBusinesses, inactiveStaff }
}

/**
 * Get all audit logs with pagination and filtering
 */
export async function getAuditLogs(params: {
  page?: number
  pageSize?: number
  action?: string
  search?: string
}) {
  await requireSuperAdmin()

  const page = params.page || 1
  const pageSize = params.pageSize || 25
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (params.action) where.action = params.action
  if (params.search) {
    where.OR = [
      { actor: { name: { contains: params.search, mode: "insensitive" } } },
      { actor: { email: { contains: params.search, mode: "insensitive" } } },
      { action: { contains: params.search, mode: "insensitive" } },
      { entityType: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  // Get distinct action types for filter dropdown
  const actionTypes = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  })

  return {
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      metadata: l.metadata as Record<string, unknown> | null,
      createdAt: l.createdAt,
      actor: l.actor,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    actionTypes: actionTypes.map((a) => a.action),
  }
}

/**
 * Get all platform users with pagination and filtering
 */
export async function getPlatformUsers(params: {
  page?: number
  pageSize?: number
  role?: string
  search?: string
}) {
  await requireSuperAdmin()

  const page = params.page || 1
  const pageSize = params.pageSize || 25
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {
    role: { not: "SUPER_ADMIN" },
  }
  if (params.role) where.role = params.role
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        businessMemberships: {
          where: { isActive: true },
          include: { business: { select: { name: true, businessSlug: true } } },
        },
        memberships: {
          where: { isActive: true },
          include: { shop: { select: { name: true, shopSlug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      lastSeenAt: u.lastSeenAt,
      createdAt: u.createdAt,
      businesses: u.businessMemberships.map((m) => ({
        name: m.business.name,
        slug: m.business.businessSlug,
      })),
      shops: u.memberships.map((m) => ({
        name: m.shop.name,
        slug: m.shop.shopSlug,
        role: m.role,
      })),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
