import { requireShopAdminForShop } from "@/lib/auth"
import prisma from "@/lib/prisma"
import ShopDashboardContent from "./shop-dashboard-content"

async function getShopStats(shopId: string) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalCustomers,
    activeCustomers,
    totalProducts,
    lowStockProducts,
    totalPurchases,
    activePurchases,
    overduePurchases,
    completedPurchases,
    allPayments,
    recentPurchases,
    recentCustomers,
  ] = await Promise.all([
    prisma.customer.count({ where: { shopId } }),
    prisma.customer.count({ where: { shopId, isActive: true } }),
    prisma.shopProduct.count({ where: { shopId } }),
    prisma.shopProduct.count({ where: { shopId, stockQuantity: { lt: 5 } } }),
    prisma.purchase.count({ where: { customer: { shopId } } }),
    prisma.purchase.count({ where: { customer: { shopId }, status: "ACTIVE" } }),
    prisma.purchase.count({ where: { customer: { shopId }, status: "OVERDUE" } }),
    prisma.purchase.count({ where: { customer: { shopId }, status: "COMPLETED" } }),
    prisma.payment.findMany({
      where: { purchase: { customer: { shopId } } },
      select: { amount: true, status: true, isConfirmed: true, createdAt: true, paymentMethod: true },
    }),
    prisma.purchase.findMany({
      where: { customer: { shopId } },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.customer.count({
      where: {
        shopId,
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  // Payment totals
  const confirmedPayments = allPayments.filter(p => p.status === "COMPLETED" && p.isConfirmed)
  const pendingPayments = allPayments.filter(p => p.status === "PENDING" || (p.status === "COMPLETED" && !p.isConfirmed))

  const totalCollected = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const pendingPaymentsAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Time-based revenue
  const todayRevenue = confirmedPayments
    .filter(p => new Date(p.createdAt) >= startOfToday)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const weekRevenue = confirmedPayments
    .filter(p => new Date(p.createdAt) >= startOfWeek)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const monthRevenue = confirmedPayments
    .filter(p => new Date(p.createdAt) >= startOfMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  // Payment method distribution
  const paymentMethodDistribution = {
    cash: confirmedPayments.filter(p => p.paymentMethod === "CASH").length,
    mobileMoney: confirmedPayments.filter(p => p.paymentMethod === "MOBILE_MONEY").length,
    bank: confirmedPayments.filter(p => p.paymentMethod === "BANK_TRANSFER").length,
    wallet: confirmedPayments.filter(p => p.paymentMethod === "WALLET").length,
  }

  // Revenue trend (last 7 days)
  const revenueTrend: { day: string; revenue: number; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
    const dayLabel = dayStart.toLocaleDateString('en', { weekday: 'short' })
    const dayPayments = confirmedPayments.filter(p => {
      const d = new Date(p.createdAt)
      return d >= dayStart && d < dayEnd
    })
    revenueTrend.push({
      day: dayLabel,
      revenue: dayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      count: dayPayments.length,
    })
  }

  // Customer growth (last 5 weeks)
  const customerGrowth: { week: string; count: number }[] = []
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const count = await prisma.customer.count({
      where: {
        shopId,
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    })
    customerGrowth.push({ week: `W${5 - i}`, count })
  }

  return {
    totalCustomers,
    activeCustomers,
    totalProducts,
    lowStockProducts,
    totalPurchases,
    activePurchases,
    overduePurchases,
    completedPurchases,
    totalCollected,
    pendingPaymentsAmount,
    pendingPaymentsCount: pendingPayments.length,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    recentCustomers,
    paymentMethodDistribution,
    revenueTrend,
    customerGrowth,
    recentPurchases: recentPurchases.map(p => ({
      id: p.id,
      totalAmount: Number(p.totalAmount),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      customerName: `${p.customer.firstName} ${p.customer.lastName}`,
      customerInitial: p.customer.firstName.charAt(0).toUpperCase(),
      itemCount: p.items.length,
    })),
  }
}

async function getShopWalletStats(shopId: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [customers, pendingCount, todayDeposits] = await Promise.all([
    prisma.customer.findMany({
      where: { shopId },
      select: { walletBalance: true },
    }),
    prisma.walletTransaction.count({
      where: { shopId, status: "PENDING" },
    }),
    prisma.walletTransaction.findMany({
      where: {
        shopId,
        status: "CONFIRMED",
        type: "DEPOSIT",
        confirmedAt: { gte: today },
      },
    }),
  ])

  const totalBalance = customers.reduce((sum, c) => sum + Number(c.walletBalance), 0)
  const customersWithBalance = customers.filter(c => Number(c.walletBalance) > 0).length
  const todayTotal = todayDeposits.reduce((sum, t) => sum + Number(t.amount), 0)

  // 7-day wallet trend
  const walletTrend: { day: string; deposits: number; spent: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
    const dayLabel = dayStart.toLocaleDateString('en', { weekday: 'short' })

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        shopId,
        status: "CONFIRMED",
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      select: { type: true, amount: true },
    })

    const deposits = transactions
      .filter(t => t.type === "DEPOSIT" || t.type === "REFUND")
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const spent = transactions
      .filter(t => t.type === "PURCHASE")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    walletTrend.push({ day: dayLabel, deposits, spent })
  }

  return {
    totalBalance,
    customersWithBalance,
    pendingDeposits: pendingCount,
    todayDeposits: todayTotal,
    walletTrend,
  }
}

export default async function ShopAdminDashboard({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)

  const [stats, walletStats] = await Promise.all([
    getShopStats(shop.id),
    getShopWalletStats(shop.id),
  ])

  return (
    <ShopDashboardContent
      shopSlug={shopSlug}
      shopName={shop.name}
      shopCountry={shop.country}
      userName={user.name?.split(' ')[0] || 'Admin'}
      currency="GHS"
      stats={stats}
      walletStats={walletStats}
    />
  )
}
