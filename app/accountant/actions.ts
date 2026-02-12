"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireAccountant, getAccountantBusinessMemberships, createAuditLog } from "../../lib/auth"
import { Prisma } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// Types for accountant data
export interface AccountantDashboardStats {
  // Overview counts
  totalCustomers: number
  activeCustomers: number
  totalPurchases: number
  activePurchases: number
  overduePurchases: number

  // Financial summary
  totalRevenue: number
  totalCollected: number
  totalOutstanding: number
  totalOverdueAmount: number

  // Today's metrics
  todayCollections: number
  todayPaymentCount: number

  // This week's metrics
  weekCollections: number
  weekPaymentCount: number

  // This month's metrics
  monthCollections: number
  monthPaymentCount: number

  // Collections breakdown by method
  cashCollections: number
  mobileMoneyCollections: number
  bankTransferCollections: number
  walletCollections: number

  // Purchase type distribution
  cashSalesCount: number
  creditSalesCount: number
  layawaySalesCount: number

  // Shop breakdown
  shopCount: number
  shops: {
    id: string
    name: string
    customerCount: number
    totalCollected: number
    totalOutstanding: number
  }[]

  // Monthly revenue data for chart
  monthlyData: {
    month: string
    revenue: number
    collections: number
    paymentCount: number
  }[]
}

export interface PaymentForAccountant {
  id: string
  amount: number
  paymentMethod: string
  status: string
  reference: string | null
  notes: string | null
  paidAt: Date | null
  createdAt: Date
  purchaseId: string
  purchaseNumber: string
  customerName: string
  customerPhone: string
  customerId: string
  shopName: string
  shopSlug: string
  collectorName: string | null
  isConfirmed: boolean
  confirmedAt: Date | null
  rejectedAt: Date | null
  rejectionReason: string | null
}

export interface CustomerForAccountant {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  shopName: string
  totalPurchases: number
  totalPaid: number
  totalOutstanding: number
  overdueAmount: number
  status: string
  createdAt: Date
}

export interface AgingReportItem {
  customerId: string
  customerName: string
  customerPhone: string
  shopName: string
  totalOutstanding: number
  current: number // 0-30 days
  days31to60: number
  days61to90: number
  over90Days: number
  oldestDueDate: Date | null
}

export interface RevenueReportItem {
  date: string
  revenue: number
  collections: number
  cashSales: number
  creditSales: number
  layawaySales: number
  paymentCount: number
}

/**
 * Get accountant dashboard statistics
 */
export async function getAccountantDashboardStats(
  businessSlug: string
): Promise<AccountantDashboardStats> {
  const { business, membership } = await requireAccountant(businessSlug)

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    shops,
    customers,
    purchases,
    payments,
  ] = await Promise.all([
    // Get all shops with customer counts
    prisma.shop.findMany({
      where: { businessId: business.id, isActive: true },
      include: {
        _count: { select: { customers: true } },
      },
    }),
    // Get all customers
    prisma.customer.findMany({
      where: { shop: { businessId: business.id } },
      select: { id: true, isActive: true },
    }),
    // Get all purchases
    prisma.purchase.findMany({
      where: { customer: { shop: { businessId: business.id } } },
      select: {
        id: true,
        totalAmount: true,
        purchaseType: true,
        status: true,
        createdAt: true,
        dueDate: true,
        customerId: true,
        customer: {
          select: {
            shopId: true,
          },
        },
      },
    }),
    // Get all confirmed payments
    prisma.payment.findMany({
      where: {
        purchase: { customer: { shop: { businessId: business.id } } },
        isConfirmed: true,
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        purchase: {
          select: {
            customer: {
              select: { shopId: true },
            },
          },
        },
      },
    }),
  ])

  // Calculate overall metrics
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.isActive).length
  const totalPurchases = purchases.length
  const activePurchases = purchases.filter(p => p.status === "ACTIVE").length
  const overduePurchases = purchases.filter(
    p => p.status === "ACTIVE" && p.dueDate && new Date(p.dueDate) < now
  ).length

  // Financial summary
  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalOutstanding = totalRevenue - totalCollected

  // Calculate overdue amount
  const overdueAmount = purchases
    .filter(p => p.status === "ACTIVE" && p.dueDate && new Date(p.dueDate) < now)
    .reduce((sum, p) => {
      const paidForPurchase = payments
        .filter(pay => pay.purchase.customer.shopId === p.customer.shopId)
        .reduce((s, pay) => s + Number(pay.amount), 0)
      return sum + Math.max(0, Number(p.totalAmount) - paidForPurchase)
    }, 0)

  // Time-based collections
  const todayPayments = payments.filter(p => new Date(p.createdAt) >= startOfToday)
  const weekPayments = payments.filter(p => new Date(p.createdAt) >= startOfWeek)
  const monthPayments = payments.filter(p => new Date(p.createdAt) >= startOfMonth)

  // Payment method breakdown
  const cashCollections = payments
    .filter(p => p.paymentMethod === "CASH")
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const mobileMoneyCollections = payments
    .filter(p => p.paymentMethod === "MOBILE_MONEY")
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const bankTransferCollections = payments
    .filter(p => p.paymentMethod === "BANK_TRANSFER")
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const walletCollections = payments
    .filter(p => p.paymentMethod === "WALLET")
    .reduce((sum, p) => sum + Number(p.amount), 0)

  // Purchase type distribution
  const cashSalesCount = purchases.filter(p => p.purchaseType === "CASH").length
  const creditSalesCount = purchases.filter(p => p.purchaseType === "CREDIT").length
  const layawaySalesCount = purchases.filter(p => p.purchaseType === "LAYAWAY").length

  // Shop breakdown
  const shopStats = shops.map(shop => {
    const shopPurchases = purchases.filter(p => p.customer.shopId === shop.id)
    const shopPayments = payments.filter(p => p.purchase.customer.shopId === shop.id)
    const collected = shopPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const revenue = shopPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)

    return {
      id: shop.id,
      name: shop.name,
      customerCount: shop._count.customers,
      totalCollected: collected,
      totalOutstanding: revenue - collected,
    }
  })

  // Monthly data for chart (last 6 months)
  const monthlyData: AccountantDashboardStats["monthlyData"] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthName = monthStart.toLocaleString("default", { month: "short" })

    const monthPurchases = purchases.filter(p => {
      const date = new Date(p.createdAt)
      return date >= monthStart && date <= monthEnd
    })
    const monthPaymentsData = payments.filter(p => {
      const date = new Date(p.createdAt)
      return date >= monthStart && date <= monthEnd
    })

    monthlyData.push({
      month: monthName,
      revenue: monthPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0),
      collections: monthPaymentsData.reduce((sum, p) => sum + Number(p.amount), 0),
      paymentCount: monthPaymentsData.length,
    })
  }

  return {
    totalCustomers,
    activeCustomers,
    totalPurchases,
    activePurchases,
    overduePurchases,
    totalRevenue,
    totalCollected,
    totalOutstanding,
    totalOverdueAmount: overdueAmount,
    todayCollections: todayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    todayPaymentCount: todayPayments.length,
    weekCollections: weekPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    weekPaymentCount: weekPayments.length,
    monthCollections: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    monthPaymentCount: monthPayments.length,
    cashCollections,
    mobileMoneyCollections,
    bankTransferCollections,
    walletCollections,
    cashSalesCount,
    creditSalesCount,
    layawaySalesCount,
    shopCount: shops.length,
    shops: shopStats,
    monthlyData,
  }
}

/**
 * Get all payments for the business with filtering
 */
export async function getAccountantPayments(
  businessSlug: string,
  filters?: {
    status?: "pending" | "confirmed" | "rejected" | "all"
    shopId?: string
    startDate?: Date
    endDate?: Date
    paymentMethod?: string
    search?: string
  }
): Promise<PaymentForAccountant[]> {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Prisma.PaymentWhereInput = {
    purchase: {
      customer: {
        shop: { businessId: business.id },
      },
    },
  }

  // Apply status filter
  if (filters?.status === "pending") {
    whereClause.isConfirmed = false
    whereClause.rejectedAt = null
  } else if (filters?.status === "confirmed") {
    whereClause.isConfirmed = true
  } else if (filters?.status === "rejected") {
    whereClause.rejectedAt = { not: null }
  }

  // Apply shop filter
  if (filters?.shopId) {
    whereClause.purchase = {
      ...whereClause.purchase as Prisma.PurchaseWhereInput,
      customer: {
        shopId: filters.shopId,
      },
    }
  }

  // Apply date filter
  if (filters?.startDate || filters?.endDate) {
    whereClause.createdAt = {}
    if (filters.startDate) {
      whereClause.createdAt.gte = filters.startDate
    }
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate)
      endOfDay.setHours(23, 59, 59, 999)
      whereClause.createdAt.lte = endOfDay
    }
  }

  // Apply payment method filter
  if (filters?.paymentMethod && filters.paymentMethod !== "all") {
    whereClause.paymentMethod = filters.paymentMethod as Prisma.EnumPaymentMethodFilter
  }

  const payments = await prisma.payment.findMany({
    where: whereClause,
    include: {
      purchase: {
        include: {
          customer: {
            include: {
              shop: {
                select: { name: true, shopSlug: true },
              },
            },
          },
        },
      },
      collector: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  })

  let result = payments.map(p => ({
    id: p.id,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    status: p.status,
    reference: p.reference,
    notes: p.notes,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    purchaseId: p.purchaseId,
    purchaseNumber: p.purchase.purchaseNumber,
    customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
    customerPhone: p.purchase.customer.phone,
    customerId: p.purchase.customerId,
    shopName: p.purchase.customer.shop.name,
    shopSlug: p.purchase.customer.shop.shopSlug,
    collectorName: p.collector?.user?.name || null,
    isConfirmed: p.isConfirmed,
    confirmedAt: p.confirmedAt,
    rejectedAt: p.rejectedAt,
    rejectionReason: p.rejectionReason,
  }))

  // Apply search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(
      p =>
        p.customerName.toLowerCase().includes(searchLower) ||
        p.customerPhone.includes(searchLower) ||
        p.purchaseNumber.toLowerCase().includes(searchLower) ||
        p.shopName.toLowerCase().includes(searchLower) ||
        (p.reference && p.reference.toLowerCase().includes(searchLower))
    )
  }

  return result
}

/**
 * Confirm a payment (if accountant has permission)
 */
export async function accountantConfirmPayment(
  businessSlug: string,
  paymentId: string
): Promise<ActionResult> {
  const { business, membership, user } = await requireAccountant(businessSlug)

  // Check permission
  if (!membership.canConfirmPayments) {
    return {
      success: false,
      error: "You do not have permission to confirm payments",
    }
  }

  // Find the payment
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      purchase: {
        customer: {
          shop: { businessId: business.id },
        },
      },
    },
    include: {
      purchase: {
        include: {
          customer: true,
        },
      },
    },
  })

  if (!payment) {
    return { success: false, error: "Payment not found" }
  }

  if (payment.isConfirmed) {
    return { success: false, error: "Payment is already confirmed" }
  }

  if (payment.rejectedAt) {
    return { success: false, error: "Cannot confirm a rejected payment" }
  }

  // Confirm the payment
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      isConfirmed: true,
      confirmedAt: new Date(),
    },
  })

  // Create audit log
  await createAuditLog({
    action: "PAYMENT_CONFIRMED",
    actorUserId: user.id,
    entityType: "Payment",
    entityId: paymentId,
    metadata: {
      businessId: business.id,
      amount: Number(payment.amount),
      customerName: `${payment.purchase.customer.firstName} ${payment.purchase.customer.lastName}`,
    },
  })

  revalidatePath(`/accountant/${businessSlug}`)
  return { success: true }
}

/**
 * Get aging report (outstanding balances by age)
 */
export async function getAgingReport(
  businessSlug: string,
  shopId?: string
): Promise<AgingReportItem[]> {
  const { business } = await requireAccountant(businessSlug)
  const now = new Date()

  // Get all active purchases with balances
  const purchases = await prisma.purchase.findMany({
    where: {
      status: "ACTIVE",
      customer: {
        shop: {
          businessId: business.id,
          ...(shopId && { id: shopId }),
        },
      },
    },
    include: {
      customer: {
        include: {
          shop: { select: { name: true } },
        },
      },
      payments: {
        where: { isConfirmed: true },
        select: { amount: true },
      },
    },
  })

  // Group by customer
  const customerMap = new Map<string, {
    customer: typeof purchases[0]["customer"]
    purchases: typeof purchases
  }>()

  for (const purchase of purchases) {
    const existing = customerMap.get(purchase.customerId)
    if (existing) {
      existing.purchases.push(purchase)
    } else {
      customerMap.set(purchase.customerId, {
        customer: purchase.customer,
        purchases: [purchase],
      })
    }
  }

  const result: AgingReportItem[] = []

  for (const [customerId, data] of customerMap) {
    let current = 0
    let days31to60 = 0
    let days61to90 = 0
    let over90Days = 0
    let oldestDueDate: Date | null = null

    for (const purchase of data.purchases) {
      const paid = purchase.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const outstanding = Number(purchase.totalAmount) - paid

      if (outstanding <= 0) continue

      const dueDate = purchase.dueDate
      if (!dueDate) {
        current += outstanding
        continue
      }

      if (!oldestDueDate || dueDate < oldestDueDate) {
        oldestDueDate = dueDate
      }

      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysOverdue <= 0) {
        current += outstanding
      } else if (daysOverdue <= 30) {
        current += outstanding
      } else if (daysOverdue <= 60) {
        days31to60 += outstanding
      } else if (daysOverdue <= 90) {
        days61to90 += outstanding
      } else {
        over90Days += outstanding
      }
    }

    const totalOutstanding = current + days31to60 + days61to90 + over90Days

    if (totalOutstanding > 0) {
      result.push({
        customerId,
        customerName: `${data.customer.firstName} ${data.customer.lastName}`,
        customerPhone: data.customer.phone,
        shopName: data.customer.shop.name,
        totalOutstanding,
        current,
        days31to60,
        days61to90,
        over90Days,
        oldestDueDate,
      })
    }
  }

  // Sort by total outstanding descending
  result.sort((a, b) => b.totalOutstanding - a.totalOutstanding)

  return result
}

/**
 * Get revenue report by date range
 */
export async function getRevenueReport(
  businessSlug: string,
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" = "day",
  shopId?: string
): Promise<RevenueReportItem[]> {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Prisma.PurchaseWhereInput = {
    customer: {
      shop: {
        businessId: business.id,
        ...(shopId && { id: shopId }),
      },
    },
    createdAt: {
      gte: startDate,
      lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1),
    },
  }

  const [purchases, payments] = await Promise.all([
    prisma.purchase.findMany({
      where: whereClause,
      select: {
        totalAmount: true,
        purchaseType: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        purchase: whereClause,
        isConfirmed: true,
        createdAt: {
          gte: startDate,
          lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1),
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    }),
  ])

  // Group data
  const dataMap = new Map<string, RevenueReportItem>()

  const getGroupKey = (date: Date): string => {
    if (groupBy === "day") {
      return date.toISOString().split("T")[0]
    } else if (groupBy === "week") {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      return weekStart.toISOString().split("T")[0]
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    }
  }

  // Process purchases
  for (const purchase of purchases) {
    const key = getGroupKey(purchase.createdAt)
    const existing = dataMap.get(key) || {
      date: key,
      revenue: 0,
      collections: 0,
      cashSales: 0,
      creditSales: 0,
      layawaySales: 0,
      paymentCount: 0,
    }

    existing.revenue += Number(purchase.totalAmount)
    if (purchase.purchaseType === "CASH") existing.cashSales++
    else if (purchase.purchaseType === "CREDIT") existing.creditSales++
    else if (purchase.purchaseType === "LAYAWAY") existing.layawaySales++

    dataMap.set(key, existing)
  }

  // Process payments
  for (const payment of payments) {
    const key = getGroupKey(payment.createdAt)
    const existing = dataMap.get(key) || {
      date: key,
      revenue: 0,
      collections: 0,
      cashSales: 0,
      creditSales: 0,
      layawaySales: 0,
      paymentCount: 0,
    }

    existing.collections += Number(payment.amount)
    existing.paymentCount++

    dataMap.set(key, existing)
  }

  // Sort by date
  return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get collection performance report (by collector)
 */
export async function getCollectionPerformanceReport(
  businessSlug: string,
  startDate?: Date,
  endDate?: Date
) {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Prisma.PaymentWhereInput = {
    purchase: {
      customer: {
        shop: { businessId: business.id },
      },
    },
    isConfirmed: true,
    collectorId: { not: null },
  }

  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = startDate
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereClause.createdAt.lte = end
    }
  }

  const payments = await prisma.payment.findMany({
    where: whereClause,
    include: {
      collector: {
        include: {
          user: { select: { name: true, email: true } },
          shop: { select: { name: true } },
        },
      },
    },
  })

  // Group by collector
  const collectorMap = new Map<
    string,
    {
      name: string
      email: string | null
      shopName: string
      totalCollected: number
      paymentCount: number
      cashCollected: number
      mobileMoneyCollected: number
      bankTransferCollected: number
    }
  >()

  for (const payment of payments) {
    if (!payment.collector) continue

    const key = payment.collectorId!
    const existing = collectorMap.get(key) || {
      name: payment.collector.user.name || "Unknown",
      email: payment.collector.user.email,
      shopName: payment.collector.shop.name,
      totalCollected: 0,
      paymentCount: 0,
      cashCollected: 0,
      mobileMoneyCollected: 0,
      bankTransferCollected: 0,
    }

    existing.totalCollected += Number(payment.amount)
    existing.paymentCount++

    if (payment.paymentMethod === "CASH") {
      existing.cashCollected += Number(payment.amount)
    } else if (payment.paymentMethod === "MOBILE_MONEY") {
      existing.mobileMoneyCollected += Number(payment.amount)
    } else if (payment.paymentMethod === "BANK_TRANSFER") {
      existing.bankTransferCollected += Number(payment.amount)
    }

    collectorMap.set(key, existing)
  }

  return Array.from(collectorMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalCollected - a.totalCollected)
}

/**
 * Get all customers with their financial status
 */
export async function getCustomersForAccountant(
  businessSlug: string,
  filters?: {
    shopId?: string
    status?: "all" | "active" | "overdue" | "completed"
    search?: string
  }
): Promise<CustomerForAccountant[]> {
  const { business } = await requireAccountant(businessSlug)
  const now = new Date()

  const customers = await prisma.customer.findMany({
    where: {
      shop: {
        businessId: business.id,
        ...(filters?.shopId && { id: filters.shopId }),
      },
    },
    include: {
      shop: { select: { name: true } },
      purchases: {
        include: {
          payments: {
            where: { isConfirmed: true },
            select: { amount: true },
          },
        },
      },
    },
  })

  let result = customers.map(customer => {
    const totalPurchases = customer.purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0
    )
    const totalPaid = customer.purchases.reduce(
      (sum, p) =>
        sum + p.payments.reduce((s, pay) => s + Number(pay.amount), 0),
      0
    )
    const totalOutstanding = totalPurchases - totalPaid

    const overdueAmount = customer.purchases
      .filter(p => p.status === "ACTIVE" && p.dueDate && new Date(p.dueDate) < now)
      .reduce((sum, p) => {
        const paid = p.payments.reduce((s, pay) => s + Number(pay.amount), 0)
        return sum + Math.max(0, Number(p.totalAmount) - paid)
      }, 0)

    const hasActivePurchases = customer.purchases.some(p => p.status === "ACTIVE")
    const hasOverdue = overdueAmount > 0

    let status = "completed"
    if (hasOverdue) status = "overdue"
    else if (hasActivePurchases) status = "active"

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      shopName: customer.shop.name,
      totalPurchases,
      totalPaid,
      totalOutstanding,
      overdueAmount,
      status,
      createdAt: customer.createdAt,
    }
  })

  // Apply status filter
  if (filters?.status && filters.status !== "all") {
    result = result.filter(c => c.status === filters.status)
  }

  // Apply search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(
      c =>
        c.firstName.toLowerCase().includes(searchLower) ||
        c.lastName.toLowerCase().includes(searchLower) ||
        c.phone.includes(searchLower) ||
        (c.email && c.email.toLowerCase().includes(searchLower))
    )
  }

  return result
}

/**
 * Get all shops for the business (for filter dropdowns)
 */
export async function getAccountantShops(businessSlug: string) {
  const { business } = await requireAccountant(businessSlug)

  return prisma.shop.findMany({
    where: { businessId: business.id },
    select: {
      id: true,
      name: true,
      shopSlug: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  })
}

/**
 * Export payments data as JSON (to be converted to Excel on client)
 */
export async function exportPaymentsData(
  businessSlug: string,
  filters?: {
    status?: "pending" | "confirmed" | "rejected" | "all"
    shopId?: string
    startDate?: Date
    endDate?: Date
  }
) {
  const { membership } = await requireAccountant(businessSlug)

  if (!membership.canExportData) {
    throw new Error("You do not have permission to export data")
  }

  const payments = await getAccountantPayments(businessSlug, filters)

  return payments.map(p => ({
    "Payment ID": p.id,
    "Date": p.createdAt.toISOString().split("T")[0],
    "Customer Name": p.customerName,
    "Customer Phone": p.customerPhone,
    "Shop": p.shopName,
    "Amount": p.amount,
    "Payment Method": p.paymentMethod,
    "Reference": p.reference || "",
    "Status": p.isConfirmed ? "Confirmed" : p.rejectedAt ? "Rejected" : "Pending",
    "Collector": p.collectorName || "N/A",
    "Notes": p.notes || "",
  }))
}

/**
 * Export aging report data
 */
export async function exportAgingReport(
  businessSlug: string,
  shopId?: string
) {
  const { membership } = await requireAccountant(businessSlug)

  if (!membership.canExportData) {
    throw new Error("You do not have permission to export data")
  }

  const agingData = await getAgingReport(businessSlug, shopId)

  return agingData.map(item => ({
    "Customer Name": item.customerName,
    "Phone": item.customerPhone,
    "Shop": item.shopName,
    "Total Outstanding": item.totalOutstanding,
    "Current (0-30 days)": item.current,
    "31-60 Days": item.days31to60,
    "61-90 Days": item.days61to90,
    "Over 90 Days": item.over90Days,
    "Oldest Due Date": item.oldestDueDate?.toISOString().split("T")[0] || "N/A",
  }))
}

/**
 * Export customer financial data
 */
export async function exportCustomerData(
  businessSlug: string,
  filters?: {
    shopId?: string
    status?: "all" | "active" | "overdue" | "completed"
  }
) {
  const { membership } = await requireAccountant(businessSlug)

  if (!membership.canExportData) {
    throw new Error("You do not have permission to export data")
  }

  const customers = await getCustomersForAccountant(businessSlug, filters)

  return customers.map(c => ({
    "Customer Name": `${c.firstName} ${c.lastName}`,
    "Phone": c.phone,
    "Email": c.email || "",
    "Shop": c.shopName,
    "Total Purchases": c.totalPurchases,
    "Total Paid": c.totalPaid,
    "Outstanding Balance": c.totalOutstanding,
    "Overdue Amount": c.overdueAmount,
    "Status": c.status,
    "Registered": c.createdAt.toISOString().split("T")[0],
  }))
}

/**
 * Get profit margin data (if permitted)
 */
export interface ProfitMarginItem {
  shopId: string
  shopName: string
  revenue: number
  cost: number
  profit: number
  margin: number
  itemsSold: number
}

export async function getProfitMarginReport(
  businessSlug: string,
  filters?: {
    shopId?: string
    from?: string
    to?: string
  }
) {
  const { business, membership } = await requireAccountant(businessSlug)

  if (!membership.canViewProfitMargins) {
    throw new Error("You do not have permission to view profit margins")
  }

  // Get shops for filter dropdown
  const shops = await prisma.shop.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true, shopSlug: true, isActive: true },
    orderBy: { name: "asc" },
  })

  const whereClause: Prisma.PurchaseWhereInput = {
    customer: {
      shop: { 
        businessId: business.id,
        ...(filters?.shopId && { id: filters.shopId }),
      },
    },
    ...(filters?.from || filters?.to
      ? {
          createdAt: {
            ...(filters?.from && { gte: new Date(filters.from) }),
            ...(filters?.to && { lte: new Date(new Date(filters.to).getTime() + 24 * 60 * 60 * 1000 - 1) }),
          },
        }
      : {}),
  }

  const purchases = await prisma.purchase.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          product: {
            select: { costPrice: true },
          },
        },
      },
      customer: {
        include: {
          shop: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Calculate profit margins by shop
  const shopProfits = new Map<string, { revenue: number; cost: number; shopName: string; itemsSold: number }>()

  for (const purchase of purchases) {
    const revenue = Number(purchase.totalAmount)
    let cost = 0
    let items = 0

    for (const item of purchase.items) {
      cost += Number(item.product?.costPrice || 0) * item.quantity
      items += item.quantity
    }

    const shopId = purchase.customer.shop.id
    const existing = shopProfits.get(shopId) || {
      revenue: 0,
      cost: 0,
      shopName: purchase.customer.shop.name,
      itemsSold: 0,
    }
    existing.revenue += revenue
    existing.cost += cost
    existing.itemsSold += items
    shopProfits.set(shopId, existing)
  }

  const data: ProfitMarginItem[] = Array.from(shopProfits.entries()).map(([id, d]) => ({
    shopId: id,
    shopName: d.shopName,
    revenue: d.revenue,
    cost: d.cost,
    profit: d.revenue - d.cost,
    margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
    itemsSold: d.itemsSold,
  })).sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending

  return { data, shops }
}

/**
 * Get business memberships for the accountant portal business selector
 */
export async function getAccountantBusinesses(userId: string) {
  return getAccountantBusinessMemberships(userId)
}
