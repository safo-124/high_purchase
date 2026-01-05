"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "../../lib/auth"

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

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    category: product.category?.name || null,
    cashPrice: Number(product.cashPrice),
    hpPrice: Number(product.creditPrice),
    stockQuantity: product.stockQuantity,
    isActive: product.isActive,
    shopName: product.shop.name,
    shopSlug: product.shop.shopSlug,
    purchaseCount: product.purchaseItems.length,
    createdAt: product.createdAt,
  }))
}
