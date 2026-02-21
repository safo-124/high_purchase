"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireCollectorForShop, createAuditLog } from "../../lib/auth"
import { sendCollectionReceipt, sendPendingPaymentNotification } from "../../lib/email"
import { sendPendingPaymentMessage } from "../../lib/messaging-actions"
import { PaymentPreference, PaymentMethod, PurchaseStatus, Prisma, Role } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export type PurchaseTypeOption = "CASH" | "LAYAWAY" | "CREDIT"

// ============================================
// CUSTOMER INTERFACES
// ============================================

export interface CustomerPayload {
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  idType?: string | null
  idNumber?: string | null
  address?: string | null
  city?: string | null
  region?: string | null
  preferredPayment?: PaymentPreference
  notes?: string | null
  // Customer portal account fields
  createAccount?: boolean
  accountEmail?: string
  accountPassword?: string
}

export interface AssignedCustomerData {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  address: string | null
  isActive: boolean
  totalPurchases: number
  activePurchases: number
  totalOwed: number
  totalPaid: number
}

export interface PurchaseData {
  id: string
  purchaseNumber: string
  customerId: string
  customerName: string
  status: PurchaseStatus
  subtotal: number
  interestAmount: number
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  downPayment: number
  installments: number
  startDate: Date
  dueDate: Date | null
  notes: string | null
  createdAt: Date
  items: {
    id: string
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  payments: {
    id: string
    amount: number
    paymentMethod: PaymentMethod
    status: string
    paidAt: Date | null
    reference: string | null
  }[]
}

// ============================================
// COLLECTOR DASHBOARD
// ============================================

export interface CollectorDashboardData {
  shopId: string
  collectorName: string
  shopName: string
  businessName: string
  businessLogoUrl: string | null
  assignedCustomers: number
  activeLoans: number
  totalOutstanding: number
  totalCollected: number
  canSellProducts: boolean
  canCreateCustomers: boolean
  recentPayments: {
    id: string
    amount: number
    customerName: string
    purchaseNumber: string
    paidAt: Date
  }[]
}

export async function getCollectorDashboard(shopSlug: string): Promise<CollectorDashboardData> {
  const { user, shop, membership } = await requireCollectorForShop(shopSlug)

  // Get business details including logo
  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
    select: { name: true, logoUrl: true },
  })

  // Get collector's member ID (for assigned customers)
  const collectorMemberId = membership?.id

  // Get assigned customers with their purchase stats
  const customers = collectorMemberId
    ? await prisma.customer.findMany({
        where: {
          shopId: shop.id,
          assignedCollectorId: collectorMemberId,
          isActive: true,
        },
        include: {
          purchases: {
            where: {
              status: { in: ["ACTIVE", "PENDING", "OVERDUE"] },
            },
            select: {
              outstandingBalance: true,
            },
          },
        },
      })
    : []

  // Calculate stats
  const assignedCustomers = customers.length
  const activeLoans = customers.reduce((sum, c) => sum + c.purchases.length, 0)
  const totalOutstanding = customers.reduce(
    (sum, c) => sum + c.purchases.reduce((ps, p) => ps + Number(p.outstandingBalance), 0),
    0
  )

  // Calculate totalCollected from CONFIRMED payments made by THIS collector
  // NOT from purchase.amountPaid which includes all payments (down payments, other collectors, etc.)
  const confirmedPaymentsByCollector = collectorMemberId
    ? await prisma.payment.aggregate({
        where: {
          collectorId: collectorMemberId,
          isConfirmed: true,
        },
        _sum: { amount: true },
      })
    : { _sum: { amount: null } }
  
  const totalCollected = confirmedPaymentsByCollector._sum.amount 
    ? Number(confirmedPaymentsByCollector._sum.amount) 
    : 0

  // Get recent payments collected by this collector (only confirmed ones)
  const recentPayments = collectorMemberId
    ? await prisma.payment.findMany({
        where: {
          collectorId: collectorMemberId,
          status: "COMPLETED",
          isConfirmed: true,
        },
        include: {
          purchase: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: { paidAt: "desc" },
        take: 10,
      })
    : []

  return {
    shopId: shop.id,
    collectorName: user.name || "Collector",
    shopName: shop.name,
    businessName: business?.name || 'Business',
    businessLogoUrl: business?.logoUrl || null,
    assignedCustomers,
    activeLoans,
    totalOutstanding,
    totalCollected,
    canSellProducts: membership?.canSellProducts ?? false,
    canCreateCustomers: membership?.canCreateCustomers ?? false,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
      purchaseNumber: p.purchase.purchaseNumber,
      paidAt: p.paidAt || p.createdAt,
    })),
  }
}

// ============================================
// ENHANCED COLLECTOR DASHBOARD (v2)
// ============================================

export interface CollectorDashboardV2Data {
  collectorName: string
  shopName: string
  businessName: string
  businessLogoUrl: string | null
  canSellProducts: boolean
  canCreateCustomers: boolean
  canLoadWallet: boolean
  // Core stats
  assignedCustomers: number
  activeLoans: number
  totalOutstanding: number
  totalCollected: number
  todayCollected: number
  // Wallet stats
  walletTotalBalance: number
  walletPending: number
  walletPendingCount: number
  walletConfirmedToday: number
  walletCustomersWithBalance: number
  // Collection analytics
  collectionRate: number // percentage of outstanding collected
  weeklyTrend: { date: string; collections: number; wallets: number }[]
  monthlyCollections: { month: string; amount: number }[]
  // Payment method breakdown
  paymentMethodBreakdown: { method: string; amount: number; count: number }[]
  // Purchase status breakdown
  purchaseStatusBreakdown: { status: string; count: number }[]
  // Top customers by outstanding
  topOwingCustomers: { id: string; name: string; phone: string; amount: number; lastPayment: string | null }[]
  // Recent activity
  recentPayments: { id: string; amount: number; customerName: string; purchaseNumber: string; method: string; paidAt: string }[]
  recentWalletDeposits: { id: string; amount: number; customerName: string; status: string; createdAt: string }[]
}

export async function getCollectorDashboardV2(shopSlug: string): Promise<CollectorDashboardV2Data> {
  const { user, shop, membership } = await requireCollectorForShop(shopSlug)
  const memberId = membership?.id || null

  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
    select: { name: true, logoUrl: true },
  })

  // ==== Assigned customers with purchases ====
  const customers = memberId
    ? await prisma.customer.findMany({
        where: { shopId: shop.id, assignedCollectorId: memberId, isActive: true },
        include: {
          purchases: {
            where: { status: { in: ["ACTIVE", "PENDING", "OVERDUE", "COMPLETED", "DEFAULTED"] } },
            select: { id: true, status: true, outstandingBalance: true, totalAmount: true, amountPaid: true },
          },
        },
      })
    : []

  const activePurchases = customers.flatMap(c => c.purchases.filter(p => ["ACTIVE", "PENDING", "OVERDUE"].includes(p.status)))
  const allPurchases = customers.flatMap(c => c.purchases)
  const totalOutstanding = activePurchases.reduce((s, p) => s + Number(p.outstandingBalance), 0)

  // ==== All confirmed payments by this collector ====
  const allPayments = memberId
    ? await prisma.payment.findMany({
        where: { collectorId: memberId, isConfirmed: true },
        include: {
          purchase: { include: { customer: { select: { firstName: true, lastName: true, phone: true } } } },
        },
        orderBy: { paidAt: "desc" },
      })
    : []

  const totalCollected = allPayments.reduce((s, p) => s + Number(p.amount), 0)

  // Today's collections
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayCollected = allPayments
    .filter(p => p.paidAt && p.paidAt >= todayStart)
    .reduce((s, p) => s + Number(p.amount), 0)

  // ==== Wallet stats ====
  const walletCustomers = memberId
    ? await prisma.customer.findMany({
        where: { shopId: shop.id, assignedCollectorId: memberId },
        select: { id: true, firstName: true, lastName: true, walletBalance: true },
      })
    : []

  const walletTotalBalance = walletCustomers.reduce((s, c) => s + Number(c.walletBalance), 0)
  const walletCustomersWithBalance = walletCustomers.filter(c => Number(c.walletBalance) > 0).length

  const walletTransactions = memberId
    ? await prisma.walletTransaction.findMany({
        where: { shopId: shop.id, createdById: memberId },
        include: { customer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : []

  const walletPendingTxns = walletTransactions.filter(w => w.status === "PENDING")
  const walletPending = walletPendingTxns.reduce((s, w) => s + Number(w.amount), 0)
  const walletConfirmedToday = walletTransactions
    .filter(w => w.status === "CONFIRMED" && w.confirmedAt && w.confirmedAt >= todayStart)
    .reduce((s, w) => s + Number(w.amount), 0)

  // ==== Collection rate ====
  const totalLoanValue = allPurchases.reduce((s, p) => s + Number(p.totalAmount), 0)
  const collectionRate = totalLoanValue > 0 ? Math.round((totalCollected / totalLoanValue) * 100) : 0

  // ==== Weekly trend (last 7 days) ====
  const weeklyTrend: { date: string; collections: number; wallets: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const dayStart = new Date(dateStr + "T00:00:00")
    const dayEnd = new Date(dateStr + "T23:59:59")

    const dayCollections = allPayments
      .filter(p => p.paidAt && p.paidAt >= dayStart && p.paidAt <= dayEnd)
      .reduce((s, p) => s + Number(p.amount), 0)

    const dayWallets = walletTransactions
      .filter(w => w.status !== "REJECTED" && w.createdAt >= dayStart && w.createdAt <= dayEnd)
      .reduce((s, w) => s + Number(w.amount), 0)

    weeklyTrend.push({ date: dateStr, collections: dayCollections, wallets: dayWallets })
  }

  // ==== Monthly collections (last 6 months) ====
  const monthlyCollections: { month: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })

    const monthAmount = allPayments
      .filter(p => p.paidAt && p.paidAt >= monthStart && p.paidAt <= monthEnd)
      .reduce((s, p) => s + Number(p.amount), 0)

    monthlyCollections.push({ month: monthLabel, amount: monthAmount })
  }

  // ==== Payment method breakdown ====
  const methodMap: Record<string, { amount: number; count: number }> = {}
  allPayments.forEach(p => {
    const m = p.paymentMethod
    if (!methodMap[m]) methodMap[m] = { amount: 0, count: 0 }
    methodMap[m].amount += Number(p.amount)
    methodMap[m].count++
  })
  const paymentMethodBreakdown = Object.entries(methodMap).map(([method, data]) => ({
    method: method.replace(/_/g, " "),
    amount: data.amount,
    count: data.count,
  }))

  // ==== Purchase status breakdown ====
  const statusMap: Record<string, number> = {}
  allPurchases.forEach(p => {
    statusMap[p.status] = (statusMap[p.status] || 0) + 1
  })
  const purchaseStatusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // ==== Top owing customers ====
  const customerOwing = customers
    .map(c => {
      const owed = c.purchases
        .filter(p => ["ACTIVE", "PENDING", "OVERDUE"].includes(p.status))
        .reduce((s, p) => s + Number(p.outstandingBalance), 0)
      const lastPay = allPayments.find(p => p.purchase.customer.phone === c.phone)
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone,
        amount: owed,
        lastPayment: lastPay?.paidAt?.toISOString() || null,
      }
    })
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // ==== Recent payments (last 10) ====
  const recentPayments = allPayments.slice(0, 10).map(p => ({
    id: p.id,
    amount: Number(p.amount),
    customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
    purchaseNumber: p.purchase.purchaseNumber,
    method: p.paymentMethod.replace(/_/g, " "),
    paidAt: (p.paidAt || p.createdAt).toISOString(),
  }))

  // ==== Recent wallet deposits (last 10) ====
  const recentWalletDeposits = walletTransactions
    .filter(w => w.type === "DEPOSIT")
    .slice(0, 10)
    .map(w => ({
      id: w.id,
      amount: Number(w.amount),
      customerName: `${w.customer.firstName} ${w.customer.lastName}`,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    }))

  return {
    collectorName: user.name || "Collector",
    shopName: shop.name,
    businessName: business?.name || "Business",
    businessLogoUrl: business?.logoUrl || null,
    canSellProducts: membership?.canSellProducts ?? false,
    canCreateCustomers: membership?.canCreateCustomers ?? false,
    canLoadWallet: membership?.canLoadWallet ?? false,
    assignedCustomers: customers.length,
    activeLoans: activePurchases.length,
    totalOutstanding,
    totalCollected,
    todayCollected,
    walletTotalBalance,
    walletPending,
    walletPendingCount: walletPendingTxns.length,
    walletConfirmedToday,
    walletCustomersWithBalance,
    collectionRate,
    weeklyTrend,
    monthlyCollections,
    paymentMethodBreakdown,
    purchaseStatusBreakdown,
    topOwingCustomers: customerOwing,
    recentPayments,
    recentWalletDeposits,
  }
}

// ============================================
// ASSIGNED CUSTOMERS
// ============================================

export async function getAssignedCustomers(shopSlug: string): Promise<AssignedCustomerData[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  const collectorMemberId = membership?.id

  // If super admin, show all customers for testing
  const whereClause = collectorMemberId
    ? { shopId: shop.id, assignedCollectorId: collectorMemberId }
    : { shopId: shop.id }

  const customers = await prisma.customer.findMany({
    where: whereClause,
    include: {
      purchases: {
        select: {
          id: true,
          status: true,
          outstandingBalance: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get confirmed payments by this collector for these customers
  const customerIds = customers.map(c => c.id)
  const confirmedPaymentsByCustomer = collectorMemberId && customerIds.length > 0
    ? await prisma.payment.groupBy({
        by: ['purchaseId'],
        where: {
          collectorId: collectorMemberId,
          isConfirmed: true,
          purchase: {
            customerId: { in: customerIds },
          },
        },
        _sum: { amount: true },
      })
    : []

  // Create a map of purchaseId to confirmed amount
  const purchasePaymentMap = new Map<string, number>()
  confirmedPaymentsByCustomer.forEach(p => {
    purchasePaymentMap.set(p.purchaseId, Number(p._sum.amount) || 0)
  })

  return customers.map((c) => {
    const activePurchases = c.purchases.filter(
      (p) => p.status === "ACTIVE" || p.status === "PENDING" || p.status === "OVERDUE"
    )
    // Sum confirmed payments by this collector for this customer's purchases
    const totalPaid = c.purchases.reduce((sum, p) => sum + (purchasePaymentMap.get(p.id) || 0), 0)
    
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      isActive: c.isActive,
      totalPurchases: c.purchases.length,
      activePurchases: activePurchases.length,
      totalOwed: activePurchases.reduce((sum, p) => sum + Number(p.outstandingBalance), 0),
      totalPaid,
    }
  })
}

// ============================================
// CREATE CUSTOMER (BY COLLECTOR)
// ============================================

export async function createCustomerAsCollector(
  shopSlug: string,
  payload: CustomerPayload
): Promise<ActionResult> {
  try {
    const { user, shop, membership } = await requireCollectorForShop(shopSlug)

    // Check for duplicate phone
    const existingCustomer = await prisma.customer.findFirst({
      where: { shopId: shop.id, phone: payload.phone },
    })

    if (existingCustomer) {
      return { success: false, error: "A customer with this phone number already exists" }
    }

    // If creating portal account, validate and create user
    let userAccount = null
    if (payload.createAccount) {
      if (!payload.accountEmail || payload.accountEmail.trim().length === 0) {
        return { success: false, error: "Email is required for account creation" }
      }
      if (!payload.accountPassword || payload.accountPassword.length < 8) {
        return { success: false, error: "Password must be at least 8 characters" }
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: payload.accountEmail.trim().toLowerCase() },
      })

      if (existingUser) {
        return { success: false, error: "An account with this email already exists" }
      }

      const bcrypt = await import("bcryptjs")
      const passwordHash = await bcrypt.hash(payload.accountPassword, 12)

      userAccount = await prisma.user.create({
        data: {
          email: payload.accountEmail.trim().toLowerCase(),
          name: `${payload.firstName.trim()} ${payload.lastName.trim()}`,
          passwordHash,
          plainPassword: payload.accountPassword,
          role: "CUSTOMER",
        },
      })
    }

    // Create customer and auto-assign to this collector
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.createAccount
          ? payload.accountEmail?.trim().toLowerCase()
          : (payload.email || null),
        idType: payload.idType,
        idNumber: payload.idNumber,
        address: payload.address,
        city: payload.city,
        region: payload.region,
        preferredPayment: payload.preferredPayment || "DEBT_COLLECTOR",
        assignedCollectorId: membership?.id || null, // Auto-assign to creating collector
        notes: payload.notes,
        userId: userAccount?.id || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_CREATED_BY_COLLECTOR",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { shopSlug, collectorId: membership?.id, hasAccount: !!userAccount },
    })

    revalidatePath(`/collector/${shopSlug}/customers`)
    return { success: true, data: { ...customer, hasAccount: !!userAccount } }
  } catch (error) {
    console.error("Create customer error:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

// ============================================
// GET CUSTOMER PURCHASES
// ============================================

export async function getCustomerPurchasesForCollector(
  shopSlug: string,
  customerId: string
): Promise<PurchaseData[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  // Verify customer belongs to shop and is assigned to this collector
  const whereClause = membership?.id
    ? { id: customerId, shopId: shop.id, assignedCollectorId: membership.id }
    : { id: customerId, shopId: shop.id }

  const customer = await prisma.customer.findFirst({
    where: whereClause,
  })

  if (!customer) {
    return []
  }

  const purchases = await prisma.purchase.findMany({
    where: { customerId },
    include: {
      customer: true,
      items: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return purchases.map((p) => ({
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    customerId: p.customerId,
    customerName: `${p.customer.firstName} ${p.customer.lastName}`,
    status: p.status,
    subtotal: Number(p.subtotal),
    interestAmount: Number(p.interestAmount),
    totalAmount: Number(p.totalAmount),
    amountPaid: Number(p.amountPaid),
    outstandingBalance: Number(p.outstandingBalance),
    downPayment: Number(p.downPayment),
    installments: p.installments,
    startDate: p.startDate,
    dueDate: p.dueDate,
    notes: p.notes,
    createdAt: p.createdAt,
    items: p.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    payments: p.payments.map((pay) => ({
      id: pay.id,
      amount: Number(pay.amount),
      paymentMethod: pay.paymentMethod,
      status: pay.status,
      paidAt: pay.paidAt,
      reference: pay.reference,
    })),
  }))
}

// ============================================
// RECORD PAYMENT (BY COLLECTOR)
// ============================================

export interface PaymentPayload {
  purchaseId: string
  amount: number
  paymentMethod: PaymentMethod
  reference?: string
  notes?: string
}

export async function recordPaymentAsCollector(
  shopSlug: string,
  payload: PaymentPayload
): Promise<ActionResult> {
  try {
    const { user, shop, membership } = await requireCollectorForShop(shopSlug)

    // Verify purchase belongs to a customer assigned to this collector
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: payload.purchaseId,
        customer: {
          shopId: shop.id,
          ...(membership?.id ? { assignedCollectorId: membership.id } : {}),
        },
      },
      include: { customer: true },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found or not accessible" }
    }

    if (purchase.status === "COMPLETED") {
      return { success: false, error: "This purchase is already fully paid" }
    }

    if (payload.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0" }
    }

    // Prevent overpayment
    const outstanding = Number(purchase.outstandingBalance)
    if (payload.amount > outstanding) {
      return { success: false, error: `Amount cannot exceed outstanding balance of ₵${outstanding.toLocaleString()}` }
    }

    // Create the payment as PENDING confirmation (isConfirmed = false)
    // The balance will NOT be updated until shop admin confirms
    const payment = await prisma.payment.create({
      data: {
        purchaseId: purchase.id,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        status: "PENDING", // Set to PENDING until confirmed
        collectorId: membership?.id,
        paidAt: new Date(),
        reference: payload.reference,
        notes: payload.notes,
        isConfirmed: false, // Requires shop admin confirmation
      },
    })

    // NOTE: Purchase balance is NOT updated here
    // It will be updated when shop admin confirms the payment

    await createAuditLog({
      actorUserId: user.id,
      action: "PAYMENT_RECORDED_BY_COLLECTOR",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        purchaseId: purchase.id,
        customerId: purchase.customerId,
        amount: payload.amount,
        collectorId: membership?.id,
        awaitingConfirmation: true,
      },
    })

    // Send pending payment notification email to customer
    if (purchase.customer.email) {
      try {
        const business = await prisma.business.findFirst({
          where: { shops: { some: { id: shop.id } } },
        })

        const now = new Date()
        await sendPendingPaymentNotification({
          businessId: shop.businessId,
          customerEmail: purchase.customer.email,
          customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
          shopName: shop.name,
          businessName: business?.name || shop.name,
          collectorName: user.name || "Collector",
          amount: payload.amount,
          paymentMethod: payload.paymentMethod,
          reference: payload.reference,
          purchaseNumber: purchase.purchaseNumber,
          collectionDate: now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          collectionTime: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        })
      } catch (emailError) {
        console.error("Failed to send pending payment notification:", emailError)
        // Don't fail the payment if email fails
      }
    }

    // Send in-app message to customer about the pending payment
    try {
      await sendPendingPaymentMessage({
        customerId: purchase.customerId,
        staffUserId: user.id,
        businessId: shop.businessId,
        shopId: shop.id,
        purchaseNumber: purchase.purchaseNumber,
        paymentAmount: payload.amount,
        paymentMethod: payload.paymentMethod,
        reference: payload.reference,
        collectorName: user.name || "Collector",
      })
    } catch (msgError) {
      console.error("Failed to send pending payment message:", msgError)
      // Don't fail the payment if messaging fails
    }

    revalidatePath(`/collector/${shopSlug}/customers/${purchase.customerId}`)
    revalidatePath(`/collector/${shopSlug}/dashboard`)
    revalidatePath(`/collector/${shopSlug}/payments`)
    return { 
      success: true, 
      data: {
        ...payment,
        amount: Number(payment.amount),
      }
    }
  } catch (error) {
    console.error("Record payment error:", error)
    return { success: false, error: "Failed to record payment" }
  }
}

// ============================================
// GET COLLECTOR'S PENDING PAYMENTS
// ============================================

export interface PendingPaymentData {
  id: string
  amount: number
  paymentMethod: PaymentMethod
  reference: string | null
  notes: string | null
  paidAt: Date | null
  createdAt: Date
  isConfirmed: boolean
  purchaseNumber: string
  customerName: string
  customerId: string
}

export async function getCollectorPendingPayments(shopSlug: string): Promise<PendingPaymentData[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  if (!membership?.id) return []

  const payments = await prisma.payment.findMany({
    where: {
      collectorId: membership.id,
      isConfirmed: false,
      rejectedAt: null, // Not rejected
    },
    include: {
      purchase: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    notes: p.notes,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    isConfirmed: p.isConfirmed,
    purchaseNumber: p.purchase.purchaseNumber,
    customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
    customerId: p.purchase.customerId,
  }))
}

// Get all payments by this collector (including confirmed)
export async function getCollectorPaymentHistory(shopSlug: string): Promise<PendingPaymentData[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  if (!membership?.id) return []

  const payments = await prisma.payment.findMany({
    where: {
      collectorId: membership.id,
    },
    include: {
      purchase: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    notes: p.notes,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    isConfirmed: p.isConfirmed,
    purchaseNumber: p.purchase.purchaseNumber,
    customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
    customerId: p.purchase.customerId,
  }))
}

// ============================================
// PRODUCTS (VIEW ONLY FOR COLLECTORS)
// ============================================

export interface ProductForCollector {
  id: string
  name: string
  sku: string | null
  description: string | null
  price: number
  cashPrice: number
  layawayPrice: number
  creditPrice: number
  stockQuantity: number
  category: string | null
  imageUrl: string | null
  isActive: boolean
  hasCustomPricing: boolean
}

export async function getProductsForCollector(shopSlug: string): Promise<ProductForCollector[]> {
  const { shop } = await requireCollectorForShop(shopSlug)

  // Get products via ShopProduct junction table
  const shopProducts = await prisma.shopProduct.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
      product: {
        isActive: true,
      },
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { product: { name: "asc" } },
  })

  return shopProducts.map((sp) => {
    const hasCustomPricing = !!(sp.costPrice || sp.cashPrice || sp.layawayPrice || sp.creditPrice)
    return {
      id: sp.product.id,
      name: sp.product.name,
      sku: sp.product.sku,
      description: sp.product.description,
      // Use shop-specific pricing if set, otherwise fall back to product pricing
      price: Number(sp.cashPrice ?? sp.product.price),
      cashPrice: Number(sp.cashPrice ?? sp.product.cashPrice),
      layawayPrice: Number(sp.layawayPrice ?? sp.product.layawayPrice),
      creditPrice: Number(sp.creditPrice ?? sp.product.creditPrice),
      stockQuantity: sp.stockQuantity, // Use shop-specific stock
      category: sp.product.category?.name || null,
      imageUrl: sp.product.imageUrl,
      isActive: sp.isActive,
      hasCustomPricing,
    }
  })
}

// ============================================
// CUSTOMERS FOR SALE (ASSIGNED TO THIS COLLECTOR)
// ============================================

export interface CustomerForCollectorSale {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
}

export async function getCustomersForCollectorSale(shopSlug: string): Promise<CustomerForCollectorSale[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
      // Only show customers assigned to this collector
      ...(membership ? { assignedCollectorId: membership.id } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
    orderBy: { firstName: "asc" },
  })

  return customers
}

// ============================================
// CREATE SALE (FOR COLLECTORS)
// ============================================

export interface CollectorSaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface CollectorSalePayload {
  customerId: string
  items: CollectorSaleItem[]
  downPayment: number
  purchaseType: PurchaseTypeOption
  tenorDays: number
}

export async function createCollectorSale(
  shopSlug: string,
  payload: CollectorSalePayload
): Promise<ActionResult> {
  try {
    const { user, shop, membership } = await requireCollectorForShop(shopSlug)

    // Validate inputs
    if (!payload.customerId) {
      return { success: false, error: "Customer is required" }
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: "At least one product is required" }
    }

    if (payload.downPayment < 0) {
      return { success: false, error: "Down payment cannot be negative" }
    }

    if (payload.tenorDays < 1) {
      return { success: false, error: "Tenor must be at least 1 day" }
    }

    // Verify customer belongs to shop
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Verify all products and their stock via ShopProduct
    const productIds = payload.items.map(item => item.productId)
    const shopProducts = await prisma.shopProduct.findMany({
      where: { 
        productId: { in: productIds }, 
        shopId: shop.id, 
        isActive: true,
        product: { isActive: true },
      },
      include: { product: true },
    })

    if (shopProducts.length !== payload.items.length) {
      return { success: false, error: "One or more products not found in this shop" }
    }

    // Check stock for each item
    for (const item of payload.items) {
      const shopProduct = shopProducts.find(sp => sp.productId === item.productId)
      if (!shopProduct) {
        return { success: false, error: `Product not found: ${item.productId}` }
      }
      if (shopProduct.stockQuantity < item.quantity) {
        return { success: false, error: `Insufficient stock for ${shopProduct.product.name}. Only ${shopProduct.stockQuantity} available.` }
      }
    }

    // Get business policy for interest calculation (only required for non-CASH purchases)
    const policy = await prisma.businessPolicy.findFirst({
      where: { 
        business: { 
          shops: { some: { id: shop.id } } 
        } 
      },
    })

    // CASH sales don't require policy
    if (payload.purchaseType !== "CASH" && !policy) {
      return { success: false, error: "Business policy not configured. Please contact your administrator." }
    }

    // Check tenor against policy (only for non-CASH)
    if (payload.purchaseType !== "CASH" && policy && payload.tenorDays > policy.maxTenorDays) {
      return { success: false, error: `Tenor cannot exceed ${policy.maxTenorDays} days` }
    }

    // Calculate subtotal from all items
    const subtotal = payload.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const interestRate = policy ? Number(policy.interestRate) / 100 : 0

    // For CASH purchases, no interest
    let interestAmount = 0
    if (payload.purchaseType !== "CASH" && policy) {
      if (policy.interestType === "FLAT") {
        interestAmount = subtotal * interestRate
      } else if (policy.interestType === "MONTHLY") {
        const months = payload.tenorDays / 30
        interestAmount = subtotal * interestRate * months
      }
    }

    const totalAmount = subtotal + interestAmount
    const downPayment = Math.min(payload.downPayment, totalAmount)
    const outstandingBalance = totalAmount - downPayment

    // Calculate due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + payload.tenorDays)

    // Generate purchase number
    const purchaseCount = await prisma.purchase.count({
      where: { customerId: customer.id },
    })
    const purchaseNumber = `HP-${String(purchaseCount + 1).padStart(4, "0")}`

    // Create purchase and update stock in a transaction
    const purchase = await prisma.$transaction(async (tx) => {
      // Only deduct stock for CASH sales (immediate delivery)
      // For CREDIT/LAYAWAY, stock is deducted when payment is completed
      if (payload.purchaseType === "CASH") {
        for (const item of payload.items) {
          await tx.shopProduct.updateMany({
            where: { 
              shopId: shop.id,
              productId: item.productId 
            },
            data: { stockQuantity: { decrement: item.quantity } },
          })
        }
      }

      // Create purchase with all items
      const newPurchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          customerId: customer.id,
          purchaseType: payload.purchaseType,
          status: outstandingBalance === 0 ? "COMPLETED" : "ACTIVE",
          subtotal: new Prisma.Decimal(subtotal),
          interestAmount: new Prisma.Decimal(interestAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          amountPaid: new Prisma.Decimal(downPayment),
          outstandingBalance: new Prisma.Decimal(outstandingBalance),
          downPayment: new Prisma.Decimal(downPayment),
          installments: payload.purchaseType === "CASH" ? 1 : Math.ceil(payload.tenorDays / 30),
          startDate: new Date(),
          dueDate,
          interestType: policy?.interestType || "FLAT",
          interestRate: policy ? Number(policy.interestRate) : 0,
          notes: `${payload.purchaseType} sale by Collector ${user.name}`,
          items: {
            create: payload.items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.unitPrice * item.quantity),
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      })

      // Create down payment record if > 0 (already confirmed since it's counted in amountPaid)
      if (downPayment > 0) {
        await tx.payment.create({
          data: {
            purchaseId: newPurchase.id,
            amount: new Prisma.Decimal(downPayment),
            paymentMethod: "CASH",
            status: "COMPLETED",
            isConfirmed: true,
            confirmedAt: new Date(),
            paidAt: new Date(),
            collectorId: membership?.id || null,
            notes: "Down payment at time of purchase (Collector sale)",
          },
        })
      }

      // Auto-assign the collector to the customer if not already assigned
      if (!customer.assignedCollectorId && membership?.id) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { assignedCollectorId: membership.id },
        })
      }

      return newPurchase
    })

    // Create audit log with all product info
    const productNames = payload.items.map(item => item.productName).join(", ")
    const totalQuantity = payload.items.reduce((sum, item) => sum + item.quantity, 0)

    await createAuditLog({
      actorUserId: user.id,
      action: "COLLECTOR_SALE_CREATED",
      entityType: "Purchase",
      entityId: purchase.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        productCount: payload.items.length,
        productNames,
        totalQuantity,
        totalAmount,
        downPayment,
        tenorDays: payload.tenorDays,
        collectorId: membership?.id,
      },
    })

    // AUTO-GENERATE WAYBILL for CASH sales (they are completed immediately)
    if (payload.purchaseType === "CASH" && outstandingBalance === 0) {
      const year = new Date().getFullYear()
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 6).toUpperCase()
      const waybillNumber = `WB-${year}-${timestamp}${random}`

      await prisma.waybill.create({
        data: {
          waybillNumber,
          purchaseId: purchase.id,
          recipientName: `${customer.firstName} ${customer.lastName}`,
          recipientPhone: customer.phone,
          deliveryAddress: customer.address || "N/A",
          deliveryCity: customer.city,
          deliveryRegion: customer.region,
          specialInstructions: `Cash sale by Collector - Ready for delivery`,
          generatedById: user.id,
        },
      })

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { deliveryStatus: "SCHEDULED" },
      })
    }

    revalidatePath(`/collector/${shopSlug}/dashboard`)
    revalidatePath(`/collector/${shopSlug}/new-sale`)
    revalidatePath(`/collector/${shopSlug}/products`)
    revalidatePath(`/shop-admin/${shopSlug}/dashboard`)
    revalidatePath(`/shop-admin/${shopSlug}/products`)

    return {
      success: true,
      data: {
        purchaseId: purchase.id,
        purchaseNumber,
        totalAmount,
        downPayment,
        outstandingBalance,
        dueDate: dueDate.toISOString(),
      },
    }
  } catch (error) {
    console.error("Error creating collector sale:", error)
    return { success: false, error: "Failed to create sale" }
  }
}

// ============================================
// GET COLLECTORS FOR DROPDOWN
// ============================================

export interface CollectorOption {
  id: string
  name: string
}

export async function getCollectorsForDropdown(shopSlug: string): Promise<CollectorOption[]> {
  const { shop } = await requireCollectorForShop(shopSlug)

  const members = await prisma.shopMember.findMany({
    where: {
      shopId: shop.id,
      role: Role.DEBT_COLLECTOR,
    },
    include: {
      user: true,
    },
  })

  return members.map((m) => ({
    id: m.id,
    name: m.user.name || m.user.email || "Unknown",
  }))
}

// ============================================
// QUICK CREATE CUSTOMER (FOR COLLECTORS)
// ============================================

export async function createQuickCustomerAsCollector(
  shopSlug: string,
  payload: {
    firstName: string
    lastName: string
    phone: string
    email?: string | null
    idType?: string | null
    idNumber?: string | null
    address?: string | null
    city?: string | null
    region?: string | null
    preferredPayment?: PaymentPreference
    notes?: string | null
  }
): Promise<ActionResult> {
  try {
    const { user, shop, membership } = await requireCollectorForShop(shopSlug)

    // Validate required fields
    if (!payload.firstName || !payload.lastName || !payload.phone) {
      return { success: false, error: "First name, last name, and phone are required" }
    }

    // Check for duplicate phone
    const existing = await prisma.customer.findFirst({
      where: { phone: payload.phone, shopId: shop.id },
    })

    if (existing) {
      return { success: false, error: "A customer with this phone number already exists" }
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email || null,
        idType: payload.idType || null,
        idNumber: payload.idNumber || null,
        address: payload.address || null,
        city: payload.city || null,
        region: payload.region || null,
        preferredPayment: payload.preferredPayment || "BOTH",
        notes: payload.notes || null,
        assignedCollectorId: membership?.id || null, // Auto-assign to this collector
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_CREATED_BY_COLLECTOR",
      entityType: "Customer",
      entityId: customer.id,
      metadata: {
        shopId: shop.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
      },
    })

    revalidatePath(`/collector/${shopSlug}`)
    return {
      success: true,
      data: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      },
    }
  } catch (error) {
    console.error("Create customer error:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

// ============================================
// BILL DATA FOR COLLECTOR
// ============================================

export interface CollectorBillData {
  purchaseId: string
  purchaseNumber: string
  purchaseType: string
  createdAt: Date
  dueDate: Date | null
  customer: {
    name: string
    phone: string
    address: string | null
    city: string | null
    region: string | null
  }
  shop: {
    name: string
    phone: string | null
    address: string | null
  }
  items: {
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  subtotal: number
  interestAmount: number
  totalAmount: number
  downPayment: number
  amountPaid: number
  outstandingBalance: number
  installments: number
  interestRate: number
  interestType: string
  collectorName: string | null
}

export async function getCollectorBillData(shopSlug: string, purchaseId: string): Promise<CollectorBillData | null> {
  const { user, shop } = await requireCollectorForShop(shopSlug)

  const purchase = await prisma.purchase.findFirst({
    where: {
      id: purchaseId,
      customer: { shopId: shop.id },
    },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
    },
  })

  if (!purchase) {
    return null
  }

  return {
    purchaseId: purchase.id,
    purchaseNumber: purchase.purchaseNumber,
    purchaseType: purchase.purchaseType,
    createdAt: purchase.createdAt,
    dueDate: purchase.dueDate,
    customer: {
      name: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
      phone: purchase.customer.phone,
      address: purchase.customer.address,
      city: purchase.customer.city,
      region: purchase.customer.region,
    },
    shop: {
      name: shop.name,
      phone: null,
      address: null,
    },
    items: purchase.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    subtotal: Number(purchase.subtotal),
    interestAmount: Number(purchase.interestAmount),
    totalAmount: Number(purchase.totalAmount),
    downPayment: Number(purchase.downPayment),
    amountPaid: Number(purchase.amountPaid),
    outstandingBalance: Number(purchase.outstandingBalance),
    installments: purchase.installments,
    interestRate: Number(purchase.interestRate),
    interestType: purchase.interestType,
    collectorName: user.name,
  }
}
// ============================================
// PROGRESS INVOICES (Collector View)
// ============================================

export interface CollectorInvoiceData {
  id: string
  invoiceNumber: string
  paymentId: string
  purchaseId: string
  paymentAmount: number
  previousBalance: number
  newBalance: number
  totalPurchaseAmount: number
  totalAmountPaid: number
  collectorName: string | null
  confirmedByName: string | null
  paymentMethod: string
  customerName: string
  customerPhone: string
  customerAddress: string | null
  purchaseNumber: string
  purchaseType: string
  shopName: string
  businessName: string
  isPurchaseCompleted: boolean
  waybillGenerated: boolean
  waybillNumber: string | null
  notes: string | null
  generatedAt: Date
  items: {
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
}

/**
 * Get invoices for payments collected by this collector
 */
export async function getCollectorInvoices(shopSlug: string): Promise<CollectorInvoiceData[]> {
  const { user, shop, membership } = await requireCollectorForShop(shopSlug)

  const invoices = await prisma.progressInvoice.findMany({
    where: { 
      shopId: shop.id,
      collectorId: membership?.id,
    },
    include: {
      purchase: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  })

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    paymentId: inv.paymentId,
    purchaseId: inv.purchaseId,
    paymentAmount: Number(inv.paymentAmount),
    previousBalance: Number(inv.previousBalance),
    newBalance: Number(inv.newBalance),
    totalPurchaseAmount: Number(inv.totalPurchaseAmount),
    totalAmountPaid: Number(inv.totalAmountPaid),
    collectorName: inv.collectorName,
    confirmedByName: inv.confirmedByName,
    paymentMethod: inv.paymentMethod,
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    customerAddress: inv.customerAddress,
    purchaseNumber: inv.purchaseNumber,
    purchaseType: inv.purchaseType,
    shopName: inv.shopName,
    businessName: inv.businessName,
    isPurchaseCompleted: inv.isPurchaseCompleted,
    waybillGenerated: inv.waybillGenerated,
    waybillNumber: inv.waybillNumber,
    notes: inv.notes,
    generatedAt: inv.generatedAt,
    items: inv.purchase.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
  }))
}

/**
 * Get a single progress invoice by ID (for collector view)
 */
export async function getCollectorProgressInvoice(shopSlug: string, invoiceId: string): Promise<CollectorInvoiceData | null> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  const invoice = await prisma.progressInvoice.findFirst({
    where: { 
      id: invoiceId,
      shopId: shop.id,
      collectorId: membership?.id,
    },
    include: {
      purchase: {
        include: {
          items: true,
        },
      },
    },
  })

  if (!invoice) return null

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    paymentId: invoice.paymentId,
    purchaseId: invoice.purchaseId,
    paymentAmount: Number(invoice.paymentAmount),
    previousBalance: Number(invoice.previousBalance),
    newBalance: Number(invoice.newBalance),
    totalPurchaseAmount: Number(invoice.totalPurchaseAmount),
    totalAmountPaid: Number(invoice.totalAmountPaid),
    collectorName: invoice.collectorName,
    confirmedByName: invoice.confirmedByName,
    paymentMethod: invoice.paymentMethod,
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,
    purchaseNumber: invoice.purchaseNumber,
    purchaseType: invoice.purchaseType,
    shopName: invoice.shopName,
    businessName: invoice.businessName,
    isPurchaseCompleted: invoice.isPurchaseCompleted,
    waybillGenerated: invoice.waybillGenerated,
    waybillNumber: invoice.waybillNumber,
    notes: invoice.notes,
    generatedAt: invoice.generatedAt,
    items: invoice.purchase.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
  }
}
// ============================================
// COLLECTION RECEIPTS
// ============================================

export interface CollectionReceiptData {
  id: string
  receiptNumber: string
  amount: number
  paymentMethod: string
  reference: string | null
  notes: string | null
  paidAt: Date | null
  createdAt: Date
  isConfirmed: boolean
  rejectedAt: Date | null
  customerId: string
  customerName: string
  customerPhone: string
  purchaseId: string
  purchaseNumber: string
  outstandingBalance: number
}

export async function getCollectorReceipts(shopSlug: string): Promise<CollectionReceiptData[]> {
  const { user, shop, membership } = await requireCollectorForShop(shopSlug)

  if (!membership?.id) {
    return []
  }

  const payments = await prisma.payment.findMany({
    where: {
      collectorId: membership.id,
      purchase: {
        customer: {
          shopId: shop.id,
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
    orderBy: { createdAt: "desc" },
  })

  return payments.map((payment) => {
    const dateStr = payment.paidAt
      ? payment.paidAt.toISOString().split("T")[0].replace(/-/g, "")
      : payment.createdAt.toISOString().split("T")[0].replace(/-/g, "")
    const receiptNumber = `RCP-${dateStr}-${payment.id.slice(-6).toUpperCase()}`

    return {
      id: payment.id,
      receiptNumber,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      isConfirmed: payment.isConfirmed,
      rejectedAt: payment.rejectedAt,
      customerId: payment.purchase.customer.id,
      customerName: `${payment.purchase.customer.firstName} ${payment.purchase.customer.lastName}`,
      customerPhone: payment.purchase.customer.phone,
      purchaseId: payment.purchase.id,
      purchaseNumber: payment.purchase.purchaseNumber,
      outstandingBalance: Number(payment.purchase.outstandingBalance),
    }
  })
}

// ============================================
// DAILY REPORTS
// ============================================

import { DailyReportType, DailyReportStatus } from "../generated/prisma/client"

export interface CollectorDailyReportPayload {
  reportDate: string // ISO date string
  customersVisited: number
  paymentsCollected: number
  totalCollected: number
  notes?: string
}

export interface CollectorDailyReportData {
  id: string
  reportDate: Date
  reportType: DailyReportType
  status: DailyReportStatus
  customersVisited: number | null
  paymentsCollected: number | null
  totalCollected: number | null
  notes: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Get today's report for the current debt collector
 */
export async function getTodaysCollectorReport(shopSlug: string): Promise<CollectorDailyReportData | null> {
  const { shop, membership, user } = await requireCollectorForShop(shopSlug)
  
  let memberId: string | null = membership?.id || null
  
  if (!memberId && user.role === "SUPER_ADMIN") {
    return null
  }
  
  if (!memberId) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const report = await prisma.dailyReport.findFirst({
    where: {
      shopMemberId: memberId,
      reportType: "COLLECTION",
      reportDate: today,
    },
  })

  if (!report) return null

  return {
    id: report.id,
    reportDate: report.reportDate,
    reportType: report.reportType,
    status: report.status,
    customersVisited: report.customersVisited,
    paymentsCollected: report.paymentsCollected,
    totalCollected: report.totalCollected ? Number(report.totalCollected) : null,
    notes: report.notes,
    reviewedAt: report.reviewedAt,
    reviewNotes: report.reviewNotes,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }
}

/**
 * Get all daily reports for the current debt collector
 */
export async function getMyCollectorReports(shopSlug: string): Promise<CollectorDailyReportData[]> {
  const { shop, membership, user } = await requireCollectorForShop(shopSlug)
  
  let memberId: string | null = membership?.id || null
  
  if (!memberId) {
    return []
  }

  const reports = await prisma.dailyReport.findMany({
    where: {
      shopMemberId: memberId,
      reportType: "COLLECTION",
    },
    orderBy: { reportDate: "desc" },
    take: 30,
  })

  return reports.map((report) => ({
    id: report.id,
    reportDate: report.reportDate,
    reportType: report.reportType,
    status: report.status,
    customersVisited: report.customersVisited,
    paymentsCollected: report.paymentsCollected,
    totalCollected: report.totalCollected ? Number(report.totalCollected) : null,
    notes: report.notes,
    reviewedAt: report.reviewedAt,
    reviewNotes: report.reviewNotes,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }))
}

/**
 * Submit or update a daily collector report
 */
export async function submitCollectorDailyReport(
  shopSlug: string,
  payload: CollectorDailyReportPayload
): Promise<ActionResult> {
  try {
    const { shop, membership, user } = await requireCollectorForShop(shopSlug)
    
    let memberId: string | null = membership?.id || null
    
    if (!memberId) {
      return { success: false, error: "You must be a shop member to submit reports" }
    }

    const reportDate = new Date(payload.reportDate)
    reportDate.setHours(0, 0, 0, 0)

    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        shopMemberId: memberId,
        reportType: "COLLECTION",
        reportDate,
      },
    })

    if (existingReport && existingReport.status === "REVIEWED") {
      return { success: false, error: "This report has already been reviewed and cannot be modified" }
    }

    const report = await prisma.dailyReport.upsert({
      where: {
        id: existingReport?.id || "new-report",
      },
      create: {
        shopMemberId: memberId,
        shopId: shop.id,
        reportDate,
        reportType: "COLLECTION",
        status: "SUBMITTED",
        customersVisited: payload.customersVisited,
        paymentsCollected: payload.paymentsCollected,
        totalCollected: payload.totalCollected,
        notes: payload.notes || null,
      },
      update: {
        status: "SUBMITTED",
        customersVisited: payload.customersVisited,
        paymentsCollected: payload.paymentsCollected,
        totalCollected: payload.totalCollected,
        notes: payload.notes || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: existingReport ? "UPDATE_DAILY_REPORT" : "CREATE_DAILY_REPORT",
      entityType: "DAILY_REPORT",
      entityId: report.id,
      metadata: { reportType: "COLLECTION", reportDate: payload.reportDate },
    })

    revalidatePath(`/collector/${shopSlug}/reports`)
    return { success: true, data: report }
  } catch (error) {
    console.error("Error submitting daily report:", error)
    return { success: false, error: "Failed to submit daily report" }
  }
}

/**
 * Get auto-calculated stats for collector daily report
 */
export async function getCollectorDailyStats(shopSlug: string, date: string) {
  const { shop, membership, user } = await requireCollectorForShop(shopSlug)

  let memberId: string | null = membership?.id || null
  
  if (!memberId) {
    return {
      customersVisited: 0,
      paymentsCollected: 0,
      totalCollected: 0,
    }
  }

  const reportDate = new Date(date)
  const startOfDay = new Date(reportDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(reportDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Get payments collected today by this collector
  const payments = await prisma.payment.findMany({
    where: {
      collectorId: memberId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
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

  const uniqueCustomers = new Set(payments.map((p) => p.purchase.customer.id))
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return {
    customersVisited: uniqueCustomers.size,
    paymentsCollected: payments.length,
    totalCollected,
  }
}

// ============================================
// ENHANCED DAILY REPORT DASHBOARD
// ============================================

export interface CollectorCustomerChecklistItem {
  customerId: string
  customerName: string
  phone: string
  totalOwed: number
  lastPaymentDate: string | null
  visitedToday: boolean
  collectedToday: number
  walletDepositToday: number
}

export interface CollectorPaymentLogEntry {
  id: string
  customerName: string
  amount: number
  type: "collection" | "wallet"
  status: string
  time: string
  reference: string | null
}

export interface CollectorStreakStats {
  currentStreak: number
  longestStreak: number
  totalReportsThisMonth: number
  totalCollectedThisMonth: number
  totalCollectedThisWeek: number
  avgDailyCollection: number
  weeklyTrend: { date: string; amount: number }[]
}

export interface CollectorReportDashboardData {
  collectorName: string
  shopName: string
  businessName: string
  todaysStats: {
    customersAssigned: number
    customersVisited: number
    paymentsCollected: number
    totalCollected: number
    walletDeposits: number
    walletDepositCount: number
    pendingWallets: number
  }
  customerChecklist: CollectorCustomerChecklistItem[]
  paymentLog: CollectorPaymentLogEntry[]
  streakStats: CollectorStreakStats
  todaysReport: CollectorDailyReportData | null
  reportHistory: CollectorDailyReportData[]
}

export async function getCollectorReportDashboard(shopSlug: string): Promise<CollectorReportDashboardData> {
  const { user, shop, membership } = await requireCollectorForShop(shopSlug)
  const memberId = membership?.id || null

  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
    select: { name: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  // --- Assigned customers with outstanding balances ---
  const assignedCustomers = memberId
    ? await prisma.customer.findMany({
        where: { shopId: shop.id, assignedCollectorId: memberId, isActive: true },
        include: {
          purchases: {
            where: { status: { in: ["ACTIVE", "PENDING", "OVERDUE"] } },
            select: { id: true, outstandingBalance: true },
          },
        },
        orderBy: { firstName: "asc" },
      })
    : []

  // --- Today's payments by this collector ---
  const todaysPayments = memberId
    ? await prisma.payment.findMany({
        where: {
          collectorId: memberId,
          createdAt: { gte: today, lte: endOfDay },
        },
        include: {
          purchase: { include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        },
        orderBy: { createdAt: "desc" },
      })
    : []

  // --- Today's wallet deposits by this collector ---
  const todaysWalletDeposits = memberId
    ? await prisma.walletTransaction.findMany({
        where: {
          createdById: memberId,
          shopId: shop.id,
          type: "DEPOSIT",
          createdAt: { gte: today, lte: endOfDay },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : []

  // --- Build customer checklist ---
  const visitedCustomerIds = new Set(todaysPayments.map(p => p.purchase.customer.id))
  const walletCustomerIds = new Set(todaysWalletDeposits.map(w => w.customerId))

  // Payments aggregated by customer
  const paymentsByCustomer = new Map<string, number>()
  for (const p of todaysPayments) {
    const cid = p.purchase.customer.id
    paymentsByCustomer.set(cid, (paymentsByCustomer.get(cid) || 0) + Number(p.amount))
  }

  // Wallet deposits by customer
  const walletByCustomer = new Map<string, number>()
  for (const w of todaysWalletDeposits) {
    if (w.status !== "REJECTED") {
      walletByCustomer.set(w.customerId, (walletByCustomer.get(w.customerId) || 0) + Number(w.amount))
    }
  }

  // Get last payment date for each customer
  const customerIds = assignedCustomers.map(c => c.id)
  const lastPayments = memberId && customerIds.length > 0
    ? await prisma.payment.findMany({
        where: {
          collectorId: memberId,
          purchase: { customerId: { in: customerIds } },
          isConfirmed: true,
        },
        select: { purchase: { select: { customerId: true } }, paidAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : []

  const lastPaymentByCustomer = new Map<string, Date>()
  for (const lp of lastPayments) {
    const cid = lp.purchase.customerId
    if (!lastPaymentByCustomer.has(cid)) {
      lastPaymentByCustomer.set(cid, lp.paidAt || lp.createdAt)
    }
  }

  const customerChecklist: CollectorCustomerChecklistItem[] = assignedCustomers.map(c => ({
    customerId: c.id,
    customerName: `${c.firstName} ${c.lastName}`,
    phone: c.phone,
    totalOwed: c.purchases.reduce((s, p) => s + Number(p.outstandingBalance), 0),
    lastPaymentDate: lastPaymentByCustomer.has(c.id)
      ? lastPaymentByCustomer.get(c.id)!.toISOString()
      : null,
    visitedToday: visitedCustomerIds.has(c.id) || walletCustomerIds.has(c.id),
    collectedToday: paymentsByCustomer.get(c.id) || 0,
    walletDepositToday: walletByCustomer.get(c.id) || 0,
  }))

  // --- Payment log ---
  const paymentLog: CollectorPaymentLogEntry[] = [
    ...todaysPayments.map(p => ({
      id: p.id,
      customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
      amount: Number(p.amount),
      type: "collection" as const,
      status: p.isConfirmed ? "Confirmed" : "Pending",
      time: (p.paidAt || p.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      reference: p.reference,
    })),
    ...todaysWalletDeposits.map(w => ({
      id: w.id,
      customerName: `${w.customer.firstName} ${w.customer.lastName}`,
      amount: Number(w.amount),
      type: "wallet" as const,
      status: w.status === "CONFIRMED" ? "Confirmed" : w.status === "REJECTED" ? "Rejected" : "Pending",
      time: w.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      reference: w.reference,
    })),
  ].sort((a, b) => b.time.localeCompare(a.time))

  // --- Streak & performance ---
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday

  const allReports = memberId
    ? await prisma.dailyReport.findMany({
        where: { shopMemberId: memberId, reportType: "COLLECTION" },
        orderBy: { reportDate: "desc" },
        take: 90,
      })
    : []

  // Current streak
  let currentStreak = 0
  const sortedDates = allReports.map(r => {
    const d = new Date(r.reportDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })
  const uniqueDates = [...new Set(sortedDates)].sort((a, b) => b - a)
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    expected.setHours(0, 0, 0, 0)
    if (uniqueDates[i] === expected.getTime()) {
      currentStreak++
    } else if (i === 0 && uniqueDates[0] < expected.getTime()) {
      // Today not yet reported, check from yesterday
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      if (uniqueDates[0] === yesterday.getTime()) {
        currentStreak++
      } else break
    } else break
  }

  // Longest streak (from last 90 reports)
  let longestStreak = 0
  let tempStreak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = uniqueDates[i - 1] - uniqueDates[i]
    if (diff === 86400000) { // 1 day
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)

  const monthReports = allReports.filter(r => new Date(r.reportDate) >= startOfMonth)
  const weekReports = allReports.filter(r => new Date(r.reportDate) >= startOfWeek)

  const totalCollectedThisMonth = monthReports.reduce((s, r) => s + Number(r.totalCollected || 0), 0)
  const totalCollectedThisWeek = weekReports.reduce((s, r) => s + Number(r.totalCollected || 0), 0)
  const avgDailyCollection = monthReports.length > 0 ? totalCollectedThisMonth / monthReports.length : 0

  // Weekly trend (last 7 days)
  const weeklyTrend: { date: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateKey = d.toISOString().split("T")[0]
    const dayReport = allReports.find(r => {
      const rd = new Date(r.reportDate)
      return rd.toISOString().split("T")[0] === dateKey
    })
    weeklyTrend.push({ date: dateKey, amount: Number(dayReport?.totalCollected || 0) })
  }

  // --- Today's report ---
  const todaysReportRecord = memberId
    ? await prisma.dailyReport.findFirst({
        where: { shopMemberId: memberId, reportType: "COLLECTION", reportDate: today },
      })
    : null

  const todaysReport: CollectorDailyReportData | null = todaysReportRecord
    ? {
        id: todaysReportRecord.id,
        reportDate: todaysReportRecord.reportDate,
        reportType: todaysReportRecord.reportType,
        status: todaysReportRecord.status,
        customersVisited: todaysReportRecord.customersVisited,
        paymentsCollected: todaysReportRecord.paymentsCollected,
        totalCollected: todaysReportRecord.totalCollected ? Number(todaysReportRecord.totalCollected) : null,
        notes: todaysReportRecord.notes,
        reviewedAt: todaysReportRecord.reviewedAt,
        reviewNotes: todaysReportRecord.reviewNotes,
        createdAt: todaysReportRecord.createdAt,
        updatedAt: todaysReportRecord.updatedAt,
      }
    : null

  // --- Report history ---
  const reportHistory = allReports.slice(0, 30).map(r => ({
    id: r.id,
    reportDate: r.reportDate,
    reportType: r.reportType,
    status: r.status,
    customersVisited: r.customersVisited,
    paymentsCollected: r.paymentsCollected,
    totalCollected: r.totalCollected ? Number(r.totalCollected) : null,
    notes: r.notes,
    reviewedAt: r.reviewedAt,
    reviewNotes: r.reviewNotes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))

  // Stats
  const totalCollectedPayments = todaysPayments.reduce((s, p) => s + Number(p.amount), 0)
  const confirmedWallets = todaysWalletDeposits.filter(w => w.status === "CONFIRMED")
  const pendingWallets = todaysWalletDeposits.filter(w => w.status === "PENDING")
  const totalWalletAmount = todaysWalletDeposits.filter(w => w.status !== "REJECTED").reduce((s, w) => s + Number(w.amount), 0)

  return {
    collectorName: user.name || "Collector",
    shopName: shop.name,
    businessName: business?.name || "Business",
    todaysStats: {
      customersAssigned: assignedCustomers.length,
      customersVisited: visitedCustomerIds.size + [...walletCustomerIds].filter(id => !visitedCustomerIds.has(id)).length,
      paymentsCollected: todaysPayments.length,
      totalCollected: totalCollectedPayments,
      walletDeposits: totalWalletAmount,
      walletDepositCount: todaysWalletDeposits.filter(w => w.status !== "REJECTED").length,
      pendingWallets: pendingWallets.length,
    },
    customerChecklist,
    paymentLog,
    streakStats: {
      currentStreak,
      longestStreak,
      totalReportsThisMonth: monthReports.length,
      totalCollectedThisMonth,
      totalCollectedThisWeek,
      avgDailyCollection,
      weeklyTrend,
    },
    todaysReport,
    reportHistory,
  }
}

// ============================================
// PDF DATA FOR COLLECTOR REPORTS
// ============================================

export interface CollectorPDFReportData {
  collectorName: string
  shopName: string
  businessName: string
  dateRange: { start: string; end: string }
  totalDaysWorked: number
  totalCollected: number
  totalWalletDeposits: number
  totalCustomersVisited: number
  reports: {
    date: string
    customersVisited: number
    paymentsCollected: number
    totalCollected: number
    walletDeposits: number
    status: string
  }[]
  walletSummary: {
    totalPending: number
    totalConfirmed: number
    totalRejected: number
    pendingCount: number
    confirmedCount: number
  }
}

export async function getCollectorPDFReportData(
  shopSlug: string,
  startDate: string,
  endDate: string
): Promise<CollectorPDFReportData> {
  const { user, shop, membership } = await requireCollectorForShop(shopSlug)
  const memberId = membership?.id || null

  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
    select: { name: true },
  })

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  // Daily reports in range
  const reports = memberId
    ? await prisma.dailyReport.findMany({
        where: {
          shopMemberId: memberId,
          reportType: "COLLECTION",
          reportDate: { gte: start, lte: end },
        },
        orderBy: { reportDate: "desc" },
      })
    : []

  // Wallet transactions in range
  const walletTxns = memberId
    ? await prisma.walletTransaction.findMany({
        where: {
          createdById: memberId,
          shopId: shop.id,
          type: "DEPOSIT",
          createdAt: { gte: start, lte: end },
        },
        select: { amount: true, status: true, createdAt: true },
      })
    : []

  // Group wallet deposits by date
  const walletByDate = new Map<string, number>()
  for (const w of walletTxns) {
    if (w.status !== "REJECTED") {
      const dk = new Date(w.createdAt).toISOString().split("T")[0]
      walletByDate.set(dk, (walletByDate.get(dk) || 0) + Number(w.amount))
    }
  }

  const pendingWallets = walletTxns.filter(w => w.status === "PENDING")
  const confirmedWallets = walletTxns.filter(w => w.status === "CONFIRMED")
  const rejectedWallets = walletTxns.filter(w => w.status === "REJECTED")

  const reportRows = reports.map(r => {
    const dk = new Date(r.reportDate).toISOString().split("T")[0]
    return {
      date: new Date(r.reportDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      customersVisited: r.customersVisited || 0,
      paymentsCollected: r.paymentsCollected || 0,
      totalCollected: Number(r.totalCollected || 0),
      walletDeposits: walletByDate.get(dk) || 0,
      status: r.status === "REVIEWED" ? "Reviewed" : r.status === "SUBMITTED" ? "Submitted" : "Draft",
    }
  })

  return {
    collectorName: user.name || "Collector",
    shopName: shop.name,
    businessName: business?.name || "Business",
    dateRange: { start: startDate, end: endDate },
    totalDaysWorked: reports.length,
    totalCollected: reports.reduce((s, r) => s + Number(r.totalCollected || 0), 0),
    totalWalletDeposits: walletTxns.filter(w => w.status !== "REJECTED").reduce((s, w) => s + Number(w.amount), 0),
    totalCustomersVisited: reports.reduce((s, r) => s + (r.customersVisited || 0), 0),
    reports: reportRows,
    walletSummary: {
      totalPending: pendingWallets.reduce((s, w) => s + Number(w.amount), 0),
      totalConfirmed: confirmedWallets.reduce((s, w) => s + Number(w.amount), 0),
      totalRejected: rejectedWallets.reduce((s, w) => s + Number(w.amount), 0),
      pendingCount: pendingWallets.length,
      confirmedCount: confirmedWallets.length,
    },
  }
}