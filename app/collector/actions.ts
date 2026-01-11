"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireCollectorForShop, createAuditLog } from "../../lib/auth"
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

  return shopProducts.map((sp) => ({
    id: sp.product.id,
    name: sp.product.name,
    sku: sp.product.sku,
    description: sp.product.description,
    price: Number(sp.product.price),
    cashPrice: Number(sp.product.cashPrice),
    layawayPrice: Number(sp.product.layawayPrice),
    creditPrice: Number(sp.product.creditPrice),
    stockQuantity: sp.stockQuantity, // Use shop-specific stock
    category: sp.product.category?.name || null,
    imageUrl: sp.product.imageUrl,
    isActive: sp.isActive,
  }))
}

// ============================================
// CUSTOMERS FOR SALE (ALL SHOP CUSTOMERS)
// ============================================

export interface CustomerForCollectorSale {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
}

export async function getCustomersForCollectorSale(shopSlug: string): Promise<CustomerForCollectorSale[]> {
  const { shop } = await requireCollectorForShop(shopSlug)

  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
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

      // Create down payment record if > 0
      if (downPayment > 0) {
        await tx.payment.create({
          data: {
            purchaseId: newPurchase.id,
            amount: new Prisma.Decimal(downPayment),
            paymentMethod: "CASH",
            status: "COMPLETED",
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
      const waybillCount = await prisma.waybill.count()
      const waybillNumber = `WB-${year}-${String(waybillCount + 1).padStart(5, "0")}`

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