"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireAccountant, getAccountantBusinessMemberships, createAuditLog } from "../../lib/auth"
import { 
  Prisma, 
  ExpenseCategory,
  DisputeType,
  RefundReason,
  PaymentMethod,
  BudgetPeriod,
  NoteEntityType
} from "../generated/prisma/client"

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

// ========================================
// EXPENSE TRACKING
// ========================================

export interface ExpenseItem {
  id: string
  category: string
  customCategory: string | null
  description: string
  amount: number
  vendor: string | null
  reference: string | null
  receiptUrl: string | null
  expenseDate: Date
  paymentMethod: string | null
  isRecurring: boolean
  recurringPeriod: string | null
  status: string
  notes: string | null
  shopId: string | null
  shopName: string | null
  createdAt: Date
}

export async function getAccountantExpenses(
  businessSlug: string,
  filters?: {
    category?: string
    status?: string
    shopId?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<{ expenses: ExpenseItem[]; summary: { total: number; pending: number; approved: number; byCategory: Record<string, number> } }> {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Record<string, unknown> = {
    businessId: business.id,
  }

  if (filters?.category && filters.category !== "all") {
    whereClause.category = filters.category
  }
  if (filters?.status && filters.status !== "all") {
    whereClause.status = filters.status
  }
  if (filters?.shopId) {
    whereClause.shopId = filters.shopId
  }
  if (filters?.startDate || filters?.endDate) {
    whereClause.expenseDate = {}
    if (filters.startDate) {
      (whereClause.expenseDate as Record<string, Date>).gte = filters.startDate
    }
    if (filters.endDate) {
      (whereClause.expenseDate as Record<string, Date>).lte = filters.endDate
    }
  }

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })

  const shopMap = new Map(shops.map(s => [s.id, s.name]))

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    orderBy: { expenseDate: "desc" },
  })

  const expenseItems: ExpenseItem[] = expenses.map(e => ({
    id: e.id,
    category: e.category,
    customCategory: e.customCategory,
    description: e.description,
    amount: Number(e.amount),
    vendor: e.vendor,
    reference: e.reference,
    receiptUrl: e.receiptUrl,
    expenseDate: e.expenseDate,
    paymentMethod: e.paymentMethod,
    isRecurring: e.isRecurring,
    recurringPeriod: e.recurringPeriod,
    status: e.status,
    notes: e.notes,
    shopId: e.shopId,
    shopName: e.shopId ? shopMap.get(e.shopId) || null : null,
    createdAt: e.createdAt,
  }))

  // Calculate summary
  const total = expenseItems.reduce((sum, e) => sum + e.amount, 0)
  const pending = expenseItems.filter(e => e.status === "PENDING").reduce((sum, e) => sum + e.amount, 0)
  const approved = expenseItems.filter(e => e.status === "APPROVED" || e.status === "PAID").reduce((sum, e) => sum + e.amount, 0)
  const byCategory: Record<string, number> = {}
  expenseItems.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })

  return { expenses: expenseItems, summary: { total, pending, approved, byCategory } }
}

export async function createExpense(
  businessSlug: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    if (!membership.canRecordExpenses) {
      return { success: false, error: "You don't have permission to record expenses" }
    }

    const category = formData.get("category") as string
    const customCategory = formData.get("customCategory") as string
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const vendor = formData.get("vendor") as string
    const reference = formData.get("reference") as string
    const expenseDate = new Date(formData.get("expenseDate") as string)
    const paymentMethod = formData.get("paymentMethod") as string
    const shopId = formData.get("shopId") as string
    const isRecurring = formData.get("isRecurring") === "true"
    const recurringPeriod = formData.get("recurringPeriod") as string
    const notes = formData.get("notes") as string

    if (!category || !description || isNaN(amount) || amount <= 0) {
      return { success: false, error: "Category, description, and valid amount are required" }
    }

    await prisma.expense.create({
      data: {
        businessId: business.id,
        shopId: shopId || null,
        category: category as ExpenseCategory,
        customCategory: category === "OTHER" ? customCategory : null,
        description,
        amount,
        vendor: vendor || null,
        reference: reference || null,
        expenseDate,
        paymentMethod: (paymentMethod as PaymentMethod) || null,
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : null,
        status: "PENDING",
        notes: notes || null,
        createdById: membership.id,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_EXPENSE",
      entityType: "Expense",
      metadata: { businessId: business.id, amount, category },
    })

    revalidatePath(`/accountant/${businessSlug}/expenses`)
    return { success: true }
  } catch (error) {
    console.error("Error creating expense:", error)
    return { success: false, error: "Failed to create expense" }
  }
}

export async function approveExpense(
  businessSlug: string,
  expenseId: string
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, businessId: business.id },
    })

    if (!expense) {
      return { success: false, error: "Expense not found" }
    }

    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: "APPROVED",
        approvedById: membership.id,
        approvedAt: new Date(),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "APPROVE_EXPENSE",
      entityType: "Expense",
      entityId: expenseId,
    })

    revalidatePath(`/accountant/${businessSlug}/expenses`)
    return { success: true }
  } catch (error) {
    console.error("Error approving expense:", error)
    return { success: false, error: "Failed to approve expense" }
  }
}

export async function rejectExpense(
  businessSlug: string,
  expenseId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireAccountant(businessSlug)

    await prisma.expense.update({
      where: { id: expenseId, businessId: business.id },
      data: {
        status: "REJECTED",
        rejectedReason: reason,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "REJECT_EXPENSE",
      entityType: "Expense", 
      entityId: expenseId,
      metadata: { reason },
    })

    revalidatePath(`/accountant/${businessSlug}/expenses`)
    return { success: true }
  } catch (error) {
    console.error("Error rejecting expense:", error)
    return { success: false, error: "Failed to reject expense" }
  }
}

// ========================================
// DAILY CASH SUMMARY
// ========================================

export interface DailyCashSummaryData {
  id: string
  summaryDate: Date
  shopId: string
  shopName: string
  openingCash: number
  openingMomo: number
  openingBank: number
  cashCollected: number
  momoCollected: number
  bankCollected: number
  cashExpenses: number
  momoExpenses: number
  bankExpenses: number
  closingCash: number
  closingMomo: number
  closingBank: number
  cashVariance: number
  varianceExplanation: string | null
  status: string
  notes: string | null
}

export async function getDailyCashSummaries(
  businessSlug: string,
  filters?: {
    shopId?: string
    startDate?: Date
    endDate?: Date
    status?: string
  }
): Promise<DailyCashSummaryData[]> {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Record<string, unknown> = {
    businessId: business.id,
  }

  if (filters?.shopId) {
    whereClause.shopId = filters.shopId
  }
  if (filters?.status && filters.status !== "all") {
    whereClause.status = filters.status
  }
  if (filters?.startDate || filters?.endDate) {
    whereClause.summaryDate = {}
    if (filters.startDate) {
      (whereClause.summaryDate as Record<string, Date>).gte = filters.startDate
    }
    if (filters.endDate) {
      (whereClause.summaryDate as Record<string, Date>).lte = filters.endDate
    }
  }

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })
  const shopMap = new Map(shops.map(s => [s.id, s.name]))

  const summaries = await prisma.dailyCashSummary.findMany({
    where: whereClause,
    orderBy: { summaryDate: "desc" },
  })

  return summaries.map(s => ({
    id: s.id,
    summaryDate: s.summaryDate,
    shopId: s.shopId,
    shopName: shopMap.get(s.shopId) || "Unknown",
    openingCash: Number(s.openingCash),
    openingMomo: Number(s.openingMomo),
    openingBank: Number(s.openingBank),
    cashCollected: Number(s.cashCollected),
    momoCollected: Number(s.momoCollected),
    bankCollected: Number(s.bankCollected),
    cashExpenses: Number(s.cashExpenses),
    momoExpenses: Number(s.momoExpenses),
    bankExpenses: Number(s.bankExpenses),
    closingCash: Number(s.closingCash),
    closingMomo: Number(s.closingMomo),
    closingBank: Number(s.closingBank),
    cashVariance: Number(s.cashVariance),
    varianceExplanation: s.varianceExplanation,
    status: s.status,
    notes: s.notes,
  }))
}

export async function createDailyCashSummary(
  businessSlug: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    const shopId = formData.get("shopId") as string
    const summaryDate = new Date(formData.get("summaryDate") as string)
    const openingCash = parseFloat(formData.get("openingCash") as string) || 0
    const openingMomo = parseFloat(formData.get("openingMomo") as string) || 0
    const openingBank = parseFloat(formData.get("openingBank") as string) || 0
    const cashCollected = parseFloat(formData.get("cashCollected") as string) || 0
    const momoCollected = parseFloat(formData.get("momoCollected") as string) || 0
    const bankCollected = parseFloat(formData.get("bankCollected") as string) || 0
    const cashExpenses = parseFloat(formData.get("cashExpenses") as string) || 0
    const momoExpenses = parseFloat(formData.get("momoExpenses") as string) || 0
    const bankExpenses = parseFloat(formData.get("bankExpenses") as string) || 0
    const closingCash = parseFloat(formData.get("closingCash") as string) || 0
    const closingMomo = parseFloat(formData.get("closingMomo") as string) || 0
    const closingBank = parseFloat(formData.get("closingBank") as string) || 0
    const notes = formData.get("notes") as string

    // Calculate expected closing and variance
    const expectedCash = openingCash + cashCollected - cashExpenses
    const cashVariance = closingCash - expectedCash

    await prisma.dailyCashSummary.create({
      data: {
        businessId: business.id,
        shopId,
        summaryDate,
        openingCash,
        openingMomo,
        openingBank,
        cashCollected,
        momoCollected,
        bankCollected,
        cashExpenses,
        momoExpenses,
        bankExpenses,
        closingCash,
        closingMomo,
        closingBank,
        cashVariance,
        status: "DRAFT",
        notes: notes || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_CASH_SUMMARY",
      entityType: "DailyCashSummary",
      metadata: { shopId, date: summaryDate },
    })

    revalidatePath(`/accountant/${businessSlug}/cash-summary`)
    return { success: true }
  } catch (error) {
    console.error("Error creating cash summary:", error)
    return { success: false, error: "Failed to create cash summary" }
  }
}

// ========================================
// CASH FLOW PROJECTIONS
// ========================================

export interface CashFlowProjection {
  date: string
  expectedInflow: number
  actualInflow: number
  expectedOutflow: number
  actualOutflow: number
  netCashFlow: number
  cumulativeBalance: number
}

export async function getCashFlowProjections(
  businessSlug: string,
  days: number = 30
): Promise<{ projections: CashFlowProjection[]; summary: { totalExpectedInflow: number; totalExpectedOutflow: number; projectedBalance: number } }> {
  const { business } = await requireAccountant(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const shopIds = shops.map(s => s.id)

  const today = new Date()
  const projections: CashFlowProjection[] = []
  let cumulativeBalance = 0

  // Get expected payments (from payment schedules/due dates)
  const upcomingPayments = await prisma.payment.findMany({
    where: {
      purchase: {
        customer: { shopId: { in: shopIds } },
      },
      dueDate: {
        gte: today,
        lte: new Date(today.getTime() + days * 24 * 60 * 60 * 1000),
      },
    },
    select: { dueDate: true, amount: true, status: true },
  })

  // Get recurring expenses
  const recurringExpenses = await prisma.expense.findMany({
    where: {
      businessId: business.id,
      isRecurring: true,
      status: { in: ["APPROVED", "PAID"] },
    },
    select: { amount: true, recurringPeriod: true, expenseDate: true },
  })

  // Calculate daily projections
  for (let i = 0; i < days; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split("T")[0]

    // Expected inflows (payments due on this date)
    const expectedInflow = upcomingPayments
      .filter(p => p.dueDate && p.dueDate.toISOString().split("T")[0] === dateStr)
      .reduce((sum, p) => sum + Number(p.amount), 0)

    // Expected outflows (recurring expenses)
    const expectedOutflow = recurringExpenses
      .filter(e => {
        if (e.recurringPeriod === "monthly" && date.getDate() === e.expenseDate.getDate()) return true
        if (e.recurringPeriod === "weekly" && date.getDay() === e.expenseDate.getDay()) return true
        return false
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)

    const netCashFlow = expectedInflow - expectedOutflow
    cumulativeBalance += netCashFlow

    projections.push({
      date: dateStr,
      expectedInflow,
      actualInflow: 0, // Will be filled with actual data
      expectedOutflow,
      actualOutflow: 0,
      netCashFlow,
      cumulativeBalance,
    })
  }

  const totalExpectedInflow = projections.reduce((sum, p) => sum + p.expectedInflow, 0)
  const totalExpectedOutflow = projections.reduce((sum, p) => sum + p.expectedOutflow, 0)

  return {
    projections,
    summary: {
      totalExpectedInflow,
      totalExpectedOutflow,
      projectedBalance: cumulativeBalance,
    },
  }
}

// ========================================
// BAD DEBT ANALYSIS
// ========================================

export interface BadDebtItem {
  customerId: string
  customerName: string
  customerPhone: string
  purchaseId: string
  purchaseNumber: string
  shopName: string
  totalAmount: number
  amountPaid: number
  outstanding: number
  daysOverdue: number
  dueDate: Date
  riskScore: number // 1-100, higher is more risky
  lastPaymentDate: Date | null
  paymentCount: number
}

export async function getBadDebtAnalysis(
  businessSlug: string,
  filters?: {
    shopId?: string
    minDaysOverdue?: number
    minAmount?: number
  }
): Promise<{ items: BadDebtItem[]; summary: { totalAtRisk: number; highRiskCount: number; mediumRiskCount: number; lowRiskCount: number; writeOffSuggested: number } }> {
  const { business } = await requireAccountant(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })
  const shopIds = filters?.shopId ? [filters.shopId] : shops.map(s => s.id)
  const shopMap = new Map(shops.map(s => [s.id, s.name]))

  const today = new Date()
  const overduePurchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: { in: shopIds } },
      status: { in: ["ACTIVE", "OVERDUE", "DEFAULTED"] },
      dueDate: { lt: today },
      outstandingBalance: { gt: 0 },
    },
    include: {
      customer: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { payments: true } },
    },
  })

  const items: BadDebtItem[] = overduePurchases
    .map(p => {
      const daysOverdue = Math.floor((today.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const outstanding = Number(p.outstandingBalance)
      const totalAmount = Number(p.totalAmount)

      // Calculate risk score (0-100)
      let riskScore = 0
      riskScore += Math.min(daysOverdue / 2, 40) // Up to 40 points for days overdue
      riskScore += (outstanding / totalAmount) * 30 // Up to 30 points for % unpaid
      riskScore += p._count.payments === 0 ? 20 : 0 // 20 points if no payments at all
      riskScore += daysOverdue > 90 ? 10 : 0 // 10 extra points if over 90 days

      return {
        customerId: p.customerId,
        customerName: `${p.customer.firstName} ${p.customer.lastName}`,
        customerPhone: p.customer.phone,
        purchaseId: p.id,
        purchaseNumber: p.purchaseNumber,
        shopName: shopMap.get(p.customer.shopId) || "Unknown",
        totalAmount,
        amountPaid: Number(p.amountPaid),
        outstanding,
        daysOverdue,
        dueDate: p.dueDate,
        riskScore: Math.min(Math.round(riskScore), 100),
        lastPaymentDate: p.payments[0]?.paidAt || null,
        paymentCount: p._count.payments,
      }
    })
    .filter(item => {
      if (filters?.minDaysOverdue && item.daysOverdue < filters.minDaysOverdue) return false
      if (filters?.minAmount && item.outstanding < filters.minAmount) return false
      return true
    })
    .sort((a, b) => b.riskScore - a.riskScore)

  const totalAtRisk = items.reduce((sum, i) => sum + i.outstanding, 0)
  const highRiskCount = items.filter(i => i.riskScore >= 70).length
  const mediumRiskCount = items.filter(i => i.riskScore >= 40 && i.riskScore < 70).length
  const lowRiskCount = items.filter(i => i.riskScore < 40).length
  const writeOffSuggested = items
    .filter(i => i.riskScore >= 80 && i.daysOverdue > 180)
    .reduce((sum, i) => sum + i.outstanding, 0)

  return {
    items,
    summary: { totalAtRisk, highRiskCount, mediumRiskCount, lowRiskCount, writeOffSuggested },
  }
}

// ========================================
// COLLECTION EFFICIENCY
// ========================================

export interface CollectorEfficiency {
  collectorId: string
  collectorName: string
  shopName: string
  assignedCustomers: number
  totalAssigned: number
  totalCollected: number
  collectionRate: number
  paymentsCount: number
  avgPaymentAmount: number
  overdueCustomers: number
  onTimePayments: number
  latePayments: number
}

export async function getCollectionEfficiency(
  businessSlug: string,
  filters?: {
    shopId?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<CollectorEfficiency[]> {
  const { business } = await requireAccountant(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })
  const shopIds = filters?.shopId ? [filters.shopId] : shops.map(s => s.id)
  const shopMap = new Map(shops.map(s => [s.id, s.name]))

  // Get all debt collectors
  const collectors = await prisma.shopMember.findMany({
    where: {
      shopId: { in: shopIds },
      role: "DEBT_COLLECTOR",
      isActive: true,
    },
    include: {
      user: { select: { name: true } },
      assignedCustomers: {
        include: {
          purchases: {
            where: { status: { in: ["ACTIVE", "OVERDUE"] } },
          },
        },
      },
      collectedPayments: {
        where: filters?.startDate || filters?.endDate
          ? {
              createdAt: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : undefined,
      },
    },
  })

  return collectors.map(c => {
    const totalAssigned = c.assignedCustomers.reduce(
      (sum, cust) => sum + cust.purchases.reduce((s, p) => s + Number(p.outstandingBalance), 0),
      0
    )
    const totalCollected = c.collectedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const overdueCustomers = c.assignedCustomers.filter(cust =>
      cust.purchases.some(p => p.status === "OVERDUE")
    ).length

    return {
      collectorId: c.id,
      collectorName: c.user.name || "Unknown",
      shopName: shopMap.get(c.shopId) || "Unknown",
      assignedCustomers: c.assignedCustomers.length,
      totalAssigned,
      totalCollected,
      collectionRate: totalAssigned > 0 ? (totalCollected / totalAssigned) * 100 : 0,
      paymentsCount: c.collectedPayments.length,
      avgPaymentAmount: c.collectedPayments.length > 0 ? totalCollected / c.collectedPayments.length : 0,
      overdueCustomers,
      onTimePayments: c.collectedPayments.filter(p => p.status === "COMPLETED").length,
      latePayments: c.collectedPayments.filter(p => p.dueDate && p.paidAt && p.paidAt > p.dueDate).length,
    }
  }).sort((a, b) => b.collectionRate - a.collectionRate)
}

// ========================================
// REVENUE BY CATEGORY
// ========================================

export interface CategoryRevenue {
  categoryId: string
  categoryName: string
  color: string
  totalRevenue: number
  totalCost: number
  profit: number
  margin: number
  itemsSold: number
  purchaseCount: number
}

export async function getRevenueByCategory(
  businessSlug: string,
  filters?: {
    shopId?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<CategoryRevenue[]> {
  const { business, membership } = await requireAccountant(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const shopIds = filters?.shopId ? [filters.shopId] : shops.map(s => s.id)

  const categories = await prisma.category.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true, color: true },
  })

  const purchaseItems = await prisma.purchaseItem.findMany({
    where: {
      purchase: {
        customer: { shopId: { in: shopIds } },
        status: { in: ["ACTIVE", "COMPLETED"] },
        ...(filters?.startDate || filters?.endDate
          ? {
              createdAt: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : {}),
      },
      product: { categoryId: { not: null } },
    },
    include: {
      product: {
        select: { categoryId: true, costPrice: true },
      },
    },
  })

  const categoryMap = new Map<string, { revenue: number; cost: number; items: number; purchases: Set<string> }>()

  for (const item of purchaseItems) {
    const categoryId = item.product?.categoryId
    if (!categoryId) continue

    const existing = categoryMap.get(categoryId) || { revenue: 0, cost: 0, items: 0, purchases: new Set<string>() }
    existing.revenue += Number(item.totalPrice)
    existing.cost += Number(item.product?.costPrice || 0) * item.quantity
    existing.items += item.quantity
    existing.purchases.add(item.purchaseId)
    categoryMap.set(categoryId, existing)
  }

  return categories
    .map(cat => {
      const data = categoryMap.get(cat.id) || { revenue: 0, cost: 0, items: 0, purchases: new Set() }
      const profit = membership.canViewProfitMargins ? data.revenue - data.cost : 0
      const margin = membership.canViewProfitMargins && data.revenue > 0 ? (profit / data.revenue) * 100 : 0

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        color: cat.color || "#6366f1",
        totalRevenue: data.revenue,
        totalCost: membership.canViewProfitMargins ? data.cost : 0,
        profit,
        margin,
        itemsSold: data.items,
        purchaseCount: data.purchases.size,
      }
    })
    .filter(c => c.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ========================================
// STAFF PERFORMANCE
// ========================================

export interface StaffPerformance {
  staffId: string
  staffName: string
  role: string
  shopName: string
  // Sales metrics
  salesCount: number
  salesAmount: number
  newCustomers: number
  // Collection metrics
  collectionsCount: number
  collectionsAmount: number
  // Commission
  commissionEarned: number
  commissionPending: number
}

export async function getStaffPerformance(
  businessSlug: string,
  filters?: {
    shopId?: string
    role?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<StaffPerformance[]> {
  const { business } = await requireAccountant(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })
  const shopIds = filters?.shopId ? [filters.shopId] : shops.map(s => s.id)
  const shopMap = new Map(shops.map(s => [s.id, s.name]))

  const dateFilter = filters?.startDate || filters?.endDate
    ? {
        createdAt: {
          ...(filters.startDate && { gte: filters.startDate }),
          ...(filters.endDate && { lte: filters.endDate }),
        },
      }
    : {}

  const staffMembers = await prisma.shopMember.findMany({
    where: {
      shopId: { in: shopIds },
      isActive: true,
      ...(filters?.role ? { role: filters.role as Prisma.EnumRoleFilter["equals"] } : {}),
    },
    include: {
      user: { select: { name: true } },
      collectedPayments: { where: dateFilter },
    },
  })

  // Get commissions
  const commissions = await prisma.commission.findMany({
    where: {
      businessId: business.id,
      shopId: { in: shopIds },
      ...dateFilter,
    },
  })

  const commissionMap = new Map<string, { earned: number; pending: number }>()
  for (const c of commissions) {
    const existing = commissionMap.get(c.staffMemberId) || { earned: 0, pending: 0 }
    if (c.status === "PAID") {
      existing.earned += Number(c.amount)
    } else if (c.status === "PENDING" || c.status === "APPROVED") {
      existing.pending += Number(c.amount)
    }
    commissionMap.set(c.staffMemberId, existing)
  }

  return staffMembers.map(s => {
    const commission = commissionMap.get(s.id) || { earned: 0, pending: 0 }
    return {
      staffId: s.id,
      staffName: s.user.name || "Unknown",
      role: s.role,
      shopName: shopMap.get(s.shopId) || "Unknown",
      salesCount: 0, // Would need to track who created purchases
      salesAmount: 0,
      newCustomers: 0,
      collectionsCount: s.collectedPayments.length,
      collectionsAmount: s.collectedPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      commissionEarned: commission.earned,
      commissionPending: commission.pending,
    }
  }).sort((a, b) => b.collectionsAmount - a.collectionsAmount)
}

// ========================================
// AUDIT TRAIL VIEWER
// ========================================

export interface AuditLogEntry {
  id: string
  actorName: string | null
  actorEmail: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export async function getAuditTrail(
  businessSlug: string,
  filters?: {
    action?: string
    entityType?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }
): Promise<AuditLogEntry[]> {
  const { business } = await requireAccountant(businessSlug)

  // Get all business member IDs
  const members = await prisma.businessMember.findMany({
    where: { businessId: business.id },
    select: { userId: true },
  })
  const userIds = members.map(m => m.userId)

  // Also get shop members
  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const shopMembers = await prisma.shopMember.findMany({
    where: { shopId: { in: shops.map(s => s.id) } },
    select: { userId: true },
  })
  const allUserIds = [...new Set([...userIds, ...shopMembers.map(m => m.userId)])]

  const whereClause: Record<string, unknown> = {
    actorUserId: { in: allUserIds },
  }

  if (filters?.action) {
    whereClause.action = { contains: filters.action, mode: "insensitive" }
  }
  if (filters?.entityType) {
    whereClause.entityType = filters.entityType
  }
  if (filters?.startDate || filters?.endDate) {
    whereClause.createdAt = {}
    if (filters.startDate) {
      (whereClause.createdAt as Record<string, Date>).gte = filters.startDate
    }
    if (filters.endDate) {
      (whereClause.createdAt as Record<string, Date>).lte = filters.endDate
    }
  }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      actor: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 100,
  })

  return logs.map(l => ({
    id: l.id,
    actorName: l.actor?.name || null,
    actorEmail: l.actor?.email || null,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata as Record<string, unknown> | null,
    createdAt: l.createdAt,
  }))
}

// ========================================
// TAX REPORT GENERATOR
// ========================================

export interface TaxReportData {
  period: { start: Date; end: Date }
  totalRevenue: number
  totalTaxCollected: number
  taxBreakdown: {
    taxName: string
    rate: number
    baseAmount: number
    taxAmount: number
  }[]
  shopBreakdown: {
    shopName: string
    revenue: number
    taxCollected: number
  }[]
}

export async function getTaxReport(
  businessSlug: string,
  startDate: Date,
  endDate: Date
): Promise<TaxReportData> {
  const { business } = await requireAccountant(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })
  const shopIds = shops.map(s => s.id)
  const shopMap = new Map(shops.map(s => [s.id, s.name]))

  // Get taxes configured
  const taxes = await prisma.tax.findMany({
    where: { businessId: business.id, isActive: true },
  })

  // Get purchases in period
  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: { in: shopIds } },
      status: { in: ["ACTIVE", "COMPLETED"] },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      customer: { select: { shopId: true } },
    },
  })

  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)

  // Calculate tax breakdown (simplified - would need actual tax tracking in products)
  const taxBreakdown = taxes.map(t => {
    const baseAmount = totalRevenue
    const taxAmount = (baseAmount * Number(t.rate)) / 100
    return {
      taxName: t.name,
      rate: Number(t.rate),
      baseAmount,
      taxAmount,
    }
  })

  const totalTaxCollected = taxBreakdown.reduce((sum, t) => sum + t.taxAmount, 0)

  // Shop breakdown
  const shopRevenue = new Map<string, number>()
  for (const p of purchases) {
    const shopId = p.customer.shopId
    shopRevenue.set(shopId, (shopRevenue.get(shopId) || 0) + Number(p.totalAmount))
  }

  const shopBreakdown = Array.from(shopRevenue.entries()).map(([shopId, revenue]) => ({
    shopName: shopMap.get(shopId) || "Unknown",
    revenue,
    taxCollected: taxes.reduce((sum, t) => sum + (revenue * Number(t.rate)) / 100, 0),
  }))

  return {
    period: { start: startDate, end: endDate },
    totalRevenue,
    totalTaxCollected,
    taxBreakdown,
    shopBreakdown,
  }
}

// ========================================
// FINANCIAL STATEMENTS
// ========================================

export interface ProfitLossStatement {
  period: { start: Date; end: Date }
  revenue: {
    sales: number
    interest: number
    other: number
    total: number
  }
  costOfGoods: number
  grossProfit: number
  expenses: {
    category: string
    amount: number
  }[]
  totalExpenses: number
  operatingProfit: number
  taxes: number
  netProfit: number
}

export async function getProfitLossStatement(
  businessSlug: string,
  startDate: Date,
  endDate: Date
): Promise<ProfitLossStatement> {
  const { business, membership } = await requireAccountant(businessSlug)

  if (!membership.canViewProfitMargins) {
    throw new Error("You don't have permission to view profit margins")
  }

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const shopIds = shops.map(s => s.id)

  // Get purchases
  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: { in: shopIds } },
      status: { in: ["ACTIVE", "COMPLETED"] },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      items: {
        include: { product: { select: { costPrice: true } } },
      },
    },
  })

  const salesRevenue = purchases.reduce((sum, p) => sum + Number(p.subtotal), 0)
  const interestRevenue = purchases.reduce((sum, p) => sum + Number(p.interestAmount), 0)
  const totalRevenue = salesRevenue + interestRevenue

  const costOfGoods = purchases.reduce((sum, p) => {
    return sum + p.items.reduce((s, i) => s + Number(i.product?.costPrice || 0) * i.quantity, 0)
  }, 0)

  const grossProfit = totalRevenue - costOfGoods

  // Get expenses
  const expenses = await prisma.expense.findMany({
    where: {
      businessId: business.id,
      status: { in: ["APPROVED", "PAID"] },
      expenseDate: { gte: startDate, lte: endDate },
    },
  })

  const expensesByCategory = new Map<string, number>()
  for (const e of expenses) {
    const cat = e.customCategory || e.category
    expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + Number(e.amount))
  }

  const expenseBreakdown = Array.from(expensesByCategory.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const totalExpenses = expenseBreakdown.reduce((sum, e) => sum + e.amount, 0)
  const operatingProfit = grossProfit - totalExpenses

  // Estimate taxes
  const taxes = await prisma.tax.findMany({
    where: { businessId: business.id, isActive: true },
  })
  const estimatedTax = taxes.reduce((sum, t) => sum + (totalRevenue * Number(t.rate)) / 100, 0)

  const netProfit = operatingProfit - estimatedTax

  return {
    period: { start: startDate, end: endDate },
    revenue: {
      sales: salesRevenue,
      interest: interestRevenue,
      other: 0,
      total: totalRevenue,
    },
    costOfGoods,
    grossProfit,
    expenses: expenseBreakdown,
    totalExpenses,
    operatingProfit,
    taxes: estimatedTax,
    netProfit,
  }
}

// ========================================
// PAYMENT DISPUTES
// ========================================

export interface DisputeItem {
  id: string
  paymentId: string
  disputeType: string
  description: string
  disputedAmount: number
  expectedAmount: number | null
  status: string
  resolution: string | null
  resolvedAmount: number | null
  raisedByName: string | null
  assignedToName: string | null
  resolvedAt: Date | null
  createdAt: Date
}

export async function getPaymentDisputes(
  businessSlug: string,
  filters?: {
    status?: string
    type?: string
  }
): Promise<DisputeItem[]> {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Record<string, unknown> = {
    businessId: business.id,
  }

  if (filters?.status && filters.status !== "all") {
    whereClause.status = filters.status
  }
  if (filters?.type && filters.type !== "all") {
    whereClause.disputeType = filters.type
  }

  const disputes = await prisma.paymentDispute.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })

  // Get names for raised by and assigned to
  const memberIds = [...new Set(disputes.flatMap(d => [d.raisedById, d.assignedToId].filter(Boolean)))]
  const members = await prisma.businessMember.findMany({
    where: { id: { in: memberIds as string[] } },
    include: { user: { select: { name: true } } },
  })
  const memberMap = new Map(members.map(m => [m.id, m.user.name]))

  return disputes.map(d => ({
    id: d.id,
    paymentId: d.paymentId,
    disputeType: d.disputeType,
    description: d.description,
    disputedAmount: Number(d.disputedAmount),
    expectedAmount: d.expectedAmount ? Number(d.expectedAmount) : null,
    status: d.status,
    resolution: d.resolution,
    resolvedAmount: d.resolvedAmount ? Number(d.resolvedAmount) : null,
    raisedByName: memberMap.get(d.raisedById) || null,
    assignedToName: d.assignedToId ? memberMap.get(d.assignedToId) || null : null,
    resolvedAt: d.resolvedAt,
    createdAt: d.createdAt,
  }))
}

export async function createDispute(
  businessSlug: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    const paymentId = formData.get("paymentId") as string
    const disputeType = formData.get("disputeType") as string
    const description = formData.get("description") as string
    const disputedAmount = parseFloat(formData.get("disputedAmount") as string)
    const expectedAmount = formData.get("expectedAmount") as string

    await prisma.paymentDispute.create({
      data: {
        businessId: business.id,
        paymentId,
        disputeType: disputeType as DisputeType,
        description,
        disputedAmount,
        expectedAmount: expectedAmount ? parseFloat(expectedAmount) : null,
        status: "OPEN",
        raisedById: membership.id,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_DISPUTE",
      entityType: "PaymentDispute",
      metadata: { paymentId, disputeType },
    })

    revalidatePath(`/accountant/${businessSlug}/disputes`)
    return { success: true }
  } catch (error) {
    console.error("Error creating dispute:", error)
    return { success: false, error: "Failed to create dispute" }
  }
}

export async function resolveDispute(
  businessSlug: string,
  disputeId: string,
  resolution: string,
  resolvedAmount?: number
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    await prisma.paymentDispute.update({
      where: { id: disputeId, businessId: business.id },
      data: {
        status: "RESOLVED",
        resolution,
        resolvedAmount: resolvedAmount ?? null,
        resolvedById: membership.id,
        resolvedAt: new Date(),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "RESOLVE_DISPUTE",
      entityType: "PaymentDispute",
      entityId: disputeId,
    })

    revalidatePath(`/accountant/${businessSlug}/disputes`)
    return { success: true }
  } catch (error) {
    console.error("Error resolving dispute:", error)
    return { success: false, error: "Failed to resolve dispute" }
  }
}

// ========================================
// REFUND MANAGEMENT
// ========================================

export interface RefundItem {
  id: string
  purchaseId: string
  purchaseNumber: string
  customerId: string
  customerName: string
  reason: string
  customReason: string | null
  amount: number
  refundMethod: string
  status: string
  reference: string | null
  processedAt: Date | null
  notes: string | null
  createdAt: Date
}

export async function getRefunds(
  businessSlug: string,
  filters?: {
    status?: string
    reason?: string
  }
): Promise<RefundItem[]> {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Record<string, unknown> = {
    businessId: business.id,
  }

  if (filters?.status && filters.status !== "all") {
    whereClause.status = filters.status
  }
  if (filters?.reason && filters.reason !== "all") {
    whereClause.reason = filters.reason
  }

  const refunds = await prisma.refund.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })

  // Get purchase and customer info
  const purchaseIds = [...new Set(refunds.map(r => r.purchaseId))]
  const purchases = await prisma.purchase.findMany({
    where: { id: { in: purchaseIds } },
    select: { id: true, purchaseNumber: true },
  })
  const purchaseMap = new Map(purchases.map(p => [p.id, p.purchaseNumber]))

  const customerIds = [...new Set(refunds.map(r => r.customerId))]
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, firstName: true, lastName: true },
  })
  const customerMap = new Map(customers.map(c => [c.id, `${c.firstName} ${c.lastName}`]))

  return refunds.map(r => ({
    id: r.id,
    purchaseId: r.purchaseId,
    purchaseNumber: purchaseMap.get(r.purchaseId) || "Unknown",
    customerId: r.customerId,
    customerName: customerMap.get(r.customerId) || "Unknown",
    reason: r.reason,
    customReason: r.customReason,
    amount: Number(r.amount),
    refundMethod: r.refundMethod,
    status: r.status,
    reference: r.reference,
    processedAt: r.processedAt,
    notes: r.notes,
    createdAt: r.createdAt,
  }))
}

export async function createRefund(
  businessSlug: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    const purchaseId = formData.get("purchaseId") as string
    const customerId = formData.get("customerId") as string
    const reason = formData.get("reason") as string
    const customReason = formData.get("customReason") as string
    const amount = parseFloat(formData.get("amount") as string)
    const refundMethod = formData.get("refundMethod") as string
    const notes = formData.get("notes") as string

    await prisma.refund.create({
      data: {
        businessId: business.id,
        purchaseId,
        customerId,
        reason: reason as RefundReason,
        customReason: reason === "OTHER" ? customReason : null,
        amount,
        refundMethod: refundMethod as PaymentMethod,
        status: "PENDING",
        notes: notes || null,
        requestedById: membership.id,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_REFUND",
      entityType: "Refund",
      metadata: { purchaseId, amount },
    })

    revalidatePath(`/accountant/${businessSlug}/refunds`)
    return { success: true }
  } catch (error) {
    console.error("Error creating refund:", error)
    return { success: false, error: "Failed to create refund" }
  }
}

export async function approveRefund(
  businessSlug: string,
  refundId: string
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    await prisma.refund.update({
      where: { id: refundId, businessId: business.id },
      data: {
        status: "APPROVED",
        approvedById: membership.id,
        approvedAt: new Date(),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "APPROVE_REFUND",
      entityType: "Refund",
      entityId: refundId,
    })

    revalidatePath(`/accountant/${businessSlug}/refunds`)
    return { success: true }
  } catch (error) {
    console.error("Error approving refund:", error)
    return { success: false, error: "Failed to approve refund" }
  }
}

export async function processRefund(
  businessSlug: string,
  refundId: string,
  reference: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireAccountant(businessSlug)

    await prisma.refund.update({
      where: { id: refundId, businessId: business.id },
      data: {
        status: "COMPLETED",
        reference,
        processedAt: new Date(),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PROCESS_REFUND",
      entityType: "Refund",
      entityId: refundId,
      metadata: { reference },
    })

    revalidatePath(`/accountant/${businessSlug}/refunds`)
    return { success: true }
  } catch (error) {
    console.error("Error processing refund:", error)
    return { success: false, error: "Failed to process refund" }
  }
}

// ========================================
// COMMISSION CALCULATOR
// ========================================

export interface CommissionItem {
  id: string
  staffMemberId: string
  staffName: string
  staffRole: string
  shopName: string
  sourceType: string
  sourceId: string
  baseAmount: number
  rate: number
  amount: number
  status: string
  paidAt: Date | null
  paymentRef: string | null
  periodStart: Date
  periodEnd: Date
}

export async function getCommissions(
  businessSlug: string,
  filters?: {
    shopId?: string
    status?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<{ commissions: CommissionItem[]; summary: { total: number; pending: number; approved: number; paid: number } }> {
  const { business } = await requireAccountant(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })
  const shopIds = filters?.shopId ? [filters.shopId] : shops.map(s => s.id)
  const shopMap = new Map(shops.map(s => [s.id, s.name]))

  const whereClause: Record<string, unknown> = {
    businessId: business.id,
    shopId: { in: shopIds },
  }

  if (filters?.status && filters.status !== "all") {
    whereClause.status = filters.status
  }
  if (filters?.startDate) {
    whereClause.periodStart = { gte: filters.startDate }
  }
  if (filters?.endDate) {
    whereClause.periodEnd = { lte: filters.endDate }
  }

  const commissions = await prisma.commission.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })

  // Get staff member info
  const staffIds = [...new Set(commissions.map(c => c.staffMemberId))]
  const staff = await prisma.shopMember.findMany({
    where: { id: { in: staffIds } },
    include: { user: { select: { name: true } } },
  })
  const staffMap = new Map(staff.map(s => [s.id, { name: s.user.name, role: s.role }]))

  const items: CommissionItem[] = commissions.map(c => {
    const staffInfo = staffMap.get(c.staffMemberId)
    return {
      id: c.id,
      staffMemberId: c.staffMemberId,
      staffName: staffInfo?.name || "Unknown",
      staffRole: staffInfo?.role || c.staffRole,
      shopName: shopMap.get(c.shopId) || "Unknown",
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      baseAmount: Number(c.baseAmount),
      rate: Number(c.rate),
      amount: Number(c.amount),
      status: c.status,
      paidAt: c.paidAt,
      paymentRef: c.paymentRef,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
    }
  })

  const total = items.reduce((sum, c) => sum + c.amount, 0)
  const pending = items.filter(c => c.status === "PENDING").reduce((sum, c) => sum + c.amount, 0)
  const approved = items.filter(c => c.status === "APPROVED").reduce((sum, c) => sum + c.amount, 0)
  const paid = items.filter(c => c.status === "PAID").reduce((sum, c) => sum + c.amount, 0)

  return { commissions: items, summary: { total, pending, approved, paid } }
}

export async function calculateCommissions(
  businessSlug: string,
  periodStart: Date,
  periodEnd: Date,
  rates: { salesRate: number; collectionRate: number }
): Promise<ActionResult> {
  try {
    const { user, business } = await requireAccountant(businessSlug)

    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true },
    })
    const shopIds = shops.map(s => s.id)

    // Get collections by debt collectors in period
    const payments = await prisma.payment.findMany({
      where: {
        purchase: { customer: { shopId: { in: shopIds } } },
        collectorId: { not: null },
        isConfirmed: true,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        collector: true,
        purchase: { include: { customer: true } },
      },
    })

    // Group by collector
    const collectorPayments = new Map<string, { total: number; shopId: string }>()
    for (const p of payments) {
      if (!p.collectorId) continue
      const existing = collectorPayments.get(p.collectorId) || { total: 0, shopId: p.collector?.shopId || "" }
      existing.total += Number(p.amount)
      collectorPayments.set(p.collectorId, existing)
    }

    // Create commission records
    const commissionsToCreate = []
    for (const [staffId, data] of collectorPayments.entries()) {
      const amount = data.total * rates.collectionRate
      commissionsToCreate.push({
        businessId: business.id,
        shopId: data.shopId,
        staffMemberId: staffId,
        staffRole: "DEBT_COLLECTOR" as const,
        sourceType: "COLLECTION" as const,
        sourceId: `period-${periodStart.toISOString()}-${periodEnd.toISOString()}`,
        baseAmount: data.total,
        rate: rates.collectionRate,
        amount,
        status: "PENDING" as const,
        periodStart,
        periodEnd,
      })
    }

    if (commissionsToCreate.length > 0) {
      await prisma.commission.createMany({ data: commissionsToCreate })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "CALCULATE_COMMISSIONS",
      entityType: "Commission",
      metadata: { periodStart, periodEnd, count: commissionsToCreate.length },
    })

    revalidatePath(`/accountant/${businessSlug}/commissions`)
    return { success: true, data: { count: commissionsToCreate.length } }
  } catch (error) {
    console.error("Error calculating commissions:", error)
    return { success: false, error: "Failed to calculate commissions" }
  }
}

export async function approveCommission(
  businessSlug: string,
  commissionId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireAccountant(businessSlug)

    await prisma.commission.update({
      where: { id: commissionId, businessId: business.id },
      data: { status: "APPROVED" },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "APPROVE_COMMISSION",
      entityType: "Commission",
      entityId: commissionId,
    })

    revalidatePath(`/accountant/${businessSlug}/commissions`)
    return { success: true }
  } catch (error) {
    console.error("Error approving commission:", error)
    return { success: false, error: "Failed to approve commission" }
  }
}

export async function markCommissionPaid(
  businessSlug: string,
  commissionId: string,
  paymentRef: string
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    await prisma.commission.update({
      where: { id: commissionId, businessId: business.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidById: membership.id,
        paymentRef,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PAY_COMMISSION",
      entityType: "Commission",
      entityId: commissionId,
      metadata: { paymentRef },
    })

    revalidatePath(`/accountant/${businessSlug}/commissions`)
    return { success: true }
  } catch (error) {
    console.error("Error marking commission paid:", error)
    return { success: false, error: "Failed to mark commission as paid" }
  }
}

// ========================================
// BUDGET VS ACTUAL
// ========================================

export interface BudgetItem {
  id: string
  name: string
  category: string | null
  customCategory: string | null
  amount: number
  spent: number
  variance: number
  variancePercent: number
  period: string
  startDate: Date
  endDate: Date
  isActive: boolean
}

export async function getBudgets(
  businessSlug: string,
  filters?: {
    period?: string
    category?: string
    isActive?: boolean
  }
): Promise<BudgetItem[]> {
  const { business } = await requireAccountant(businessSlug)

  const whereClause: Record<string, unknown> = {
    businessId: business.id,
  }

  if (filters?.period) {
    whereClause.period = filters.period
  }
  if (filters?.category) {
    whereClause.category = filters.category
  }
  if (filters?.isActive !== undefined) {
    whereClause.isActive = filters.isActive
  }

  const budgets = await prisma.budget.findMany({
    where: whereClause,
    orderBy: { startDate: "desc" },
  })

  // Calculate spent amounts from expenses
  const items: BudgetItem[] = await Promise.all(
    budgets.map(async b => {
      const expenseWhere: Record<string, unknown> = {
        businessId: business.id,
        expenseDate: { gte: b.startDate, lte: b.endDate },
        status: { in: ["APPROVED", "PAID"] },
      }
      if (b.category) {
        expenseWhere.category = b.category
      }

      const expenses = await prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      })

      const spent = Number(expenses._sum.amount || 0)
      const budgetAmount = Number(b.amount)
      const variance = budgetAmount - spent
      const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0

      return {
        id: b.id,
        name: b.name,
        category: b.category,
        customCategory: b.customCategory,
        amount: budgetAmount,
        spent,
        variance,
        variancePercent,
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
        isActive: b.isActive,
      }
    })
  )

  return items
}

export async function createBudget(
  businessSlug: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const customCategory = formData.get("customCategory") as string
    const amount = parseFloat(formData.get("amount") as string)
    const period = formData.get("period") as string
    const startDate = new Date(formData.get("startDate") as string)
    const endDate = new Date(formData.get("endDate") as string)
    const notes = formData.get("notes") as string

    await prisma.budget.create({
      data: {
        businessId: business.id,
        name,
        category: category ? (category as ExpenseCategory) : null,
        customCategory: customCategory || null,
        amount,
        period: period as BudgetPeriod,
        startDate,
        endDate,
        notes: notes || null,
        createdById: membership.id,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_BUDGET",
      entityType: "Budget",
      metadata: { name, amount, period },
    })

    revalidatePath(`/accountant/${businessSlug}/budgets`)
    return { success: true }
  } catch (error) {
    console.error("Error creating budget:", error)
    return { success: false, error: "Failed to create budget" }
  }
}

// ========================================
// ACCOUNTANT NOTES
// ========================================

export interface NoteItem {
  id: string
  entityType: string
  entityId: string
  content: string
  isInternal: boolean
  isPinned: boolean
  createdByName: string | null
  createdAt: Date
}

export async function getAccountantNotes(
  businessSlug: string,
  entityType: string,
  entityId: string
): Promise<NoteItem[]> {
  const { business } = await requireAccountant(businessSlug)

  const notes = await prisma.accountantNote.findMany({
    where: {
      businessId: business.id,
      entityType: entityType as NoteEntityType,
      entityId,
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  })

  // Get creator names
  const creatorIds = [...new Set(notes.map(n => n.createdById))]
  const creators = await prisma.businessMember.findMany({
    where: { id: { in: creatorIds } },
    include: { user: { select: { name: true } } },
  })
  const creatorMap = new Map(creators.map(c => [c.id, c.user.name]))

  return notes.map(n => ({
    id: n.id,
    entityType: n.entityType,
    entityId: n.entityId,
    content: n.content,
    isInternal: n.isInternal,
    isPinned: n.isPinned,
    createdByName: creatorMap.get(n.createdById) || null,
    createdAt: n.createdAt,
  }))
}

export async function createAccountantNote(
  businessSlug: string,
  entityType: string,
  entityId: string,
  content: string,
  isInternal: boolean = true
): Promise<ActionResult> {
  try {
    const { user, business, membership } = await requireAccountant(businessSlug)

    await prisma.accountantNote.create({
      data: {
        businessId: business.id,
        entityType: entityType as NoteEntityType,
        entityId,
        content,
        isInternal,
        createdById: membership.id,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_NOTE",
      entityType: "AccountantNote",
      metadata: { entityType, entityId },
    })

    return { success: true }
  } catch (error) {
    console.error("Error creating note:", error)
    return { success: false, error: "Failed to create note" }
  }
}

export async function toggleNotePin(
  businessSlug: string,
  noteId: string
): Promise<ActionResult> {
  try {
    const { business } = await requireAccountant(businessSlug)

    const note = await prisma.accountantNote.findFirst({
      where: { id: noteId, businessId: business.id },
    })

    if (!note) {
      return { success: false, error: "Note not found" }
    }

    await prisma.accountantNote.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
    })

    return { success: true }
  } catch (error) {
    console.error("Error toggling note pin:", error)
    return { success: false, error: "Failed to toggle note pin" }
  }
}

export async function deleteAccountantNote(
  businessSlug: string,
  noteId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireAccountant(businessSlug)

    await prisma.accountantNote.delete({
      where: { id: noteId, businessId: business.id },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "DELETE_NOTE",
      entityType: "AccountantNote",
      entityId: noteId,
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting note:", error)
    return { success: false, error: "Failed to delete note" }
  }
}
