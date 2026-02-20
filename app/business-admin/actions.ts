"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "../../lib/auth"
import { sendAccountCreationEmail, sendCollectionReceipt } from "../../lib/email"
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
  // Payment configuration
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bankBranch: string | null
  mobileMoneyProvider: string | null
  mobileMoneyNumber: string | null
  mobileMoneyName: string | null
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

// Business Profile Types
export interface BusinessProfileData {
  id: string
  name: string
  businessSlug: string
  country: string
  logoUrl: string | null
  tagline: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  createdAt: Date
}

export interface BusinessProfilePayload {
  name: string
  tagline?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logoUrl?: string | null
}

/**
 * Get business profile
 */
export async function getBusinessProfile(businessSlug: string): Promise<BusinessProfileData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  return {
    id: business.id,
    name: business.name,
    businessSlug: business.businessSlug,
    country: business.country,
    logoUrl: business.logoUrl ?? null,
    tagline: business.tagline ?? null,
    address: business.address ?? null,
    phone: business.phone ?? null,
    email: business.email ?? null,
    website: business.website ?? null,
    createdAt: business.createdAt,
  }
}

/**
 * Update business profile
 */
export async function updateBusinessProfile(
  businessSlug: string,
  payload: BusinessProfilePayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Validation
    if (!payload.name || payload.name.trim().length < 2) {
      return { success: false, error: "Business name must be at least 2 characters" }
    }

    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
      return { success: false, error: "Invalid email format" }
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: payload.name.trim(),
        tagline: payload.tagline?.trim() || null,
        address: payload.address?.trim() || null,
        phone: payload.phone?.trim() || null,
        email: payload.email?.trim() || null,
        website: payload.website?.trim() || null,
        logoUrl: payload.logoUrl || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_PROFILE_UPDATED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: updatedBusiness.name,
        changes: payload,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}`)
    revalidatePath(`/business-admin/${businessSlug}/settings`)

    return { success: true }
  } catch (error) {
    console.error("Error updating business profile:", error)
    return { success: false, error: "Failed to update business profile" }
  }
}

/**
 * Update business logo URL
 */
export async function updateBusinessLogo(
  businessSlug: string,
  logoUrl: string | null
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    await prisma.business.update({
      where: { id: business.id },
      data: { logoUrl },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_LOGO_UPDATED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: business.name,
        logoUrl,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}`)
    revalidatePath(`/business-admin/${businessSlug}/settings`)

    return { success: true }
  } catch (error) {
    console.error("Error updating business logo:", error)
    return { success: false, error: "Failed to update logo" }
  }
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
    // Payment configuration
    bankName: s.bankName,
    bankAccountNumber: s.bankAccountNumber,
    bankAccountName: s.bankAccountName,
    bankBranch: s.bankBranch,
    mobileMoneyProvider: s.mobileMoneyProvider,
    mobileMoneyNumber: s.mobileMoneyNumber,
    mobileMoneyName: s.mobileMoneyName,
  }))
}

/**
 * Update shop payment configuration (bank and mobile money details)
 */
export async function updateShopPaymentConfig(
  businessSlug: string,
  shopId: string,
  data: {
    bankName?: string | null
    bankAccountNumber?: string | null
    bankAccountName?: string | null
    bankBranch?: string | null
    mobileMoneyProvider?: string | null
    mobileMoneyNumber?: string | null
    mobileMoneyName?: string | null
  }
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Verify shop belongs to this business
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, businessId: business.id },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: {
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        bankBranch: data.bankBranch,
        mobileMoneyProvider: data.mobileMoneyProvider,
        mobileMoneyNumber: data.mobileMoneyNumber,
        mobileMoneyName: data.mobileMoneyName,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to update shop payment config:", error)
    return { success: false, error: "Failed to update payment configuration" }
  }
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

    // Send account creation email to shop admin
    if (shopAdmin && shopAdminData) {
      await sendAccountCreationEmail({
        businessId: business.id,
        recipientEmail: shopAdmin.email,
        recipientName: shopAdminData.name,
        businessName: business.name,
        businessLogoUrl: business.logoUrl,
        accountEmail: shopAdmin.email,
        temporaryPassword: shopAdminData.password,
        role: "SHOP_ADMIN",
        shopName: shop.name,
      })
    }

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

  // Get date ranges for analytics
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  
  // Get last 6 months for revenue chart
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    shopCount, 
    activeShops, 
    totalProducts, 
    totalCustomers, 
    totalPurchases,
    totalStaff,
    purchases,
    payments,
    recentCustomers,
    monthlyPurchases
  ] = await Promise.all([
    prisma.shop.count({ where: { businessId: business.id } }),
    prisma.shop.count({ where: { businessId: business.id, isActive: true } }),
    prisma.product.count({ where: { businessId: business.id } }),
    prisma.customer.count({ where: { shop: { businessId: business.id } } }),
    prisma.purchase.count({ where: { customer: { shop: { businessId: business.id } } } }),
    prisma.shopMember.count({ where: { shop: { businessId: business.id }, isActive: true } }),
    // Get all purchases for analytics
    prisma.purchase.findMany({
      where: { customer: { shop: { businessId: business.id } } },
      select: {
        id: true,
        totalAmount: true,
        purchaseType: true,
        status: true,
        createdAt: true,
        dueDate: true,
      }
    }),
    // Get all payments for analytics
    prisma.payment.findMany({
      where: { 
        purchase: { customer: { shop: { businessId: business.id } } },
        isConfirmed: true 
      },
      select: {
        amount: true,
        createdAt: true,
        paymentMethod: true,
      }
    }),
    // Get recent customers (last 30 days)
    prisma.customer.count({
      where: {
        shop: { businessId: business.id },
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      }
    }),
    // Get monthly purchases for the last 6 months
    prisma.purchase.groupBy({
      by: ['createdAt'],
      where: {
        customer: { shop: { businessId: business.id } },
        createdAt: { gte: sixMonthsAgo }
      },
      _sum: { totalAmount: true },
      _count: true,
    })
  ])

  // Calculate revenue metrics
  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalOutstanding = totalRevenue - totalCollected

  // Calculate today's revenue
  const todayPayments = payments.filter(p => new Date(p.createdAt) >= startOfToday)
  const todayRevenue = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Calculate this week's revenue
  const weekPayments = payments.filter(p => new Date(p.createdAt) >= startOfWeek)
  const weekRevenue = weekPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Calculate this month's revenue
  const monthPayments = payments.filter(p => new Date(p.createdAt) >= startOfMonth)
  const monthRevenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Sale type distribution for pie chart
  const cashSales = purchases.filter(p => p.purchaseType === "CASH").length
  const creditSales = purchases.filter(p => p.purchaseType === "CREDIT").length
  const layawaySales = purchases.filter(p => p.purchaseType === "LAYAWAY").length

  // Status distribution
  const activePurchases = purchases.filter(p => p.status === "ACTIVE").length
  const completedPurchases = purchases.filter(p => p.status === "COMPLETED").length
  const overduePurchases = purchases.filter(p => p.status === "ACTIVE" && p.dueDate && new Date(p.dueDate) < now).length

  // Payment method distribution
  const cashPayments = payments.filter(p => p.paymentMethod === "CASH").length
  const mobilePayments = payments.filter(p => p.paymentMethod === "MOBILE_MONEY").length
  const bankPayments = payments.filter(p => p.paymentMethod === "BANK_TRANSFER").length
  const walletPayments = payments.filter(p => p.paymentMethod === "WALLET").length

  // Monthly revenue data for chart (last 6 months)
  const monthlyData: { month: string; revenue: number; payments: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthName = monthStart.toLocaleString('default', { month: 'short' })
    
    const monthPaymentsData = payments.filter(p => {
      const date = new Date(p.createdAt)
      return date >= monthStart && date <= monthEnd
    })
    
    const monthPurchasesData = purchases.filter(p => {
      const date = new Date(p.createdAt)
      return date >= monthStart && date <= monthEnd
    })
    
    monthlyData.push({
      month: monthName,
      revenue: monthPaymentsData.reduce((sum, p) => sum + Number(p.amount), 0),
      payments: monthPurchasesData.length
    })
  }

  // Customer growth trend (last 5 weeks)
  const customerGrowth: { week: string; count: number }[] = []
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const weekLabel = `W${5 - i}`
    const count = await prisma.customer.count({
      where: {
        shop: { businessId: business.id },
        createdAt: { gte: weekStart, lt: weekEnd }
      }
    })
    customerGrowth.push({ week: weekLabel, count })
  }

  // Calculate growth percentages
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59)

  const lastMonthRevenue = payments
    .filter(p => new Date(p.createdAt) >= lastMonthStart && new Date(p.createdAt) <= lastMonthEnd)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  
  const twoMonthsAgoRevenue = payments
    .filter(p => new Date(p.createdAt) >= twoMonthsAgoStart && new Date(p.createdAt) <= twoMonthsAgoEnd)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const revenueGrowth = twoMonthsAgoRevenue > 0 
    ? ((lastMonthRevenue - twoMonthsAgoRevenue) / twoMonthsAgoRevenue) * 100 
    : 0

  return {
    totalShops: shopCount,
    activeShops,
    suspendedShops: shopCount - activeShops,
    totalProducts,
    totalCustomers,
    totalPurchases,
    totalStaff,
    // Revenue metrics
    totalRevenue,
    totalCollected,
    totalOutstanding,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    // Recent activity
    recentCustomers,
    // Sale type distribution (for pie chart)
    saleTypeDistribution: {
      cash: cashSales,
      credit: creditSales,
      layaway: layawaySales,
    },
    // Status distribution
    statusDistribution: {
      active: activePurchases,
      completed: completedPurchases,
      overdue: overduePurchases,
    },
    // Payment method distribution (for pie chart)
    paymentMethodDistribution: {
      cash: cashPayments,
      mobileMoney: mobilePayments,
      bank: bankPayments,
      wallet: walletPayments,
    },
    // Monthly data for line chart
    monthlyData,
    // Customer growth trend
    customerGrowth,
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
      // Payment configuration
      bankName: shop.bankName,
      bankAccountNumber: shop.bankAccountNumber,
      bankAccountName: shop.bankAccountName,
      bankBranch: shop.bankBranch,
      mobileMoneyProvider: shop.mobileMoneyProvider,
      mobileMoneyNumber: shop.mobileMoneyNumber,
      mobileMoneyName: shop.mobileMoneyName,
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
      user: {
        select: { id: true, email: true },
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
        // Only count confirmed payments
        if (payment.isConfirmed) {
          totalPaid += Number(payment.amount)
        }
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
      hasAccount: !!customer.user,
      accountEmail: customer.user?.email || null,
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
  // Portal account creation
  createAccount?: boolean
  accountEmail?: string
  accountPassword?: string
  // Portal account deactivation
  deactivateAccount?: boolean
  // Portal account password reset
  resetPassword?: boolean
  newPassword?: string
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

    // Handle portal account creation
    let userAccountId: string | null = null
    if (payload.createAccount && payload.accountEmail && payload.accountPassword) {
      // Check if customer already has an account (customer.userId is set)
      if (existingCustomer.userId) {
        return { success: false, error: "This customer already has a portal account" }
      }

      // Check if email is already in use
      const emailInUse = await prisma.user.findUnique({
        where: { email: payload.accountEmail.trim().toLowerCase() },
      })
      if (emailInUse) {
        return { success: false, error: "This email is already associated with another account" }
      }

      // Validate password
      if (payload.accountPassword.length < 8) {
        return { success: false, error: "Password must be at least 8 characters long" }
      }

      // Hash password and create account
      const bcrypt = await import("bcryptjs")
      const hashedPassword = await bcrypt.hash(payload.accountPassword, 12)

      const newUser = await prisma.user.create({
        data: {
          email: payload.accountEmail.trim().toLowerCase(),
          passwordHash: hashedPassword,
          name: `${existingCustomer.firstName} ${existingCustomer.lastName}`,
          role: "CUSTOMER",
        },
      })
      userAccountId = newUser.id
    }

    // Handle portal account deactivation
    let unlinkUserId = false
    if (payload.deactivateAccount && existingCustomer.userId) {
      // We'll unlink the user from the customer but keep the user record
      // This preserves the user's data while preventing login access
      unlinkUserId = true
    }

    // Handle password reset for existing accounts
    if (payload.resetPassword && payload.newPassword && existingCustomer.userId) {
      if (payload.newPassword.length < 8) {
        return { success: false, error: "New password must be at least 8 characters long" }
      }

      const bcrypt = await import("bcryptjs")
      const hashedPassword = await bcrypt.hash(payload.newPassword, 12)

      await prisma.user.update({
        where: { id: existingCustomer.userId },
        data: { passwordHash: hashedPassword },
      })
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
        // Link user account if created
        ...(userAccountId && { userId: userAccountId }),
        // Unlink user account if deactivating
        ...(unlinkUserId && { userId: null }),
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
    posAccess: member.posAccess,
    shopName: member.shop.name,
    shopSlug: member.shop.shopSlug,
    createdAt: member.createdAt,
    canSellProducts: member.canSellProducts,
    canCreateCustomers: member.canCreateCustomers,
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
    const canSellProducts = formData.get("canSellProducts") === "true"
    const canCreateCustomers = formData.get("canCreateCustomers") === "true"

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
          canSellProducts: role === "DEBT_COLLECTOR" ? canSellProducts : false,
          canCreateCustomers: role === "DEBT_COLLECTOR" ? canCreateCustomers : false,
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
          canSellProducts: role === "DEBT_COLLECTOR" ? canSellProducts : false,
          canCreateCustomers: role === "DEBT_COLLECTOR" ? canCreateCustomers : false,
        },
      })

      await createAuditLog({
        actorUserId: user.id,
        action: "CREATE",
        entityType: "ShopMember",
        entityId: newUser.id,
        metadata: { shopId, role, email, name },
      })

      // Send account creation email
      const emailRole = role === "SHOP_ADMIN" 
        ? "SHOP_ADMIN" 
        : role === "DEBT_COLLECTOR" 
          ? "DEBT_COLLECTOR" 
          : "SALES_STAFF"
          
      await sendAccountCreationEmail({
        businessId: business.id,
        recipientEmail: newUser.email,
        recipientName: name.trim(),
        businessName: business.name,
        businessLogoUrl: business.logoUrl,
        accountEmail: newUser.email,
        temporaryPassword: password,
        role: emailRole,
        shopName: shop.name,
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
    const canSellProducts = formData.get("canSellProducts") === "true"
    const canCreateCustomers = formData.get("canCreateCustomers") === "true"

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
        canSellProducts: role === "DEBT_COLLECTOR" ? canSellProducts : false,
        canCreateCustomers: role === "DEBT_COLLECTOR" ? canCreateCustomers : false,
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
    totalWalletCollections: number
    totalWalletAmount: number
    todayWalletCollections: number
    todayWalletAmount: number
    confirmedWalletAmount: number
    pendingWalletAmount: number
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
  walletHistory: {
    id: string
    amount: number
    type: string
    status: string
    paymentMethod: string | null
    description: string | null
    reference: string | null
    customerName: string
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

    // Get wallet transactions created by this collector
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: {
        createdById: collector.id,
        type: "DEPOSIT",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: true,
      },
    })

    // Today's wallet collections
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayWalletTxns = walletTransactions.filter(t => new Date(t.createdAt) >= todayStart)
    const confirmedWalletTxns = walletTransactions.filter(t => t.status === "CONFIRMED")
    const pendingWalletTxns = walletTransactions.filter(t => t.status === "PENDING")

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
      totalWalletCollections: walletTransactions.length,
      totalWalletAmount: walletTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
      todayWalletCollections: todayWalletTxns.length,
      todayWalletAmount: todayWalletTxns.reduce((sum, t) => sum + Number(t.amount), 0),
      confirmedWalletAmount: confirmedWalletTxns.reduce((sum, t) => sum + Number(t.amount), 0),
      pendingWalletAmount: pendingWalletTxns.reduce((sum, t) => sum + Number(t.amount), 0),
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

    // Format wallet history
    const walletHistory = walletTransactions.map(t => ({
      id: t.id,
      amount: Number(t.amount),
      type: t.type,
      status: t.status,
      paymentMethod: t.paymentMethod,
      description: t.description,
      reference: t.reference,
      customerName: `${t.customer.firstName} ${t.customer.lastName}`,
      createdAt: t.createdAt,
      confirmedAt: t.confirmedAt,
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
      walletHistory,
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

    // Credit customer wallet with the confirmed payment amount
    // This increases their wallet balance (reduces the negative balance from purchase debt)
    const customer = purchase.customer
    const currentWalletBalance = Number(customer.walletBalance || 0)
    const paymentAmount = Number(payment.amount)
    const newWalletBalance = currentWalletBalance + paymentAmount

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        walletBalance: newWalletBalance,
      },
    })

    // Create wallet transaction record for the payment credit
    await prisma.walletTransaction.create({
      data: {
        customerId: customer.id,
        shopId: customer.shopId,
        type: "DEPOSIT",
        amount: paymentAmount,
        balanceBefore: currentWalletBalance,
        balanceAfter: newWalletBalance,
        status: "CONFIRMED",
        description: `Payment confirmed for ${purchase.purchaseNumber}`,
        reference: purchase.purchaseNumber,
        confirmedAt: new Date(),
      },
    })

    // Generate Progress Invoice for this payment
    const year = new Date().getFullYear()
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const invoiceNumber = `INV-${year}-${timestamp}${random}`

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
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        waybillNumber = `WB-${year}-${timestamp}${random}`

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

    // Send receipt email to customer when payment is confirmed
    if (purchase.customer.email) {
      try {
        // Get collector info
        const collector = payment.collectorId ? await prisma.shopMember.findUnique({
          where: { id: payment.collectorId },
          include: { user: true },
        }) : null

        // Get shop admin email
        const shopAdmin = await prisma.shopMember.findFirst({
          where: { shopId: shop.id, role: "SHOP_ADMIN", isActive: true },
          include: { user: true },
        })

        // Get business admin email (current user)
        const now = new Date()
        await sendCollectionReceipt({
          businessId: business.id,
          receiptNumber: invoiceNumber,
          customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
          customerPhone: purchase.customer.phone,
          customerEmail: purchase.customer.email,
          shopName: shop.name,
          businessName: business.name,
          collectorName: collector?.user?.name || collectorName || "Shop Staff",
          collectorEmail: collector?.user?.email || "",
          collectorPhone: collector?.user?.phone || undefined,
          shopAdminEmail: shopAdmin?.user?.email || null,
          businessAdminEmail: user.email || null,
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          purchaseNumber: purchase.purchaseNumber,
          totalPurchaseAmount: Number(purchase.totalAmount),
          previousAmountPaid: previousBalance < Number(purchase.totalAmount) ? Number(purchase.totalAmount) - previousBalance : 0,
          newAmountPaid: newAmountPaid,
          outstandingBalance: Math.max(0, newOutstanding),
          collectionDate: now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          collectionTime: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          notes: payment.notes,
        })
      } catch (emailError) {
        console.error("Failed to send collection receipt email:", emailError)
        // Don't fail the confirmation if email fails
      }
    }

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
  walletBalance: number
  totalOutstanding: number
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
      walletBalance: true,
      purchases: {
        where: {
          status: { in: ["ACTIVE", "OVERDUE"] },
        },
        select: {
          outstandingBalance: true,
        },
      },
    },
  })

  return customers.map(c => {
    const totalOutstanding = c.purchases.reduce((sum, p) => sum + Number(p.outstandingBalance), 0)
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      walletBalance: Number(c.walletBalance),
      totalOutstanding,
    }
  })
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
  paymentMethod?: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD" | "WALLET"
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
      // Find which products are missing
      const foundProductIds = shopProducts.map(sp => sp.productId)
      const missingItems = payload.items.filter(item => !foundProductIds.includes(item.productId))
      const missingNames = missingItems.map(item => item.productName).join(", ")
      return { success: false, error: `Products not available in this shop: ${missingNames}. Please ensure products are added to the shop's inventory.` }
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
          status: payload.purchaseType === "CASH" ? "COMPLETED" : (outstandingBalance === 0 ? "COMPLETED" : "ACTIVE"),
          subtotal: new Prisma.Decimal(subtotal),
          interestAmount: new Prisma.Decimal(interestAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          amountPaid: payload.purchaseType === "CASH" ? new Prisma.Decimal(totalAmount) : new Prisma.Decimal(downPayment),
          outstandingBalance: payload.purchaseType === "CASH" ? new Prisma.Decimal(0) : new Prisma.Decimal(outstandingBalance),
          downPayment: payload.purchaseType === "CASH" ? new Prisma.Decimal(totalAmount) : new Prisma.Decimal(downPayment),
          installments: payload.purchaseType === "CASH" ? 1 : Math.ceil(payload.tenorDays / 30),
          startDate: new Date(),
          dueDate,
          interestType: policy?.interestType || "FLAT",
          interestRate: policy ? Number(policy.interestRate) : 0,
          deliveryStatus: payload.purchaseType === "CASH" ? "DELIVERED" : "PENDING",
          deliveredAt: payload.purchaseType === "CASH" ? new Date() : null,
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

      // Create payment record
      // For CASH: record full payment; for others: record down payment if > 0
      const paymentAmount = payload.purchaseType === "CASH" ? totalAmount : downPayment
      const paymentMethod = payload.paymentMethod || "CASH"
      
      if (paymentAmount > 0) {
        // Handle wallet payment - check balance and deduct
        if (paymentMethod === "WALLET") {
          const customerForWallet = await tx.customer.findUnique({
            where: { id: customer.id },
            select: { walletBalance: true },
          })
          
          if (!customerForWallet || Number(customerForWallet.walletBalance) < paymentAmount) {
            throw new Error(`Insufficient wallet balance. Available: GH₵${Number(customerForWallet?.walletBalance || 0).toFixed(2)}, Required: GH₵${paymentAmount.toFixed(2)}`)
          }
          
          // Deduct from wallet
          await tx.customer.update({
            where: { id: customer.id },
            data: { walletBalance: { decrement: paymentAmount } },
          })
          
          // Create wallet transaction record
          await tx.walletTransaction.create({
            data: {
              customerId: customer.id,
              shopId: shop.id,
              type: "PURCHASE",
              amount: new Prisma.Decimal(paymentAmount),
              balanceBefore: customerForWallet.walletBalance,
              balanceAfter: new Prisma.Decimal(Number(customerForWallet.walletBalance) - paymentAmount),
              description: `Payment for purchase ${purchaseNumber}`,
              status: "CONFIRMED",
              confirmedAt: new Date(),
            },
          })
        }
        
        await tx.payment.create({
          data: {
            purchaseId: newPurchase.id,
            amount: new Prisma.Decimal(paymentAmount),
            paymentMethod,
            status: "COMPLETED",
            isConfirmed: true,
            confirmedAt: new Date(),
            paidAt: new Date(),
            notes: payload.purchaseType === "CASH" 
              ? `Full ${paymentMethod.toLowerCase().replace("_", " ")} payment (Business Admin)` 
              : `Down payment via ${paymentMethod.toLowerCase().replace("_", " ")} at time of purchase (Business Admin)`,
          },
        })
      }

      return newPurchase
    })

    // For LAYAWAY/CREDIT purchases, debit the outstanding amount from wallet (as debt)
    // This creates a negative wallet balance representing what the customer owes
    if (payload.purchaseType !== "CASH" && outstandingBalance > 0) {
      const customerForDebt = await prisma.customer.findUnique({
        where: { id: customer.id },
        select: { walletBalance: true },
      })
      
      const currentWalletBalance = Number(customerForDebt?.walletBalance || 0)
      const newWalletBalance = currentWalletBalance - outstandingBalance
      
      // Deduct outstanding amount from wallet (will go negative)
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          walletBalance: newWalletBalance,
        },
      })

      // Create wallet transaction record for the debt
      await prisma.walletTransaction.create({
        data: {
          customerId: customer.id,
          shopId: shop.id,
          type: "PURCHASE",
          amount: outstandingBalance,
          balanceBefore: currentWalletBalance,
          balanceAfter: newWalletBalance,
          status: "CONFIRMED",
          description: `${payload.purchaseType} purchase debt for ${purchaseNumber}`,
          reference: purchaseNumber,
          confirmedAt: new Date(),
        },
      })
    }

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
      // Use timestamp + random to ensure uniqueness
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
        purchaseType: payload.purchaseType,
        totalAmount,
        subtotal,
        interestAmount,
        downPayment,
        outstandingBalance,
        dueDate: dueDate.toISOString(),
        createdAt: purchase.startDate.toISOString(),
        customer: {
          name: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          region: customer.region,
        },
        shop: {
          name: shop.name,
          slug: shop.shopSlug,
        },
        business: {
          name: business.name,
        },
        items: payload.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
        })),
        tenorDays: payload.tenorDays,
        installments: payload.purchaseType === "CASH" ? 1 : Math.ceil(payload.tenorDays / 30),
      },
    }
  } catch (error) {
    console.error("Error creating business sale:", error)
    // Return more specific error if available
    if (error instanceof Error) {
      return { success: false, error: `Failed to create sale: ${error.message}` }
    }
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
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "WALLET"
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

    // Prevent overpayment
    const outstanding = Number(purchase.outstandingBalance)
    if (payload.amount > outstanding) {
      return { success: false, error: `Amount cannot exceed outstanding balance of ₵${outstanding.toLocaleString()}` }
    }

    // Handle WALLET payments - always auto-confirm since wallet funds are verified
    const isWalletPayment = payload.paymentMethod === "WALLET"
    const autoConfirm = isWalletPayment ? true : (payload.autoConfirm ?? false)

    // For wallet payments, verify balance
    if (isWalletPayment) {
      const customerWalletBalance = Number(purchase.customer.walletBalance)
      if (payload.amount > customerWalletBalance) {
        return { 
          success: false, 
          error: `Insufficient wallet balance. Available: GH₵${customerWalletBalance.toLocaleString()}` 
        }
      }
    }

    // Use transaction for wallet payments to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // For wallet payments, deduct from wallet and create transaction record
      if (isWalletPayment) {
        const currentBalance = Number(purchase.customer.walletBalance)
        const newBalance = currentBalance - payload.amount

        // Update customer wallet balance
        await tx.customer.update({
          where: { id: purchase.customer.id },
          data: { walletBalance: newBalance },
        })

        // Create wallet transaction record
        await tx.walletTransaction.create({
          data: {
            customerId: purchase.customer.id,
            shopId: purchase.customer.shop.id,
            type: "PURCHASE",
            amount: payload.amount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            description: `Payment for purchase ${purchase.purchaseNumber}`,
            reference: payload.reference || `PAY-${purchase.purchaseNumber}`,
            paymentMethod: "WALLET",
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        })
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          purchaseId: purchase.id,
          amount: payload.amount,
          paymentMethod: payload.paymentMethod,
          status: autoConfirm ? "COMPLETED" : "PENDING",
          collectorId: payload.collectorId || null,
          paidAt: new Date(),
          reference: payload.reference,
          notes: `${payload.notes || ""} [Recorded by Business Admin: ${user.name}]${isWalletPayment ? " [Wallet Payment]" : ""}`.trim(),
          isConfirmed: autoConfirm,
          confirmedAt: autoConfirm ? new Date() : null,
        },
      })

      // Update purchase totals if auto-confirming
      if (autoConfirm) {
        const newAmountPaid = Number(purchase.amountPaid) + payload.amount
        const newOutstanding = Number(purchase.totalAmount) - newAmountPaid
        let newStatus: PurchaseStatus = purchase.status
        if (newOutstanding <= 0) {
          newStatus = PurchaseStatus.COMPLETED
        } else if (purchase.status === PurchaseStatus.PENDING) {
          newStatus = PurchaseStatus.ACTIVE
        }

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            amountPaid: newAmountPaid,
            outstandingBalance: Math.max(0, newOutstanding),
            status: newStatus,
          },
        })
      }

      return payment
    })

    await createAuditLog({
      actorUserId: user.id,
      action: autoConfirm ? "PAYMENT_RECORDED_AND_CONFIRMED" : "PAYMENT_RECORDED_PENDING",
      entityType: "Payment",
      entityId: result.id,
      metadata: {
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        shopName: purchase.customer.shop.name,
        recordedBy: user.name,
        recordedByBusinessAdmin: true,
        awaitingConfirmation: !autoConfirm,
        isWalletPayment,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/payments`)
    revalidatePath(`/business-admin/${businessSlug}/customers`)
    revalidatePath(`/shop-admin/${purchase.customer.shop.shopSlug}/pending-payments`)
    revalidatePath(`/shop-admin/${purchase.customer.shop.shopSlug}/customers`)

    return {
      success: true,
      data: {
        paymentId: result.id,
        awaitingConfirmation: !autoConfirm,
        isWalletPayment,
      },
    }
  } catch (error) {
    console.error("Error recording payment as business admin:", error)
    return { success: false, error: "Failed to record payment" }
  }
}

/**
 * Get full customer details with all purchases and payments
 */
export async function getBusinessCustomerDetails(
  businessSlug: string,
  customerId: string
) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      shop: { businessId: business.id },
    },
    include: {
      shop: {
        select: { name: true, shopSlug: true },
      },
      assignedCollector: {
        include: { user: { select: { name: true } } },
      },
      purchases: {
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
      },
      user: {
        select: { id: true, email: true },
      },
    },
  })

  if (!customer) {
    return null
  }

  // Calculate totals
  let totalPurchased = 0
  let totalPaid = 0
  let activePurchases = 0

  for (const purchase of customer.purchases) {
    totalPurchased += Number(purchase.totalAmount)
    for (const payment of purchase.payments) {
      if (payment.isConfirmed) {
        totalPaid += Number(payment.amount)
      }
    }
    if (purchase.status === "ACTIVE") {
      activePurchases++
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
    assignedCollectorName: customer.assignedCollector?.user?.name || null,
    createdAt: customer.createdAt,
    shopName: customer.shop.name,
    shopSlug: customer.shop.shopSlug,
    hasAccount: !!customer.user,
    accountEmail: customer.user?.email || null,
    totalPurchased,
    totalPaid,
    outstanding: totalPurchased - totalPaid,
    activePurchases,
    totalPurchases: customer.purchases.length,
    walletBalance: Number(customer.walletBalance),
    purchases: customer.purchases.map((purchase) => {
      const purchasePaid = purchase.payments
        .filter(p => p.isConfirmed)
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const purchaseOutstanding = Number(purchase.totalAmount) - purchasePaid
      const isOverdue = purchase.status === "ACTIVE" && purchase.dueDate && new Date(purchase.dueDate) < new Date()

      return {
        id: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        purchaseType: purchase.purchaseType,
        status: purchase.status,
        totalAmount: Number(purchase.totalAmount),
        subtotal: Number(purchase.subtotal),
        interestAmount: Number(purchase.interestAmount),
        downPayment: Number(purchase.downPayment),
        amountPaid: purchasePaid,
        outstandingBalance: purchaseOutstanding,
        installments: purchase.installments,
        dueDate: purchase.dueDate,
        isOverdue,
        createdAt: purchase.createdAt,
        items: purchase.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          productSku: item.product?.sku || null,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        payments: purchase.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          notes: payment.notes,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          isConfirmed: payment.isConfirmed,
          confirmedAt: payment.confirmedAt,
          rejectedAt: payment.rejectedAt,
          rejectionReason: payment.rejectionReason,
        })),
      }
    }),
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
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const waybillNumber = `WB-${year}-${timestamp}${random}`

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
  recordedByRole: string | null
  recordedByName: string | null
  shopAdminName: string | null
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
  // Payment configuration from shop
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bankBranch: string | null
  mobileMoneyProvider: string | null
  mobileMoneyNumber: string | null
  mobileMoneyName: string | null
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
          customer: {
            include: {
              shop: true,
            },
          },
        },
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 200,
  })

  return invoices.map((inv) => {
    const shop = inv.purchase.customer.shop
    return {
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
      recordedByRole: inv.recordedByRole,
      recordedByName: inv.recordedByName,
      shopAdminName: inv.shopAdminName,
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
      // Payment configuration from shop
      bankName: shop.bankName,
      bankAccountNumber: shop.bankAccountNumber,
      bankAccountName: shop.bankAccountName,
      bankBranch: shop.bankBranch,
      mobileMoneyProvider: shop.mobileMoneyProvider,
      mobileMoneyNumber: shop.mobileMoneyNumber,
      mobileMoneyName: shop.mobileMoneyName,
      items: inv.purchase.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }
  })
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
          customer: {
            include: {
              shop: true,
            },
          },
        },
      },
    },
  })

  if (!invoice) return null

  const shop = invoice.purchase.customer.shop

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
    recordedByRole: invoice.recordedByRole,
    recordedByName: invoice.recordedByName,
    shopAdminName: invoice.shopAdminName,
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
    // Payment configuration from shop
    bankName: shop.bankName,
    bankAccountNumber: shop.bankAccountNumber,
    bankAccountName: shop.bankAccountName,
    bankBranch: shop.bankBranch,
    mobileMoneyProvider: shop.mobileMoneyProvider,
    mobileMoneyNumber: shop.mobileMoneyNumber,
    mobileMoneyName: shop.mobileMoneyName,
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

// ============================================
// PURCHASE INVOICES (Generated at purchase time)
// ============================================

export interface PurchaseInvoiceListData {
  id: string
  invoiceNumber: string
  purchaseNumber: string
  purchaseType: string
  totalAmount: number
  downPayment: number
  customerName: string
  customerPhone: string
  shopName: string
  collectorName: string | null
  status: string
  generatedAt: Date
}

export interface PurchaseInvoiceDetailData {
  id: string
  invoiceNumber: string
  purchaseNumber: string
  purchaseType: string
  subtotal: number
  interestAmount: number
  totalAmount: number
  downPayment: number
  installments: number
  dueDate: Date
  customerName: string
  customerPhone: string
  customerAddress: string | null
  collectorName: string | null
  collectorPhone: string | null
  shopName: string
  shopAdminName: string | null
  businessName: string
  paymentMethods: string[]
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bankBranch: string | null
  mobileMoneyProvider: string | null
  mobileMoneyNumber: string | null
  mobileMoneyName: string | null
  status: string
  generatedAt: Date
  items: {
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
}

/**
 * Get all purchase invoices across all shops in the business
 */
export async function getBusinessPurchaseInvoices(businessSlug: string): Promise<PurchaseInvoiceListData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: { generatedAt: "desc" },
  })

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    purchaseNumber: inv.purchaseNumber,
    purchaseType: inv.purchaseType,
    totalAmount: Number(inv.totalAmount),
    downPayment: Number(inv.downPayment),
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    shopName: inv.shopName,
    collectorName: inv.collectorName,
    status: inv.status,
    generatedAt: inv.generatedAt,
  }))
}

/**
 * Get a specific purchase invoice
 */
export async function getBusinessPurchaseInvoice(
  businessSlug: string,
  invoiceId: string
): Promise<PurchaseInvoiceDetailData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const invoice = await prisma.purchaseInvoice.findFirst({
    where: {
      id: invoiceId,
      businessId: business.id,
    },
  })

  if (!invoice) return null

  const items = invoice.itemsSnapshot as { productName: string; quantity: number; unitPrice: number; totalPrice: number }[]

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    purchaseNumber: invoice.purchaseNumber,
    purchaseType: invoice.purchaseType,
    subtotal: Number(invoice.subtotal),
    interestAmount: Number(invoice.interestAmount),
    totalAmount: Number(invoice.totalAmount),
    downPayment: Number(invoice.downPayment),
    installments: invoice.installments,
    dueDate: invoice.dueDate,
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,
    collectorName: invoice.collectorName,
    collectorPhone: invoice.collectorPhone,
    shopName: invoice.shopName,
    shopAdminName: invoice.shopAdminName,
    businessName: invoice.businessName,
    paymentMethods: invoice.paymentMethods,
    bankName: invoice.bankName,
    bankAccountNumber: invoice.bankAccountNumber,
    bankAccountName: invoice.bankAccountName,
    bankBranch: invoice.bankBranch,
    mobileMoneyProvider: invoice.mobileMoneyProvider,
    mobileMoneyNumber: invoice.mobileMoneyNumber,
    mobileMoneyName: invoice.mobileMoneyName,
    status: invoice.status,
    generatedAt: invoice.generatedAt,
    items: items || [],
  }
}

/**
 * Generate a purchase invoice for a purchase
 */
export async function generatePurchaseInvoice(
  businessSlug: string,
  purchaseId: string
): Promise<ActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    // Get purchase details
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
            shop: {
              include: {
                members: {
                  where: { role: "SHOP_ADMIN", isActive: true },
                  include: { user: true },
                  take: 1,
                },
              },
            },
            assignedCollector: {
              include: { user: true },
            },
          },
        },
        items: true,
        purchaseInvoice: true,
      },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    // Check if invoice already exists
    if (purchase.purchaseInvoice) {
      return { success: false, error: "Invoice already exists for this purchase" }
    }

    const shop = purchase.customer.shop
    const shopAdmin = shop.members[0]?.user
    const collector = purchase.customer.assignedCollector

    // Generate invoice number
    const invoiceCount = await prisma.purchaseInvoice.count({
      where: { businessId: business.id },
    })
    const invoiceNumber = `INV-${business.businessSlug.toUpperCase().slice(0, 3)}-${String(invoiceCount + 1).padStart(6, "0")}`

    // Determine available payment methods based on shop configuration
    const paymentMethods: string[] = ["CASH"]
    if (shop.bankName && shop.bankAccountNumber) {
      paymentMethods.push("BANK_TRANSFER")
    }
    if (shop.mobileMoneyProvider && shop.mobileMoneyNumber) {
      paymentMethods.push("MOBILE_MONEY")
    }

    // Create the invoice
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber,
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        purchaseType: purchase.purchaseType,
        subtotal: purchase.subtotal,
        interestAmount: purchase.interestAmount,
        totalAmount: purchase.totalAmount,
        downPayment: purchase.downPayment,
        installments: purchase.installments,
        dueDate: purchase.dueDate,
        customerId: purchase.customer.id,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        customerPhone: purchase.customer.phone,
        customerAddress: purchase.customer.address,
        collectorId: collector?.id || null,
        collectorName: collector?.user.name || null,
        collectorPhone: collector?.user.phone || null,
        shopId: shop.id,
        shopName: shop.name,
        shopAdminName: shopAdmin?.name || null,
        businessId: business.id,
        businessName: business.name,
        paymentMethods,
        bankName: shop.bankName,
        bankAccountNumber: shop.bankAccountNumber,
        bankAccountName: shop.bankAccountName,
        bankBranch: shop.bankBranch,
        mobileMoneyProvider: shop.mobileMoneyProvider,
        mobileMoneyNumber: shop.mobileMoneyNumber,
        mobileMoneyName: shop.mobileMoneyName,
        itemsSnapshot: purchase.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        status: purchase.status === "COMPLETED" ? "FULLY_PAID" : 
                Number(purchase.amountPaid) > 0 ? "PARTIALLY_PAID" : "PENDING",
      },
    })

    return { success: true, data: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber } }
  } catch (error) {
    console.error("Error generating purchase invoice:", error)
    return { success: false, error: "Failed to generate invoice" }
  }
}

// ==========================================
// ACCOUNT SETTINGS (Email & Password)
// ==========================================

export async function changeBusinessAdminEmail(
  businessSlug: string,
  newEmail: string,
  currentPassword: string
): Promise<ActionResult> {
  try {
    const { user } = await requireBusinessAdmin(businessSlug)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail.trim())) {
      return { success: false, error: "Invalid email format" }
    }

    // Check if email is already in use by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail.trim().toLowerCase() },
    })
    if (existingUser && existingUser.id !== user.id) {
      return { success: false, error: "This email is already in use" }
    }

    // Verify current password
    const bcrypt = await import("bcryptjs")
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    })
    
    if (!currentUser) {
      return { success: false, error: "User not found" }
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.passwordHash)
    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect" }
    }

    const oldEmail = user.email

    // Update email
    await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail.trim().toLowerCase() },
    })

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "EMAIL_CHANGED",
      entityType: "User",
      entityId: user.id,
      metadata: {
        oldEmail,
        newEmail: newEmail.trim().toLowerCase(),
        changedByBusinessAdmin: true,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error changing email:", error)
    return { success: false, error: "Failed to change email" }
  }
}

export async function changeBusinessAdminPassword(
  businessSlug: string,
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const { user } = await requireBusinessAdmin(businessSlug)

    // Validate new password
    if (newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" }
    }

    // Verify current password
    const bcrypt = await import("bcryptjs")
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    })
    
    if (!currentUser) {
      return { success: false, error: "User not found" }
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.passwordHash)
    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect" }
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    })

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
      metadata: {
        changedByBusinessAdmin: true,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error changing password:", error)
    return { success: false, error: "Failed to change password" }
  }
}

// ============================================
// STAFF DAILY REPORTS (Business Admin View)
// ============================================

import { DailyReportType, DailyReportStatus } from "../generated/prisma/client"

export interface BusinessStaffDailyReportData {
  id: string
  reportDate: Date
  reportType: DailyReportType | "WALLET"
  status: DailyReportStatus
  staffName: string
  staffRole: string
  shopName: string
  shopSlug: string
  // Sales fields
  totalSalesAmount: number | null
  newCustomersCount: number | null
  newPurchasesCount: number | null
  itemsSoldCount: number | null
  // Collection fields
  customersVisited: number | null
  paymentsCollected: number | null
  totalCollected: number | null
  // Wallet fields
  walletDepositsCount: number | null
  totalWalletDeposits: number | null
  // Common fields
  notes: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  reviewedByName: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all daily reports across all shops for a business (for business admin)
 */
export async function getBusinessDailyReports(
  businessSlug: string,
  filters?: {
    startDate?: string
    endDate?: string
    reportType?: DailyReportType
    status?: DailyReportStatus
    shopId?: string
  }
): Promise<BusinessStaffDailyReportData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  // Get all shop IDs for this business
  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true, shopSlug: true },
  })
  const shopIds = shops.map((s) => s.id)
  const shopMap = new Map(shops.map((s) => [s.id, { name: s.name, slug: s.shopSlug }]))

  // Get date range - default to last 30 days
  const endDate = filters?.endDate ? new Date(filters.endDate) : new Date()
  const startDate = filters?.startDate ? new Date(filters.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)

  // Get all purchases (sales) for the date range
  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: filters?.shopId ? filters.shopId : { in: shopIds } },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      customer: {
        include: {
          shop: { select: { id: true, name: true, shopSlug: true } },
        },
      },
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get all payments (collections) for the date range
  const payments = await prisma.payment.findMany({
    where: {
      purchase: { customer: { shopId: filters?.shopId ? filters.shopId : { in: shopIds } } },
      isConfirmed: true,
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      collector: {
        include: {
          user: { select: { id: true, name: true } },
          shop: { select: { id: true, name: true, shopSlug: true } },
        },
      },
      purchase: {
        include: {
          customer: {
            include: {
              shop: { select: { id: true, name: true, shopSlug: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get new customers for the date range
  const newCustomers = await prisma.customer.findMany({
    where: {
      shopId: filters?.shopId ? filters.shopId : { in: shopIds },
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
      shopId: true,
    },
  })

  // Get wallet transactions (confirmed deposits) for the date range
  const walletTransactions = await prisma.walletTransaction.findMany({
    where: {
      shopId: filters?.shopId ? filters.shopId : { in: shopIds },
      type: "DEPOSIT",
      status: "CONFIRMED",
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      shop: { select: { id: true, name: true, shopSlug: true } },
      createdBy: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Helper to format date as YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Aggregate data by date and shop
  const activityMap = new Map<string, {
    dateKey: string
    date: Date
    shopId: string
    shopName: string
    shopSlug: string
    salesAmount: number
    purchasesCount: number
    itemsSold: number
    collectionsAmount: number
    paymentsCount: number
    newCustomersCount: number
    collectorNames: Set<string>
    walletDepositsAmount: number
    walletDepositsCount: number
    walletStaffNames: Set<string>
  }>()

  // Process purchases (sales)
  for (const purchase of purchases) {
    const dateKey = formatDateKey(new Date(purchase.createdAt))
    const shop = purchase.customer.shop
    const key = `${dateKey}-${shop.id}-SALES`
    
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        dateKey,
        date: new Date(purchase.createdAt),
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.shopSlug,
        salesAmount: 0,
        purchasesCount: 0,
        itemsSold: 0,
        collectionsAmount: 0,
        paymentsCount: 0,
        newCustomersCount: 0,
        collectorNames: new Set(),
        walletDepositsAmount: 0,
        walletDepositsCount: 0,
        walletStaffNames: new Set(),
      })
    }
    
    const activity = activityMap.get(key)!
    activity.salesAmount += Number(purchase.totalAmount)
    activity.purchasesCount += 1
    activity.itemsSold += purchase.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  // Process payments (collections)
  for (const payment of payments) {
    const dateKey = formatDateKey(new Date(payment.createdAt))
    const shop = payment.collector?.shop || payment.purchase.customer.shop
    const key = `${dateKey}-${shop.id}-COLLECTION`
    
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        dateKey,
        date: new Date(payment.createdAt),
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.shopSlug,
        salesAmount: 0,
        purchasesCount: 0,
        itemsSold: 0,
        collectionsAmount: 0,
        paymentsCount: 0,
        newCustomersCount: 0,
        collectorNames: new Set(),
        walletDepositsAmount: 0,
        walletDepositsCount: 0,
        walletStaffNames: new Set(),
      })
    }
    
    const activity = activityMap.get(key)!
    activity.collectionsAmount += Number(payment.amount)
    activity.paymentsCount += 1
    if (payment.collector?.user.name) {
      activity.collectorNames.add(payment.collector.user.name)
    }
  }

  // Process wallet transactions (deposits)
  for (const walletTx of walletTransactions) {
    const dateKey = formatDateKey(new Date(walletTx.createdAt))
    const shop = walletTx.shop
    const key = `${dateKey}-${shop.id}-WALLET`
    
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        dateKey,
        date: new Date(walletTx.createdAt),
        shopId: shop.id,
        shopName: shop.name,
        shopSlug: shop.shopSlug,
        salesAmount: 0,
        purchasesCount: 0,
        itemsSold: 0,
        collectionsAmount: 0,
        paymentsCount: 0,
        newCustomersCount: 0,
        collectorNames: new Set(),
        walletDepositsAmount: 0,
        walletDepositsCount: 0,
        walletStaffNames: new Set(),
      })
    }
    
    const activity = activityMap.get(key)!
    activity.walletDepositsAmount += Number(walletTx.amount)
    activity.walletDepositsCount += 1
    if (walletTx.createdBy?.user.name) {
      activity.walletStaffNames.add(walletTx.createdBy.user.name)
    }
  }

  // Process new customers
  for (const customer of newCustomers) {
    const dateKey = formatDateKey(new Date(customer.createdAt))
    const key = `${dateKey}-${customer.shopId}-SALES`
    
    if (activityMap.has(key)) {
      activityMap.get(key)!.newCustomersCount += 1
    }
  }

  // Convert to reports array
  const reports: BusinessStaffDailyReportData[] = []
  
  for (const [key, activity] of activityMap) {
    const isSales = key.endsWith('-SALES')
    const isCollection = key.endsWith('-COLLECTION')
    const isWallet = key.endsWith('-WALLET')
    
    // Skip if filtering by type
    if (filters?.reportType === "SALES" && !isSales) continue
    if (filters?.reportType === "COLLECTION" && !isCollection) continue
    
    // Create sales report
    if (isSales && activity.salesAmount > 0) {
      reports.push({
        id: `auto-sales-${activity.dateKey}-${activity.shopId}`,
        reportDate: activity.date,
        reportType: "SALES",
        status: "REVIEWED", // Auto-generated are considered reviewed
        staffName: "Shop Activity",
        staffRole: "SALES_STAFF",
        shopName: activity.shopName,
        shopSlug: activity.shopSlug,
        totalSalesAmount: activity.salesAmount,
        newCustomersCount: activity.newCustomersCount,
        newPurchasesCount: activity.purchasesCount,
        itemsSoldCount: activity.itemsSold,
        customersVisited: null,
        paymentsCollected: null,
        totalCollected: null,
        walletDepositsCount: null,
        totalWalletDeposits: null,
        notes: `Auto-generated from ${activity.purchasesCount} purchase(s)`,
        reviewedAt: null,
        reviewNotes: null,
        reviewedByName: null,
        createdAt: activity.date,
        updatedAt: activity.date,
      })
    }
    
    // Create collection report
    if (isCollection && activity.collectionsAmount > 0) {
      const collectorName = activity.collectorNames.size > 0 
        ? Array.from(activity.collectorNames).join(", ")
        : "Shop Collections"
      
      reports.push({
        id: `auto-collection-${activity.dateKey}-${activity.shopId}`,
        reportDate: activity.date,
        reportType: "COLLECTION",
        status: "REVIEWED",
        staffName: collectorName,
        staffRole: "DEBT_COLLECTOR",
        shopName: activity.shopName,
        shopSlug: activity.shopSlug,
        totalSalesAmount: null,
        newCustomersCount: null,
        newPurchasesCount: null,
        itemsSoldCount: null,
        customersVisited: activity.paymentsCount,
        paymentsCollected: activity.paymentsCount,
        totalCollected: activity.collectionsAmount,
        walletDepositsCount: null,
        totalWalletDeposits: null,
        notes: `Auto-generated from ${activity.paymentsCount} payment(s)`,
        reviewedAt: null,
        reviewNotes: null,
        reviewedByName: null,
        createdAt: activity.date,
        updatedAt: activity.date,
      })
    }

    // Create wallet deposit report
    if (isWallet && activity.walletDepositsAmount > 0) {
      const staffName = activity.walletStaffNames.size > 0
        ? Array.from(activity.walletStaffNames).join(", ")
        : "Wallet Deposits"
      
      reports.push({
        id: `auto-wallet-${activity.dateKey}-${activity.shopId}`,
        reportDate: activity.date,
        reportType: "WALLET",
        status: "REVIEWED",
        staffName: staffName,
        staffRole: "WALLET",
        shopName: activity.shopName,
        shopSlug: activity.shopSlug,
        totalSalesAmount: null,
        newCustomersCount: null,
        newPurchasesCount: null,
        itemsSoldCount: null,
        customersVisited: null,
        paymentsCollected: null,
        totalCollected: null,
        walletDepositsCount: activity.walletDepositsCount,
        totalWalletDeposits: activity.walletDepositsAmount,
        notes: `Auto-generated from ${activity.walletDepositsCount} wallet deposit(s)`,
        reviewedAt: null,
        reviewNotes: null,
        reviewedByName: null,
        createdAt: activity.date,
        updatedAt: activity.date,
      })
    }
  }

  // Sort by date descending
  reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())

  return reports
}

/**
 * Review a daily report as business admin
 */
export async function reviewDailyReportAsBusinessAdmin(
  businessSlug: string,
  reportId: string,
  reviewNotes?: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get shops for this business
    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true },
    })
    const shopIds = shops.map((s) => s.id)

    const report = await prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        shopId: { in: shopIds },
      },
    })

    if (!report) {
      return { success: false, error: "Report not found" }
    }

    await prisma.dailyReport.update({
      where: { id: reportId },
      data: {
        status: "REVIEWED",
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "REVIEW_DAILY_REPORT",
      entityType: "DAILY_REPORT",
      entityId: reportId,
    })

    revalidatePath(`/business-admin/${businessSlug}/staff-reports`)
    return { success: true }
  } catch (error) {
    console.error("Error reviewing daily report:", error)
    return { success: false, error: "Failed to review report" }
  }
}

/**
 * Get staff activity data for calendar view
 */
export interface StaffActivityData {
  id: string
  name: string
  email: string
  role: string
  shopName: string
  shopSlug: string
  isActive: boolean
}

export interface DayActivitySummary {
  date: string
  totalSales: number
  totalCollections: number
  salesCount: number
  collectionsCount: number
  newCustomers: number
  paymentsCount: number
  staffActivities: {
    staffId: string
    staffName: string
    staffRole: string
    shopName: string
    salesAmount: number
    collectionsAmount: number
    newCustomers: number
    paymentsCount: number
    itemsSold: number
  }[]
}

export async function getStaffActivityForMonth(
  businessSlug: string,
  year: number,
  month: number
): Promise<{
  staff: StaffActivityData[]
  dailyActivities: Record<string, DayActivitySummary>
  monthSummary: {
    totalSales: number
    totalCollections: number
    totalStaff: number
    activeDays: number
  }
}> {
  const { business } = await requireBusinessAdmin(businessSlug)

  // Get all staff for the business
  const staffMembers = await prisma.shopMember.findMany({
    where: {
      shop: { businessId: business.id },
      role: { in: ["SALES_STAFF", "DEBT_COLLECTOR"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      shop: { select: { name: true, shopSlug: true } },
    },
  })

  const staff: StaffActivityData[] = staffMembers.map((m) => ({
    id: m.id,
    name: m.user.name || "Unknown",
    email: m.user.email,
    role: m.role,
    shopName: m.shop.name,
    shopSlug: m.shop.shopSlug,
    isActive: m.isActive,
  }))

  // Get all shops for this business
  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const shopIds = shops.map((s) => s.id)

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  // Get all payments for the month
  const payments = await prisma.payment.findMany({
    where: {
      purchase: { customer: { shopId: { in: shopIds } } },
      isConfirmed: true,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      createdAt: true,
      collectorId: true,
      purchase: {
        select: {
          customer: {
            select: {
              shop: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  // Get all purchases (sales) for the month
  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: { in: shopIds } },
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      totalAmount: true,
      createdAt: true,
      customer: {
        select: {
          shop: { select: { id: true, name: true } },
        },
      },
      items: { select: { quantity: true } },
    },
  })

  // Get new customers for the month
  const newCustomers = await prisma.customer.findMany({
    where: {
      shopId: { in: shopIds },
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
      shop: { select: { id: true, name: true } },
    },
  })

  // Get daily reports for more accurate staff attribution
  const dailyReports = await prisma.dailyReport.findMany({
    where: {
      shopId: { in: shopIds },
      reportDate: { gte: startDate, lte: endDate },
    },
    include: {
      shopMember: {
        include: {
          user: { select: { name: true } },
          shop: { select: { name: true } },
        },
      },
    },
  })

  // Build daily activities map
  const dailyActivities: Record<string, DayActivitySummary> = {}

  // Process daily reports
  for (const report of dailyReports) {
    const dateKey = new Date(report.reportDate).toISOString().split("T")[0]
    
    if (!dailyActivities[dateKey]) {
      dailyActivities[dateKey] = {
        date: dateKey,
        totalSales: 0,
        totalCollections: 0,
        salesCount: 0,
        collectionsCount: 0,
        newCustomers: 0,
        paymentsCount: 0,
        staffActivities: [],
      }
    }

    const activity = dailyActivities[dateKey]
    
    if (report.reportType === "SALES") {
      activity.totalSales += Number(report.totalSalesAmount || 0)
      activity.salesCount += 1
      activity.newCustomers += report.newCustomersCount || 0
    } else if (report.reportType === "COLLECTION") {
      activity.totalCollections += Number(report.totalCollected || 0)
      activity.collectionsCount += 1
      activity.paymentsCount += report.paymentsCollected || 0
    }

    // Add staff activity
    activity.staffActivities.push({
      staffId: report.shopMemberId,
      staffName: report.shopMember.user.name || "Unknown",
      staffRole: report.shopMember.role,
      shopName: report.shopMember.shop.name,
      salesAmount: report.reportType === "SALES" ? Number(report.totalSalesAmount || 0) : 0,
      collectionsAmount: report.reportType === "COLLECTION" ? Number(report.totalCollected || 0) : 0,
      newCustomers: report.newCustomersCount || 0,
      paymentsCount: report.paymentsCollected || 0,
      itemsSold: report.itemsSoldCount || 0,
    })
  }

  // If no daily reports, use raw payment/purchase data
  for (const payment of payments) {
    const dateKey = new Date(payment.createdAt).toISOString().split("T")[0]
    if (!dailyActivities[dateKey]) {
      dailyActivities[dateKey] = {
        date: dateKey,
        totalSales: 0,
        totalCollections: 0,
        salesCount: 0,
        collectionsCount: 0,
        newCustomers: 0,
        paymentsCount: 0,
        staffActivities: [],
      }
    }
    // Only count if not already counted from reports
    if (dailyActivities[dateKey].collectionsCount === 0) {
      dailyActivities[dateKey].totalCollections += Number(payment.amount)
      dailyActivities[dateKey].paymentsCount += 1
    }
  }

  for (const purchase of purchases) {
    const dateKey = new Date(purchase.createdAt).toISOString().split("T")[0]
    if (!dailyActivities[dateKey]) {
      dailyActivities[dateKey] = {
        date: dateKey,
        totalSales: 0,
        totalCollections: 0,
        salesCount: 0,
        collectionsCount: 0,
        newCustomers: 0,
        paymentsCount: 0,
        staffActivities: [],
      }
    }
    // Only count if not already counted from reports
    if (dailyActivities[dateKey].salesCount === 0) {
      dailyActivities[dateKey].totalSales += Number(purchase.totalAmount)
      dailyActivities[dateKey].salesCount += 1
    }
  }

  for (const customer of newCustomers) {
    const dateKey = new Date(customer.createdAt).toISOString().split("T")[0]
    if (!dailyActivities[dateKey]) {
      dailyActivities[dateKey] = {
        date: dateKey,
        totalSales: 0,
        totalCollections: 0,
        salesCount: 0,
        collectionsCount: 0,
        newCustomers: 0,
        paymentsCount: 0,
        staffActivities: [],
      }
    }
    // Only count if not already counted from reports
    if (dailyActivities[dateKey].newCustomers === 0 || dailyActivities[dateKey].staffActivities.length === 0) {
      dailyActivities[dateKey].newCustomers += 1
    }
  }

  // Calculate month summary
  const monthSummary = {
    totalSales: Object.values(dailyActivities).reduce((sum, d) => sum + d.totalSales, 0),
    totalCollections: Object.values(dailyActivities).reduce((sum, d) => sum + d.totalCollections, 0),
    totalStaff: staff.filter((s) => s.isActive).length,
    activeDays: Object.keys(dailyActivities).length,
  }

  return { staff, dailyActivities, monthSummary }
}

// ============================================
// POS SYSTEM ACTIONS
// ============================================

interface PosCartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface CreatePosTransactionPayload {
  shopId: string
  customerName: string | null
  customerPhone: string | null
  items: PosCartItem[]
  paymentMethod: "CASH" | "MOBILE_MONEY" | "CARD"
  amountPaid: number
}

/**
 * Create a new POS transaction
 */
export async function createPosTransaction(
  businessSlug: string,
  payload: CreatePosTransactionPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    if (!business.posEnabled) {
      return { success: false, error: "POS is not enabled for this business" }
    }

    if (payload.items.length === 0) {
      return { success: false, error: "Cart is empty" }
    }

    // Calculate totals
    const subtotal = payload.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const totalAmount = subtotal

    if (payload.amountPaid < totalAmount) {
      return { success: false, error: "Amount paid is less than total" }
    }

    // Generate transaction number
    const today = new Date()
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "")
    const count = await prisma.posTransaction.count({
      where: {
        businessId: business.id,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    })
    const transactionNo = `POS-${datePrefix}-${String(count + 1).padStart(4, "0")}`

    // Create transaction with items
    const transaction = await prisma.posTransaction.create({
      data: {
        transactionNo,
        businessId: business.id,
        shopId: payload.shopId,
        cashierId: user.id,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        subtotal,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount,
        paymentMethod: payload.paymentMethod,
        amountPaid: payload.amountPaid,
        changeGiven: payload.amountPaid - totalAmount,
        status: "COMPLETED",
        items: {
          create: payload.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
    })

    // Update product stock for each item
    for (const item of payload.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { decrement: item.quantity },
        },
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_POS_TRANSACTION",
      entityType: "POS_TRANSACTION",
      entityId: transaction.id,
      metadata: { transactionNo, totalAmount, itemCount: payload.items.length },
    })

    revalidatePath(`/business-admin/${businessSlug}/pos`)
    return { success: true, data: { transactionId: transaction.id, transactionNo } }
  } catch (error) {
    console.error("Error creating POS transaction:", error)
    return { success: false, error: "Failed to create transaction" }
  }
}

/**
 * Toggle staff POS access
 */
export async function toggleStaffPosAccess(
  businessSlug: string,
  memberId: string,
  enabled: boolean
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get shops for this business
    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true },
    })
    const shopIds = shops.map((s) => s.id)

    // Verify the member belongs to a shop in this business
    const member = await prisma.shopMember.findFirst({
      where: {
        id: memberId,
        shopId: { in: shopIds },
      },
    })

    if (!member) {
      return { success: false, error: "Staff member not found" }
    }

    await prisma.shopMember.update({
      where: { id: memberId },
      data: { posAccess: enabled },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: enabled ? "GRANT_POS_ACCESS" : "REVOKE_POS_ACCESS",
      entityType: "SHOP_MEMBER",
      entityId: memberId,
    })

    revalidatePath(`/business-admin/${businessSlug}/pos`)
    revalidatePath(`/business-admin/${businessSlug}/staff`)
    return { success: true }
  } catch (error) {
    console.error("Error toggling POS access:", error)
    return { success: false, error: "Failed to update POS access" }
  }
}

/**
 * Get POS transactions for a date range
 */
export async function getPosTransactions(
  businessSlug: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  id: string
  transactionNo: string
  customerName: string | null
  totalAmount: number
  paymentMethod: string
  cashierName: string
  itemCount: number
  createdAt: Date
  status: string
}[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const where: Prisma.PosTransactionWhereInput = {
    businessId: business.id,
  }

  if (startDate && endDate) {
    where.createdAt = {
      gte: startDate,
      lte: endDate,
    }
  }

  const transactions = await prisma.posTransaction.findMany({
    where,
    include: {
      cashier: {
        select: { name: true },
      },
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  })

  return transactions.map((t) => ({
    id: t.id,
    transactionNo: t.transactionNo,
    customerName: t.customerName,
    totalAmount: Number(t.totalAmount),
    paymentMethod: t.paymentMethod,
    cashierName: t.cashier.name || "Unknown",
    itemCount: t._count.items,
    createdAt: t.createdAt,
    status: t.status,
  }))
}

/**
 * Get POS daily summary
 */
export async function getPosDailySummary(
  businessSlug: string,
  date: Date
): Promise<{
  totalSales: number
  transactionCount: number
  cashSales: number
  mobileMoneySales: number
  cardSales: number
  itemsSold: number
}> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

  const transactions = await prisma.posTransaction.findMany({
    where: {
      businessId: business.id,
      status: "COMPLETED",
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
  })

  const totalSales = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0)
  const cashSales = transactions
    .filter((t) => t.paymentMethod === "CASH")
    .reduce((sum, t) => sum + Number(t.totalAmount), 0)
  const mobileMoneySales = transactions
    .filter((t) => t.paymentMethod === "MOBILE_MONEY")
    .reduce((sum, t) => sum + Number(t.totalAmount), 0)
  const cardSales = transactions
    .filter((t) => t.paymentMethod === "CARD")
    .reduce((sum, t) => sum + Number(t.totalAmount), 0)
  const itemsSold = transactions.reduce((sum, t) => sum + t._count.items, 0)

  return {
    totalSales,
    transactionCount: transactions.length,
    cashSales,
    mobileMoneySales,
    cardSales,
    itemsSold,
  }
}

/**
 * Void a POS transaction
 */
export async function voidPosTransaction(
  businessSlug: string,
  transactionId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const transaction = await prisma.posTransaction.findFirst({
      where: {
        id: transactionId,
        businessId: business.id,
        status: "COMPLETED",
      },
      include: {
        items: true,
      },
    })

    if (!transaction) {
      return { success: false, error: "Transaction not found or already voided" }
    }

    // Restore stock for each item
    for (const item of transaction.items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
          },
        })
      }
    }

    // Update transaction status
    await prisma.posTransaction.update({
      where: { id: transactionId },
      data: {
        status: "VOIDED",
        voidReason: reason,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "VOID_POS_TRANSACTION",
      entityType: "POS_TRANSACTION",
      entityId: transactionId,
      metadata: { reason },
    })

    revalidatePath(`/business-admin/${businessSlug}/pos`)
    return { success: true }
  } catch (error) {
    console.error("Error voiding POS transaction:", error)
    return { success: false, error: "Failed to void transaction" }
  }
}

// ============================================
// SUPPLY CATALOG ACTIONS
// ============================================

// Supplier Types
export interface SupplierData {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  paymentTerms: string | null
  rating: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  itemCount: number
}

export interface SupplierPayload {
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  paymentTerms?: string | null
  rating?: number | null
  isActive?: boolean
}

// Supply Category Types
export interface SupplyCategoryData {
  id: string
  name: string
  description: string | null
  color: string | null
  imageUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  itemCount: number
}

export interface SupplyCategoryPayload {
  name: string
  description?: string | null
  color?: string
  imageUrl?: string | null
  isActive?: boolean
}

// Supply Item Types
export interface SupplyItemData {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string | null
  unitPrice: number
  stockQuantity: number
  reorderLevel: number
  leadTimeDays: number | null
  description: string | null
  imageUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  supplier: { id: string; name: string } | null
  category: { id: string; name: string; color: string | null } | null
}

export interface SupplyItemPayload {
  name: string
  sku?: string | null
  barcode?: string | null
  unit?: string
  unitPrice: number
  stockQuantity?: number
  reorderLevel?: number
  leadTimeDays?: number | null
  description?: string | null
  imageUrl?: string | null
  isActive?: boolean
  supplierId?: string | null
  categoryId?: string | null
}

// ========== SUPPLIER ACTIONS ==========

/**
 * Get all suppliers for a business
 */
export async function getSuppliers(businessSlug: string): Promise<SupplierData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const suppliers = await prisma.supplier.findMany({
    where: { businessId: business.id },
    include: {
      _count: {
        select: { supplyItems: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson,
    email: s.email,
    phone: s.phone,
    address: s.address,
    paymentTerms: s.paymentTerms,
    rating: s.rating ? Number(s.rating) : null,
    isActive: s.isActive,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    itemCount: s._count.supplyItems,
  }))
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(businessSlug: string, supplierId: string): Promise<SupplierData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId: business.id },
    include: {
      _count: {
        select: { supplyItems: true },
      },
    },
  })

  if (!supplier) return null

  return {
    id: supplier.id,
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    paymentTerms: supplier.paymentTerms,
    rating: supplier.rating ? Number(supplier.rating) : null,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
    itemCount: supplier._count.supplyItems,
  }
}

/**
 * Create a new supplier
 */
export async function createSupplier(businessSlug: string, data: SupplierPayload): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    if (!data.name?.trim()) {
      return { success: false, error: "Supplier name is required" }
    }

    // Check for duplicate name
    const existing = await prisma.supplier.findFirst({
      where: {
        businessId: business.id,
        name: { equals: data.name.trim(), mode: "insensitive" },
      },
    })

    if (existing) {
      return { success: false, error: "A supplier with this name already exists" }
    }

    const supplier = await prisma.supplier.create({
      data: {
        businessId: business.id,
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        paymentTerms: data.paymentTerms?.trim() || null,
        rating: data.rating ?? null,
        isActive: data.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_SUPPLIER",
      entityType: "SUPPLIER",
      entityId: supplier.id,
      metadata: { name: supplier.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/suppliers`)
    return { success: true, data: { id: supplier.id } }
  } catch (error) {
    console.error("Error creating supplier:", error)
    return { success: false, error: "Failed to create supplier" }
  }
}

/**
 * Update a supplier
 */
export async function updateSupplier(
  businessSlug: string,
  supplierId: string,
  data: SupplierPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId: business.id },
    })

    if (!supplier) {
      return { success: false, error: "Supplier not found" }
    }

    if (!data.name?.trim()) {
      return { success: false, error: "Supplier name is required" }
    }

    // Check for duplicate name (excluding current)
    const existing = await prisma.supplier.findFirst({
      where: {
        businessId: business.id,
        name: { equals: data.name.trim(), mode: "insensitive" },
        NOT: { id: supplierId },
      },
    })

    if (existing) {
      return { success: false, error: "A supplier with this name already exists" }
    }

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        paymentTerms: data.paymentTerms?.trim() || null,
        rating: data.rating ?? null,
        isActive: data.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE_SUPPLIER",
      entityType: "SUPPLIER",
      entityId: supplierId,
      metadata: { name: data.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/suppliers`)
    return { success: true }
  } catch (error) {
    console.error("Error updating supplier:", error)
    return { success: false, error: "Failed to update supplier" }
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(businessSlug: string, supplierId: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId: business.id },
      include: {
        _count: {
          select: { supplyItems: true },
        },
      },
    })

    if (!supplier) {
      return { success: false, error: "Supplier not found" }
    }

    if (supplier._count.supplyItems > 0) {
      return { success: false, error: "Cannot delete supplier with associated items. Remove items first." }
    }

    await prisma.supplier.delete({
      where: { id: supplierId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "DELETE_SUPPLIER",
      entityType: "SUPPLIER",
      entityId: supplierId,
      metadata: { name: supplier.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/suppliers`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return { success: false, error: "Failed to delete supplier" }
  }
}

// ========== SUPPLY CATEGORY ACTIONS ==========

/**
 * Get all supply categories for a business
 */
export async function getSupplyCategories(businessSlug: string): Promise<SupplyCategoryData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const categories = await prisma.supplyCategory.findMany({
    where: { businessId: business.id },
    include: {
      _count: {
        select: { supplyItems: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    color: c.color,
    imageUrl: c.imageUrl,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    itemCount: c._count.supplyItems,
  }))
}

/**
 * Get a single supply category by ID
 */
export async function getSupplyCategory(businessSlug: string, categoryId: string): Promise<SupplyCategoryData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const category = await prisma.supplyCategory.findFirst({
    where: { id: categoryId, businessId: business.id },
    include: {
      _count: {
        select: { supplyItems: true },
      },
    },
  })

  if (!category) return null

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    color: category.color,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    itemCount: category._count.supplyItems,
  }
}

/**
 * Create a new supply category
 */
export async function createSupplyCategory(businessSlug: string, data: SupplyCategoryPayload): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    if (!data.name?.trim()) {
      return { success: false, error: "Category name is required" }
    }

    // Check for duplicate name
    const existing = await prisma.supplyCategory.findFirst({
      where: {
        businessId: business.id,
        name: { equals: data.name.trim(), mode: "insensitive" },
      },
    })

    if (existing) {
      return { success: false, error: "A category with this name already exists" }
    }

    const category = await prisma.supplyCategory.create({
      data: {
        businessId: business.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        color: data.color || "#8b5cf6",
        imageUrl: data.imageUrl || null,
        isActive: data.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_SUPPLY_CATEGORY",
      entityType: "SUPPLY_CATEGORY",
      entityId: category.id,
      metadata: { name: category.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/supply-categories`)
    return { success: true, data: { id: category.id } }
  } catch (error) {
    console.error("Error creating supply category:", error)
    return { success: false, error: "Failed to create category" }
  }
}

/**
 * Update a supply category
 */
export async function updateSupplyCategory(
  businessSlug: string,
  categoryId: string,
  data: SupplyCategoryPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const category = await prisma.supplyCategory.findFirst({
      where: { id: categoryId, businessId: business.id },
    })

    if (!category) {
      return { success: false, error: "Category not found" }
    }

    if (!data.name?.trim()) {
      return { success: false, error: "Category name is required" }
    }

    // Check for duplicate name (excluding current)
    const existing = await prisma.supplyCategory.findFirst({
      where: {
        businessId: business.id,
        name: { equals: data.name.trim(), mode: "insensitive" },
        NOT: { id: categoryId },
      },
    })

    if (existing) {
      return { success: false, error: "A category with this name already exists" }
    }

    await prisma.supplyCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        color: data.color || "#8b5cf6",
        imageUrl: data.imageUrl || null,
        isActive: data.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE_SUPPLY_CATEGORY",
      entityType: "SUPPLY_CATEGORY",
      entityId: categoryId,
      metadata: { name: data.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/supply-categories`)
    return { success: true }
  } catch (error) {
    console.error("Error updating supply category:", error)
    return { success: false, error: "Failed to update category" }
  }
}

/**
 * Delete a supply category
 */
export async function deleteSupplyCategory(businessSlug: string, categoryId: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const category = await prisma.supplyCategory.findFirst({
      where: { id: categoryId, businessId: business.id },
      include: {
        _count: {
          select: { supplyItems: true },
        },
      },
    })

    if (!category) {
      return { success: false, error: "Category not found" }
    }

    if (category._count.supplyItems > 0) {
      return { success: false, error: "Cannot delete category with associated items. Remove items first." }
    }

    await prisma.supplyCategory.delete({
      where: { id: categoryId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "DELETE_SUPPLY_CATEGORY",
      entityType: "SUPPLY_CATEGORY",
      entityId: categoryId,
      metadata: { name: category.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/supply-categories`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting supply category:", error)
    return { success: false, error: "Failed to delete category" }
  }
}

// ========== SUPPLY ITEM ACTIONS ==========

/**
 * Get all supply items for a business
 */
export async function getSupplyItems(businessSlug: string): Promise<SupplyItemData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const items = await prisma.supplyItem.findMany({
    where: { businessId: business.id },
    include: {
      supplier: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { name: "asc" },
  })

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    barcode: i.barcode,
    unit: i.unit,
    unitPrice: Number(i.unitPrice),
    stockQuantity: i.stockQuantity,
    reorderLevel: i.reorderLevel,
    leadTimeDays: i.leadTimeDays,
    description: i.description,
    imageUrl: i.imageUrl,
    isActive: i.isActive,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    supplier: i.supplier,
    category: i.category,
  }))
}

/**
 * Get a single supply item by ID
 */
export async function getSupplyItem(businessSlug: string, itemId: string): Promise<SupplyItemData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const item = await prisma.supplyItem.findFirst({
    where: { id: itemId, businessId: business.id },
    include: {
      supplier: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  })

  if (!item) return null

  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    unit: item.unit,
    unitPrice: Number(item.unitPrice),
    stockQuantity: item.stockQuantity,
    reorderLevel: item.reorderLevel,
    leadTimeDays: item.leadTimeDays,
    description: item.description,
    imageUrl: item.imageUrl,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    supplier: item.supplier,
    category: item.category,
  }
}

/**
 * Create a new supply item
 */
export async function createSupplyItem(businessSlug: string, data: SupplyItemPayload): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    if (!data.name?.trim()) {
      return { success: false, error: "Item name is required" }
    }

    if (data.unitPrice === undefined || data.unitPrice < 0) {
      return { success: false, error: "Valid unit price is required" }
    }

    // Validate supplier if provided
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, businessId: business.id },
      })
      if (!supplier) {
        return { success: false, error: "Invalid supplier" }
      }
    }

    // Validate category if provided
    if (data.categoryId) {
      const category = await prisma.supplyCategory.findFirst({
        where: { id: data.categoryId, businessId: business.id },
      })
      if (!category) {
        return { success: false, error: "Invalid category" }
      }
    }

    const item = await prisma.supplyItem.create({
      data: {
        businessId: business.id,
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        barcode: data.barcode?.trim() || null,
        unit: data.unit || "piece",
        unitPrice: data.unitPrice,
        stockQuantity: data.stockQuantity ?? 0,
        reorderLevel: data.reorderLevel ?? 10,
        leadTimeDays: data.leadTimeDays ?? undefined,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive ?? true,
        supplierId: data.supplierId || null,
        categoryId: data.categoryId || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_SUPPLY_ITEM",
      entityType: "SUPPLY_ITEM",
      entityId: item.id,
      metadata: { name: item.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/supply-items`)
    return { success: true, data: { id: item.id } }
  } catch (error) {
    console.error("Error creating supply item:", error)
    return { success: false, error: "Failed to create item" }
  }
}

/**
 * Update a supply item
 */
export async function updateSupplyItem(
  businessSlug: string,
  itemId: string,
  data: SupplyItemPayload
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const item = await prisma.supplyItem.findFirst({
      where: { id: itemId, businessId: business.id },
    })

    if (!item) {
      return { success: false, error: "Item not found" }
    }

    if (!data.name?.trim()) {
      return { success: false, error: "Item name is required" }
    }

    if (data.unitPrice === undefined || data.unitPrice < 0) {
      return { success: false, error: "Valid unit price is required" }
    }

    // Validate supplier if provided
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, businessId: business.id },
      })
      if (!supplier) {
        return { success: false, error: "Invalid supplier" }
      }
    }

    // Validate category if provided
    if (data.categoryId) {
      const category = await prisma.supplyCategory.findFirst({
        where: { id: data.categoryId, businessId: business.id },
      })
      if (!category) {
        return { success: false, error: "Invalid category" }
      }
    }

    await prisma.supplyItem.update({
      where: { id: itemId },
      data: {
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        barcode: data.barcode?.trim() || null,
        unit: data.unit || "piece",
        unitPrice: data.unitPrice,
        stockQuantity: data.stockQuantity ?? 0,
        reorderLevel: data.reorderLevel ?? 10,
        leadTimeDays: data.leadTimeDays ?? undefined,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive ?? true,
        supplierId: data.supplierId || null,
        categoryId: data.categoryId || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE_SUPPLY_ITEM",
      entityType: "SUPPLY_ITEM",
      entityId: itemId,
      metadata: { name: data.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/supply-items`)
    return { success: true }
  } catch (error) {
    console.error("Error updating supply item:", error)
    return { success: false, error: "Failed to update item" }
  }
}

/**
 * Delete a supply item
 */
export async function deleteSupplyItem(businessSlug: string, itemId: string): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const item = await prisma.supplyItem.findFirst({
      where: { id: itemId, businessId: business.id },
    })

    if (!item) {
      return { success: false, error: "Item not found" }
    }

    await prisma.supplyItem.delete({
      where: { id: itemId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "DELETE_SUPPLY_ITEM",
      entityType: "SUPPLY_ITEM",
      entityId: itemId,
      metadata: { name: item.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/supply-items`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting supply item:", error)
    return { success: false, error: "Failed to delete item" }
  }
}

/**
 * Update supply item stock
 */
export async function updateSupplyItemStock(
  businessSlug: string,
  itemId: string,
  adjustment: number,
  reason?: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const item = await prisma.supplyItem.findFirst({
      where: { id: itemId, businessId: business.id },
    })

    if (!item) {
      return { success: false, error: "Item not found" }
    }

    const newQuantity = item.stockQuantity + adjustment
    if (newQuantity < 0) {
      return { success: false, error: "Stock quantity cannot be negative" }
    }

    await prisma.supplyItem.update({
      where: { id: itemId },
      data: { stockQuantity: newQuantity },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE_SUPPLY_ITEM_STOCK",
      entityType: "SUPPLY_ITEM",
      entityId: itemId,
      metadata: {
        name: item.name,
        previousQuantity: item.stockQuantity,
        adjustment,
        newQuantity,
        reason: reason || "Manual adjustment",
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/supply-items`)
    return { success: true, data: { newQuantity } }
  } catch (error) {
    console.error("Error updating supply item stock:", error)
    return { success: false, error: "Failed to update stock" }
  }
}

// ============================================================================
// Accountant Management
// ============================================================================

/**
 * Create a new accountant for the business
 */
export async function createAccountant(
  businessSlug: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const phone = formData.get("phone") as string
    const canConfirmPayments = formData.get("canConfirmPayments") === "true"
    const canExportData = formData.get("canExportData") === "true"
    const canViewProfitMargins = formData.get("canViewProfitMargins") === "true"
    const canRecordExpenses = formData.get("canRecordExpenses") === "true"

    // Validation
    if (!name || name.trim().length === 0) {
      return { success: false, error: "Name is required" }
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return { success: false, error: "Valid email is required" }
    }

    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    let accountantUser

    if (existingUser) {
      // Check if already a member of this business
      const existingMember = await prisma.businessMember.findFirst({
        where: { userId: existingUser.id, businessId: business.id },
      })

      if (existingMember) {
        return { success: false, error: "This user is already a member of this business" }
      }

      accountantUser = existingUser
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10)

      accountantUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: name.trim(),
          passwordHash: hashedPassword,
          role: "ACCOUNTANT" as Role,
          phone: phone?.trim() || null,
        },
      })
    }

    // Create business membership
    await prisma.businessMember.create({
      data: {
        businessId: business.id,
        userId: accountantUser.id,
        role: "ACCOUNTANT",
        isActive: true,
        canConfirmPayments,
        canExportData,
        canViewProfitMargins,
        canRecordExpenses,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE",
      entityType: "BusinessMember",
      entityId: accountantUser.id,
      metadata: {
        businessId: business.id,
        role: "ACCOUNTANT",
        email: email.toLowerCase(),
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/settings/accountants`)
    return { success: true }
  } catch (error) {
    console.error("Error creating accountant:", error)
    return { success: false, error: "Failed to create accountant" }
  }
}

/**
 * Update accountant permissions
 */
export async function updateAccountantPermissions(
  businessSlug: string,
  membershipId: string,
  permissions: {
    canConfirmPayments: boolean
    canExportData: boolean
    canViewProfitMargins: boolean
    canRecordExpenses: boolean
  }
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const membership = await prisma.businessMember.findFirst({
      where: {
        id: membershipId,
        businessId: business.id,
        role: "ACCOUNTANT",
      },
    })

    if (!membership) {
      return { success: false, error: "Accountant not found" }
    }

    await prisma.businessMember.update({
      where: { id: membershipId },
      data: {
        canConfirmPayments: permissions.canConfirmPayments,
        canExportData: permissions.canExportData,
        canViewProfitMargins: permissions.canViewProfitMargins,
        canRecordExpenses: permissions.canRecordExpenses,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE",
      entityType: "BusinessMember",
      entityId: membershipId,
      metadata: { permissions },
    })

    revalidatePath(`/business-admin/${businessSlug}/settings/accountants`)
    return { success: true }
  } catch (error) {
    console.error("Error updating accountant permissions:", error)
    return { success: false, error: "Failed to update permissions" }
  }
}

/**
 * Toggle accountant active status
 */
export async function toggleAccountantActive(
  businessSlug: string,
  membershipId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const membership = await prisma.businessMember.findFirst({
      where: {
        id: membershipId,
        businessId: business.id,
        role: "ACCOUNTANT",
      },
    })

    if (!membership) {
      return { success: false, error: "Accountant not found" }
    }

    const newStatus = !membership.isActive

    await prisma.businessMember.update({
      where: { id: membershipId },
      data: { isActive: newStatus },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: newStatus ? "ACTIVATE" : "DEACTIVATE",
      entityType: "BusinessMember",
      entityId: membershipId,
      metadata: { role: "ACCOUNTANT" },
    })

    revalidatePath(`/business-admin/${businessSlug}/settings/accountants`)
    return { success: true }
  } catch (error) {
    console.error("Error toggling accountant status:", error)
    return { success: false, error: "Failed to update status" }
  }
}

/**
 * Delete accountant from business
 */
export async function deleteAccountant(
  businessSlug: string,
  membershipId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const membership = await prisma.businessMember.findFirst({
      where: {
        id: membershipId,
        businessId: business.id,
        role: "ACCOUNTANT",
      },
      include: { user: true },
    })

    if (!membership) {
      return { success: false, error: "Accountant not found" }
    }

    await prisma.businessMember.delete({
      where: { id: membershipId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "DELETE",
      entityType: "BusinessMember",
      entityId: membershipId,
      metadata: { email: membership.user.email, role: "ACCOUNTANT" },
    })

    revalidatePath(`/business-admin/${businessSlug}/settings/accountants`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting accountant:", error)
    return { success: false, error: "Failed to remove accountant" }
  }
}

/**
 * Get all accountants for the business staff directory
 */
export async function getBusinessAccountants(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const accountants = await prisma.businessMember.findMany({
    where: {
      businessId: business.id,
      role: "ACCOUNTANT",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return accountants.map((acc) => ({
    id: acc.id,
    userId: acc.user.id,
    userName: acc.user.name,
    userEmail: acc.user.email,
    userPhone: acc.user.phone,
    userGender: null,
    userIdCardType: null,
    userIdCardNumber: null,
    userGuarantorName: null,
    userGuarantorPhone: null,
    userGuarantorRelationship: null,
    userAddress: null,
    role: "ACCOUNTANT" as const,
    isActive: acc.isActive,
    posAccess: false,
    shopName: "All Shops",
    shopSlug: "business-wide",
    createdAt: acc.createdAt,
    canSellProducts: false,
    canCreateCustomers: false,
    // Accountant-specific permissions
    canConfirmPayments: acc.canConfirmPayments,
    canExportData: acc.canExportData,
    canViewProfitMargins: acc.canViewProfitMargins,
    canRecordExpenses: acc.canRecordExpenses,
  }))
}

/**
 * Update an accountant's information
 */
export async function updateAccountant(
  businessSlug: string,
  membershipId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const phone = formData.get("phone") as string
    const isActive = formData.get("isActive") === "true"
    const canConfirmPayments = formData.get("canConfirmPayments") === "true"
    const canExportData = formData.get("canExportData") === "true"
    const canViewProfitMargins = formData.get("canViewProfitMargins") === "true"
    const canRecordExpenses = formData.get("canRecordExpenses") === "true"

    if (!name || !email) {
      return { success: false, error: "Name and email are required" }
    }

    // Find the accountant membership
    const membership = await prisma.businessMember.findFirst({
      where: {
        id: membershipId,
        businessId: business.id,
        role: "ACCOUNTANT",
      },
      include: { user: true },
    })

    if (!membership) {
      return { success: false, error: "Accountant not found" }
    }

    // Check if email is being changed and if it's already in use
    if (email !== membership.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })
      if (existingUser && existingUser.id !== membership.userId) {
        return { success: false, error: "Email is already in use" }
      }
    }

    // Update user info
    const userUpdateData: {
      name: string
      email: string
      phone: string | null
      passwordHash?: string
    } = {
      name,
      email,
      phone: phone || null,
    }

    if (password) {
      const bcrypt = await import("bcryptjs")
      userUpdateData.passwordHash = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: { id: membership.userId },
      data: userUpdateData,
    })

    // Update membership info
    await prisma.businessMember.update({
      where: { id: membershipId },
      data: {
        isActive,
        canConfirmPayments,
        canExportData,
        canViewProfitMargins,
        canRecordExpenses,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "UPDATE",
      entityType: "BusinessMember",
      entityId: membershipId,
      metadata: { name, email, permissions: { canConfirmPayments, canExportData, canViewProfitMargins, canRecordExpenses } },
    })

    revalidatePath(`/business-admin/${businessSlug}/staff`)
    return { success: true }
  } catch (error) {
    console.error("Error updating accountant:", error)
    return { success: false, error: "Failed to update accountant" }
  }
}