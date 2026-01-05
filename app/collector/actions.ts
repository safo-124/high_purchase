"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireCollectorForShop, createAuditLog } from "../../lib/auth"
import { PaymentPreference, PaymentMethod, PurchaseStatus } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

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
  collectorName: string
  shopName: string
  assignedCustomers: number
  activeLoans: number
  totalOutstanding: number
  totalCollected: number
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
              amountPaid: true,
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
  const totalCollected = customers.reduce(
    (sum, c) => sum + c.purchases.reduce((ps, p) => ps + Number(p.amountPaid), 0),
    0
  )

  // Get recent payments collected by this collector
  const recentPayments = collectorMemberId
    ? await prisma.payment.findMany({
        where: {
          collectorId: collectorMemberId,
          status: "COMPLETED",
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
    collectorName: user.name || "Collector",
    shopName: shop.name,
    assignedCustomers,
    activeLoans,
    totalOutstanding,
    totalCollected,
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
          status: true,
          outstandingBalance: true,
          amountPaid: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return customers.map((c) => {
    const activePurchases = c.purchases.filter(
      (p) => p.status === "ACTIVE" || p.status === "PENDING" || p.status === "OVERDUE"
    )
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
      totalPaid: c.purchases.reduce((sum, p) => sum + Number(p.amountPaid), 0),
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

    // Create customer and auto-assign to this collector
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email: payload.email,
        idType: payload.idType,
        idNumber: payload.idNumber,
        address: payload.address,
        city: payload.city,
        region: payload.region,
        preferredPayment: payload.preferredPayment || "DEBT_COLLECTOR",
        assignedCollectorId: membership?.id || null, // Auto-assign to creating collector
        notes: payload.notes,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_CREATED_BY_COLLECTOR",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { shopSlug, collectorId: membership?.id },
    })

    revalidatePath(`/collector/${shopSlug}/customers`)
    return { success: true, data: customer }
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
