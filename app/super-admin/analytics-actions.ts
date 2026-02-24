"use server"

import { requireSuperAdmin } from "@/lib/auth"
import prisma from "@/lib/prisma"

// ============================================================================
// PLATFORM ANALYTICS
// ============================================================================

export async function getPlatformAnalytics() {
  await requireSuperAdmin()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersThisWeek,
    activeUsersToday,
    totalBusinesses,
    activeBusinesses,
    totalShops,
    totalPurchases,
    totalPayments,
    usersByRole,
    registrationsByMonth,
    purchasesByMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: oneDayAgo } } }),
    prisma.business.count(),
    prisma.business.count({ where: { isActive: true } }),
    prisma.shop.count(),
    prisma.purchase.count(),
    prisma.payment.count(),
    prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
    // Registrations per month (last 12 months)
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM') as month, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1)}
      GROUP BY to_char("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `,
    // Purchases per month (last 12 months)
    prisma.$queryRaw<{ month: string; count: bigint; total: number }[]>`
      SELECT to_char("createdAt", 'YYYY-MM') as month, COUNT(*) as count, COALESCE(SUM("totalPrice"::numeric), 0) as total
      FROM "Purchase"
      WHERE "createdAt" >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1)}
      GROUP BY to_char("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `,
  ])

  return {
    overview: {
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      activeUsersToday,
      totalBusinesses,
      activeBusinesses,
      totalShops,
      totalPurchases,
      totalPayments,
    },
    usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
    registrationsByMonth: registrationsByMonth.map(r => ({
      month: r.month,
      count: Number(r.count),
    })),
    purchasesByMonth: purchasesByMonth.map(r => ({
      month: r.month,
      count: Number(r.count),
      total: Number(r.total),
    })),
  }
}

// ============================================================================
// BUSINESS HEALTH MONITOR
// ============================================================================

export async function getBusinessHealthData() {
  await requireSuperAdmin()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const businesses = await prisma.business.findMany({
    include: {
      _count: {
        select: {
          shops: true,
          members: true,
        },
      },
      shops: {
        select: { id: true, name: true, isActive: true },
      },
      subscription: {
        include: { plan: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get recent activity per business
  const businessHealth = await Promise.all(
    businesses.map(async (biz) => {
      const shopIds = biz.shops.map(s => s.id)
      const recentPurchases = shopIds.length > 0 ? await prisma.purchase.count({
        where: {
          customer: { shopId: { in: shopIds } },
          createdAt: { gte: thirtyDaysAgo },
        },
      }) : 0
      const recentPayments = shopIds.length > 0 ? await prisma.payment.count({
        where: {
          purchase: { customer: { shopId: { in: shopIds } } },
          createdAt: { gte: thirtyDaysAgo },
        },
      }) : 0
      const weeklyPurchases = shopIds.length > 0 ? await prisma.purchase.count({
        where: {
          customer: { shopId: { in: shopIds } },
          createdAt: { gte: sevenDaysAgo },
        },
      }) : 0

      const totalPurchases = shopIds.length > 0 ? await prisma.purchase.count({
        where: { customer: { shopId: { in: shopIds } } },
      }) : 0
      const totalPayments = shopIds.length > 0 ? await prisma.payment.count({
        where: { purchase: { customer: { shopId: { in: shopIds } } } },
      }) : 0

      // Health scoring
      let healthScore = 100
      if (recentPurchases === 0) healthScore -= 30 // No activity in 30 days
      if (weeklyPurchases === 0) healthScore -= 20 // No activity in 7 days
      if (!biz.isActive) healthScore -= 50
      if (!biz.subscription || biz.subscription.status !== "ACTIVE") healthScore -= 20

      const status = healthScore >= 80 ? "HEALTHY" : healthScore >= 50 ? "WARNING" : "CRITICAL"

      return {
        id: biz.id,
        name: biz.name,
        slug: biz.businessSlug,
        isActive: biz.isActive,
        createdAt: biz.createdAt,
        shopCount: biz._count.shops,
        memberCount: biz._count.members,
        totalPurchases,
        totalPayments,
        recentPurchases,
        recentPayments,
        weeklyPurchases,
        subscriptionStatus: biz.subscription?.status || "NONE",
        planName: biz.subscription?.plan?.name || "No Plan",
        healthScore,
        status,
      }
    })
  )

  const summary = {
    healthy: businessHealth.filter(b => b.status === "HEALTHY").length,
    warning: businessHealth.filter(b => b.status === "WARNING").length,
    critical: businessHealth.filter(b => b.status === "CRITICAL").length,
    inactive: businessHealth.filter(b => !b.isActive).length,
  }

  return { businesses: businessHealth, summary }
}

// ============================================================================
// REVENUE DASHBOARD
// ============================================================================

export async function getRevenueDashboard() {
  await requireSuperAdmin()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Subscription revenue
  const [
    totalSubRevenue,
    thisMonthSubRevenue,
    lastMonthSubRevenue,
    activeSubscriptions,
    recentPayments,
    paymentsByStatus,
    revenueByPlan,
    monthlyRevenue,
  ] = await Promise.all([
    prisma.subscriptionPayment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED", paidAt: { gte: thisMonthStart } },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED", paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscriptionPayment.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { subscription: { include: { plan: true, business: true } } },
    }),
    prisma.subscriptionPayment.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ planName: string; total: number; count: bigint }[]>`
      SELECT sp."name" as "planName", COALESCE(SUM(spay."amount"::numeric), 0) as total, COUNT(spay.id) as count
      FROM "SubscriptionPayment" spay
      JOIN "Subscription" s ON spay."subscriptionId" = s.id
      JOIN "SubscriptionPlan" sp ON s."planId" = sp.id
      WHERE spay."status" = 'COMPLETED'
      GROUP BY sp."name"
      ORDER BY total DESC
    `,
    prisma.$queryRaw<{ month: string; revenue: number }[]>`
      SELECT to_char("paidAt", 'YYYY-MM') as month, COALESCE(SUM("amount"::numeric), 0) as revenue
      FROM "SubscriptionPayment"
      WHERE "status" = 'COMPLETED' AND "paidAt" IS NOT NULL
        AND "paidAt" >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1)}
      GROUP BY to_char("paidAt", 'YYYY-MM')
      ORDER BY month ASC
    `,
  ])

  const totalRev = Number(totalSubRevenue._sum.amount || 0)
  const thisMonthRev = Number(thisMonthSubRevenue._sum.amount || 0)
  const lastMonthRev = Number(lastMonthSubRevenue._sum.amount || 0)
  const mrrGrowth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0

  return {
    overview: {
      totalRevenue: totalRev,
      mrr: thisMonthRev,
      arr: thisMonthRev * 12,
      mrrGrowth: Math.round(mrrGrowth * 100) / 100,
      activeSubscriptions,
    },
    recentPayments: recentPayments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      method: p.paymentMethod,
      businessName: p.subscription?.business?.name || "Unknown",
      planName: p.subscription?.plan?.name || "Unknown",
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    paymentsByStatus: paymentsByStatus.map(p => ({
      status: p.status,
      count: p._count.id,
      total: Number(p._sum.amount || 0),
    })),
    revenueByPlan: revenueByPlan.map(r => ({
      planName: r.planName,
      total: Number(r.total),
      count: Number(r.count),
    })),
    monthlyRevenue: monthlyRevenue.map(r => ({
      month: r.month,
      revenue: Number(r.revenue),
    })),
  }
}

// ============================================================================
// DASHBOARD QUICK STATS (Pending items)
// ============================================================================

export async function getDashboardQuickStats() {
  await requireSuperAdmin()

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    unreadMessages,
    pendingRegistrations,
    openTickets,
    expiringSubs,
    failedPayments,
    todayLogins,
  ] = await Promise.all([
    prisma.contactMessage.count({ where: { status: "UNREAD" } }),
    prisma.businessRegistration.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: { lte: sevenDaysFromNow, gte: now },
      },
    }),
    prisma.subscriptionPayment.count({
      where: { status: "FAILED", createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.loginActivity.count({
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
    }),
  ])

  return {
    unreadMessages,
    pendingRegistrations,
    openTickets,
    expiringSubs,
    failedPayments,
    todayLogins,
  }
}
