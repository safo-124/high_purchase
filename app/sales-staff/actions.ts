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
  shopId: string
  shopName: string
  staffName: string | null
  businessName: string
  businessLogoUrl: string | null
  totalProducts: number
  totalCustomers: number
  totalSalesToday: number
  totalSalesThisMonth: number
}

export async function getSalesStaffDashboard(shopSlug: string): Promise<SalesStaffDashboard> {
  const { user, shop } = await requireSalesStaffForShop(shopSlug)

  // Get business details including logo
  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
    select: { name: true, logoUrl: true },
  })

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
    shopId: shop.id,
    shopName: shop.name,
    staffName: user.name,
    businessName: business?.name || 'Business',
    businessLogoUrl: business?.logoUrl || null,
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
  lowStockThreshold: number
  categoryName: string | null
  categoryColor: string | null
  imageUrl: string | null
  hasCustomPricing: boolean
}

export async function getProductsForSale(shopSlug: string): Promise<ProductForSale[]> {
  await requireSalesStaffForShop(shopSlug)

  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
  })

  if (!shop) return []

  // Query ShopProduct to get shop-specific stock and optional pricing
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
          category: {
            select: { name: true, color: true },
          },
        },
      },
    },
    orderBy: {
      product: { name: "asc" },
    },
  })

  return shopProducts.map((sp) => {
    const p = sp.product
    const hasCustomPricing = !!(sp.costPrice || sp.cashPrice || sp.layawayPrice || sp.creditPrice)
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      sku: p.sku,
      // Use shop-specific pricing if set, otherwise fall back to product pricing
      price: Number(sp.cashPrice ?? p.price),
      cashPrice: Number(sp.cashPrice ?? p.cashPrice),
      layawayPrice: Number(sp.layawayPrice ?? p.layawayPrice),
      creditPrice: Number(sp.creditPrice ?? p.creditPrice),
      stockQuantity: sp.stockQuantity, // Use shop-specific stock
      lowStockThreshold: p.lowStockThreshold,
      categoryName: p.category?.name || null,
      categoryColor: p.category?.color || null,
      imageUrl: p.imageUrl,
      hasCustomPricing,
    }
  })
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
// GET COLLECTORS FOR DROPDOWN
// ============================================

export interface CollectorOption {
  id: string
  name: string
  email: string | null
}

export async function getCollectorsForDropdown(shopSlug: string): Promise<CollectorOption[]> {
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
    orderBy: { createdAt: "asc" },
  })

  return collectors.map((c) => ({
    id: c.id,
    name: c.user.name || "Unknown",
    email: c.user.email,
  }))
}

// ============================================
// CREATE CUSTOMER (Quick Add)
// ============================================

export interface QuickCustomerPayload {
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  idType?: string | null
  idNumber?: string | null
  address?: string | null
  city?: string | null
  region?: string | null
  preferredPayment?: "ONLINE" | "COLLECTOR" | "BOTH"
  assignedCollectorId?: string | null
  notes?: string | null
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
        idType: payload.idType?.trim() || null,
        idNumber: payload.idNumber?.trim() || null,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        region: payload.region?.trim() || null,
        preferredPayment: (payload.preferredPayment || "BOTH") as PaymentPreference,
        assignedCollectorId: payload.assignedCollectorId || null,
        notes: payload.notes?.trim() || null,
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

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface SalePayload {
  customerId: string
  items: SaleItem[]
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
          status: payload.purchaseType === "CASH" ? "COMPLETED" : (outstandingBalance === 0 ? "COMPLETED" : "ACTIVE"),
          subtotal: new Prisma.Decimal(subtotal),
          interestAmount: new Prisma.Decimal(interestAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          amountPaid: payload.purchaseType === "CASH" ? new Prisma.Decimal(totalAmount) : new Prisma.Decimal(downPayment),
          outstandingBalance: payload.purchaseType === "CASH" ? new Prisma.Decimal(0) : new Prisma.Decimal(outstandingBalance),
          downPayment: payload.purchaseType === "CASH" ? new Prisma.Decimal(totalAmount) : new Prisma.Decimal(downPayment),
          installments: payload.purchaseType === "CASH" ? 1 : Math.ceil(payload.tenorDays / 30), // Monthly installments
          startDate: new Date(),
          dueDate,
          interestType: policy?.interestType || "FLAT",
          interestRate: policy ? Number(policy.interestRate) : 0,
          deliveryStatus: payload.purchaseType === "CASH" ? "DELIVERED" : "PENDING",
          deliveredAt: payload.purchaseType === "CASH" ? new Date() : null,
          notes: `${payload.purchaseType} sale by ${user.name}`,
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

      // Create payment record
      // For CASH: record full payment; for others: record down payment if > 0
      const paymentAmount = payload.purchaseType === "CASH" ? totalAmount : downPayment
      if (paymentAmount > 0) {
        await tx.payment.create({
          data: {
            purchaseId: newPurchase.id,
            amount: new Prisma.Decimal(paymentAmount),
            paymentMethod: "CASH",
            status: "COMPLETED",
            isConfirmed: true,
            confirmedAt: new Date(),
            paidAt: new Date(),
            notes: payload.purchaseType === "CASH" ? "Full cash payment" : "Down payment at time of purchase",
          },
        })
      }

      return newPurchase
    })

    // Create audit log with all product info
    const productNames = payload.items.map(item => item.productName).join(", ")
    const totalQuantity = payload.items.reduce((sum, item) => sum + item.quantity, 0)

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
        productCount: payload.items.length,
        productNames,
        totalQuantity,
        totalAmount,
        downPayment,
        tenorDays: payload.tenorDays,
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
          specialInstructions: `Cash sale - Ready for delivery`,
          generatedById: user.id,
        },
      })

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { deliveryStatus: "SCHEDULED" },
      })
    }

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
  // Customer portal account fields
  createAccount?: boolean
  accountEmail?: string
  accountPassword?: string
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

    // If creating account, validate and check email uniqueness
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

      // Import bcrypt dynamically to hash password
      const bcrypt = await import("bcryptjs")
      const passwordHash = await bcrypt.hash(payload.accountPassword, 12)

      userAccount = await prisma.user.create({
        data: {
          email: payload.accountEmail.trim().toLowerCase(),
          name: `${payload.firstName.trim()} ${payload.lastName.trim()}`,
          passwordHash,
          role: "CUSTOMER",
        },
      })
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        email: payload.createAccount 
          ? payload.accountEmail?.trim().toLowerCase() 
          : (payload.email?.trim() || null),
        idType: payload.idType?.trim() || null,
        idNumber: payload.idNumber?.trim() || null,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        region: payload.region?.trim() || null,
        preferredPayment: payload.preferredPayment || "BOTH",
        assignedCollectorId: payload.assignedCollectorId || null,
        userId: userAccount?.id || null,
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
        hasAccount: !!userAccount,
      },
    })

    revalidatePath(`/sales-staff/${shopSlug}/customers`)
    revalidatePath(`/sales-staff/${shopSlug}/dashboard`)

    return { success: true, data: { customerId: customer.id, hasAccount: !!userAccount } }
  } catch (error) {
    console.error("Error creating customer:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

// ============================================
// GET DEBT COLLECTORS FOR ASSIGNMENT
// ============================================

// CollectorOption interface is already defined above

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
      createdAt: "asc",
    },
  })

  return collectors.map((c) => ({
    id: c.id,
    name: c.user.name || c.user.email,
    email: c.user.email,
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
  // Shop and staff info
  shopName: string
  businessName: string
  generatedByName: string | null
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
    include: { business: true },
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

  // Get the staff who generated the waybill
  let generatedByName: string | null = null
  if (waybill.generatedById) {
    const generatedBy = await prisma.user.findUnique({
      where: { id: waybill.generatedById },
    })
    generatedByName = generatedBy?.name || null
  }

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
    shopName: shop.name,
    businessName: shop.business?.name || shop.name,
    generatedByName,
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

// ============================================
// MESSAGING FUNCTIONS
// ============================================

export interface SendMessagePayload {
  customerId: string
  type: "EMAIL" | "SMS" | "IN_APP"
  subject?: string
  body: string
}

export async function sendMessageToCustomer(
  shopSlug: string,
  payload: SendMessagePayload
): Promise<ActionResult> {
  const { user, shop } = await requireSalesStaffForShop(shopSlug)

  try {
    // Verify customer belongs to this shop
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Create the message record
    const message = await prisma.message.create({
      data: {
        shopId: shop.id,
        customerId: customer.id,
        senderId: user.id,
        type: payload.type,
        subject: payload.subject,
        body: payload.body,
        status: "PENDING",
      },
    })

    // Simulate sending based on type
    if (payload.type === "EMAIL") {
      // In production: integrate with email service (SendGrid, SES, etc.)
      console.log(`[EMAIL] To: ${customer.email}, Subject: ${payload.subject}`)
      console.log(`Body: ${payload.body}`)
      
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "SENT", sentAt: new Date() },
      })
    } else if (payload.type === "SMS") {
      // In production: integrate with SMS service (Twilio, Africa's Talking, etc.)
      console.log(`[SMS] To: ${customer.phone}`)
      console.log(`Body: ${payload.body}`)
      
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "SENT", sentAt: new Date() },
      })
    } else if (payload.type === "IN_APP") {
      // Create notification for customer portal (only if customer has account)
      if (customer.userId) {
        await prisma.notification.create({
          data: {
            customerId: customer.id,
            title: payload.subject || "New Message",
            body: payload.body,
            type: "MESSAGE",
          },
        })
        
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "DELIVERED", sentAt: new Date() },
        })
      } else {
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "FAILED" },
        })
        return { 
          success: false, 
          error: "Customer doesn't have a portal account for in-app messages" 
        }
      }
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "SEND_MESSAGE",
      entityType: "Message",
      entityId: message.id,
      metadata: { type: payload.type, customerId: customer.id },
    })

    revalidatePath(`/sales-staff/${shopSlug}`)
    return { success: true, data: { messageId: message.id } }
  } catch (error) {
    console.error("Send message error:", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function sendPaymentReminder(
  shopSlug: string,
  customerId: string,
  purchaseId: string
): Promise<ActionResult> {
  const { user, shop } = await requireSalesStaffForShop(shopSlug)

  try {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    const purchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, customerId },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    const reminderBody = `Dear ${customer.firstName}, this is a friendly reminder that you have an outstanding balance of GHS ${Number(purchase.outstandingBalance).toFixed(2)} for purchase ${purchase.purchaseNumber}. Please make payment at your earliest convenience. Thank you for your patronage!`

    // Send SMS reminder
    await prisma.message.create({
      data: {
        shopId: shop.id,
        customerId: customer.id,
        senderId: user.id,
        type: "SMS",
        body: reminderBody,
        status: "SENT",
        sentAt: new Date(),
      },
    })

    console.log(`[SMS REMINDER] To: ${customer.phone}`)
    console.log(`Body: ${reminderBody}`)

    // If customer has account, also send in-app notification
    if (customer.userId) {
      await prisma.notification.create({
        data: {
          customerId: customer.id,
          title: "Payment Reminder",
          body: reminderBody,
          type: "REMINDER",
          link: `/customer/${shopSlug}/purchases`,
        },
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "SEND_PAYMENT_REMINDER",
      entityType: "Purchase",
      entityId: purchaseId,
      metadata: { customerId },
    })

    revalidatePath(`/sales-staff/${shopSlug}`)
    return { success: true }
  } catch (error) {
    console.error("Send reminder error:", error)
    return { success: false, error: "Failed to send reminder" }
  }
}

// ============================================
// BILL / RECEIPT DATA
// ============================================

export interface BillData {
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
  salesStaff: string | null
}

export async function getBillData(shopSlug: string, purchaseId: string): Promise<BillData | null> {
  const { user, shop } = await requireSalesStaffForShop(shopSlug)

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
    salesStaff: user.name,
  }
}

// ============================================
// PROGRESS INVOICES (Sales Staff View)
// ============================================

export interface SalesStaffInvoiceData {
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
 * Get all invoices for the shop (sales staff view)
 */
export async function getSalesStaffInvoices(shopSlug: string): Promise<SalesStaffInvoiceData[]> {
  const { shop } = await requireSalesStaffForShop(shopSlug)

  const invoices = await prisma.progressInvoice.findMany({
    where: { shopId: shop.id },
    include: {
      purchase: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 200,
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
 * Get a single progress invoice by ID (for sales staff view)
 */
export async function getSalesStaffProgressInvoice(shopSlug: string, invoiceId: string): Promise<SalesStaffInvoiceData | null> {
  const { shop } = await requireSalesStaffForShop(shopSlug)

  const invoice = await prisma.progressInvoice.findFirst({
    where: { 
      id: invoiceId,
      shopId: shop.id,
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
// DAILY REPORTS
// ============================================

import { DailyReportType, DailyReportStatus } from "../generated/prisma/client"

export interface DailyReportPayload {
  reportDate: string // ISO date string
  totalSalesAmount: number
  newCustomersCount: number
  newPurchasesCount: number
  itemsSoldCount: number
  notes?: string
}

export interface DailyReportData {
  id: string
  reportDate: Date
  reportType: DailyReportType
  status: DailyReportStatus
  totalSalesAmount: number | null
  newCustomersCount: number | null
  newPurchasesCount: number | null
  itemsSoldCount: number | null
  notes: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Get today's report for the current sales staff member
 */
export async function getTodaysSalesReport(shopSlug: string): Promise<DailyReportData | null> {
  const { shop, membership, user } = await requireSalesStaffForShop(shopSlug)
  
  // For SUPER_ADMIN, get membership or return null
  let memberId: string | null = membership?.id || null
  
  if (!memberId && user.role === "SUPER_ADMIN") {
    // SUPER_ADMIN doesn't have membership, return null
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
      reportType: "SALES",
      reportDate: today,
    },
  })

  if (!report) return null

  return {
    id: report.id,
    reportDate: report.reportDate,
    reportType: report.reportType,
    status: report.status,
    totalSalesAmount: report.totalSalesAmount ? Number(report.totalSalesAmount) : null,
    newCustomersCount: report.newCustomersCount,
    newPurchasesCount: report.newPurchasesCount,
    itemsSoldCount: report.itemsSoldCount,
    notes: report.notes,
    reviewedAt: report.reviewedAt,
    reviewNotes: report.reviewNotes,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }
}

/**
 * Get all daily reports for the current sales staff member
 */
export async function getMySalesReports(shopSlug: string): Promise<DailyReportData[]> {
  const { shop, membership, user } = await requireSalesStaffForShop(shopSlug)
  
  let memberId: string | null = membership?.id || null
  
  if (!memberId) {
    return []
  }

  const reports = await prisma.dailyReport.findMany({
    where: {
      shopMemberId: memberId,
      reportType: "SALES",
    },
    orderBy: { reportDate: "desc" },
    take: 30, // Last 30 reports
  })

  return reports.map((report) => ({
    id: report.id,
    reportDate: report.reportDate,
    reportType: report.reportType,
    status: report.status,
    totalSalesAmount: report.totalSalesAmount ? Number(report.totalSalesAmount) : null,
    newCustomersCount: report.newCustomersCount,
    newPurchasesCount: report.newPurchasesCount,
    itemsSoldCount: report.itemsSoldCount,
    notes: report.notes,
    reviewedAt: report.reviewedAt,
    reviewNotes: report.reviewNotes,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }))
}

/**
 * Submit or update a daily sales report
 */
export async function submitSalesDailyReport(
  shopSlug: string,
  payload: DailyReportPayload
): Promise<ActionResult> {
  try {
    const { shop, membership, user } = await requireSalesStaffForShop(shopSlug)
    
    let memberId: string | null = membership?.id || null
    
    if (!memberId) {
      return { success: false, error: "You must be a shop member to submit reports" }
    }

    const reportDate = new Date(payload.reportDate)
    reportDate.setHours(0, 0, 0, 0)

    // Check if report already exists
    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        shopMemberId: memberId,
        reportType: "SALES",
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
        reportType: "SALES",
        status: "SUBMITTED",
        totalSalesAmount: payload.totalSalesAmount,
        newCustomersCount: payload.newCustomersCount,
        newPurchasesCount: payload.newPurchasesCount,
        itemsSoldCount: payload.itemsSoldCount,
        notes: payload.notes || null,
      },
      update: {
        status: "SUBMITTED",
        totalSalesAmount: payload.totalSalesAmount,
        newCustomersCount: payload.newCustomersCount,
        newPurchasesCount: payload.newPurchasesCount,
        itemsSoldCount: payload.itemsSoldCount,
        notes: payload.notes || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: existingReport ? "UPDATE_DAILY_REPORT" : "CREATE_DAILY_REPORT",
      entityType: "DAILY_REPORT",
      entityId: report.id,
      metadata: { reportType: "SALES", reportDate: payload.reportDate },
    })

    revalidatePath(`/sales-staff/${shopSlug}/reports`)
    return { success: true, data: report }
  } catch (error) {
    console.error("Error submitting daily report:", error)
    return { success: false, error: "Failed to submit daily report" }
  }
}

/**
 * Get auto-calculated stats for sales staff daily report
 */
export async function getSalesStaffDailyStats(shopSlug: string, date: string) {
  const { shop, membership, user } = await requireSalesStaffForShop(shopSlug)

  const reportDate = new Date(date)
  const startOfDay = new Date(reportDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(reportDate)
  endOfDay.setHours(23, 59, 59, 999)

  // Get purchases created today
  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: shop.id },
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: true,
    },
  })

  // Get new customers today
  const newCustomers = await prisma.customer.count({
    where: {
      shopId: shop.id,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  const totalSalesAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
  const itemsSoldCount = purchases.reduce((sum, p) => 
    sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  )

  return {
    totalSalesAmount,
    newCustomersCount: newCustomers,
    newPurchasesCount: purchases.length,
    itemsSoldCount,
  }
}