"use server"

import prisma from "../../lib/prisma"
import { requireSalesStaffForShop, createAuditLog } from "../../lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma, PaymentPreference, DeliveryStatus } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// ============================================
// DASHBOARD DATA
// ============================================

export interface SalesStaffDashboard {
  shopName: string
  staffName: string | null
  totalProducts: number
  totalCustomers: number
  totalSalesToday: number
  totalSalesThisMonth: number
}

export async function getSalesStaffDashboard(shopSlug: string): Promise<SalesStaffDashboard> {
  const { user, shop } = await requireSalesStaffForShop(shopSlug)

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [products, customers, salesToday, salesThisMonth] = await Promise.all([
    prisma.product.count({
      where: { shopId: shop.id, isActive: true },
    }),
    prisma.customer.count({
      where: { shopId: shop.id, isActive: true },
    }),
    prisma.purchase.count({
      where: {
        customer: { shopId: shop.id },
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.purchase.count({
      where: {
        customer: { shopId: shop.id },
        createdAt: { gte: startOfMonth },
      },
    }),
  ])

  return {
    shopName: shop.name,
    staffName: user.name,
    totalProducts: products,
    totalCustomers: customers,
    totalSalesToday: salesToday,
    totalSalesThisMonth: salesThisMonth,
  }
}

// ============================================
// PRODUCT DATA (Read Only for Sales Staff)
// ============================================

export interface ProductForSale {
  id: string
  name: string
  description: string | null
  sku: string | null
  price: number
  cashPrice: number
  layawayPrice: number
  creditPrice: number
  stockQuantity: number
  categoryName: string | null
  categoryColor: string | null
  imageUrl: string | null
}

export async function getProductsForSale(shopSlug: string): Promise<ProductForSale[]> {
  await requireSalesStaffForShop(shopSlug)

  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
  })

  if (!shop) return []

  const products = await prisma.product.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
    },
    include: {
      category: {
        select: { name: true, color: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    sku: p.sku,
    price: Number(p.price),
    cashPrice: Number(p.cashPrice),
    layawayPrice: Number(p.layawayPrice),
    creditPrice: Number(p.creditPrice),
    stockQuantity: p.stockQuantity,
    categoryName: p.category?.name || null,
    categoryColor: p.category?.color || null,
    imageUrl: p.imageUrl,
  }))
}

// ============================================
// CUSTOMER DATA
// ============================================

export interface CustomerForSale {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
}

export async function getCustomersForSale(shopSlug: string): Promise<CustomerForSale[]> {
  await requireSalesStaffForShop(shopSlug)

  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
  })

  if (!shop) return []

  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
    },
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  })

  return customers
}

// ============================================
// CREATE CUSTOMER (Quick Add)
// ============================================

export interface QuickCustomerPayload {
  firstName: string
  lastName: string
  phone: string
  email?: string | null
}

export async function createQuickCustomer(
  shopSlug: string,
  payload: QuickCustomerPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireSalesStaffForShop(shopSlug)

    if (!payload.firstName || payload.firstName.trim().length === 0) {
      return { success: false, error: "First name is required" }
    }

    if (!payload.lastName || payload.lastName.trim().length === 0) {
      return { success: false, error: "Last name is required" }
    }

    if (!payload.phone || payload.phone.trim().length < 10) {
      return { success: false, error: "Valid phone number is required" }
    }

    // Check for duplicate phone
    const existingPhone = await prisma.customer.findFirst({
      where: { shopId: shop.id, phone: payload.phone.trim() },
    })

    if (existingPhone) {
      return { success: false, error: "A customer with this phone number already exists" }
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        email: payload.email?.trim() || null,
        preferredPayment: "BOTH" as PaymentPreference,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_CREATED_BY_STAFF",
      entityType: "Customer",
      entityId: customer.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
      },
    })

    revalidatePath(`/sales-staff/${shopSlug}/dashboard`)
    revalidatePath(`/sales-staff/${shopSlug}/new-sale`)

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
    console.error("Error creating customer:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

// ============================================
// CREATE PURCHASE (SALE)
// ============================================

export type PurchaseTypeOption = "CASH" | "LAYAWAY" | "CREDIT"

export interface SalePayload {
  customerId: string
  productId: string
  quantity: number
  downPayment: number
  tenorDays: number
  purchaseType: PurchaseTypeOption
}

export async function createSale(
  shopSlug: string,
  payload: SalePayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireSalesStaffForShop(shopSlug)

    // Validate inputs
    if (!payload.customerId) {
      return { success: false, error: "Customer is required" }
    }

    if (!payload.productId) {
      return { success: false, error: "Product is required" }
    }

    if (payload.quantity < 1) {
      return { success: false, error: "Quantity must be at least 1" }
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

    // Verify product belongs to shop and has stock
    const product = await prisma.product.findFirst({
      where: { id: payload.productId, shopId: shop.id, isActive: true },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    if (product.stockQuantity < payload.quantity) {
      return { success: false, error: `Insufficient stock. Only ${product.stockQuantity} available.` }
    }

    // Get shop policy for interest calculation
    const policy = await prisma.shopPolicy.findUnique({
      where: { shopId: shop.id },
    })

    if (!policy) {
      return { success: false, error: "Shop policy not configured. Please contact your administrator." }
    }

    // Check tenor against policy
    if (payload.tenorDays > policy.maxTenorDays) {
      return { success: false, error: `Tenor cannot exceed ${policy.maxTenorDays} days` }
    }

    // Get the appropriate price based on purchase type
    let unitPrice: number
    switch (payload.purchaseType) {
      case "CASH":
        unitPrice = Number(product.cashPrice)
        break
      case "LAYAWAY":
        unitPrice = Number(product.layawayPrice)
        break
      case "CREDIT":
      default:
        unitPrice = Number(product.creditPrice)
        break
    }

    // Fallback to legacy price if tier price is 0
    if (unitPrice === 0) {
      unitPrice = Number(product.price)
    }

    const subtotal = unitPrice * payload.quantity
    const interestRate = Number(policy.interestRate) / 100

    // For CASH purchases, no interest
    let interestAmount = 0
    if (payload.purchaseType !== "CASH") {
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
      // Decrement stock
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: { decrement: payload.quantity } },
      })

      // Create purchase
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
          installments: payload.purchaseType === "CASH" ? 1 : Math.ceil(payload.tenorDays / 30), // Monthly installments
          startDate: new Date(),
          dueDate,
          interestType: policy.interestType,
          interestRate: policy.interestRate,
          notes: `${payload.purchaseType} sale by ${user.name}`,
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              quantity: payload.quantity,
              unitPrice: new Prisma.Decimal(unitPrice),
              totalPrice: new Prisma.Decimal(subtotal),
            },
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
            notes: "Down payment at time of purchase",
          },
        })
      }

      return newPurchase
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "SALE_CREATED",
      entityType: "Purchase",
      entityId: purchase.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        productId: product.id,
        productName: product.name,
        quantity: payload.quantity,
        totalAmount,
        downPayment,
        tenorDays: payload.tenorDays,
      },
    })

    revalidatePath(`/sales-staff/${shopSlug}/dashboard`)
    revalidatePath(`/sales-staff/${shopSlug}/new-sale`)
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
    console.error("Error creating sale:", error)
    return { success: false, error: "Failed to create sale" }
  }
}

// ============================================
// FULL CUSTOMER MANAGEMENT
// ============================================

export interface FullCustomerData {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  idType: string | null
  idNumber: string | null
  address: string | null
  city: string | null
  region: string | null
  preferredPayment: PaymentPreference
  assignedCollectorId: string | null
  assignedCollectorName: string | null
  isActive: boolean
  createdAt: Date
  totalPurchases: number
  totalOutstanding: number
}

export async function getFullCustomers(shopSlug: string): Promise<FullCustomerData[]> {
  await requireSalesStaffForShop(shopSlug)

  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
  })

  if (!shop) return []

  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    include: {
      assignedCollector: {
        include: { user: true },
      },
      purchases: {
        select: {
          totalAmount: true,
          outstandingBalance: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return customers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    idType: c.idType,
    idNumber: c.idNumber,
    address: c.address,
    city: c.city,
    region: c.region,
    preferredPayment: c.preferredPayment,
    assignedCollectorId: c.assignedCollectorId,
    assignedCollectorName: c.assignedCollector?.user.name || null,
    isActive: c.isActive,
    createdAt: c.createdAt,
    totalPurchases: c.purchases.length,
    totalOutstanding: c.purchases.reduce((sum, p) => sum + Number(p.outstandingBalance), 0),
  }))
}

export interface CreateCustomerPayload {
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
  assignedCollectorId?: string | null
}

export async function createFullCustomer(
  shopSlug: string,
  payload: CreateCustomerPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireSalesStaffForShop(shopSlug)

    if (!payload.firstName?.trim()) {
      return { success: false, error: "First name is required" }
    }

    if (!payload.lastName?.trim()) {
      return { success: false, error: "Last name is required" }
    }

    if (!payload.phone || payload.phone.trim().length < 10) {
      return { success: false, error: "Valid phone number is required" }
    }

    // Check for duplicate phone
    const existingPhone = await prisma.customer.findFirst({
      where: { shopId: shop.id, phone: payload.phone.trim() },
    })

    if (existingPhone) {
      return { success: false, error: "A customer with this phone number already exists" }
    }

    // Verify collector if provided
    if (payload.assignedCollectorId) {
      const collector = await prisma.shopMember.findFirst({
        where: {
          id: payload.assignedCollectorId,
          shopId: shop.id,
          role: "DEBT_COLLECTOR",
          isActive: true,
        },
      })

      if (!collector) {
        return { success: false, error: "Invalid debt collector" }
      }
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        email: payload.email?.trim() || null,
        idType: payload.idType?.trim() || null,
        idNumber: payload.idNumber?.trim() || null,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        region: payload.region?.trim() || null,
        preferredPayment: payload.preferredPayment || "BOTH",
        assignedCollectorId: payload.assignedCollectorId || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_CREATED_BY_STAFF",
      entityType: "Customer",
      entityId: customer.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
      },
    })

    revalidatePath(`/sales-staff/${shopSlug}/customers`)
    revalidatePath(`/sales-staff/${shopSlug}/dashboard`)

    return { success: true, data: { customerId: customer.id } }
  } catch (error) {
    console.error("Error creating customer:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

// ============================================
// GET DEBT COLLECTORS FOR ASSIGNMENT
// ============================================

export interface CollectorOption {
  id: string
  name: string
  phone: string | null
}

export async function getDebtCollectorsForAssignment(shopSlug: string): Promise<CollectorOption[]> {
  await requireSalesStaffForShop(shopSlug)

  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
  })

  if (!shop) return []

  const collectors = await prisma.shopMember.findMany({
    where: {
      shopId: shop.id,
      role: "DEBT_COLLECTOR",
      isActive: true,
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: {
      user: { name: "asc" },
    },
  })

  return collectors.map((c) => ({
    id: c.id,
    name: c.user.name || c.user.email,
    phone: null, // User doesn't have phone in schema
  }))
}

// ============================================
// ASSIGN DEBT COLLECTOR TO CUSTOMER
// ============================================

export async function assignCollectorToCustomer(
  shopSlug: string,
  customerId: string,
  collectorId: string | null
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireSalesStaffForShop(shopSlug)

    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Verify collector if provided
    if (collectorId) {
      const collector = await prisma.shopMember.findFirst({
        where: {
          id: collectorId,
          shopId: shop.id,
          role: "DEBT_COLLECTOR",
          isActive: true,
        },
      })

      if (!collector) {
        return { success: false, error: "Invalid debt collector" }
      }
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { assignedCollectorId: collectorId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: collectorId ? "COLLECTOR_ASSIGNED" : "COLLECTOR_UNASSIGNED",
      entityType: "Customer",
      entityId: customerId,
      metadata: {
        shopId: shop.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        collectorId,
      },
    })

    revalidatePath(`/sales-staff/${shopSlug}/customers`)

    return { success: true }
  } catch (error) {
    console.error("Error assigning collector:", error)
    return { success: false, error: "Failed to assign collector" }
  }
}

// ============================================
// DELIVERY MANAGEMENT
// ============================================

export interface DeliveryData {
  purchaseId: string
  purchaseNumber: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryStatus: DeliveryStatus
  scheduledDelivery: Date | null
  deliveredAt: Date | null
  deliveredByName: string | null
  items: Array<{
    productName: string
    quantity: number
  }>
  totalAmount: number
  hasWaybill: boolean
  waybillNumber: string | null
  createdAt: Date
}

export async function getPendingDeliveries(shopSlug: string): Promise<DeliveryData[]> {
  const { shop } = await requireSalesStaffForShop(shopSlug)

  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: shop.id },
      deliveryStatus: { in: ["PENDING", "SCHEDULED", "IN_TRANSIT"] },
    },
    include: {
      customer: true,
      items: true,
      deliveredBy: {
        include: { user: true },
      },
      waybill: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return purchases.map((p) => ({
    purchaseId: p.id,
    purchaseNumber: p.purchaseNumber,
    customerName: `${p.customer.firstName} ${p.customer.lastName}`,
    customerPhone: p.customer.phone,
    deliveryAddress: p.deliveryAddress || p.customer.address || "No address",
    deliveryStatus: p.deliveryStatus,
    scheduledDelivery: p.scheduledDelivery,
    deliveredAt: p.deliveredAt,
    deliveredByName: p.deliveredBy?.user.name || null,
    items: p.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
    })),
    totalAmount: Number(p.totalAmount),
    hasWaybill: !!p.waybill,
    waybillNumber: p.waybill?.waybillNumber || null,
    createdAt: p.createdAt,
  }))
}

export async function getAllDeliveries(shopSlug: string): Promise<DeliveryData[]> {
  const { shop } = await requireSalesStaffForShop(shopSlug)

  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: shop.id },
    },
    include: {
      customer: true,
      items: true,
      deliveredBy: {
        include: { user: true },
      },
      waybill: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit for performance
  })

  return purchases.map((p) => ({
    purchaseId: p.id,
    purchaseNumber: p.purchaseNumber,
    customerName: `${p.customer.firstName} ${p.customer.lastName}`,
    customerPhone: p.customer.phone,
    deliveryAddress: p.deliveryAddress || p.customer.address || "No address",
    deliveryStatus: p.deliveryStatus,
    scheduledDelivery: p.scheduledDelivery,
    deliveredAt: p.deliveredAt,
    deliveredByName: p.deliveredBy?.user.name || null,
    items: p.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
    })),
    totalAmount: Number(p.totalAmount),
    hasWaybill: !!p.waybill,
    waybillNumber: p.waybill?.waybillNumber || null,
    createdAt: p.createdAt,
  }))
}

// ============================================
// READY FOR DELIVERY (Fully Paid Purchases)
// ============================================

export interface ReadyForDeliveryData {
  purchaseId: string
  purchaseNumber: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryStatus: DeliveryStatus
  items: Array<{
    productName: string
    quantity: number
  }>
  totalAmount: number
  amountPaid: number
  waybillNumber: string
  waybillGeneratedAt: Date
  paymentCompletedAt: Date | null
  createdAt: Date
}

/**
 * Get purchases that are fully paid (COMPLETED status) with waybills
 * and ready for delivery (not yet delivered)
 */
export async function getReadyForDelivery(shopSlug: string): Promise<ReadyForDeliveryData[]> {
  const { shop } = await requireSalesStaffForShop(shopSlug)

  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: shop.id },
      status: "COMPLETED", // Fully paid
      deliveryStatus: { in: ["PENDING", "SCHEDULED", "IN_TRANSIT"] }, // Not yet delivered
      waybill: { isNot: null }, // Has waybill
    },
    include: {
      customer: true,
      items: true,
      waybill: true,
      payments: {
        where: { isConfirmed: true },
        orderBy: { confirmedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return purchases.map((p) => ({
    purchaseId: p.id,
    purchaseNumber: p.purchaseNumber,
    customerName: `${p.customer.firstName} ${p.customer.lastName}`,
    customerPhone: p.customer.phone,
    deliveryAddress: p.waybill?.deliveryAddress || p.deliveryAddress || p.customer.address || "No address",
    deliveryStatus: p.deliveryStatus,
    items: p.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
    })),
    totalAmount: Number(p.totalAmount),
    amountPaid: Number(p.amountPaid),
    waybillNumber: p.waybill!.waybillNumber,
    waybillGeneratedAt: p.waybill!.generatedAt,
    paymentCompletedAt: p.payments[0]?.confirmedAt || null,
    createdAt: p.createdAt,
  }))
}

/**
 * Get count of purchases ready for delivery (for navigation badges)
 */
export async function getReadyForDeliveryCount(shopSlug: string): Promise<number> {
  const { shop } = await requireSalesStaffForShop(shopSlug)

  return prisma.purchase.count({
    where: {
      customer: { shopId: shop.id },
      status: "COMPLETED",
      deliveryStatus: { in: ["PENDING", "SCHEDULED"] },
      waybill: { isNot: null },
    },
  })
}

export async function updateDeliveryStatus(
  shopSlug: string,
  purchaseId: string,
  status: DeliveryStatus,
  scheduledDate?: Date
): Promise<ActionResult> {
  try {
    const { user, shop, membership } = await requireSalesStaffForShop(shopSlug)

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: { shopId: shop.id },
      },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    const updateData: Prisma.PurchaseUpdateInput = {
      deliveryStatus: status,
    }

    if (status === "SCHEDULED" && scheduledDate) {
      updateData.scheduledDelivery = scheduledDate
    }

    if (status === "DELIVERED") {
      updateData.deliveredAt = new Date()
      if (membership) {
        updateData.deliveredBy = { connect: { id: membership.id } }
      }
    }

    await prisma.purchase.update({
      where: { id: purchaseId },
      data: updateData,
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "DELIVERY_STATUS_UPDATED",
      entityType: "Purchase",
      entityId: purchaseId,
      metadata: {
        shopId: shop.id,
        purchaseNumber: purchase.purchaseNumber,
        newStatus: status,
      },
    })

    revalidatePath(`/sales-staff/${shopSlug}/deliveries`)

    return { success: true }
  } catch (error) {
    console.error("Error updating delivery status:", error)
    return { success: false, error: "Failed to update delivery status" }
  }
}

export async function markAsDelivered(
  shopSlug: string,
  purchaseId: string
): Promise<ActionResult> {
  return updateDeliveryStatus(shopSlug, purchaseId, "DELIVERED")
}

// ============================================
// WAYBILL GENERATION
// ============================================

export interface WaybillData {
  id: string
  waybillNumber: string
  purchaseNumber: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryCity: string | null
  deliveryRegion: string | null
  specialInstructions: string | null
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
  }>
  subtotal: number
  generatedAt: Date
  receivedBy: string | null
}

export async function generateWaybill(
  shopSlug: string,
  purchaseId: string,
  overrides?: {
    recipientName?: string
    recipientPhone?: string
    deliveryAddress?: string
    deliveryCity?: string
    deliveryRegion?: string
    specialInstructions?: string
  }
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireSalesStaffForShop(shopSlug)

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: { shopId: shop.id },
      },
      include: {
        customer: true,
        items: true,
        waybill: true,
      },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    if (purchase.waybill) {
      return { success: false, error: "Waybill already exists for this purchase" }
    }

    // Generate waybill number
    const year = new Date().getFullYear()
    const waybillCount = await prisma.waybill.count()
    const waybillNumber = `WB-${year}-${String(waybillCount + 1).padStart(5, "0")}`

    const waybill = await prisma.waybill.create({
      data: {
        waybillNumber,
        purchaseId: purchase.id,
        recipientName: overrides?.recipientName || `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        recipientPhone: overrides?.recipientPhone || purchase.customer.phone,
        deliveryAddress: overrides?.deliveryAddress || purchase.deliveryAddress || purchase.customer.address || "N/A",
        deliveryCity: overrides?.deliveryCity || purchase.customer.city,
        deliveryRegion: overrides?.deliveryRegion || purchase.customer.region,
        specialInstructions: overrides?.specialInstructions,
        generatedById: user.id,
      },
    })

    // Update purchase delivery status if pending
    if (purchase.deliveryStatus === "PENDING") {
      await prisma.purchase.update({
        where: { id: purchaseId },
        data: { deliveryStatus: "SCHEDULED" },
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "WAYBILL_GENERATED",
      entityType: "Waybill",
      entityId: waybill.id,
      metadata: {
        shopId: shop.id,
        waybillNumber,
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
      },
    })

    revalidatePath(`/sales-staff/${shopSlug}/deliveries`)

    return { success: true, data: { waybillId: waybill.id, waybillNumber } }
  } catch (error) {
    console.error("Error generating waybill:", error)
    return { success: false, error: "Failed to generate waybill" }
  }
}

export async function getWaybill(shopSlug: string, purchaseId: string): Promise<WaybillData | null> {
  await requireSalesStaffForShop(shopSlug)

  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
  })

  if (!shop) return null

  const purchase = await prisma.purchase.findFirst({
    where: {
      id: purchaseId,
      customer: { shopId: shop.id },
    },
    include: {
      items: true,
      waybill: true,
    },
  })

  if (!purchase || !purchase.waybill) return null

  const waybill = purchase.waybill

  return {
    id: waybill.id,
    waybillNumber: waybill.waybillNumber,
    purchaseNumber: purchase.purchaseNumber,
    recipientName: waybill.recipientName,
    recipientPhone: waybill.recipientPhone,
    deliveryAddress: waybill.deliveryAddress,
    deliveryCity: waybill.deliveryCity,
    deliveryRegion: waybill.deliveryRegion,
    specialInstructions: waybill.specialInstructions,
    items: purchase.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
    subtotal: Number(purchase.subtotal),
    generatedAt: waybill.generatedAt,
    receivedBy: waybill.receivedBy,
  }
}

// ============================================
// GET CUSTOMER PURCHASES (for customer detail)
// ============================================

export interface CustomerPurchaseData {
  id: string
  purchaseNumber: string
  status: string
  deliveryStatus: DeliveryStatus
  totalAmount: number
  outstandingBalance: number
  items: Array<{
    productName: string
    quantity: number
  }>
  createdAt: Date
  dueDate: Date
  hasWaybill: boolean
}

export async function getCustomerPurchases(
  shopSlug: string,
  customerId: string
): Promise<CustomerPurchaseData[]> {
  await requireSalesStaffForShop(shopSlug)

  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
  })

  if (!shop) return []

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId: shop.id },
  })

  if (!customer) return []

  const purchases = await prisma.purchase.findMany({
    where: { customerId },
    include: {
      items: true,
      waybill: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return purchases.map((p) => ({
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    status: p.status,
    deliveryStatus: p.deliveryStatus,
    totalAmount: Number(p.totalAmount),
    outstandingBalance: Number(p.outstandingBalance),
    items: p.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
    })),
    createdAt: p.createdAt,
    dueDate: p.dueDate,
    hasWaybill: !!p.waybill,
  }))
}
