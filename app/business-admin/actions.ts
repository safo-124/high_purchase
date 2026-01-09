"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "../../lib/auth"
import { Role, Prisma, PurchaseStatus } from "../generated/prisma/client"

// Validation regex
const SLUG_REGEX = /^[a-z0-9-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface ShopData {
  id: string
  name: string
  shopSlug: string
  country: string
  isActive: boolean
  createdAt: Date
  productCount: number
  customerCount: number
  adminName: string | null
  adminEmail: string | null
}

export interface ShopWithMetrics extends ShopData {
  totalSales: number
  totalCollected: number
  totalOutstanding: number
  activePurchases: number
  overduePurchases: number
  staffCount: number
  collectorCount: number
}

// Business Policy Types
export interface BusinessPolicyData {
  id: string
  interestType: "FLAT" | "MONTHLY"
  interestRate: number
  graceDays: number
  maxTenorDays: number
  lateFeeFixed: number | null
  lateFeeRate: number | null
}

export interface BusinessPolicyPayload {
  interestType: "FLAT" | "MONTHLY"
  interestRate: number
  graceDays: number
  maxTenorDays: number
  lateFeeFixed?: number
  lateFeeRate?: number
}

/**
 * Get business policy
 */
export async function getBusinessPolicy(businessSlug: string): Promise<BusinessPolicyData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const policy = await prisma.businessPolicy.findUnique({
    where: { businessId: business.id },
  })

  if (!policy) return null

  return {
    id: policy.id,
    interestType: policy.interestType,
    interestRate: Number(policy.interestRate),
    graceDays: policy.graceDays,
    maxTenorDays: policy.maxTenorDays,
    lateFeeFixed: policy.lateFeeFixed ? Number(policy.lateFeeFixed) : null,
    lateFeeRate: policy.lateFeeRate ? Number(policy.lateFeeRate) : null,
  }
}

/**
 * Create or update business policy
 */
export async function upsertBusinessPolicy(
  businessSlug: string,
  payload: BusinessPolicyPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Validation
    if (payload.interestRate < 0 || payload.interestRate > 100) {
      return { success: false, error: "Interest rate must be between 0 and 100" }
    }
    if (payload.graceDays < 0) {
      return { success: false, error: "Grace days cannot be negative" }
    }
    if (payload.maxTenorDays < 1) {
      return { success: false, error: "Maximum tenor must be at least 1 day" }
    }

    const existingPolicy = await prisma.businessPolicy.findUnique({
      where: { businessId: business.id },
    })

    const policy = await prisma.businessPolicy.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        interestType: payload.interestType,
        interestRate: payload.interestRate,
        graceDays: payload.graceDays,
        maxTenorDays: payload.maxTenorDays,
        lateFeeFixed: payload.lateFeeFixed,
        lateFeeRate: payload.lateFeeRate,
      },
      update: {
        interestType: payload.interestType,
        interestRate: payload.interestRate,
        graceDays: payload.graceDays,
        maxTenorDays: payload.maxTenorDays,
        lateFeeFixed: payload.lateFeeFixed,
        lateFeeRate: payload.lateFeeRate,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: existingPolicy ? "BUSINESS_POLICY_UPDATED" : "BUSINESS_POLICY_CREATED",
      entityType: "BusinessPolicy",
      entityId: policy.id,
      metadata: {
        businessId: business.id,
        businessName: business.name,
        interestType: payload.interestType,
        interestRate: payload.interestRate,
        maxTenorDays: payload.maxTenorDays,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/policy`)
    return { success: true, data: policy }
  } catch (error) {
    console.error("Upsert business policy error:", error)
    return { success: false, error: "Failed to update policy" }
  }
}

/**
 * Get all shops for a business
 */
export async function getBusinessShops(businessSlug: string): Promise<ShopData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    include: {
      _count: {
        select: { 
          products: true,
          customers: true,
        },
      },
      members: {
        where: { role: "SHOP_ADMIN", isActive: true },
        include: { user: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return shops.map((s) => ({
    id: s.id,
    name: s.name,
    shopSlug: s.shopSlug,
    country: s.country,
    isActive: s.isActive,
    createdAt: s.createdAt,
    productCount: s._count.products,
    customerCount: s._count.customers,
    adminName: s.members[0]?.user.name || null,
    adminEmail: s.members[0]?.user.email || null,
  }))
}

/**
 * Create a new shop within a business
 */
export async function createShop(businessSlug: string, formData: FormData): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const name = formData.get("name") as string
    const shopSlug = formData.get("shopSlug") as string
    
    // Shop Admin fields (optional)
    const createAdmin = formData.get("createAdmin") === "true"
    const adminName = formData.get("adminName") as string | null
    const adminEmail = formData.get("adminEmail") as string | null
    const adminPassword = formData.get("adminPassword") as string | null

    // Validation
    if (!name || name.trim().length === 0) {
      return { success: false, error: "Shop name is required" }
    }

    if (!shopSlug || shopSlug.trim().length === 0) {
      return { success: false, error: "Shop slug is required" }
    }

    const normalizedSlug = shopSlug.toLowerCase().trim()

    if (!SLUG_REGEX.test(normalizedSlug)) {
      return {
        success: false,
        error: "Shop slug must contain only lowercase letters, numbers, and hyphens",
      }
    }

    // Check if slug already exists (globally unique)
    const existingShop = await prisma.shop.findUnique({
      where: { shopSlug: normalizedSlug },
    })

    if (existingShop) {
      return { success: false, error: "A shop with this slug already exists" }
    }

    // Validate shop admin fields if creating admin
    let shopAdminData = null
    if (createAdmin) {
      if (!adminName || adminName.trim().length === 0) {
        return { success: false, error: "Shop admin name is required" }
      }
      if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) {
        return { success: false, error: "Valid shop admin email is required" }
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

      shopAdminData = {
        name: adminName.trim(),
        email: adminEmail.toLowerCase().trim(),
        password: adminPassword,
      }
    }

    // Create shop
    const shop = await prisma.shop.create({
      data: {
        name: name.trim(),
        shopSlug: normalizedSlug,
        businessId: business.id,
      },
    })

    // Create shop admin if requested
    let shopAdmin = null
    if (shopAdminData) {
      const passwordHash = await bcrypt.hash(shopAdminData.password, 12)
      
      shopAdmin = await prisma.user.create({
        data: {
          email: shopAdminData.email,
          name: shopAdminData.name,
          passwordHash,
          role: "SHOP_ADMIN",
          memberships: {
            create: {
              shopId: shop.id,
              role: "SHOP_ADMIN",
              isActive: true,
            },
          },
        },
      })
    }

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "SHOP_CREATED",
      entityType: "Shop",
      entityId: shop.id,
      metadata: {
        shopName: shop.name,
        shopSlug: shop.shopSlug,
        businessSlug: business.businessSlug,
        adminEmail: shopAdmin?.email,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}`)
    revalidatePath(`/business-admin/${businessSlug}/shops`)

    return { 
      success: true, 
      data: { 
        shop, 
        shopAdmin: shopAdmin ? { 
          email: shopAdmin.email, 
          name: shopAdmin.name 
        } : null
      } 
    }
  } catch (error) {
    console.error("Error creating shop:", error)
    return { success: false, error: "Failed to create shop" }
  }
}

/**
 * Toggle shop active status
 */
export async function setShopActive(
  businessSlug: string,
  shopId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const shop = await prisma.shop.findFirst({
      where: { 
        id: shopId,
        businessId: business.id,
      },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: { isActive },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: isActive ? "SHOP_ACTIVATED" : "SHOP_SUSPENDED",
      entityType: "Shop",
      entityId: shop.id,
      metadata: {
        shopName: shop.name,
        shopSlug: shop.shopSlug,
        businessSlug: business.businessSlug,
        previousStatus: shop.isActive,
        newStatus: isActive,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}`)
    revalidatePath(`/business-admin/${businessSlug}/shops`)

    return { success: true, data: updatedShop }
  } catch (error) {
    console.error("Error updating shop status:", error)
    return { success: false, error: "Failed to update shop status" }
  }
}

/**
 * Delete a shop
 */
export async function deleteShop(businessSlug: string, shopId: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const shop = await prisma.shop.findFirst({
      where: { 
        id: shopId,
        businessId: business.id,
      },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Delete the shop
    await prisma.shop.delete({
      where: { id: shopId },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "SHOP_DELETED",
      entityType: "Shop",
      entityId: shopId,
      metadata: {
        shopName: shop.name,
        shopSlug: shop.shopSlug,
        businessSlug: business.businessSlug,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}`)
    revalidatePath(`/business-admin/${businessSlug}/shops`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting shop:", error)
    return { success: false, error: "Failed to delete shop" }
  }
}

/**
 * Get dashboard stats for a business
 */
export async function getBusinessStats(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const [shopCount, activeShops, totalProducts, totalCustomers, totalPurchases] = await Promise.all([
    prisma.shop.count({ where: { businessId: business.id } }),
    prisma.shop.count({ where: { businessId: business.id, isActive: true } }),
    prisma.product.count({ 
      where: { shop: { businessId: business.id } } 
    }),
    prisma.customer.count({ 
      where: { shop: { businessId: business.id } } 
    }),
    prisma.purchase.count({ 
      where: { customer: { shop: { businessId: business.id } } } 
    }),
  ])

  return {
    totalShops: shopCount,
    activeShops,
    suspendedShops: shopCount - activeShops,
    totalProducts,
    totalCustomers,
    totalPurchases,
  }
}

/**
 * Get all shops with detailed performance metrics
 */
export async function getBusinessShopsWithMetrics(businessSlug: string): Promise<ShopWithMetrics[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    include: {
      _count: {
        select: { 
          products: true,
          customers: true,
        },
      },
      members: {
        where: { isActive: true },
        include: { user: true },
      },
      customers: {
        include: {
          purchases: {
            include: {
              payments: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return shops.map((shop) => {
    // Find admin
    const admin = shop.members.find(m => m.role === "SHOP_ADMIN")
    
    // Count staff by role
    const staffCount = shop.members.filter(m => m.role === "SALES_STAFF").length
    const collectorCount = shop.members.filter(m => m.role === "DEBT_COLLECTOR").length
    
    // Calculate sales metrics
    let totalSales = 0
    let totalCollected = 0
    let activePurchases = 0
    let overduePurchases = 0
    
    const today = new Date()
    
    for (const customer of shop.customers) {
      for (const purchase of customer.purchases) {
        totalSales += Number(purchase.totalAmount)
        
        // Sum payments
        for (const payment of purchase.payments) {
          totalCollected += Number(payment.amount)
        }
        
        // Count active/overdue
        if (purchase.status === "ACTIVE") {
          activePurchases++
          if (purchase.dueDate && new Date(purchase.dueDate) < today) {
            overduePurchases++
          }
        }
      }
    }
    
    const totalOutstanding = totalSales - totalCollected

    return {
      id: shop.id,
      name: shop.name,
      shopSlug: shop.shopSlug,
      country: shop.country,
      isActive: shop.isActive,
      createdAt: shop.createdAt,
      productCount: shop._count.products,
      customerCount: shop._count.customers,
      adminName: admin?.user.name || null,
      adminEmail: admin?.user.email || null,
      totalSales,
      totalCollected,
      totalOutstanding,
      activePurchases,
      overduePurchases,
      staffCount,
      collectorCount,
    }
  })
}

/**
 * Get all customers across the business
 */
export async function getBusinessCustomers(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const customers = await prisma.customer.findMany({
    where: { shop: { businessId: business.id } },
    include: {
      shop: {
        select: { name: true, shopSlug: true },
      },
      purchases: {
        include: {
          payments: true,
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return customers.map((customer) => {
    let totalPurchased = 0
    let totalPaid = 0
    let activePurchases = 0
    
    for (const purchase of customer.purchases) {
      totalPurchased += Number(purchase.totalAmount)
      for (const payment of purchase.payments) {
        totalPaid += Number(payment.amount)
      }
      if (purchase.status === "ACTIVE") {
        activePurchases++
      }
    }

    return {
      id: customer.id,
      fullName: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      idType: customer.idType,
      idNumber: customer.idNumber,
      createdAt: customer.createdAt,
      shopName: customer.shop.name,
      shopSlug: customer.shop.shopSlug,
      totalPurchases: customer.purchases.length,
      activePurchases,
      totalPurchased,
      totalPaid,
      outstanding: totalPurchased - totalPaid,
    }
  })
}

/**
 * Get all purchases across the business
 */
export async function getBusinessPurchases(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const purchases = await prisma.purchase.findMany({
    where: { customer: { shop: { businessId: business.id } } },
    include: {
      customer: {
        include: {
          shop: {
            select: { name: true, shopSlug: true },
          },
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return purchases.map((purchase) => {
    const totalPaid = purchase.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const outstanding = Number(purchase.totalAmount) - totalPaid
    const isOverdue = purchase.status === "ACTIVE" && 
      purchase.dueDate && 
      new Date(purchase.dueDate) < new Date()
    
    // Get product names from items
    const productNames = purchase.items.map(item => item.productName).join(", ")
    const firstItem = purchase.items[0]
    
    // Calculate installment amount
    const installmentAmount = purchase.installments > 0 
      ? (Number(purchase.totalAmount) - Number(purchase.downPayment)) / purchase.installments 
      : 0
    
    // Calculate paid installments based on amount paid
    const paidInstallments = installmentAmount > 0 
      ? Math.floor((totalPaid - Number(purchase.downPayment)) / installmentAmount)
      : 0

    return {
      id: purchase.id,
      productName: productNames || "N/A",
      productSku: firstItem?.product?.sku || "N/A",
      customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
      customerPhone: purchase.customer.phone,
      shopName: purchase.customer.shop.name,
      shopSlug: purchase.customer.shop.shopSlug,
      totalPrice: Number(purchase.totalAmount),
      downPayment: Number(purchase.downPayment),
      installmentAmount,
      installmentCount: purchase.installments,
      paidInstallments: Math.max(0, paidInstallments),
      totalPaid,
      outstanding,
      status: purchase.status,
      dueDate: purchase.dueDate,
      isOverdue,
      createdAt: purchase.createdAt,
      lastPayment: purchase.payments[0] ? {
        id: purchase.payments[0].id,
        amount: Number(purchase.payments[0].amount),
        paidAt: purchase.payments[0].paidAt,
        createdAt: purchase.payments[0].createdAt,
      } : null,
    }
  })
}

/**
 * Get all payments across the business
 */
export async function getBusinessPayments(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const payments = await prisma.payment.findMany({
    where: { purchase: { customer: { shop: { businessId: business.id } } } },
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
          items: true,
        },
      },
      collector: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return payments.map((payment) => {
    const productNames = payment.purchase.items.map(item => item.productName).join(", ")
    
    return {
      id: payment.id,
      amount: Number(payment.amount),
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      productName: productNames || "N/A",
      customerName: `${payment.purchase.customer.firstName} ${payment.purchase.customer.lastName}`,
      customerPhone: payment.purchase.customer.phone,
      shopName: payment.purchase.customer.shop.name,
      shopSlug: payment.purchase.customer.shop.shopSlug,
      collectorName: payment.collector?.user?.name || "System",
      collectorEmail: payment.collector?.user?.email || null,
      createdAt: payment.createdAt,
    }
  })
}

/**
 * Get all staff members across the business
 */
export async function getBusinessStaff(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const members = await prisma.shopMember.findMany({
    where: { shop: { businessId: business.id } },
    include: {
      user: true,
      shop: {
        select: { name: true, shopSlug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    userName: member.user.name,
    userEmail: member.user.email,
    role: member.role,
    isActive: member.isActive,
    shopName: member.shop.name,
    shopSlug: member.shop.shopSlug,
    createdAt: member.createdAt,
  }))
}

/**
 * Get all products across the business
 */
export async function getBusinessProducts(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const products = await prisma.product.findMany({
    where: { shop: { businessId: business.id } },
    include: {
      shop: {
        select: { name: true, shopSlug: true },
      },
      category: {
        select: { name: true },
      },
      purchaseItems: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return products.map((product) => {
    const costPrice = Number(product.costPrice)
    const cashPrice = Number(product.cashPrice)
    const layawayPrice = Number(product.layawayPrice)
    const creditPrice = Number(product.creditPrice)
    
    // Calculate profit margins for each price tier
    const cashProfit = cashPrice - costPrice
    const layawayProfit = layawayPrice - costPrice
    const creditProfit = creditPrice - costPrice
    
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      category: product.category?.name || null,
      costPrice,
      cashPrice,
      layawayPrice,
      creditPrice,
      hpPrice: creditPrice, // Keep for backward compatibility
      // Profit calculations (only for business admin)
      cashProfit,
      layawayProfit,
      creditProfit,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
      shopName: product.shop.name,
      shopSlug: product.shop.shopSlug,
      purchaseCount: product.purchaseItems.length,
      createdAt: product.createdAt,
    }
  })
}

/**
 * Create a new staff member for a shop
 */
export async function createStaffMember(
  businessSlug: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const shopId = formData.get("shopId") as string
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as "SHOP_ADMIN" | "SALES_STAFF" | "DEBT_COLLECTOR"

    // Validation
    if (!shopId) {
      return { success: false, error: "Shop is required" }
    }

    if (!name || name.trim().length === 0) {
      return { success: false, error: "Name is required" }
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return { success: false, error: "Valid email is required" }
    }

    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" }
    }

    if (!role || !["SHOP_ADMIN", "SALES_STAFF", "DEBT_COLLECTOR"].includes(role)) {
      return { success: false, error: "Valid role is required" }
    }

    // Verify shop belongs to this business
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, businessId: business.id },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      // Check if already a member of this shop
      const existingMember = await prisma.shopMember.findFirst({
        where: { userId: existingUser.id, shopId },
      })

      if (existingMember) {
        return { success: false, error: "This user is already a member of this shop" }
      }

      // Add existing user to shop
      await prisma.shopMember.create({
        data: {
          shopId,
          userId: existingUser.id,
          role,
          isActive: true,
        },
      })

      await createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "ShopMember",
        entityId: existingUser.id,
        metadata: { shopId, role, userId: existingUser.id },
      })
    } else {
      // Create new user and add to shop
      const hashedPassword = await bcrypt.hash(password, 10)

      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: name.trim(),
          passwordHash: hashedPassword,
          role: (role === "SHOP_ADMIN" ? "SHOP_ADMIN" : role === "DEBT_COLLECTOR" ? "DEBT_COLLECTOR" : "SALES_STAFF") as Role,
        },
      })

      await prisma.shopMember.create({
        data: {
          shopId,
          userId: newUser.id,
          role,
          isActive: true,
        },
      })

      await createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "ShopMember",
        entityId: newUser.id,
        metadata: { shopId, role, email, name },
      })
    }

    revalidatePath(`/business-admin/${businessSlug}/staff`)
    return { success: true }
  } catch (error) {
    console.error("Create staff error:", error)
    return { success: false, error: "Failed to create staff member" }
  }
}

/**
 * Update a staff member
 */
export async function updateStaffMember(
  businessSlug: string,
  memberId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string | null
    const role = formData.get("role") as "SHOP_ADMIN" | "SALES_STAFF" | "DEBT_COLLECTOR"
    const isActive = formData.get("isActive") === "true"
    const shopId = formData.get("shopId") as string | null

    // Validation
    if (!name || name.trim().length === 0) {
      return { success: false, error: "Name is required" }
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return { success: false, error: "Valid email is required" }
    }

    if (!role || !["SHOP_ADMIN", "SALES_STAFF", "DEBT_COLLECTOR"].includes(role)) {
      return { success: false, error: "Valid role is required" }
    }

    // Get the member and verify it belongs to this business
    const member = await prisma.shopMember.findFirst({
      where: {
        id: memberId,
        shop: { businessId: business.id },
      },
      include: { user: true, shop: true },
    })

    if (!member) {
      return { success: false, error: "Staff member not found" }
    }

    // Check if email is being changed to an existing email
    if (email.toLowerCase() !== member.user.email.toLowerCase()) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (existingUser) {
        return { success: false, error: "Email already in use by another user" }
      }
    }

    // If shop is changing, verify new shop belongs to business
    if (shopId && shopId !== member.shopId) {
      const newShop = await prisma.shop.findFirst({
        where: { id: shopId, businessId: business.id },
      })

      if (!newShop) {
        return { success: false, error: "Shop not found" }
      }
    }

    // Update user
    const userData: { name: string; email: string; passwordHash?: string; role: Role } = {
      name: name.trim(),
      email: email.toLowerCase(),
      role: (role === "SHOP_ADMIN" ? "SHOP_ADMIN" : role === "DEBT_COLLECTOR" ? "DEBT_COLLECTOR" : "SALES_STAFF") as Role,
    }

    if (password && password.length >= 6) {
      userData.passwordHash = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: { id: member.userId },
      data: userData,
    })

    // Update shop member
    await prisma.shopMember.update({
      where: { id: memberId },
      data: {
        role,
        isActive,
        ...(shopId && shopId !== member.shopId ? { shopId } : {}),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE",
      entityType: "ShopMember",
      entityId: memberId,
      metadata: { oldRole: member.role, oldIsActive: member.isActive, role, isActive, name, email },
    })

    revalidatePath(`/business-admin/${businessSlug}/staff`)
    return { success: true }
  } catch (error) {
    console.error("Update staff error:", error)
    return { success: false, error: "Failed to update staff member" }
  }
}

/**
 * Delete a staff member
 */
export async function deleteStaffMember(
  businessSlug: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get the member and verify it belongs to this business
    const member = await prisma.shopMember.findFirst({
      where: {
        id: memberId,
        shop: { businessId: business.id },
      },
      include: { user: true, shop: true },
    })

    if (!member) {
      return { success: false, error: "Staff member not found" }
    }

    // Delete the shop member record
    await prisma.shopMember.delete({
      where: { id: memberId },
    })

    // Check if user has any other shop memberships
    const otherMemberships = await prisma.shopMember.count({
      where: { userId: member.userId },
    })

    // Check if user has any business memberships
    const businessMemberships = await prisma.businessMember.count({
      where: { userId: member.userId },
    })

    // If user has no other memberships and is not a super admin, we could optionally delete the user
    // For now, we just delete the membership and leave the user account
    // This allows them to be re-added later if needed

    await createAuditLog({
      actorUserId: user.id,
      action: "DELETE",
      entityType: "ShopMember",
      entityId: memberId,
      metadata: {
        userId: member.userId,
        userEmail: member.user.email,
        role: member.role,
        shopId: member.shopId,
        shopName: member.shop.name,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/staff`)
    return { success: true }
  } catch (error) {
    console.error("Delete staff error:", error)
    return { success: false, error: "Failed to delete staff member" }
  }
}

/**
 * Toggle staff member active status
 */
export async function toggleStaffActive(
  businessSlug: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get the member and verify it belongs to this business
    const member = await prisma.shopMember.findFirst({
      where: {
        id: memberId,
        shop: { businessId: business.id },
      },
    })

    if (!member) {
      return { success: false, error: "Staff member not found" }
    }

    const newStatus = !member.isActive

    await prisma.shopMember.update({
      where: { id: memberId },
      data: { isActive: newStatus },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE",
      entityType: "ShopMember",
      entityId: memberId,
      metadata: { oldIsActive: member.isActive, isActive: newStatus },
    })

    revalidatePath(`/business-admin/${businessSlug}/staff`)
    return { success: true, data: { isActive: newStatus } }
  } catch (error) {
    console.error("Toggle staff active error:", error)
    return { success: false, error: "Failed to update staff status" }
  }
}

/**
 * Get a single staff member details
 */
export async function getStaffMember(businessSlug: string, memberId: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const member = await prisma.shopMember.findFirst({
    where: {
      id: memberId,
      shop: { businessId: business.id },
    },
    include: {
      user: true,
      shop: {
        select: { id: true, name: true, shopSlug: true },
      },
    },
  })

  if (!member) {
    return null
  }

  return {
    id: member.id,
    userId: member.userId,
    userName: member.user.name,
    userEmail: member.user.email,
    role: member.role,
    isActive: member.isActive,
    shopId: member.shop.id,
    shopName: member.shop.name,
    shopSlug: member.shop.shopSlug,
    createdAt: member.createdAt,
  }
}

// ===== PRODUCT MANAGEMENT =====

export interface ProductPayload {
  name: string
  description?: string | null
  sku?: string | null
  costPrice?: number
  cashPrice: number
  layawayPrice: number
  creditPrice: number
  stockQuantity: number
  lowStockThreshold?: number
  imageUrl?: string | null
  isActive?: boolean
  categoryId?: string | null
}

/**
 * Update a product (business admin - full access)
 */
export async function updateBusinessProduct(
  businessSlug: string,
  productId: string,
  payload: Partial<ProductPayload>
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get product and verify it belongs to a shop in this business
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        shop: { businessId: business.id },
      },
      include: { shop: true },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    // Validation
    if (payload.name !== undefined && payload.name.trim().length === 0) {
      return { success: false, error: "Product name cannot be empty" }
    }

    // Price validations
    if (payload.cashPrice !== undefined && payload.cashPrice < 0) {
      return { success: false, error: "Cash price must be 0 or greater" }
    }
    if (payload.layawayPrice !== undefined && payload.layawayPrice < 0) {
      return { success: false, error: "Layaway price must be 0 or greater" }
    }
    if (payload.creditPrice !== undefined && payload.creditPrice < 0) {
      return { success: false, error: "Credit price must be 0 or greater" }
    }

    // Get effective prices for validation
    const cashPrice = payload.cashPrice ?? Number(product.cashPrice)
    const layawayPrice = payload.layawayPrice ?? Number(product.layawayPrice)
    const creditPrice = payload.creditPrice ?? Number(product.creditPrice)

    // Validate pricing logic: Cash <= Layaway <= Credit
    if (cashPrice > layawayPrice) {
      return { success: false, error: "Cash price should not exceed layaway price" }
    }
    if (layawayPrice > creditPrice) {
      return { success: false, error: "Layaway price should not exceed credit price" }
    }

    // Check for duplicate SKU if changing
    if (payload.sku && payload.sku !== product.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          shopId: product.shopId,
          sku: payload.sku.trim(),
          id: { not: productId },
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists in this shop" }
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(payload.name !== undefined && { name: payload.name.trim() }),
        ...(payload.description !== undefined && { description: payload.description?.trim() || null }),
        ...(payload.sku !== undefined && { sku: payload.sku?.trim() || null }),
        ...(payload.costPrice !== undefined && { costPrice: new Prisma.Decimal(payload.costPrice) }),
        ...(payload.cashPrice !== undefined && { cashPrice: new Prisma.Decimal(payload.cashPrice) }),
        ...(payload.layawayPrice !== undefined && { layawayPrice: new Prisma.Decimal(payload.layawayPrice) }),
        ...(payload.creditPrice !== undefined && { creditPrice: new Prisma.Decimal(payload.creditPrice) }),
        ...(payload.stockQuantity !== undefined && { stockQuantity: payload.stockQuantity }),
        ...(payload.lowStockThreshold !== undefined && { lowStockThreshold: payload.lowStockThreshold }),
        ...(payload.imageUrl !== undefined && { imageUrl: payload.imageUrl || null }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        ...(payload.categoryId !== undefined && { categoryId: payload.categoryId || null }),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: updatedProduct.id,
      metadata: {
        businessSlug,
        shopId: product.shopId,
        shopName: product.shop.name,
        productName: updatedProduct.name,
        changes: payload,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true, data: { id: updatedProduct.id, name: updatedProduct.name } }
  } catch (error) {
    console.error("Error updating product:", error)
    return { success: false, error: "Failed to update product" }
  }
}

/**
 * Delete a product (business admin only)
 */
export async function deleteBusinessProduct(
  businessSlug: string,
  productId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get product and verify it belongs to a shop in this business
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        shop: { businessId: business.id },
      },
      include: { shop: true },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    // Check if product has any active purchases
    const activePurchases = await prisma.purchase.count({
      where: {
        items: {
          some: { productId },
        },
        status: { in: ["ACTIVE", "OVERDUE"] },
      },
    })

    if (activePurchases > 0) {
      return { 
        success: false, 
        error: `Cannot delete product with ${activePurchases} active purchase(s). Complete or cancel them first.` 
      }
    }

    await prisma.product.delete({
      where: { id: productId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_DELETED",
      entityType: "Product",
      entityId: productId,
      metadata: {
        businessSlug,
        shopId: product.shopId,
        shopName: product.shop.name,
        productName: product.name,
        productSku: product.sku,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting product:", error)
    return { success: false, error: "Failed to delete product" }
  }
}

/**
 * Toggle product active status (business admin)
 */
export async function toggleBusinessProductStatus(
  businessSlug: string,
  productId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        shop: { businessId: business.id },
      },
      include: { shop: true },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    const newStatus = !product.isActive

    await prisma.product.update({
      where: { id: productId },
      data: { isActive: newStatus },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_STATUS_CHANGED",
      entityType: "Product",
      entityId: productId,
      metadata: {
        businessSlug,
        productName: product.name,
        oldStatus: product.isActive,
        newStatus,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true, data: { isActive: newStatus } }
  } catch (error) {
    console.error("Error toggling product status:", error)
    return { success: false, error: "Failed to update product status" }
  }
}

/**
 * Get a single product details (business admin)
 */
export async function getBusinessProduct(businessSlug: string, productId: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      shop: { businessId: business.id },
    },
    include: {
      shop: { select: { id: true, name: true, shopSlug: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  })

  if (!product) {
    return null
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    cashPrice: Number(product.cashPrice),
    layawayPrice: Number(product.layawayPrice),
    creditPrice: Number(product.creditPrice),
    stockQuantity: product.stockQuantity,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    categoryId: product.categoryId,
    categoryName: product.category?.name,
    categoryColor: product.category?.color,
    shopId: product.shop.id,
    shopName: product.shop.name,
    shopSlug: product.shop.shopSlug,
    createdAt: product.createdAt,
  }
}

// ============================================
// PAYMENT CONFIRMATION (BUSINESS ADMIN)
// ============================================

export interface BusinessPaymentForAdmin {
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
  customerId: string
  collectorName: string | null
  collectorId: string | null
  isConfirmed: boolean
  confirmedAt: Date | null
  confirmedBy: string | null
  rejectedAt: Date | null
  rejectionReason: string | null
  shopName: string
  shopSlug: string
  recordedBy: string
}

/**
 * Get all payments across the business with status filtering
 */
export async function getBusinessPaymentsWithStatus(
  businessSlug: string,
  filters?: {
    status?: "pending" | "confirmed" | "rejected" | "all"
    startDate?: Date
    endDate?: Date
  }
): Promise<BusinessPaymentForAdmin[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const whereClause: Prisma.PaymentWhereInput = {
    purchase: {
      customer: {
        shop: {
          businessId: business.id,
        },
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
          user: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  // Helper to extract info from notes
  const extractFromNotes = (notes: string | null, pattern: RegExp): string | null => {
    if (!notes) return null
    const match = notes.match(pattern)
    return match ? match[1] : null
  }

  return payments.map((p) => {
    // Extract "Recorded by" from notes
    const recordedByMatch = p.notes?.match(/\[Recorded by (?:Shop Admin|Business Admin|Collector): ([^\]]+)\]/)
    const recordedBy = recordedByMatch ? recordedByMatch[1] : (p.collector?.user?.name || "Unknown")
    
    // Extract "Confirmed by" from notes  
    const confirmedByMatch = p.notes?.match(/Confirmed by: ([^|]+)/)
    const confirmedBy = confirmedByMatch ? confirmedByMatch[1].trim() : null

    return {
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
      customerId: p.purchase.customerId,
      collectorName: p.collector?.user?.name || null,
      collectorId: p.collectorId,
      isConfirmed: p.isConfirmed,
      confirmedAt: p.confirmedAt,
      confirmedBy,
      rejectedAt: p.rejectedAt,
      rejectionReason: p.rejectionReason,
      shopName: p.purchase.customer.shop.name,
      shopSlug: p.purchase.customer.shop.shopSlug,
      recordedBy,
    }
  })
}

/**
 * Get payment stats for business admin
 */
export async function getBusinessPaymentStats(
  businessSlug: string,
  startDate?: Date,
  endDate?: Date
) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const dateFilter: Prisma.PaymentWhereInput["createdAt"] = {}
  if (startDate) {
    dateFilter.gte = startDate
  }
  if (endDate) {
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)
    dateFilter.lte = endOfDay
  }

  const baseWhere: Prisma.PaymentWhereInput = {
    purchase: { customer: { shop: { businessId: business.id } } },
    ...(startDate || endDate ? { createdAt: dateFilter } : {}),
  }

  const [
    pendingCount,
    pendingTotal,
    confirmedCount,
    confirmedTotal,
    rejectedCount,
    rejectedTotal,
  ] = await Promise.all([
    prisma.payment.count({
      where: { ...baseWhere, isConfirmed: false, rejectedAt: null },
    }),
    prisma.payment.aggregate({
      where: { ...baseWhere, isConfirmed: false, rejectedAt: null },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { ...baseWhere, isConfirmed: true },
    }),
    prisma.payment.aggregate({
      where: { ...baseWhere, isConfirmed: true },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { ...baseWhere, rejectedAt: { not: null } },
    }),
    prisma.payment.aggregate({
      where: { ...baseWhere, rejectedAt: { not: null } },
      _sum: { amount: true },
    }),
  ])

  return {
    pending: {
      count: pendingCount,
      total: pendingTotal._sum.amount ? Number(pendingTotal._sum.amount) : 0,
    },
    confirmed: {
      count: confirmedCount,
      total: confirmedTotal._sum.amount ? Number(confirmedTotal._sum.amount) : 0,
    },
    rejected: {
      count: rejectedCount,
      total: rejectedTotal._sum.amount ? Number(rejectedTotal._sum.amount) : 0,
    },
  }
}

/**
 * Confirm a payment collected by a debt collector (Business Admin)
 */
export async function confirmBusinessPayment(
  businessSlug: string,
  paymentId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        purchase: {
          include: {
            customer: {
              include: {
                shop: true,
              },
            },
            items: true, // Include items for stock deduction on completion
          },
        },
      },
    })

    if (!payment) {
      return { success: false, error: "Payment not found" }
    }

    // Verify payment belongs to this business
    if (payment.purchase.customer.shop.businessId !== business.id) {
      return { success: false, error: "Payment not found in this business" }
    }

    if (payment.isConfirmed) {
      return { success: false, error: "Payment already confirmed" }
    }

    if (payment.rejectedAt) {
      return { success: false, error: "Cannot confirm a rejected payment" }
    }

    // Update the payment as confirmed
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        isConfirmed: true,
        confirmedAt: new Date(),
        status: "COMPLETED",
        notes: payment.notes 
          ? `${payment.notes} | Confirmed by: ${user.name}` 
          : `Confirmed by: ${user.name}`,
      },
    })

    // Update purchase totals
    const purchase = payment.purchase
    const newAmountPaid = Number(purchase.amountPaid) + Number(payment.amount)
    const newOutstanding = Number(purchase.totalAmount) - newAmountPaid
    const isCompleted = newOutstanding <= 0

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        amountPaid: newAmountPaid,
        outstandingBalance: Math.max(0, newOutstanding),
        status: isCompleted ? "COMPLETED" : purchase.status === "PENDING" ? "ACTIVE" : purchase.status,
      },
    })

    // AUTO-GENERATE WAYBILL and DEDUCT STOCK when purchase is fully paid
    if (isCompleted) {
      // Deduct stock for each item (only for non-CASH purchases, CASH already deducted at sale)
      if (purchase.purchaseType !== "CASH") {
        for (const item of purchase.items) {
          if (item.productId) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            })
          }
        }
      }

      const existingWaybill = await prisma.waybill.findUnique({
        where: { purchaseId: purchase.id },
      })

      if (!existingWaybill) {
        const year = new Date().getFullYear()
        const waybillCount = await prisma.waybill.count()
        const waybillNumber = `WB-${year}-${String(waybillCount + 1).padStart(5, "0")}`

        await prisma.waybill.create({
          data: {
            waybillNumber,
            purchaseId: purchase.id,
            recipientName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
            recipientPhone: purchase.customer.phone,
            deliveryAddress: purchase.deliveryAddress || purchase.customer.address || "N/A",
            deliveryCity: purchase.customer.city,
            deliveryRegion: purchase.customer.region,
            specialInstructions: `Payment completed. Ready for delivery.`,
            generatedById: user.id,
          },
        })

        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { deliveryStatus: "SCHEDULED" },
        })

        await createAuditLog({
          actorUserId: user.id,
          action: "WAYBILL_AUTO_GENERATED",
          entityType: "Waybill",
          entityId: purchase.id,
          metadata: {
            waybillNumber,
            purchaseId: purchase.id,
            purchaseNumber: purchase.purchaseNumber,
            reason: "Payment completed (Business Admin)",
          },
        })
      }
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "PAYMENT_CONFIRMED",
      entityType: "Payment",
      entityId: paymentId,
      metadata: {
        purchaseId: purchase.id,
        customerId: purchase.customerId,
        amount: Number(payment.amount),
        confirmedByBusinessAdmin: true,
        confirmedByName: user.name,
        purchaseCompleted: isCompleted,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/payments`)
    revalidatePath(`/shop-admin/${payment.purchase.customer.shop.shopSlug}/pending-payments`)
    return { success: true, data: { purchaseCompleted: isCompleted } }
  } catch (error) {
    console.error("Confirm business payment error:", error)
    return { success: false, error: "Failed to confirm payment" }
  }
}

/**
 * Reject a payment collected by a debt collector (Business Admin)
 */
export async function rejectBusinessPayment(
  businessSlug: string,
  paymentId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        purchase: {
          include: {
            customer: {
              include: {
                shop: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return { success: false, error: "Payment not found" }
    }

    // Verify payment belongs to this business
    if (payment.purchase.customer.shop.businessId !== business.id) {
      return { success: false, error: "Payment not found in this business" }
    }

    if (payment.isConfirmed) {
      return { success: false, error: "Cannot reject a confirmed payment" }
    }

    if (payment.rejectedAt) {
      return { success: false, error: "Payment already rejected" }
    }

    // Mark payment as rejected
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        rejectedAt: new Date(),
        rejectionReason: reason,
        status: "MISSED",
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PAYMENT_REJECTED",
      entityType: "Payment",
      entityId: paymentId,
      metadata: {
        purchaseId: payment.purchaseId,
        customerId: payment.purchase.customerId,
        amount: Number(payment.amount),
        reason,
        rejectedByBusinessAdmin: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/payments`)
    revalidatePath(`/shop-admin/${payment.purchase.customer.shop.shopSlug}/pending-payments`)
    return { success: true }
  } catch (error) {
    console.error("Reject business payment error:", error)
    return { success: false, error: "Failed to reject payment" }
  }
}

// ============================================
// BUSINESS ADMIN SALES
// ============================================

export interface ProductForBusinessSale {
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
}

export interface CustomerForBusinessSale {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
}

export interface CollectorForBusinessSale {
  id: string
  name: string
  email: string | null
}

/**
 * Get products for a specific shop within the business (for sale)
 */
export async function getShopProductsForSale(
  businessSlug: string,
  shopSlug: string
): Promise<ProductForBusinessSale[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shop = await prisma.shop.findFirst({
    where: { shopSlug, businessId: business.id },
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
    lowStockThreshold: p.lowStockThreshold,
    categoryName: p.category?.name || null,
    categoryColor: p.category?.color || null,
    imageUrl: p.imageUrl,
  }))
}

/**
 * Get customers for a specific shop within the business (for sale)
 */
export async function getShopCustomersForSale(
  businessSlug: string,
  shopSlug: string
): Promise<CustomerForBusinessSale[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shop = await prisma.shop.findFirst({
    where: { shopSlug, businessId: business.id },
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

/**
 * Get collectors for a specific shop within the business (for sale)
 */
export async function getShopCollectorsForSale(
  businessSlug: string,
  shopSlug: string
): Promise<CollectorForBusinessSale[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shop = await prisma.shop.findFirst({
    where: { shopSlug, businessId: business.id },
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

export type BusinessPurchaseType = "CASH" | "LAYAWAY" | "CREDIT"

export interface BusinessSaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface BusinessSalePayload {
  shopSlug: string
  customerId: string
  items: BusinessSaleItem[]
  downPayment: number
  tenorDays: number
  purchaseType: BusinessPurchaseType
}

/**
 * Create a sale as business admin
 */
export async function createBusinessSale(
  businessSlug: string,
  payload: BusinessSalePayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get the shop
    const shop = await prisma.shop.findFirst({
      where: { shopSlug: payload.shopSlug, businessId: business.id },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

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

    // Verify all products and their stock
    const productIds = payload.items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { 
        id: { in: productIds }, 
        shopId: shop.id, 
        isActive: true 
      },
    })

    if (products.length !== payload.items.length) {
      return { success: false, error: "One or more products not found" }
    }

    // Check stock for each item
    for (const item of payload.items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        return { success: false, error: `Product not found: ${item.productId}` }
      }
      if (product.stockQuantity < item.quantity) {
        return { success: false, error: `Insufficient stock for ${product.name}. Only ${product.stockQuantity} available.` }
      }
    }

    // Get business policy for interest calculation (only required for non-CASH purchases)
    const policy = await prisma.businessPolicy.findUnique({
      where: { businessId: business.id },
    })

    // CASH sales don't require policy
    if (payload.purchaseType !== "CASH" && !policy) {
      return { success: false, error: "Business policy not configured. Please configure the BNPL policy first." }
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
          await tx.product.update({
            where: { id: item.productId },
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
          interestRate: policy?.interestRate || 0,
          notes: `${payload.purchaseType} sale by Business Admin: ${user.name}`,
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
            isConfirmed: true,
            confirmedAt: new Date(),
            paidAt: new Date(),
            notes: "Down payment at time of purchase (Business Admin)",
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
        createdByBusinessAdmin: true,
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
          specialInstructions: `Cash sale by Business Admin - Ready for delivery`,
          generatedById: user.id,
        },
      })

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { deliveryStatus: "SCHEDULED" },
      })
    }

    revalidatePath(`/business-admin/${businessSlug}/purchases`)
    revalidatePath(`/business-admin/${businessSlug}/customers`)
    revalidatePath(`/business-admin/${businessSlug}/products`)
    revalidatePath(`/shop-admin/${payload.shopSlug}/dashboard`)
    revalidatePath(`/shop-admin/${payload.shopSlug}/products`)

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
    console.error("Error creating business sale:", error)
    return { success: false, error: "Failed to create sale" }
  }
}

/**
 * Create a customer as business admin
 */
export interface BusinessQuickCustomerPayload {
  shopSlug: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  idType?: string | null
  idNumber?: string | null
  address?: string | null
  city?: string | null
  region?: string | null
  preferredPayment?: "ONLINE" | "DEBT_COLLECTOR" | "BOTH"
  assignedCollectorId?: string | null
  notes?: string | null
}

export async function createBusinessCustomer(
  businessSlug: string,
  payload: BusinessQuickCustomerPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get the shop
    const shop = await prisma.shop.findFirst({
      where: { shopSlug: payload.shopSlug, businessId: business.id },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Validate required fields
    if (!payload.firstName?.trim()) {
      return { success: false, error: "First name is required" }
    }
    if (!payload.lastName?.trim()) {
      return { success: false, error: "Last name is required" }
    }
    if (!payload.phone?.trim()) {
      return { success: false, error: "Phone number is required" }
    }

    // Check if phone already exists in this shop
    const existingCustomer = await prisma.customer.findFirst({
      where: { phone: payload.phone, shopId: shop.id },
    })

    if (existingCustomer) {
      return { success: false, error: "A customer with this phone number already exists" }
    }

    // Create the customer
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        email: payload.email || null,
        idType: payload.idType || null,
        idNumber: payload.idNumber || null,
        address: payload.address || null,
        city: payload.city || null,
        region: payload.region || null,
        preferredPayment: payload.preferredPayment || "BOTH",
        assignedCollectorId: payload.assignedCollectorId || null,
        notes: payload.notes || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        createdByBusinessAdmin: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/customers`)
    revalidatePath(`/business-admin/${businessSlug}/new-sale`)

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

/**
 * Record a payment as a Business Admin
 * Payments are pending by default and need confirmation
 */
interface BusinessPaymentPayload {
  purchaseId: string
  amount: number
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD"
  reference?: string
  notes?: string
  collectorId?: string
  autoConfirm?: boolean
}

export async function recordPaymentAsBusinessAdmin(
  businessSlug: string,
  payload: BusinessPaymentPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Find the purchase and verify it belongs to this business
    const purchase = await prisma.purchase.findUnique({
      where: { id: payload.purchaseId },
      include: {
        customer: {
          include: {
            shop: true,
          },
        },
      },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    if (purchase.customer.shop.businessId !== business.id) {
      return { success: false, error: "Purchase not found in this business" }
    }

    if (purchase.status === "COMPLETED") {
      return { success: false, error: "This purchase is already fully paid" }
    }

    if (payload.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0" }
    }

    const autoConfirm = payload.autoConfirm ?? false

    // Create payment record - pending by default
    const payment = await prisma.payment.create({
      data: {
        purchaseId: purchase.id,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        status: autoConfirm ? "COMPLETED" : "PENDING",
        collectorId: payload.collectorId || null,
        paidAt: new Date(),
        reference: payload.reference,
        notes: `${payload.notes || ""} [Recorded by Business Admin: ${user.name}]`.trim(),
        isConfirmed: autoConfirm,
        confirmedAt: autoConfirm ? new Date() : null,
      },
    })

    // Only update purchase totals if auto-confirming
    if (autoConfirm) {
      const newAmountPaid = Number(purchase.amountPaid) + payload.amount
      const newOutstanding = Number(purchase.totalAmount) - newAmountPaid
      let newStatus: PurchaseStatus = purchase.status
      if (newOutstanding <= 0) {
        newStatus = PurchaseStatus.COMPLETED
      } else if (purchase.status === PurchaseStatus.PENDING) {
        newStatus = PurchaseStatus.ACTIVE
      }

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          amountPaid: newAmountPaid,
          outstandingBalance: Math.max(0, newOutstanding),
          status: newStatus,
        },
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: autoConfirm ? "PAYMENT_RECORDED_AND_CONFIRMED" : "PAYMENT_RECORDED_PENDING",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        amount: payload.amount,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        shopName: purchase.customer.shop.name,
        recordedBy: user.name,
        recordedByBusinessAdmin: true,
        awaitingConfirmation: !autoConfirm,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/payments`)
    revalidatePath(`/business-admin/${businessSlug}/customers`)
    revalidatePath(`/shop-admin/${purchase.customer.shop.shopSlug}/pending-payments`)
    revalidatePath(`/shop-admin/${purchase.customer.shop.shopSlug}/customers`)

    return {
      success: true,
      data: {
        paymentId: payment.id,
        awaitingConfirmation: !autoConfirm,
      },
    }
  } catch (error) {
    console.error("Error recording payment as business admin:", error)
    return { success: false, error: "Failed to record payment" }
  }
}

/**
 * Get purchases for a specific customer (for payment recording)
 */
export async function getBusinessCustomerPurchases(
  businessSlug: string,
  customerId: string
) {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Verify customer belongs to this business
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        shop: true,
      },
    })

    if (!customer || customer.shop.businessId !== business.id) {
      return { success: false, error: "Customer not found in this business" }
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        customerId,
        status: { in: ["ACTIVE", "OVERDUE"] },
        outstandingBalance: { gt: 0 },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return {
      success: true,
      data: purchases.map((p) => ({
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        totalAmount: Number(p.totalAmount),
        amountPaid: Number(p.amountPaid),
        outstandingBalance: Number(p.outstandingBalance),
        status: p.status,
        items: p.items.map((item) => ({
          productName: item.product?.name || "Unknown Product",
          quantity: item.quantity,
        })),
        recentPayments: p.payments.slice(0, 3).map((pay) => ({
          amount: Number(pay.amount),
          paidAt: pay.paidAt,
          isConfirmed: pay.isConfirmed,
        })),
      })),
    }
  } catch (error) {
    console.error("Error fetching customer purchases:", error)
    return { success: false, error: "Failed to fetch purchases" }
  }
}

