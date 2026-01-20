"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "../../lib/auth"
import { Role, Prisma, PurchaseStatus, DeliveryStatus } from "../generated/prisma/client"

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

// Shop Detail Overview Types
export interface ShopDetailOverview {
  id: string
  name: string
  shopSlug: string
  isActive: boolean
  createdAt: Date
  // Products & Inventory
  totalProducts: number
  totalStockUnits: number
  lowStockProducts: number
  // Staff
  staffCount: number
  collectorCount: number
  // Sales & Revenue
  totalSales: number
  totalCollected: number
  totalOutstanding: number
  activePurchases: number
  completedPurchases: number
  overduePurchases: number
  // Profit Calculations
  estimatedProfitCash: number      // Potential profit if all stock sold at cash price
  estimatedProfitLayaway: number   // Potential profit if all stock sold at layaway price
  estimatedProfitCredit: number    // Potential profit if all stock sold at credit price
  actualProfit: number             // Actual profit from completed sales
  totalCostOfGoodsSold: number     // Total cost of items sold
  // Customer Stats
  totalCustomers: number
  activeCustomers: number
}

/**
 * Get detailed shop overview for business admin
 */
export async function getShopDetailOverview(
  businessSlug: string,
  shopSlug: string
): Promise<ShopDetailOverview | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shop = await prisma.shop.findFirst({
    where: { shopSlug, businessId: business.id },
    include: {
      shopProducts: {
        where: { isActive: true, product: { isActive: true } },
        include: {
          product: {
            select: {
              id: true,
              lowStockThreshold: true,
              costPrice: true,
              cashPrice: true,
              layawayPrice: true,
              creditPrice: true,
            },
          },
        },
      },
      members: {
        where: { isActive: true },
        select: { role: true },
      },
      customers: {
        where: { isActive: true },
        select: {
          id: true,
          purchases: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              amountPaid: true,
              outstandingBalance: true,
              purchaseType: true,
              items: {
                select: {
                  quantity: true,
                  unitPrice: true,
                  product: {
                    select: { costPrice: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!shop) return null

  // Products & Inventory calculations
  const totalProducts = shop.shopProducts.length
  const totalStockUnits = shop.shopProducts.reduce((sum, sp) => sum + sp.stockQuantity, 0)
  const lowStockProducts = shop.shopProducts.filter(sp => sp.stockQuantity <= sp.product.lowStockThreshold).length

  // Staff counts
  const staffCount = shop.members.filter(m => m.role === "SALES_STAFF" || m.role === "SHOP_ADMIN").length
  const collectorCount = shop.members.filter(m => m.role === "DEBT_COLLECTOR").length

  // Calculate estimated profit from current inventory
  let estimatedProfitCash = 0
  let estimatedProfitLayaway = 0
  let estimatedProfitCredit = 0

  for (const sp of shop.shopProducts) {
    const costPrice = Number(sp.costPrice ?? sp.product.costPrice)
    const cashPrice = Number(sp.cashPrice ?? sp.product.cashPrice)
    const layawayPrice = Number(sp.layawayPrice ?? sp.product.layawayPrice)
    const creditPrice = Number(sp.creditPrice ?? sp.product.creditPrice)
    const stock = sp.stockQuantity

    estimatedProfitCash += (cashPrice - costPrice) * stock
    estimatedProfitLayaway += (layawayPrice - costPrice) * stock
    estimatedProfitCredit += (creditPrice - costPrice) * stock
  }

  // Flatten all purchases from customers
  const allPurchases = shop.customers.flatMap(c => c.purchases)

  // Sales & Revenue calculations
  const totalSales = allPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
  const totalCollected = allPurchases.reduce((sum, p) => sum + Number(p.amountPaid), 0)
  const totalOutstanding = allPurchases.reduce((sum, p) => sum + Number(p.outstandingBalance), 0)
  
  const activePurchases = allPurchases.filter(p => p.status === "ACTIVE" || p.status === "PENDING").length
  const completedPurchases = allPurchases.filter(p => p.status === "COMPLETED").length
  const overduePurchases = allPurchases.filter(p => p.status === "OVERDUE" || p.status === "DEFAULTED").length

  // Actual profit calculation (from completed sales only)
  let actualProfit = 0
  let totalCostOfGoodsSold = 0

  for (const purchase of allPurchases.filter(p => p.status === "COMPLETED")) {
    const revenue = Number(purchase.totalAmount)
    let costOfGoods = 0
    
    for (const item of purchase.items) {
      const costPrice = item.product?.costPrice ? Number(item.product.costPrice) : 0
      costOfGoods += costPrice * item.quantity
    }
    
    totalCostOfGoodsSold += costOfGoods
    actualProfit += revenue - costOfGoods
  }

  // Customer stats
  const totalCustomers = shop.customers.length
  const activeCustomers = shop.customers.filter(c => 
    c.purchases.some(p => p.status === "ACTIVE" || p.status === "PENDING")
  ).length

  return {
    id: shop.id,
    name: shop.name,
    shopSlug: shop.shopSlug,
    isActive: shop.isActive,
    createdAt: shop.createdAt,
    totalProducts,
    totalStockUnits,
    lowStockProducts,
    staffCount,
    collectorCount,
    totalSales,
    totalCollected,
    totalOutstanding,
    activePurchases,
    completedPurchases,
    overduePurchases,
    estimatedProfitCash,
    estimatedProfitLayaway,
    estimatedProfitCredit,
    actualProfit,
    totalCostOfGoodsSold,
    totalCustomers,
    activeCustomers,
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
          shopProducts: true,
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
    productCount: s._count.shopProducts,
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
    const adminPhone = formData.get("adminPhone") as string | null
    const adminGender = formData.get("adminGender") as string | null
    const adminIdCardType = formData.get("adminIdCardType") as string | null
    const adminIdCardNumber = formData.get("adminIdCardNumber") as string | null
    const adminGuarantorName = formData.get("adminGuarantorName") as string | null
    const adminGuarantorPhone = formData.get("adminGuarantorPhone") as string | null
    const adminGuarantorRelationship = formData.get("adminGuarantorRelationship") as string | null
    const adminAddress = formData.get("adminAddress") as string | null

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
    let shopAdminData: {
      name: string
      email: string
      password: string
      phone: string
      gender: "MALE" | "FEMALE" | "OTHER"
      idCardType: "GHANA_CARD" | "VOTER_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "OTHER"
      idCardNumber: string
      guarantorName: string
      guarantorPhone: string
      guarantorRelationship: string | null
      address: string | null
    } | null = null
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
      if (!adminPhone || adminPhone.trim().length === 0) {
        return { success: false, error: "Phone number is required" }
      }
      if (!adminGender || !["MALE", "FEMALE", "OTHER"].includes(adminGender)) {
        return { success: false, error: "Gender is required" }
      }
      if (!adminIdCardType || !["GHANA_CARD", "VOTER_ID", "PASSPORT", "DRIVERS_LICENSE", "OTHER"].includes(adminIdCardType)) {
        return { success: false, error: "ID card type is required" }
      }
      if (!adminIdCardNumber || adminIdCardNumber.trim().length === 0) {
        return { success: false, error: "ID card number is required" }
      }
      if (!adminGuarantorName || adminGuarantorName.trim().length === 0) {
        return { success: false, error: "Guarantor name is required" }
      }
      if (!adminGuarantorPhone || adminGuarantorPhone.trim().length === 0) {
        return { success: false, error: "Guarantor phone is required" }
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
        phone: adminPhone.trim(),
        gender: adminGender as "MALE" | "FEMALE" | "OTHER",
        idCardType: adminIdCardType as "GHANA_CARD" | "VOTER_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "OTHER",
        idCardNumber: adminIdCardNumber.trim(),
        guarantorName: adminGuarantorName.trim(),
        guarantorPhone: adminGuarantorPhone.trim(),
        guarantorRelationship: adminGuarantorRelationship?.trim() || null,
        address: adminAddress?.trim() || null,
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
          phone: shopAdminData.phone,
          gender: shopAdminData.gender,
          idCardType: shopAdminData.idCardType,
          idCardNumber: shopAdminData.idCardNumber,
          guarantorName: shopAdminData.guarantorName,
          guarantorPhone: shopAdminData.guarantorPhone,
          guarantorRelationship: shopAdminData.guarantorRelationship,
          address: shopAdminData.address,
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
      where: { businessId: business.id } 
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
          shopProducts: true,
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
        
        // Sum only CONFIRMED payments
        for (const payment of purchase.payments) {
          if (payment.isConfirmed) {
            totalCollected += Number(payment.amount)
          }
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
      productCount: shop._count.shopProducts,
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
      assignedCollector: {
        include: { user: { select: { name: true } } },
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
    const productNames: string[] = []
    
    for (const purchase of customer.purchases) {
      totalPurchased += Number(purchase.totalAmount)
      for (const payment of purchase.payments) {
        totalPaid += Number(payment.amount)
      }
      if (purchase.status === "ACTIVE") {
        activePurchases++
      }
      for (const item of purchase.items) {
        if (!productNames.includes(item.productName)) {
          productNames.push(item.productName)
        }
      }
    }

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      fullName: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      email: customer.email,
      idType: customer.idType,
      idNumber: customer.idNumber,
      address: customer.address,
      city: customer.city,
      region: customer.region,
      notes: customer.notes,
      isActive: customer.isActive,
      assignedCollectorId: customer.assignedCollectorId,
      assignedCollectorName: customer.assignedCollector?.user?.name || null,
      createdAt: customer.createdAt,
      shopName: customer.shop.name,
      shopSlug: customer.shop.shopSlug,
      totalPurchases: customer.purchases.length,
      activePurchases,
      totalPurchased,
      totalPaid,
      outstanding: totalPurchased - totalPaid,
      productNames,
    }
  })
}

/**
 * Update a customer (Business Admin)
 */
export interface UpdateBusinessCustomerPayload {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string | null
  idType?: string | null
  idNumber?: string | null
  address?: string | null
  city?: string | null
  region?: string | null
  notes?: string | null
  isActive?: boolean
  assignedCollectorId?: string | null
}

export async function updateBusinessCustomer(
  businessSlug: string,
  customerId: string,
  payload: UpdateBusinessCustomerPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId, shop: { businessId: business.id } },
      include: { shop: true },
    })

    if (!existingCustomer) {
      return { success: false, error: "Customer not found in this business" }
    }

    // Check for phone duplicates if phone is being changed
    if (payload.phone && payload.phone !== existingCustomer.phone) {
      const normalizedPhone = payload.phone.trim().replace(/\s+/g, "")
      const duplicate = await prisma.customer.findFirst({
        where: { shopId: existingCustomer.shopId, phone: normalizedPhone, id: { not: customerId } },
      })
      if (duplicate) {
        return { success: false, error: "A customer with this phone number already exists in this shop" }
      }
    }

    // Validate assigned collector if provided
    if (payload.assignedCollectorId) {
      const collector = await prisma.shopMember.findFirst({
        where: { 
          id: payload.assignedCollectorId, 
          shopId: existingCustomer.shopId, 
          role: "DEBT_COLLECTOR",
          isActive: true,
        },
      })
      if (!collector) {
        return { success: false, error: "Invalid debt collector selected" }
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(payload.firstName !== undefined && { firstName: payload.firstName.trim() }),
        ...(payload.lastName !== undefined && { lastName: payload.lastName.trim() }),
        ...(payload.phone !== undefined && { phone: payload.phone.trim().replace(/\s+/g, "") }),
        ...(payload.email !== undefined && { email: payload.email?.trim() || null }),
        ...(payload.idType !== undefined && { idType: payload.idType?.trim() || null }),
        ...(payload.idNumber !== undefined && { idNumber: payload.idNumber?.trim() || null }),
        ...(payload.address !== undefined && { address: payload.address?.trim() || null }),
        ...(payload.city !== undefined && { city: payload.city?.trim() || null }),
        ...(payload.region !== undefined && { region: payload.region?.trim() || null }),
        ...(payload.notes !== undefined && { notes: payload.notes?.trim() || null }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        ...(payload.assignedCollectorId !== undefined && { assignedCollectorId: payload.assignedCollectorId || null }),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: customer.id,
      metadata: {
        shopId: existingCustomer.shopId,
        shopName: existingCustomer.shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
        changes: payload,
        updatedByBusinessAdmin: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/customers`)

    return { success: true, data: { id: customer.id } }
  } catch (error) {
    console.error("Error updating business customer:", error)
    return { success: false, error: "Failed to update customer" }
  }
}

/**
 * Delete a customer (Business Admin only)
 */
export async function deleteBusinessCustomer(
  businessSlug: string,
  customerId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shop: { businessId: business.id } },
      include: {
        shop: true,
        purchases: {
          where: { status: { in: ["ACTIVE", "PENDING"] } },
        },
      },
    })

    if (!customer) {
      return { success: false, error: "Customer not found in this business" }
    }

    // Prevent deletion if customer has active purchases
    if (customer.purchases.length > 0) {
      return {
        success: false,
        error: `Cannot delete customer with ${customer.purchases.length} active purchase(s). Please complete or cancel all purchases first.`,
      }
    }

    // Delete the customer (cascades to related records)
    await prisma.customer.delete({
      where: { id: customerId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_DELETED",
      entityType: "Customer",
      entityId: customerId,
      metadata: {
        shopId: customer.shopId,
        shopName: customer.shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
        deletedByBusinessAdmin: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/customers`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting business customer:", error)
    return { success: false, error: "Failed to delete customer" }
  }
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
    const totalPaid = purchase.payments
      .filter(p => p.isConfirmed)
      .reduce((sum, p) => sum + Number(p.amount), 0)
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
    where: { 
      purchase: { customer: { shop: { businessId: business.id } } },
      isConfirmed: true, // Only return confirmed payments
    },
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
    userPhone: member.user.phone,
    userGender: member.user.gender,
    userIdCardType: member.user.idCardType,
    userIdCardNumber: member.user.idCardNumber,
    userGuarantorName: member.user.guarantorName,
    userGuarantorPhone: member.user.guarantorPhone,
    userGuarantorRelationship: member.user.guarantorRelationship,
    userAddress: member.user.address,
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
    where: { businessId: business.id },
    include: {
      shopProducts: {
        include: {
          shop: {
            select: { id: true, name: true, shopSlug: true },
          },
        },
        orderBy: { shop: { name: "asc" } },
      },
      category: {
        select: { id: true, name: true },
      },
      brand: {
        select: { id: true, name: true },
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

    // Calculate total stock across all shops
    const totalStock = product.shopProducts.reduce((sum, sp) => sum + sp.stockQuantity, 0)

    // Get shop names where product is assigned
    const shopNames = product.shopProducts.map((sp) => sp.shop.name)
    
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      categoryId: product.categoryId,
      category: product.category?.name || null,
      brandId: product.brandId,
      brand: product.brand?.name || null,
      costPrice,
      cashPrice,
      layawayPrice,
      creditPrice,
      hpPrice: creditPrice, // Keep for backward compatibility
      // Profit calculations (only for business admin)
      cashProfit,
      layawayProfit,
      creditProfit,
      stockQuantity: totalStock, // Total stock across all shops
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
      // Shop assignments info
      shopNames, // Array of shop names where product is available
      shopCount: product.shopProducts.length,
      shopAssignments: product.shopProducts.map((sp) => ({
        shopId: sp.shop.id,
        shopName: sp.shop.name,
        shopSlug: sp.shop.shopSlug,
        stockQuantity: sp.stockQuantity,
        lowStockThreshold: sp.lowStockThreshold,
        isActive: sp.isActive,
        hasCustomPricing: !!(sp.costPrice || sp.cashPrice || sp.layawayPrice || sp.creditPrice),
        // Shop-specific prices (null means use default product price)
        costPrice: sp.costPrice ? Number(sp.costPrice) : null,
        cashPrice: sp.cashPrice ? Number(sp.cashPrice) : null,
        layawayPrice: sp.layawayPrice ? Number(sp.layawayPrice) : null,
        creditPrice: sp.creditPrice ? Number(sp.creditPrice) : null,
      })),
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
    const phone = formData.get("phone") as string
    const gender = formData.get("gender") as string
    const idCardType = formData.get("idCardType") as string
    const idCardNumber = formData.get("idCardNumber") as string
    const guarantorName = formData.get("guarantorName") as string
    const guarantorPhone = formData.get("guarantorPhone") as string
    const guarantorRelationship = formData.get("guarantorRelationship") as string
    const address = formData.get("address") as string

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

    if (!phone || phone.trim().length === 0) {
      return { success: false, error: "Phone number is required" }
    }

    if (!gender || !["MALE", "FEMALE", "OTHER"].includes(gender)) {
      return { success: false, error: "Gender is required" }
    }

    if (!idCardType || !["GHANA_CARD", "VOTER_ID", "PASSPORT", "DRIVERS_LICENSE", "OTHER"].includes(idCardType)) {
      return { success: false, error: "ID card type is required" }
    }

    if (!idCardNumber || idCardNumber.trim().length === 0) {
      return { success: false, error: "ID card number is required" }
    }

    if (!guarantorName || guarantorName.trim().length === 0) {
      return { success: false, error: "Guarantor name is required" }
    }

    if (!guarantorPhone || guarantorPhone.trim().length === 0) {
      return { success: false, error: "Guarantor phone is required" }
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
          phone: phone.trim(),
          gender: gender as "MALE" | "FEMALE" | "OTHER",
          idCardType: idCardType as "GHANA_CARD" | "VOTER_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "OTHER",
          idCardNumber: idCardNumber.trim(),
          guarantorName: guarantorName.trim(),
          guarantorPhone: guarantorPhone.trim(),
          guarantorRelationship: guarantorRelationship?.trim() || null,
          address: address?.trim() || null,
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
    const phone = formData.get("phone") as string
    const gender = formData.get("gender") as string
    const idCardType = formData.get("idCardType") as string
    const idCardNumber = formData.get("idCardNumber") as string
    const guarantorName = formData.get("guarantorName") as string
    const guarantorPhone = formData.get("guarantorPhone") as string
    const guarantorRelationship = formData.get("guarantorRelationship") as string
    const address = formData.get("address") as string

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

    if (!phone || phone.trim().length === 0) {
      return { success: false, error: "Phone number is required" }
    }

    if (!gender || !["MALE", "FEMALE", "OTHER"].includes(gender)) {
      return { success: false, error: "Gender is required" }
    }

    if (!idCardType || !["GHANA_CARD", "VOTER_ID", "PASSPORT", "DRIVERS_LICENSE", "OTHER"].includes(idCardType)) {
      return { success: false, error: "ID card type is required" }
    }

    if (!idCardNumber || idCardNumber.trim().length === 0) {
      return { success: false, error: "ID card number is required" }
    }

    if (!guarantorName || guarantorName.trim().length === 0) {
      return { success: false, error: "Guarantor name is required" }
    }

    if (!guarantorPhone || guarantorPhone.trim().length === 0) {
      return { success: false, error: "Guarantor phone is required" }
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
    const userData: {
      name: string
      email: string
      passwordHash?: string
      role: Role
      phone: string
      gender: "MALE" | "FEMALE" | "OTHER"
      idCardType: "GHANA_CARD" | "VOTER_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "OTHER"
      idCardNumber: string
      guarantorName: string
      guarantorPhone: string
      guarantorRelationship: string | null
      address: string | null
    } = {
      name: name.trim(),
      email: email.toLowerCase(),
      role: (role === "SHOP_ADMIN" ? "SHOP_ADMIN" : role === "DEBT_COLLECTOR" ? "DEBT_COLLECTOR" : "SALES_STAFF") as Role,
      phone: phone.trim(),
      gender: gender as "MALE" | "FEMALE" | "OTHER",
      idCardType: idCardType as "GHANA_CARD" | "VOTER_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "OTHER",
      idCardNumber: idCardNumber.trim(),
      guarantorName: guarantorName.trim(),
      guarantorPhone: guarantorPhone.trim(),
      guarantorRelationship: guarantorRelationship?.trim() || null,
      address: address?.trim() || null,
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

/**
 * Get detailed collector transaction data
 */
export interface CollectorDetailsData {
  id: string
  name: string
  email: string
  shopName: string
  shopSlug: string
  isActive: boolean
  joinedAt: Date
  stats: {
    totalCustomersSignedUp: number
    assignedCustomers: number
    totalPaymentsCollected: number
    totalAmountCollected: number
    pendingPayments: number
    pendingAmount: number
    confirmedPayments: number
    confirmedAmount: number
  }
  assignedCustomers: {
    id: string
    fullName: string
    phone: string
    outstandingBalance: number
    activePurchases: number
  }[]
  paymentHistory: {
    id: string
    amount: number
    paymentMethod: string
    status: string
    isConfirmed: boolean
    customerName: string
    purchaseNumber: string
    createdAt: Date
    confirmedAt: Date | null
  }[]
}

export async function getCollectorDetails(
  businessSlug: string,
  collectorId: string
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Get the collector with all related data
    const collector = await prisma.shopMember.findFirst({
      where: {
        id: collectorId,
        role: "DEBT_COLLECTOR",
        shop: { businessId: business.id },
      },
      include: {
        user: true,
        shop: {
          select: { id: true, name: true, shopSlug: true },
        },
        assignedCustomers: {
          include: {
            purchases: {
              where: { status: { in: ["ACTIVE", "OVERDUE"] } },
            },
          },
        },
        collectedPayments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            purchase: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
    })

    if (!collector) {
      return { success: false, error: "Collector not found" }
    }

    // Count customers signed up by this collector (created by them)
    // We check audit logs for customer creation by this user
    const customersSignedUp = await prisma.customer.count({
      where: {
        shopId: collector.shopId,
        assignedCollectorId: collector.id,
      },
    })

    // Calculate stats
    const pendingPayments = collector.collectedPayments.filter(p => !p.isConfirmed && !p.rejectedAt)
    const confirmedPayments = collector.collectedPayments.filter(p => p.isConfirmed)

    const stats = {
      totalCustomersSignedUp: customersSignedUp,
      assignedCustomers: collector.assignedCustomers.length,
      totalPaymentsCollected: collector.collectedPayments.length,
      totalAmountCollected: collector.collectedPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      pendingPayments: pendingPayments.length,
      pendingAmount: pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      confirmedPayments: confirmedPayments.length,
      confirmedAmount: confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    }

    // Format assigned customers
    const assignedCustomers = collector.assignedCustomers.map(c => ({
      id: c.id,
      fullName: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      outstandingBalance: c.purchases.reduce((sum, p) => sum + Number(p.outstandingBalance), 0),
      activePurchases: c.purchases.length,
    }))

    // Format payment history
    const paymentHistory = collector.collectedPayments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      status: p.status,
      isConfirmed: p.isConfirmed,
      customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
      purchaseNumber: p.purchase.purchaseNumber,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt,
    }))

    const data: CollectorDetailsData = {
      id: collector.id,
      name: collector.user.name || "No Name",
      email: collector.user.email,
      shopName: collector.shop.name,
      shopSlug: collector.shop.shopSlug,
      isActive: collector.isActive,
      joinedAt: collector.createdAt,
      stats,
      assignedCustomers,
      paymentHistory,
    }

    return { success: true, data }
  } catch (error) {
    console.error("Get collector details error:", error)
    return { success: false, error: "Failed to fetch collector details" }
  }
}

/**
 * Get detailed sales staff transaction data
 */
export interface SalesStaffDetailsData {
  id: string
  name: string
  email: string
  shopName: string
  shopSlug: string
  isActive: boolean
  joinedAt: Date
  stats: {
    totalCustomersSignedUp: number
    totalSales: number
    cashSales: number
    cashSalesAmount: number
    creditSales: number
    creditSalesAmount: number
    layawaySales: number
    layawaySalesAmount: number
    totalProductsSold: number
    deliveredItems: number
    pendingDeliveries: number
  }
  recentSales: {
    id: string
    purchaseNumber: string
    customerName: string
    purchaseType: string
    totalAmount: number
    status: string
    deliveryStatus: string
    productCount: number
    createdAt: Date
  }[]
  deliveries: {
    id: string
    purchaseNumber: string
    customerName: string
    deliveryStatus: string
    deliveredAt: Date | null
    productNames: string[]
  }[]
}

export async function getSalesStaffDetails(
  businessSlug: string,
  staffId: string
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Get the sales staff member
    const staffMember = await prisma.shopMember.findFirst({
      where: {
        id: staffId,
        role: "SALES_STAFF",
        shop: { businessId: business.id },
      },
      include: {
        user: true,
        shop: {
          select: { id: true, name: true, shopSlug: true },
        },
        deliveredPurchases: {
          orderBy: { deliveredAt: "desc" },
          take: 50,
          include: {
            customer: true,
            items: true,
          },
        },
      },
    })

    if (!staffMember) {
      return { success: false, error: "Sales staff member not found" }
    }

    // Count customers created by this user (via audit log)
    const customersCreated = await prisma.auditLog.count({
      where: {
        actorUserId: staffMember.userId,
        action: "CUSTOMER_CREATED",
        entityType: "Customer",
      },
    })

    // Get sales created by this user
    const sales = await prisma.auditLog.findMany({
      where: {
        actorUserId: staffMember.userId,
        action: "SALE_CREATED",
        entityType: "Purchase",
      },
      select: {
        entityId: true,
      },
    })

    const saleIds = sales.map(s => s.entityId).filter(Boolean) as string[]

    // Get purchase details
    const purchases = await prisma.purchase.findMany({
      where: {
        id: { in: saleIds },
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Calculate stats
    const cashSales = purchases.filter(p => p.purchaseType === "CASH")
    const creditSales = purchases.filter(p => p.purchaseType === "CREDIT")
    const layawaySales = purchases.filter(p => p.purchaseType === "LAYAWAY")
    const totalProductsSold = purchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0), 0)

    const stats = {
      totalCustomersSignedUp: customersCreated,
      totalSales: purchases.length,
      cashSales: cashSales.length,
      cashSalesAmount: cashSales.reduce((sum, p) => sum + Number(p.totalAmount), 0),
      creditSales: creditSales.length,
      creditSalesAmount: creditSales.reduce((sum, p) => sum + Number(p.totalAmount), 0),
      layawaySales: layawaySales.length,
      layawaySalesAmount: layawaySales.reduce((sum, p) => sum + Number(p.totalAmount), 0),
      totalProductsSold,
      deliveredItems: staffMember.deliveredPurchases.length,
      pendingDeliveries: purchases.filter(p => p.deliveryStatus === "PENDING" || p.deliveryStatus === "SCHEDULED").length,
    }

    // Format recent sales
    const recentSales = purchases.slice(0, 20).map(p => ({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      customerName: `${p.customer.firstName} ${p.customer.lastName}`,
      purchaseType: p.purchaseType,
      totalAmount: Number(p.totalAmount),
      status: p.status,
      deliveryStatus: p.deliveryStatus,
      productCount: p.items.reduce((sum, i) => sum + i.quantity, 0),
      createdAt: p.createdAt,
    }))

    // Format deliveries made by this staff
    const deliveries = staffMember.deliveredPurchases.map(p => ({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      customerName: `${p.customer.firstName} ${p.customer.lastName}`,
      deliveryStatus: p.deliveryStatus,
      deliveredAt: p.deliveredAt,
      productNames: p.items.map(i => i.productName),
    }))

    const data: SalesStaffDetailsData = {
      id: staffMember.id,
      name: staffMember.user.name || "No Name",
      email: staffMember.user.email,
      shopName: staffMember.shop.name,
      shopSlug: staffMember.shop.shopSlug,
      isActive: staffMember.isActive,
      joinedAt: staffMember.createdAt,
      stats,
      recentSales,
      deliveries,
    }

    return { success: true, data }
  } catch (error) {
    console.error("Get sales staff details error:", error)
    return { success: false, error: "Failed to fetch sales staff details" }
  }
}

// ===== CATEGORY MANAGEMENT =====

export interface CategoryPayload {
  name: string
  description?: string | null
  color?: string | null
  isActive?: boolean
}

/**
 * Get all categories for the business
 */
export async function getBusinessCategories(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const categories = await prisma.category.findMany({
    where: { businessId: business.id },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  })

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    color: cat.color,
    isActive: cat.isActive,
    productCount: cat._count.products,
    createdAt: cat.createdAt,
  }))
}

/**
 * Create a new category
 */
export async function createBusinessCategory(
  businessSlug: string,
  payload: CategoryPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    if (!payload.name || payload.name.trim().length === 0) {
      return { success: false, error: "Category name is required" }
    }

    // Check for duplicate name
    const existing = await prisma.category.findFirst({
      where: {
        businessId: business.id,
        name: { equals: payload.name.trim(), mode: "insensitive" },
      },
    })

    if (existing) {
      return { success: false, error: "A category with this name already exists" }
    }

    const category = await prisma.category.create({
      data: {
        businessId: business.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        color: payload.color || "#6366f1",
        isActive: payload.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CATEGORY_CREATED",
      entityType: "Category",
      entityId: category.id,
      metadata: { categoryName: category.name, businessId: business.id },
    })

    revalidatePath(`/business-admin/${businessSlug}/categories`)
    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true, data: { id: category.id, name: category.name } }
  } catch (error) {
    console.error("Error creating category:", error)
    return { success: false, error: "Failed to create category" }
  }
}

/**
 * Update a category
 */
export async function updateBusinessCategory(
  businessSlug: string,
  categoryId: string,
  payload: Partial<CategoryPayload>
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const category = await prisma.category.findFirst({
      where: { id: categoryId, businessId: business.id },
    })

    if (!category) {
      return { success: false, error: "Category not found" }
    }

    // Check for duplicate name if changing
    if (payload.name && payload.name.trim() !== category.name) {
      const existing = await prisma.category.findFirst({
        where: {
          businessId: business.id,
          name: { equals: payload.name.trim(), mode: "insensitive" },
          id: { not: categoryId },
        },
      })
      if (existing) {
        return { success: false, error: "A category with this name already exists" }
      }
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: payload.name?.trim() ?? category.name,
        description: payload.description !== undefined ? payload.description?.trim() || null : category.description,
        color: payload.color ?? category.color,
        isActive: payload.isActive ?? category.isActive,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CATEGORY_UPDATED",
      entityType: "Category",
      entityId: category.id,
      metadata: { categoryName: updated.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/categories`)
    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true, data: { id: updated.id, name: updated.name } }
  } catch (error) {
    console.error("Error updating category:", error)
    return { success: false, error: "Failed to update category" }
  }
}

/**
 * Delete a category
 */
export async function deleteBusinessCategory(
  businessSlug: string,
  categoryId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const category = await prisma.category.findFirst({
      where: { id: categoryId, businessId: business.id },
      include: { _count: { select: { products: true } } },
    })

    if (!category) {
      return { success: false, error: "Category not found" }
    }

    if (category._count.products > 0) {
      return { success: false, error: `Cannot delete category with ${category._count.products} products. Remove products first or reassign them.` }
    }

    await prisma.category.delete({ where: { id: categoryId } })

    await createAuditLog({
      actorUserId: user.id,
      action: "CATEGORY_DELETED",
      entityType: "Category",
      entityId: categoryId,
      metadata: { categoryName: category.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/categories`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting category:", error)
    return { success: false, error: "Failed to delete category" }
  }
}

// ===== BRAND MANAGEMENT =====

export interface BrandPayload {
  name: string
  description?: string | null
  logoUrl?: string | null
  isActive?: boolean
}

/**
 * Get all brands for the business
 */
export async function getBusinessBrands(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const brands = await prisma.brand.findMany({
    where: { businessId: business.id },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  })

  return brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    description: brand.description,
    logoUrl: brand.logoUrl,
    isActive: brand.isActive,
    productCount: brand._count.products,
    createdAt: brand.createdAt,
  }))
}

/**
 * Create a new brand
 */
export async function createBusinessBrand(
  businessSlug: string,
  payload: BrandPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    if (!payload.name || payload.name.trim().length === 0) {
      return { success: false, error: "Brand name is required" }
    }

    // Check for duplicate name
    const existing = await prisma.brand.findFirst({
      where: {
        businessId: business.id,
        name: { equals: payload.name.trim(), mode: "insensitive" },
      },
    })

    if (existing) {
      return { success: false, error: "A brand with this name already exists" }
    }

    const brand = await prisma.brand.create({
      data: {
        businessId: business.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        logoUrl: payload.logoUrl || null,
        isActive: payload.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BRAND_CREATED",
      entityType: "Brand",
      entityId: brand.id,
      metadata: { brandName: brand.name, businessId: business.id },
    })

    revalidatePath(`/business-admin/${businessSlug}/brands`)
    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true, data: { id: brand.id, name: brand.name } }
  } catch (error) {
    console.error("Error creating brand:", error)
    return { success: false, error: "Failed to create brand" }
  }
}

/**
 * Update a brand
 */
export async function updateBusinessBrand(
  businessSlug: string,
  brandId: string,
  payload: Partial<BrandPayload>
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, businessId: business.id },
    })

    if (!brand) {
      return { success: false, error: "Brand not found" }
    }

    // Check for duplicate name if changing
    if (payload.name && payload.name.trim() !== brand.name) {
      const existing = await prisma.brand.findFirst({
        where: {
          businessId: business.id,
          name: { equals: payload.name.trim(), mode: "insensitive" },
          id: { not: brandId },
        },
      })
      if (existing) {
        return { success: false, error: "A brand with this name already exists" }
      }
    }

    const updated = await prisma.brand.update({
      where: { id: brandId },
      data: {
        name: payload.name?.trim() ?? brand.name,
        description: payload.description !== undefined ? payload.description?.trim() || null : brand.description,
        logoUrl: payload.logoUrl !== undefined ? payload.logoUrl || null : brand.logoUrl,
        isActive: payload.isActive ?? brand.isActive,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BRAND_UPDATED",
      entityType: "Brand",
      entityId: brand.id,
      metadata: { brandName: updated.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/brands`)
    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true, data: { id: updated.id, name: updated.name } }
  } catch (error) {
    console.error("Error updating brand:", error)
    return { success: false, error: "Failed to update brand" }
  }
}

/**
 * Delete a brand
 */
export async function deleteBusinessBrand(
  businessSlug: string,
  brandId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, businessId: business.id },
      include: { _count: { select: { products: true } } },
    })

    if (!brand) {
      return { success: false, error: "Brand not found" }
    }

    if (brand._count.products > 0) {
      return { success: false, error: `Cannot delete brand with ${brand._count.products} products. Remove products first or reassign them.` }
    }

    await prisma.brand.delete({ where: { id: brandId } })

    await createAuditLog({
      actorUserId: user.id,
      action: "BRAND_DELETED",
      entityType: "Brand",
      entityId: brandId,
      metadata: { brandName: brand.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/brands`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting brand:", error)
    return { success: false, error: "Failed to delete brand" }
  }
}

// ===== TAX MANAGEMENT =====

export interface TaxData {
  id: string
  name: string
  description: string | null
  rate: number
  isCompound: boolean
  isActive: boolean
  createdAt: Date
  // Assignment counts
  productCount: number
  categoryCount: number
  brandCount: number
  shopCount: number
}

export interface TaxPayload {
  name: string
  description?: string | null
  rate: number
  isCompound?: boolean
  isActive?: boolean
}

/**
 * Get all taxes for the business
 */
export async function getBusinessTaxes(businessSlug: string): Promise<TaxData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const taxes = await prisma.tax.findMany({
    where: { businessId: business.id },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
      brands: { select: { id: true } },
      shops: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  })

  return taxes.map((tax) => ({
    id: tax.id,
    name: tax.name,
    description: tax.description,
    rate: Number(tax.rate),
    isCompound: tax.isCompound,
    isActive: tax.isActive,
    createdAt: tax.createdAt,
    productCount: tax.products.length,
    categoryCount: tax.categories.length,
    brandCount: tax.brands.length,
    shopCount: tax.shops.length,
  }))
}

/**
 * Create a new tax
 */
export async function createTax(
  businessSlug: string,
  payload: TaxPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Validate
    if (!payload.name.trim()) {
      return { success: false, error: "Tax name is required" }
    }
    if (payload.rate < 0 || payload.rate > 100) {
      return { success: false, error: "Tax rate must be between 0 and 100" }
    }

    // Check for duplicate
    const existing = await prisma.tax.findFirst({
      where: {
        businessId: business.id,
        name: { equals: payload.name.trim(), mode: "insensitive" },
      },
    })
    if (existing) {
      return { success: false, error: "A tax with this name already exists" }
    }

    const tax = await prisma.tax.create({
      data: {
        businessId: business.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        rate: payload.rate,
        isCompound: payload.isCompound ?? false,
        isActive: payload.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "TAX_CREATED",
      entityType: "Tax",
      entityId: tax.id,
      metadata: { name: tax.name, rate: Number(tax.rate) },
    })

    revalidatePath(`/business-admin/${businessSlug}/taxes`)
    return { success: true, data: { id: tax.id } }
  } catch (error) {
    console.error("Error creating tax:", error)
    return { success: false, error: "Failed to create tax" }
  }
}

/**
 * Update an existing tax
 */
export async function updateTax(
  businessSlug: string,
  taxId: string,
  payload: TaxPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const tax = await prisma.tax.findFirst({
      where: { id: taxId, businessId: business.id },
    })
    if (!tax) {
      return { success: false, error: "Tax not found" }
    }

    // Validate
    if (!payload.name.trim()) {
      return { success: false, error: "Tax name is required" }
    }
    if (payload.rate < 0 || payload.rate > 100) {
      return { success: false, error: "Tax rate must be between 0 and 100" }
    }

    // Check for duplicate
    const existing = await prisma.tax.findFirst({
      where: {
        businessId: business.id,
        name: { equals: payload.name.trim(), mode: "insensitive" },
        id: { not: taxId },
      },
    })
    if (existing) {
      return { success: false, error: "A tax with this name already exists" }
    }

    await prisma.tax.update({
      where: { id: taxId },
      data: {
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        rate: payload.rate,
        isCompound: payload.isCompound ?? tax.isCompound,
        isActive: payload.isActive ?? tax.isActive,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "TAX_UPDATED",
      entityType: "Tax",
      entityId: taxId,
      metadata: { name: payload.name, rate: payload.rate },
    })

    revalidatePath(`/business-admin/${businessSlug}/taxes`)
    return { success: true }
  } catch (error) {
    console.error("Error updating tax:", error)
    return { success: false, error: "Failed to update tax" }
  }
}

/**
 * Delete a tax
 */
export async function deleteTax(
  businessSlug: string,
  taxId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const tax = await prisma.tax.findFirst({
      where: { id: taxId, businessId: business.id },
    })
    if (!tax) {
      return { success: false, error: "Tax not found" }
    }

    await prisma.tax.delete({ where: { id: taxId } })

    await createAuditLog({
      actorUserId: user.id,
      action: "TAX_DELETED",
      entityType: "Tax",
      entityId: taxId,
      metadata: { name: tax.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/taxes`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting tax:", error)
    return { success: false, error: "Failed to delete tax" }
  }
}

/**
 * Assign tax to products
 */
export async function assignTaxToProducts(
  businessSlug: string,
  taxId: string,
  productIds: string[]
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const tax = await prisma.tax.findFirst({
      where: { id: taxId, businessId: business.id },
    })
    if (!tax) {
      return { success: false, error: "Tax not found" }
    }

    // Remove existing assignments for this tax
    await prisma.productTax.deleteMany({ where: { taxId } })

    // Create new assignments
    if (productIds.length > 0) {
      await prisma.productTax.createMany({
        data: productIds.map((productId) => ({ productId, taxId })),
        skipDuplicates: true,
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "TAX_PRODUCTS_ASSIGNED",
      entityType: "Tax",
      entityId: taxId,
      metadata: { taxName: tax.name, productCount: productIds.length },
    })

    revalidatePath(`/business-admin/${businessSlug}/taxes`)
    return { success: true }
  } catch (error) {
    console.error("Error assigning tax to products:", error)
    return { success: false, error: "Failed to assign tax" }
  }
}

/**
 * Assign tax to categories
 */
export async function assignTaxToCategories(
  businessSlug: string,
  taxId: string,
  categoryIds: string[]
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const tax = await prisma.tax.findFirst({
      where: { id: taxId, businessId: business.id },
    })
    if (!tax) {
      return { success: false, error: "Tax not found" }
    }

    // Remove existing assignments for this tax
    await prisma.categoryTax.deleteMany({ where: { taxId } })

    // Create new assignments
    if (categoryIds.length > 0) {
      await prisma.categoryTax.createMany({
        data: categoryIds.map((categoryId) => ({ categoryId, taxId })),
        skipDuplicates: true,
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "TAX_CATEGORIES_ASSIGNED",
      entityType: "Tax",
      entityId: taxId,
      metadata: { taxName: tax.name, categoryCount: categoryIds.length },
    })

    revalidatePath(`/business-admin/${businessSlug}/taxes`)
    return { success: true }
  } catch (error) {
    console.error("Error assigning tax to categories:", error)
    return { success: false, error: "Failed to assign tax" }
  }
}

/**
 * Assign tax to brands
 */
export async function assignTaxToBrands(
  businessSlug: string,
  taxId: string,
  brandIds: string[]
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const tax = await prisma.tax.findFirst({
      where: { id: taxId, businessId: business.id },
    })
    if (!tax) {
      return { success: false, error: "Tax not found" }
    }

    // Remove existing assignments for this tax
    await prisma.brandTax.deleteMany({ where: { taxId } })

    // Create new assignments
    if (brandIds.length > 0) {
      await prisma.brandTax.createMany({
        data: brandIds.map((brandId) => ({ brandId, taxId })),
        skipDuplicates: true,
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "TAX_BRANDS_ASSIGNED",
      entityType: "Tax",
      entityId: taxId,
      metadata: { taxName: tax.name, brandCount: brandIds.length },
    })

    revalidatePath(`/business-admin/${businessSlug}/taxes`)
    return { success: true }
  } catch (error) {
    console.error("Error assigning tax to brands:", error)
    return { success: false, error: "Failed to assign tax" }
  }
}

/**
 * Assign tax to shops
 */
export async function assignTaxToShops(
  businessSlug: string,
  taxId: string,
  shopIds: string[]
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const tax = await prisma.tax.findFirst({
      where: { id: taxId, businessId: business.id },
    })
    if (!tax) {
      return { success: false, error: "Tax not found" }
    }

    // Remove existing assignments for this tax
    await prisma.shopTax.deleteMany({ where: { taxId } })

    // Create new assignments
    if (shopIds.length > 0) {
      await prisma.shopTax.createMany({
        data: shopIds.map((shopId) => ({ shopId, taxId })),
        skipDuplicates: true,
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "TAX_SHOPS_ASSIGNED",
      entityType: "Tax",
      entityId: taxId,
      metadata: { taxName: tax.name, shopCount: shopIds.length },
    })

    revalidatePath(`/business-admin/${businessSlug}/taxes`)
    return { success: true }
  } catch (error) {
    console.error("Error assigning tax to shops:", error)
    return { success: false, error: "Failed to assign tax" }
  }
}

/**
 * Get tax assignments for a specific tax
 */
export async function getTaxAssignments(businessSlug: string, taxId: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const tax = await prisma.tax.findFirst({
    where: { id: taxId, businessId: business.id },
    include: {
      products: { select: { productId: true } },
      categories: { select: { categoryId: true } },
      brands: { select: { brandId: true } },
      shops: { select: { shopId: true } },
    },
  })

  if (!tax) return null

  return {
    productIds: tax.products.map((p) => p.productId),
    categoryIds: tax.categories.map((c) => c.categoryId),
    brandIds: tax.brands.map((b) => b.brandId),
    shopIds: tax.shops.map((s) => s.shopId),
  }
}

/**
 * Calculate applicable taxes for a product in a shop
 * Taxes can come from: product, category, brand, or shop assignments
 */
export async function getApplicableTaxes(
  businessId: string,
  productId: string,
  shopId: string
): Promise<{ id: string; name: string; rate: number; isCompound: boolean }[]> {
  // Get product details
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, brandId: true },
  })

  if (!product) return []

  // Find all applicable taxes (active only, no duplicates)
  const applicableTaxIds = new Set<string>()
  const taxMap = new Map<string, { id: string; name: string; rate: number; isCompound: boolean }>()

  // 1. Product-level taxes
  const productTaxes = await prisma.productTax.findMany({
    where: { productId },
    include: { tax: true },
  })
  for (const pt of productTaxes) {
    if (pt.tax.isActive) {
      applicableTaxIds.add(pt.tax.id)
      taxMap.set(pt.tax.id, {
        id: pt.tax.id,
        name: pt.tax.name,
        rate: Number(pt.tax.rate),
        isCompound: pt.tax.isCompound,
      })
    }
  }

  // 2. Category-level taxes
  if (product.categoryId) {
    const categoryTaxes = await prisma.categoryTax.findMany({
      where: { categoryId: product.categoryId },
      include: { tax: true },
    })
    for (const ct of categoryTaxes) {
      if (ct.tax.isActive && !applicableTaxIds.has(ct.tax.id)) {
        applicableTaxIds.add(ct.tax.id)
        taxMap.set(ct.tax.id, {
          id: ct.tax.id,
          name: ct.tax.name,
          rate: Number(ct.tax.rate),
          isCompound: ct.tax.isCompound,
        })
      }
    }
  }

  // 3. Brand-level taxes
  if (product.brandId) {
    const brandTaxes = await prisma.brandTax.findMany({
      where: { brandId: product.brandId },
      include: { tax: true },
    })
    for (const bt of brandTaxes) {
      if (bt.tax.isActive && !applicableTaxIds.has(bt.tax.id)) {
        applicableTaxIds.add(bt.tax.id)
        taxMap.set(bt.tax.id, {
          id: bt.tax.id,
          name: bt.tax.name,
          rate: Number(bt.tax.rate),
          isCompound: bt.tax.isCompound,
        })
      }
    }
  }

  // 4. Shop-level taxes
  const shopTaxes = await prisma.shopTax.findMany({
    where: { shopId },
    include: { tax: true },
  })
  for (const st of shopTaxes) {
    if (st.tax.isActive && !applicableTaxIds.has(st.tax.id)) {
      applicableTaxIds.add(st.tax.id)
      taxMap.set(st.tax.id, {
        id: st.tax.id,
        name: st.tax.name,
        rate: Number(st.tax.rate),
        isCompound: st.tax.isCompound,
      })
    }
  }

  // Return taxes sorted: non-compound first, then compound
  const taxes = Array.from(taxMap.values())
  return taxes.sort((a, b) => (a.isCompound === b.isCompound ? 0 : a.isCompound ? 1 : -1))
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
  brandId?: string | null
}

/**
 * Create a new product (business admin - for any shop in business)
 */
export async function createBusinessProduct(
  businessSlug: string,
  shopSlug: string,
  payload: ProductPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Verify the shop belongs to this business
    const shop = await prisma.shop.findFirst({
      where: {
        shopSlug,
        businessId: business.id,
      },
    })

    if (!shop) {
      return { success: false, error: "Shop not found or not part of this business" }
    }

    // Validation
    if (!payload.name || payload.name.trim().length === 0) {
      return { success: false, error: "Product name is required" }
    }

    if (payload.cashPrice < 0 || payload.layawayPrice < 0 || payload.creditPrice < 0) {
      return { success: false, error: "Prices must be 0 or greater" }
    }

    // Validate pricing logic: Cash <= Layaway <= Credit
    if (payload.cashPrice > payload.layawayPrice) {
      return { success: false, error: "Cash price should not exceed layaway price" }
    }
    if (payload.layawayPrice > payload.creditPrice) {
      return { success: false, error: "Layaway price should not exceed credit price" }
    }

    // Check for duplicate SKU at business level if provided
    if (payload.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          businessId: business.id,
          sku: payload.sku.trim(),
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists in this business" }
      }
    }

    // Create product at business level and ShopProduct entry in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the product at business level
      const product = await tx.product.create({
        data: {
          businessId: business.id,
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          sku: payload.sku?.trim() || null,
          costPrice: new Prisma.Decimal(payload.costPrice ?? 0),
          cashPrice: new Prisma.Decimal(payload.cashPrice),
          layawayPrice: new Prisma.Decimal(payload.layawayPrice),
          creditPrice: new Prisma.Decimal(payload.creditPrice),
          price: new Prisma.Decimal(payload.cashPrice), // Default to cash price
          stockQuantity: 0, // Main product stock stays at 0, shop-specific stock in ShopProduct
          lowStockThreshold: payload.lowStockThreshold ?? 5,
          imageUrl: payload.imageUrl || null,
          isActive: payload.isActive ?? true,
          categoryId: payload.categoryId || null,
          brandId: payload.brandId || null,
        },
      })

      // Create ShopProduct entry with the stock for this shop
      await tx.shopProduct.create({
        data: {
          shopId: shop.id,
          productId: product.id,
          stockQuantity: payload.stockQuantity ?? 0,
          isActive: true,
        },
      })

      return product
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: result.id,
      metadata: {
        businessId: business.id,
        businessName: business.name,
        shopId: shop.id,
        shopName: shop.name,
        productName: result.name,
        productSku: result.sku,
        cashPrice: Number(result.cashPrice),
        layawayPrice: Number(result.layawayPrice),
        creditPrice: Number(result.creditPrice),
        stockQuantity: payload.stockQuantity ?? 0,
        createdByBusinessAdmin: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        shopName: shop.name,
      },
    }
  } catch (error) {
    console.error("Error creating product:", error)
    return { success: false, error: "Failed to create product" }
  }
}

/**
 * Create a new product and assign to multiple shops
 */
export interface ShopStockAssignment {
  shopId: string
  stockQuantity: number
  lowStockThreshold: number
}

export async function createBusinessProductMultiShop(
  businessSlug: string,
  payload: ProductPayload,
  shopAssignments: ShopStockAssignment[]
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Validation
    if (!payload.name || payload.name.trim().length === 0) {
      return { success: false, error: "Product name is required" }
    }

    if (shopAssignments.length === 0) {
      return { success: false, error: "Please assign the product to at least one shop" }
    }

    if (payload.cashPrice < 0 || payload.layawayPrice < 0 || payload.creditPrice < 0) {
      return { success: false, error: "Prices must be 0 or greater" }
    }

    // Validate pricing logic: Cash <= Layaway <= Credit
    if (payload.cashPrice > payload.layawayPrice) {
      return { success: false, error: "Cash price should not exceed layaway price" }
    }
    if (payload.layawayPrice > payload.creditPrice) {
      return { success: false, error: "Layaway price should not exceed credit price" }
    }

    // Verify all shops belong to this business
    const shopIds = shopAssignments.map(sa => sa.shopId)
    const validShops = await prisma.shop.findMany({
      where: {
        id: { in: shopIds },
        businessId: business.id,
      },
    })

    if (validShops.length !== shopIds.length) {
      return { success: false, error: "One or more shops not found or not part of this business" }
    }

    // Check for duplicate SKU at business level if provided
    if (payload.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          businessId: business.id,
          sku: payload.sku.trim(),
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists in this business" }
      }
    }

    // Create product at business level and ShopProduct entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the product at business level
      const product = await tx.product.create({
        data: {
          businessId: business.id,
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          sku: payload.sku?.trim() || null,
          costPrice: new Prisma.Decimal(payload.costPrice ?? 0),
          cashPrice: new Prisma.Decimal(payload.cashPrice),
          layawayPrice: new Prisma.Decimal(payload.layawayPrice),
          creditPrice: new Prisma.Decimal(payload.creditPrice),
          price: new Prisma.Decimal(payload.cashPrice),
          stockQuantity: 0,
          lowStockThreshold: payload.lowStockThreshold ?? 5,
          imageUrl: payload.imageUrl || null,
          isActive: payload.isActive ?? true,
          categoryId: payload.categoryId || null,
          brandId: payload.brandId || null,
        },
      })

      // Create ShopProduct entries for all assigned shops
      await tx.shopProduct.createMany({
        data: shopAssignments.map(sa => ({
          shopId: sa.shopId,
          productId: product.id,
          stockQuantity: sa.stockQuantity,
          lowStockThreshold: sa.lowStockThreshold,
          isActive: true,
        })),
      })

      return product
    })

    const shopNames = validShops.map(s => s.name).join(", ")
    const totalStock = shopAssignments.reduce((sum, sa) => sum + sa.stockQuantity, 0)

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: result.id,
      metadata: {
        businessId: business.id,
        businessName: business.name,
        productName: result.name,
        productSku: result.sku,
        cashPrice: Number(result.cashPrice),
        layawayPrice: Number(result.layawayPrice),
        creditPrice: Number(result.creditPrice),
        totalStock,
        shopCount: shopAssignments.length,
        shopNames,
        createdByBusinessAdmin: true,
        multiShop: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        shopCount: shopAssignments.length,
        shopNames,
        totalStock,
      },
    }
  } catch (error) {
    console.error("Error creating product:", error)
    return { success: false, error: "Failed to create product" }
  }
}

/**
 * Assign an existing product to a shop with stock quantity
 */
export interface AssignProductPayload {
  stockQuantity: number
  lowStockThreshold?: number
  costPrice?: number | null
  cashPrice?: number | null
  layawayPrice?: number | null
  creditPrice?: number | null
}

export async function assignProductToShop(
  businessSlug: string,
  productId: string,
  shopId: string,
  payload: AssignProductPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Verify product belongs to this business
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
      },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    // Verify shop belongs to this business
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        businessId: business.id,
      },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Check if product is already assigned to this shop
    const existingAssignment = await prisma.shopProduct.findUnique({
      where: {
        shopId_productId: {
          shopId: shop.id,
          productId: product.id,
        },
      },
    })

    if (existingAssignment) {
      return { success: false, error: "Product is already assigned to this shop" }
    }

    // Create ShopProduct entry
    await prisma.shopProduct.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        stockQuantity: payload.stockQuantity,
        lowStockThreshold: payload.lowStockThreshold ?? 5,
        costPrice: payload.costPrice != null ? new Prisma.Decimal(payload.costPrice) : null,
        cashPrice: payload.cashPrice != null ? new Prisma.Decimal(payload.cashPrice) : null,
        layawayPrice: payload.layawayPrice != null ? new Prisma.Decimal(payload.layawayPrice) : null,
        creditPrice: payload.creditPrice != null ? new Prisma.Decimal(payload.creditPrice) : null,
        isActive: true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_ASSIGNED_TO_SHOP",
      entityType: "ShopProduct",
      entityId: `${shopId}-${productId}`,
      metadata: {
        businessSlug,
        productId: product.id,
        productName: product.name,
        shopId: shop.id,
        shopName: shop.name,
        stockQuantity: payload.stockQuantity,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return {
      success: true,
      data: {
        productName: product.name,
        shopName: shop.name,
        stockQuantity: payload.stockQuantity,
      },
    }
  } catch (error) {
    console.error("Error assigning product to shop:", error)
    return { success: false, error: "Failed to assign product to shop" }
  }
}

/**
 * Update shop-specific stock and pricing for a product
 */
export async function updateShopProductStock(
  businessSlug: string,
  productId: string,
  shopId: string,
  payload: Partial<AssignProductPayload>
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Verify product belongs to this business
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
      },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    // Verify shop belongs to this business
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        businessId: business.id,
      },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Find the ShopProduct entry
    const shopProduct = await prisma.shopProduct.findUnique({
      where: {
        shopId_productId: {
          shopId: shop.id,
          productId: product.id,
        },
      },
    })

    if (!shopProduct) {
      return { success: false, error: "Product is not assigned to this shop" }
    }

    // Update the ShopProduct entry
    await prisma.shopProduct.update({
      where: { id: shopProduct.id },
      data: {
        ...(payload.stockQuantity !== undefined && { stockQuantity: payload.stockQuantity }),
        ...(payload.lowStockThreshold !== undefined && { lowStockThreshold: payload.lowStockThreshold }),
        ...(payload.costPrice !== undefined && { costPrice: payload.costPrice != null ? new Prisma.Decimal(payload.costPrice) : null }),
        ...(payload.cashPrice !== undefined && { cashPrice: payload.cashPrice != null ? new Prisma.Decimal(payload.cashPrice) : null }),
        ...(payload.layawayPrice !== undefined && { layawayPrice: payload.layawayPrice != null ? new Prisma.Decimal(payload.layawayPrice) : null }),
        ...(payload.creditPrice !== undefined && { creditPrice: payload.creditPrice != null ? new Prisma.Decimal(payload.creditPrice) : null }),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "SHOP_PRODUCT_UPDATED",
      entityType: "ShopProduct",
      entityId: shopProduct.id,
      metadata: {
        businessSlug,
        productId: product.id,
        productName: product.name,
        shopId: shop.id,
        shopName: shop.name,
        changes: payload,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true }
  } catch (error) {
    console.error("Error updating shop product stock:", error)
    return { success: false, error: "Failed to update shop product stock" }
  }
}

/**
 * Remove a product from a shop (unassign)
 */
export async function removeProductFromShop(
  businessSlug: string,
  productId: string,
  shopId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Verify product belongs to this business
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
      },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    // Verify shop belongs to this business
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        businessId: business.id,
      },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Check if there are active purchases with this product in this shop
    const activePurchases = await prisma.purchase.count({
      where: {
        customer: { shopId: shop.id },
        items: {
          some: { productId: product.id },
        },
        status: { in: ["ACTIVE", "OVERDUE"] },
      },
    })

    if (activePurchases > 0) {
      return {
        success: false,
        error: `Cannot remove product from shop with ${activePurchases} active purchase(s)`,
      }
    }

    // Delete the ShopProduct entry
    await prisma.shopProduct.delete({
      where: {
        shopId_productId: {
          shopId: shop.id,
          productId: product.id,
        },
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_REMOVED_FROM_SHOP",
      entityType: "ShopProduct",
      entityId: `${shopId}-${productId}`,
      metadata: {
        businessSlug,
        productId: product.id,
        productName: product.name,
        shopId: shop.id,
        shopName: shop.name,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/products`)

    return { success: true }
  } catch (error) {
    console.error("Error removing product from shop:", error)
    return { success: false, error: "Failed to remove product from shop" }
  }
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

    // Get product and verify it belongs to this business
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
      },
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

    // Check for duplicate SKU at business level if changing
    if (payload.sku && payload.sku !== product.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          businessId: business.id,
          sku: payload.sku.trim(),
          id: { not: productId },
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists in this business" }
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
        ...(payload.lowStockThreshold !== undefined && { lowStockThreshold: payload.lowStockThreshold }),
        ...(payload.imageUrl !== undefined && { imageUrl: payload.imageUrl || null }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        ...(payload.categoryId !== undefined && { categoryId: payload.categoryId || null }),
        ...(payload.brandId !== undefined && { brandId: payload.brandId || null }),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: updatedProduct.id,
      metadata: {
        businessSlug,
        businessId: business.id,
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

    // Get product and verify it belongs to this business
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
      },
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

    // Delete product (ShopProduct entries will cascade delete)
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
        businessId: business.id,
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
        businessId: business.id,
      },
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
      businessId: business.id,
    },
    include: {
      shopProducts: {
        include: {
          shop: { select: { id: true, name: true, shopSlug: true } },
        },
      },
      category: { select: { id: true, name: true, color: true } },
    },
  })

  if (!product) {
    return null
  }

  // Calculate total stock across all shops
  const totalStock = product.shopProducts.reduce((sum, sp) => sum + sp.stockQuantity, 0)

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    cashPrice: Number(product.cashPrice),
    layawayPrice: Number(product.layawayPrice),
    creditPrice: Number(product.creditPrice),
    stockQuantity: totalStock, // Total stock across all shops
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    categoryId: product.categoryId,
    categoryName: product.category?.name,
    categoryColor: product.category?.color,
    createdAt: product.createdAt,
    // Shop assignments with stock levels
    shopAssignments: product.shopProducts.map((sp) => ({
      shopId: sp.shop.id,
      shopName: sp.shop.name,
      shopSlug: sp.shop.shopSlug,
      stockQuantity: sp.stockQuantity,
      lowStockThreshold: sp.lowStockThreshold,
      isActive: sp.isActive,
      costPrice: sp.costPrice ? Number(sp.costPrice) : null,
      cashPrice: sp.cashPrice ? Number(sp.cashPrice) : null,
      layawayPrice: sp.layawayPrice ? Number(sp.layawayPrice) : null,
      creditPrice: sp.creditPrice ? Number(sp.creditPrice) : null,
    })),
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
    const previousBalance = Number(purchase.outstandingBalance)
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

    // Generate Progress Invoice for this payment
    const year = new Date().getFullYear()
    const invoiceCount = await prisma.progressInvoice.count()
    const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(6, "0")}`

    // Get collector info if available
    let collectorName: string | null = null
    if (payment.collectorId) {
      const collector = await prisma.shopMember.findUnique({
        where: { id: payment.collectorId },
        include: { user: true },
      })
      collectorName = collector?.user?.name || null
    }

    let waybillNumber: string | null = null
    let waybillGenerated = false

    // AUTO-GENERATE WAYBILL and DEDUCT STOCK when purchase is fully paid
    if (isCompleted) {
      // Deduct stock for each item (only for non-CASH purchases, CASH already deducted at sale)
      if (purchase.purchaseType !== "CASH") {
        const shopId = purchase.customer.shopId
        for (const item of purchase.items) {
          if (item.productId) {
            await prisma.shopProduct.updateMany({
              where: { 
                shopId: shopId,
                productId: item.productId 
              },
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
        const waybillCount = await prisma.waybill.count()
        waybillNumber = `WB-${year}-${String(waybillCount + 1).padStart(5, "0")}`

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

        waybillGenerated = true

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
      } else {
        waybillNumber = existingWaybill.waybillNumber
        waybillGenerated = true
      }
    }

    // Create the progress invoice
    const shop = purchase.customer.shop
    const progressInvoice = await prisma.progressInvoice.create({
      data: {
        invoiceNumber,
        paymentId: payment.id,
        purchaseId: purchase.id,
        paymentAmount: payment.amount,
        previousBalance,
        newBalance: Math.max(0, newOutstanding),
        totalPurchaseAmount: purchase.totalAmount,
        totalAmountPaid: newAmountPaid,
        collectorId: payment.collectorId,
        collectorName,
        confirmedByName: user.name,
        paymentMethod: payment.paymentMethod,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        customerPhone: purchase.customer.phone,
        customerAddress: purchase.customer.address,
        purchaseNumber: purchase.purchaseNumber,
        purchaseType: purchase.purchaseType,
        shopId: shop.id,
        shopName: shop.name,
        businessId: business.id,
        businessName: business.name,
        isPurchaseCompleted: isCompleted,
        waybillGenerated,
        waybillNumber,
        notes: payment.notes,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PROGRESS_INVOICE_GENERATED",
      entityType: "ProgressInvoice",
      entityId: progressInvoice.id,
      metadata: {
        invoiceNumber,
        paymentId: payment.id,
        purchaseId: purchase.id,
        amount: Number(payment.amount),
        isCompleted,
        waybillGenerated,
        confirmedByBusinessAdmin: true,
      },
    })

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
    }
  })
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
  // Account creation fields
  createAccount?: boolean
  accountEmail?: string
  accountPassword?: string
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

      // Hash password
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

    // Create the customer
    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        email: payload.createAccount 
          ? payload.accountEmail?.trim().toLowerCase() 
          : (payload.email || null),
        idType: payload.idType || null,
        idNumber: payload.idNumber || null,
        address: payload.address || null,
        city: payload.city || null,
        region: payload.region || null,
        preferredPayment: payload.preferredPayment || "BOTH",
        assignedCollectorId: payload.assignedCollectorId || null,
        notes: payload.notes || null,
        userId: userAccount?.id || null,
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
        hasAccount: !!userAccount,
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
        hasAccount: !!userAccount,
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

// ============================================
// DELIVERIES (Business Admin)
// ============================================

export interface BusinessDeliveryData {
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
  shopName: string
  shopSlug: string
}

/**
 * Get all deliveries across all shops in the business
 */
export async function getBusinessDeliveries(businessSlug: string): Promise<BusinessDeliveryData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shop: { businessId: business.id } },
    },
    include: {
      customer: {
        include: { shop: true },
      },
      items: true,
      deliveredBy: {
        include: { user: true },
      },
      waybill: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
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
    shopName: p.customer.shop.name,
    shopSlug: p.customer.shop.shopSlug,
  }))
}

/**
 * Get pending deliveries across all shops
 */
export async function getBusinessPendingDeliveries(businessSlug: string): Promise<BusinessDeliveryData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shop: { businessId: business.id } },
      deliveryStatus: { in: ["PENDING", "SCHEDULED", "IN_TRANSIT"] },
    },
    include: {
      customer: {
        include: { shop: true },
      },
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
    shopName: p.customer.shop.name,
    shopSlug: p.customer.shop.shopSlug,
  }))
}

export interface BusinessReadyForDeliveryData {
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
  shopName: string
  shopSlug: string
}

/**
 * Get purchases that are fully paid with waybills and ready for delivery
 */
export async function getBusinessReadyForDelivery(businessSlug: string): Promise<BusinessReadyForDeliveryData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shop: { businessId: business.id } },
      status: "COMPLETED",
      deliveryStatus: { in: ["PENDING", "SCHEDULED", "IN_TRANSIT"] },
      waybill: { isNot: null },
    },
    include: {
      customer: {
        include: { shop: true },
      },
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
    shopName: p.customer.shop.name,
    shopSlug: p.customer.shop.shopSlug,
  }))
}

/**
 * Get delivery stats for business admin
 */
export async function getBusinessDeliveryStats(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const [pending, scheduled, inTransit, delivered, readyForDelivery] = await Promise.all([
    prisma.purchase.count({
      where: {
        customer: { shop: { businessId: business.id } },
        deliveryStatus: "PENDING",
      },
    }),
    prisma.purchase.count({
      where: {
        customer: { shop: { businessId: business.id } },
        deliveryStatus: "SCHEDULED",
      },
    }),
    prisma.purchase.count({
      where: {
        customer: { shop: { businessId: business.id } },
        deliveryStatus: "IN_TRANSIT",
      },
    }),
    prisma.purchase.count({
      where: {
        customer: { shop: { businessId: business.id } },
        deliveryStatus: "DELIVERED",
      },
    }),
    prisma.purchase.count({
      where: {
        customer: { shop: { businessId: business.id } },
        status: "COMPLETED",
        deliveryStatus: { in: ["PENDING", "SCHEDULED"] },
        waybill: { isNot: null },
      },
    }),
  ])

  return { pending, scheduled, inTransit, delivered, readyForDelivery }
}

/**
 * Update delivery status (Business Admin)
 */
export async function updateBusinessDeliveryStatus(
  businessSlug: string,
  purchaseId: string,
  status: DeliveryStatus,
  scheduledDate?: Date
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: { shop: { businessId: business.id } },
      },
      include: {
        customer: { include: { shop: true } },
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
        businessId: business.id,
        shopId: purchase.customer.shopId,
        purchaseNumber: purchase.purchaseNumber,
        newStatus: status,
        updatedByBusinessAdmin: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/deliveries`)

    return { success: true }
  } catch (error) {
    console.error("Error updating delivery status:", error)
    return { success: false, error: "Failed to update delivery status" }
  }
}

/**
 * Generate waybill (Business Admin)
 */
export async function generateBusinessWaybill(
  businessSlug: string,
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
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: { shop: { businessId: business.id } },
      },
      include: {
        customer: { include: { shop: true } },
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
        businessId: business.id,
        shopId: purchase.customer.shopId,
        waybillNumber,
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        generatedByBusinessAdmin: true,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/deliveries`)

    return { success: true, data: { waybillId: waybill.id, waybillNumber } }
  } catch (error) {
    console.error("Error generating waybill:", error)
    return { success: false, error: "Failed to generate waybill" }
  }
}

/**
 * Get waybill data (Business Admin)
 */
export async function getBusinessWaybill(businessSlug: string, purchaseId: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const purchase = await prisma.purchase.findFirst({
    where: {
      id: purchaseId,
      customer: { shop: { businessId: business.id } },
    },
    include: {
      customer: { include: { shop: { include: { business: true } } } },
      items: true,
      waybill: true,
    },
  })

  if (!purchase || !purchase.waybill) return null

  const waybill = purchase.waybill

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
    shopName: purchase.customer.shop.name,
    businessName: purchase.customer.shop.business?.name || purchase.customer.shop.name,
    generatedByName,
  }
}

// ============================================
// PROGRESS INVOICES (Business Admin View)
// ============================================

export interface BusinessInvoiceData {
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
  shopId: string
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
 * Get all invoices across all shops in the business
 */
export async function getBusinessInvoices(businessSlug: string): Promise<BusinessInvoiceData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const invoices = await prisma.progressInvoice.findMany({
    where: { businessId: business.id },
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
    shopId: inv.shopId,
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
 * Get a single progress invoice by ID (for business admin view)
 */
export async function getBusinessProgressInvoice(businessSlug: string, invoiceId: string): Promise<BusinessInvoiceData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const invoice = await prisma.progressInvoice.findFirst({
    where: { 
      id: invoiceId,
      businessId: business.id,
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
    shopId: invoice.shopId,
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

// ==========================================
// EDIT PURCHASE ITEMS
// ==========================================

export interface BusinessPurchaseItemPayload {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface UpdateBusinessPurchaseItemsPayload {
  items: BusinessPurchaseItemPayload[]
}

/**
 * Update purchase items as Business Admin (change products for layaway/credit purchases)
 */
export async function updateBusinessPurchaseItems(
  businessSlug: string,
  purchaseId: string,
  payload: UpdateBusinessPurchaseItemsPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get purchase and verify it belongs to this business
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: {
          shop: { businessId: business.id },
        },
      },
      include: {
        customer: {
          include: {
            shop: true,
          },
        },
        items: true,
      },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    // Only allow editing of PENDING, ACTIVE, or LAYAWAY purchases (not COMPLETED)
    if (purchase.status === "COMPLETED") {
      return { success: false, error: "Cannot edit a completed purchase" }
    }

    if (payload.items.length === 0) {
      return { success: false, error: "At least one item is required" }
    }

    const shopId = purchase.customer.shopId

    // Validate stock availability for new items
    for (const item of payload.items) {
      const shopProduct = await prisma.shopProduct.findFirst({
        where: { 
          shopId: shopId,
          productId: item.productId 
        },
        include: { product: { select: { name: true } } },
      })
      
      if (!shopProduct) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true, name: true },
        })
        if (!product) {
          return { success: false, error: `Product not found: ${item.productName}` }
        }
        if (product.stockQuantity < item.quantity) {
          return { 
            success: false, 
            error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}` 
          }
        }
      } else {
        if (shopProduct.stockQuantity < item.quantity) {
          return { 
            success: false, 
            error: `Insufficient stock for ${shopProduct.product.name}. Available: ${shopProduct.stockQuantity}, Requested: ${item.quantity}` 
          }
        }
      }
    }

    // Get business policy for recalculating interest
    const policy = await prisma.businessPolicy.findFirst({
      where: { businessId: business.id },
    })

    // Calculate new subtotal
    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )

    // Calculate interest based on policy
    let interestAmount = 0
    const interestRate = policy ? Number(policy.interestRate) : Number(purchase.interestRate)
    const interestType = policy?.interestType || purchase.interestType

    if (interestRate > 0) {
      if (interestType === "FLAT") {
        interestAmount = subtotal * (interestRate / 100)
      } else {
        const months = Math.ceil(purchase.installments / 4)
        interestAmount = subtotal * (interestRate / 100) * months
      }
    }

    const totalAmount = subtotal + interestAmount
    const amountPaid = Number(purchase.amountPaid)
    const outstandingBalance = Math.max(0, totalAmount - amountPaid)

    // Update purchase in transaction
    await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: purchase.id },
      })

      // Create new items
      await tx.purchaseItem.createMany({
        data: payload.items.map((item) => ({
          purchaseId: purchase.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
        })),
      })

      // Update purchase totals
      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          subtotal,
          interestAmount,
          totalAmount,
          outstandingBalance,
          // Update status based on new balance
          status: outstandingBalance <= 0 ? "COMPLETED" : purchase.status,
        },
      })
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PURCHASE_ITEMS_UPDATED",
      entityType: "Purchase",
      entityId: purchase.id,
      metadata: {
        purchaseNumber: purchase.purchaseNumber,
        customerId: purchase.customerId,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        shopId: shopId,
        shopName: purchase.customer.shop.name,
        oldItems: purchase.items.map(i => ({ productName: i.productName, quantity: i.quantity })),
        newItems: payload.items.map(i => ({ productName: i.productName, quantity: i.quantity })),
        oldTotal: Number(purchase.totalAmount),
        newTotal: totalAmount,
        updatedByBusinessAdmin: true,
      },
    })

    const shopSlug = purchase.customer.shop.shopSlug
    revalidatePath(`/business-admin/${businessSlug}/shops/${shopSlug}/customers`)
    revalidatePath(`/shop-admin/${shopSlug}/customers/${purchase.customerId}`)
    revalidatePath(`/shop-admin/${shopSlug}/customers`)
    revalidatePath(`/collector/${shopSlug}`)
    revalidatePath(`/sales-staff/${shopSlug}`)

    return { 
      success: true, 
      data: { 
        newSubtotal: subtotal,
        newInterest: interestAmount,
        newTotal: totalAmount,
        newOutstanding: outstandingBalance,
      } 
    }
  } catch (error) {
    console.error("Error updating purchase items:", error)
    return { success: false, error: "Failed to update purchase" }
  }
}

/**
 * Get shop products for editing a purchase (Business Admin)
 */
export interface BusinessShopProduct {
  id: string
  name: string
  cashPrice: number
  layawayPrice: number
  creditPrice: number
  stockQuantity: number
}

export async function getBusinessShopProducts(
  businessSlug: string,
  shopSlug: string
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const shop = await prisma.shop.findUnique({
      where: { shopSlug },
    })

    if (!shop || shop.businessId !== business.id) {
      return { success: false, error: "Shop not found" }
    }

    const shopProducts = await prisma.shopProduct.findMany({
      where: {
        shopId: shop.id,
        isActive: true,
        product: { isActive: true },
      },
      include: {
        product: true,
      },
      orderBy: { product: { name: "asc" } },
    })

    return {
      success: true,
      data: shopProducts.map((sp) => ({
        id: sp.product.id,
        name: sp.product.name,
        cashPrice: Number(sp.cashPrice ?? sp.product.cashPrice),
        layawayPrice: Number(sp.layawayPrice ?? sp.product.layawayPrice),
        creditPrice: Number(sp.creditPrice ?? sp.product.creditPrice),
        stockQuantity: sp.stockQuantity,
      })),
    }
  } catch (error) {
    console.error("Error fetching shop products:", error)
    return { success: false, error: "Failed to fetch products" }
  }
}

/**
 * Get full purchase details for editing (Business Admin)
 */
export interface BusinessPurchaseDetails {
  id: string
  purchaseNumber: string
  purchaseType: string
  status: string
  subtotal: number
  interestAmount: number
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  shopSlug: string
  items: {
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
}

export async function getBusinessPurchaseDetails(
  businessSlug: string,
  purchaseId: string
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: {
          shop: { businessId: business.id },
        },
      },
      include: {
        customer: {
          include: { shop: true },
        },
        items: true,
      },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    return {
      success: true,
      data: {
        id: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        purchaseType: purchase.purchaseType,
        status: purchase.status,
        subtotal: Number(purchase.subtotal),
        interestAmount: Number(purchase.interestAmount),
        totalAmount: Number(purchase.totalAmount),
        amountPaid: Number(purchase.amountPaid),
        outstandingBalance: Number(purchase.outstandingBalance),
        shopSlug: purchase.customer.shop.shopSlug,
        items: purchase.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching purchase details:", error)
    return { success: false, error: "Failed to fetch purchase details" }
  }
}