"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireShopAdminForShop, createAuditLog } from "../../lib/auth"
import { sendCollectionReceipt, sendAccountCreationEmail, sendPurchaseInvoice } from "../../lib/email"
import { generateInvoicePDF, generateReceiptPDF } from "../../lib/pdf-generator"
import { 
  sendPurchaseInvoiceMessage, 
  sendPendingPaymentMessage, 
  sendPaymentReceiptMessage 
} from "../../lib/messaging-actions"
import { InterestType, PaymentPreference, PaymentMethod, PurchaseStatus, PaymentStatus, PurchaseType, Prisma } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface PolicyPayload {
  interestType: InterestType
  interestRate: number
  graceDays: number
  maxTenorDays: number
  lateFeeFixed?: number | null
  lateFeeRate?: number | null
}

/**
 * Get shop policy for a shop
 */
export async function getShopPolicy(shopSlug: string) {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const policy = await prisma.shopPolicy.findUnique({
    where: { shopId: shop.id },
  })

  if (!policy) {
    // Return default values if no policy exists
    return {
      interestType: "FLAT" as InterestType,
      interestRate: 0,
      graceDays: 3,
      maxTenorDays: 60,
      lateFeeFixed: null,
      lateFeeRate: null,
    }
  }

  return {
    interestType: policy.interestType,
    interestRate: Number(policy.interestRate),
    graceDays: policy.graceDays,
    maxTenorDays: policy.maxTenorDays,
    lateFeeFixed: policy.lateFeeFixed ? Number(policy.lateFeeFixed) : null,
    lateFeeRate: policy.lateFeeRate ? Number(policy.lateFeeRate) : null,
  }
}

/**
 * Upsert (create or update) shop policy
 */
export async function upsertShopPolicy(
  shopSlug: string,
  payload: PolicyPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Validation
    if (payload.interestRate < 0 || payload.interestRate > 100) {
      return { success: false, error: "Interest rate must be between 0 and 100" }
    }

    if (payload.graceDays < 0 || payload.graceDays > 60) {
      return { success: false, error: "Grace days must be between 0 and 60" }
    }

    if (payload.maxTenorDays < 1 || payload.maxTenorDays > 365) {
      return { success: false, error: "Max tenor days must be between 1 and 365" }
    }

    if (payload.lateFeeFixed !== null && payload.lateFeeFixed !== undefined && payload.lateFeeFixed < 0) {
      return { success: false, error: "Late fee fixed amount must be 0 or greater" }
    }

    if (payload.lateFeeRate !== null && payload.lateFeeRate !== undefined && payload.lateFeeRate < 0) {
      return { success: false, error: "Late fee rate must be 0 or greater" }
    }

    // Get existing policy for audit log comparison
    const existingPolicy = await prisma.shopPolicy.findUnique({
      where: { shopId: shop.id },
    })

    // Upsert the policy
    const policy = await prisma.shopPolicy.upsert({
      where: { shopId: shop.id },
      create: {
        shopId: shop.id,
        interestType: payload.interestType,
        interestRate: new Prisma.Decimal(payload.interestRate),
        graceDays: payload.graceDays,
        maxTenorDays: payload.maxTenorDays,
        lateFeeFixed: payload.lateFeeFixed != null ? new Prisma.Decimal(payload.lateFeeFixed) : null,
        lateFeeRate: payload.lateFeeRate != null ? new Prisma.Decimal(payload.lateFeeRate) : null,
      },
      update: {
        interestType: payload.interestType,
        interestRate: new Prisma.Decimal(payload.interestRate),
        graceDays: payload.graceDays,
        maxTenorDays: payload.maxTenorDays,
        lateFeeFixed: payload.lateFeeFixed != null ? new Prisma.Decimal(payload.lateFeeFixed) : null,
        lateFeeRate: payload.lateFeeRate != null ? new Prisma.Decimal(payload.lateFeeRate) : null,
      },
    })

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "POLICY_UPDATED",
      entityType: "ShopPolicy",
      entityId: policy.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        previousPolicy: existingPolicy
          ? {
              interestType: existingPolicy.interestType,
              interestRate: Number(existingPolicy.interestRate),
              graceDays: existingPolicy.graceDays,
              maxTenorDays: existingPolicy.maxTenorDays,
              lateFeeFixed: existingPolicy.lateFeeFixed
                ? Number(existingPolicy.lateFeeFixed)
                : null,
              lateFeeRate: existingPolicy.lateFeeRate
                ? Number(existingPolicy.lateFeeRate)
                : null,
            }
          : null,
        newPolicy: {
          interestType: payload.interestType,
          interestRate: payload.interestRate,
          graceDays: payload.graceDays,
          maxTenorDays: payload.maxTenorDays,
          lateFeeFixed: payload.lateFeeFixed,
          lateFeeRate: payload.lateFeeRate,
        },
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/dashboard`)
    revalidatePath(`/shop-admin/${shop.shopSlug}/policy`)

    // Convert Decimal to plain numbers for client component compatibility
    return { 
      success: true, 
      data: {
        id: policy.id,
        shopId: policy.shopId,
        interestType: policy.interestType,
        interestRate: Number(policy.interestRate),
        graceDays: policy.graceDays,
        maxTenorDays: policy.maxTenorDays,
        lateFeeFixed: policy.lateFeeFixed ? Number(policy.lateFeeFixed) : null,
        lateFeeRate: policy.lateFeeRate ? Number(policy.lateFeeRate) : null,
      }
    }
  } catch (error) {
    console.error("Error updating shop policy:", error)
    return { success: false, error: "Failed to update policy" }
  }
}

// ============================================
// PRODUCT ACTIONS
// ============================================

export interface ProductPayload {
  name: string
  description?: string | null
  sku?: string | null
  // Pricing tiers
  costPrice?: number     // Cost/purchase price (for profit calculation)
  cashPrice: number      // Full payment upfront (best price)
  layawayPrice: number   // Pay in bits before taking product
  creditPrice: number    // Take product before paying (BNPL)
  price?: number         // Default display price (usually cashPrice)
  stockQuantity?: number
  lowStockThreshold?: number
  imageUrl?: string | null
  isActive?: boolean
  categoryId?: string | null
}

export interface ProductData {
  id: string
  shopId: string | null // Optional since products are now at business level
  name: string
  description: string | null
  sku: string | null
  costPrice: number
  cashPrice: number
  layawayPrice: number
  creditPrice: number
  price: number
  stockQuantity: number
  lowStockThreshold: number
  imageUrl: string | null
  isActive: boolean
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  hasCustomPricing: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all products for a shop (via ShopProduct)
 */
export async function getProducts(shopSlug: string): Promise<ProductData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const shopProducts = await prisma.shopProduct.findMany({
    where: { shopId: shop.id },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { product: { createdAt: "desc" } },
  })

  // Convert and return products with shop-specific stock
  return shopProducts.map((sp) => {
    const p = sp.product
    const hasCustomPricing = !!(sp.costPrice || sp.cashPrice || sp.layawayPrice || sp.creditPrice)
    return {
      id: p.id,
      shopId: shop.id, // Use current shop context
      name: p.name,
      description: p.description,
      sku: p.sku,
      costPrice: Number(sp.costPrice ?? p.costPrice),
      cashPrice: Number(sp.cashPrice ?? p.cashPrice),
      layawayPrice: Number(sp.layawayPrice ?? p.layawayPrice),
      creditPrice: Number(sp.creditPrice ?? p.creditPrice),
      price: Number(sp.cashPrice ?? p.price),
      stockQuantity: sp.stockQuantity, // Shop-specific stock
      lowStockThreshold: p.lowStockThreshold,
      imageUrl: p.imageUrl,
      isActive: sp.isActive && p.isActive,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      categoryColor: p.category?.color || null,
      hasCustomPricing,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  })
}

/**
 * Create a new product
 */
export async function createProduct(
  shopSlug: string,
  payload: ProductPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Get the business for this shop
    const shopWithBusiness = await prisma.shop.findUnique({
      where: { id: shop.id },
      include: { business: true },
    })

    if (!shopWithBusiness) {
      return { success: false, error: "Shop not found" }
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
          businessId: shopWithBusiness.businessId,
          sku: payload.sku.trim(),
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists" }
      }
    }

    // Create product at business level and ShopProduct entry in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the product at business level
      const product = await tx.product.create({
        data: {
          businessId: shopWithBusiness.businessId,
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          sku: payload.sku?.trim() || null,
          costPrice: new Prisma.Decimal(payload.costPrice ?? 0),
          cashPrice: new Prisma.Decimal(payload.cashPrice),
          layawayPrice: new Prisma.Decimal(payload.layawayPrice),
          creditPrice: new Prisma.Decimal(payload.creditPrice),
          price: new Prisma.Decimal(payload.price ?? payload.cashPrice), // Default to cash price
          stockQuantity: 0, // Main product stock stays at 0, shop-specific stock in ShopProduct
          lowStockThreshold: payload.lowStockThreshold ?? 5,
          imageUrl: payload.imageUrl || null,
          isActive: payload.isActive ?? true,
          categoryId: payload.categoryId || null,
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
        businessId: shopWithBusiness.businessId,
        shopId: shop.id,
        shopName: shop.name,
        productName: result.name,
        productSku: result.sku,
        cashPrice: Number(result.cashPrice),
        layawayPrice: Number(result.layawayPrice),
        creditPrice: Number(result.creditPrice),
        stockQuantity: payload.stockQuantity ?? 0,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/products`)

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        price: Number(result.price),
      },
    }
  } catch (error) {
    console.error("Error creating product:", error)
    return { success: false, error: "Failed to create product" }
  }
}

/**
 * Update an existing product (updates product master and shop-specific stock)
 */
export async function updateProduct(
  shopSlug: string,
  productId: string,
  payload: Partial<ProductPayload>
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Get the shop's business
    const shopWithBusiness = await prisma.shop.findUnique({
      where: { id: shop.id },
      include: { business: true },
    })

    if (!shopWithBusiness) {
      return { success: false, error: "Shop not found" }
    }

    // Check product exists and is assigned to this shop
    const shopProduct = await prisma.shopProduct.findFirst({
      where: { productId, shopId: shop.id },
      include: { product: true },
    })

    if (!shopProduct) {
      return { success: false, error: "Product not found in this shop" }
    }

    const existingProduct = shopProduct.product

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
    const cashPrice = payload.cashPrice ?? Number(existingProduct.cashPrice)
    const layawayPrice = payload.layawayPrice ?? Number(existingProduct.layawayPrice)
    const creditPrice = payload.creditPrice ?? Number(existingProduct.creditPrice)

    // Validate pricing logic: Cash <= Layaway <= Credit
    if (cashPrice > layawayPrice) {
      return { success: false, error: "Cash price should not exceed layaway price" }
    }
    if (layawayPrice > creditPrice) {
      return { success: false, error: "Layaway price should not exceed credit price" }
    }

    // Check for duplicate SKU at business level if changing
    if (payload.sku && payload.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          businessId: shopWithBusiness.businessId,
          sku: payload.sku.trim(),
          id: { not: productId },
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists" }
      }
    }

    // Update in transaction - update product master and shop-specific stock
    const result = await prisma.$transaction(async (tx) => {
      // Update the product master (excludes stock which is shop-specific)
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          ...(payload.name !== undefined && { name: payload.name.trim() }),
          ...(payload.description !== undefined && { description: payload.description?.trim() || null }),
          ...(payload.sku !== undefined && { sku: payload.sku?.trim() || null }),
          ...(payload.costPrice !== undefined && { costPrice: new Prisma.Decimal(payload.costPrice) }),
          ...(payload.cashPrice !== undefined && { cashPrice: new Prisma.Decimal(payload.cashPrice) }),
          ...(payload.layawayPrice !== undefined && { layawayPrice: new Prisma.Decimal(payload.layawayPrice) }),
          ...(payload.creditPrice !== undefined && { creditPrice: new Prisma.Decimal(payload.creditPrice) }),
          ...(payload.price !== undefined && { price: new Prisma.Decimal(payload.price) }),
          ...(payload.lowStockThreshold !== undefined && { lowStockThreshold: payload.lowStockThreshold }),
          ...(payload.imageUrl !== undefined && { imageUrl: payload.imageUrl || null }),
          ...(payload.isActive !== undefined && { isActive: payload.isActive }),
          ...(payload.categoryId !== undefined && { categoryId: payload.categoryId || null }),
        },
      })

      // Update shop-specific stock if provided
      if (payload.stockQuantity !== undefined) {
        // Ensure stock cannot be negative
        const validStock = Math.max(0, payload.stockQuantity)
        await tx.shopProduct.update({
          where: { id: shopProduct.id },
          data: { stockQuantity: validStock },
        })
      }

      return product
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: result.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        productName: result.name,
        changes: payload,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/products`)

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        cashPrice: Number(result.cashPrice),
        layawayPrice: Number(result.layawayPrice),
        creditPrice: Number(result.creditPrice),
      },
    }
  } catch (error) {
    console.error("Error updating product:", error)
    return { success: false, error: "Failed to update product" }
  }
}

/**
 * Remove a product from shop (deletes ShopProduct entry)
 * Note: This doesn't delete the product itself, just removes it from this shop
 */
export async function deleteProduct(
  shopSlug: string,
  productId: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Check if product is assigned to this shop
    const shopProduct = await prisma.shopProduct.findFirst({
      where: { productId, shopId: shop.id },
      include: { product: true },
    })

    if (!shopProduct) {
      return { success: false, error: "Product not found in this shop" }
    }

    // Check if product has any active purchases in this shop
    const activePurchases = await prisma.purchase.count({
      where: {
        customer: { shopId: shop.id },
        items: { some: { productId } },
        status: { in: ["ACTIVE", "OVERDUE"] },
      },
    })

    if (activePurchases > 0) {
      return { 
        success: false, 
        error: `Cannot remove product with ${activePurchases} active purchase(s). Complete or cancel them first.` 
      }
    }

    // Remove product from this shop
    await prisma.shopProduct.delete({
      where: { id: shopProduct.id },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_REMOVED_FROM_SHOP",
      entityType: "ShopProduct",
      entityId: shopProduct.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        productName: shopProduct.product.name,
        productSku: shopProduct.product.sku,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/products`)

    return { success: true }
  } catch (error) {
    console.error("Error removing product from shop:", error)
    return { success: false, error: "Failed to remove product" }
  }
}

/**
 * Toggle product active status in this shop
 */
export async function toggleProductStatus(
  shopSlug: string,
  productId: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Find the ShopProduct entry
    const shopProduct = await prisma.shopProduct.findFirst({
      where: { productId, shopId: shop.id },
      include: { product: true },
    })

    if (!shopProduct) {
      return { success: false, error: "Product not found in this shop" }
    }

    // Toggle the ShopProduct's isActive status
    const updated = await prisma.shopProduct.update({
      where: { id: shopProduct.id },
      data: { isActive: !shopProduct.isActive },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: updated.isActive ? "SHOP_PRODUCT_ACTIVATED" : "SHOP_PRODUCT_DEACTIVATED",
      entityType: "ShopProduct",
      entityId: shopProduct.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        productName: shopProduct.product.name,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/products`)

    return { success: true, data: { isActive: updated.isActive } }
  } catch (error) {
    console.error("Error toggling product status:", error)
    return { success: false, error: "Failed to update product status" }
  }
}

// ============================================
// DEBT COLLECTOR ACTIONS
// ============================================

export interface DebtCollectorPayload {
  name: string
  email: string
  password: string
  phone?: string
  canSellProducts?: boolean
  canCreateCustomers?: boolean
}

export interface DebtCollectorData {
  id: string          // ShopMember ID
  userId: string
  name: string | null
  email: string
  phone: string | null
  isActive: boolean
  createdAt: Date
  assignedCustomersCount: number
}

/**
 * Get all debt collectors for a shop
 */
export async function getDebtCollectors(shopSlug: string): Promise<DebtCollectorData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const members = await prisma.shopMember.findMany({
    where: {
      shopId: shop.id,
      role: "DEBT_COLLECTOR",
    },
    include: {
      user: true,
      _count: {
        select: { assignedCustomers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    phone: null, // Could add phone to User model later
    isActive: m.isActive,
    createdAt: m.createdAt,
    assignedCustomersCount: m._count.assignedCustomers,
  }))
}

/**
 * Create a new debt collector
 */
export async function createDebtCollector(
  shopSlug: string,
  payload: DebtCollectorPayload
): Promise<ActionResult> {
  try {
    const { user: adminUser, shop } = await requireShopAdminForShop(shopSlug)

    // Validation
    if (!payload.name || payload.name.trim().length === 0) {
      return { success: false, error: "Name is required" }
    }

    if (!payload.email || !payload.email.includes("@")) {
      return { success: false, error: "Valid email is required" }
    }

    if (!payload.password || payload.password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" }
    }

    const normalizedEmail = payload.email.toLowerCase().trim()

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      // Check if already a member of this shop
      const existingMember = await prisma.shopMember.findFirst({
        where: { userId: existingUser.id, shopId: shop.id },
      })

      if (existingMember) {
        return { success: false, error: "This user is already a member of your shop" }
      }

      return { success: false, error: "A user with this email already exists" }
    }

    // Hash password and create user + membership
    const passwordHash = await bcrypt.hash(payload.password, 12)

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: payload.name.trim(),
        passwordHash,
        role: "DEBT_COLLECTOR",
        memberships: {
          create: {
            shopId: shop.id,
            role: "DEBT_COLLECTOR",
            isActive: true,
            canSellProducts: payload.canSellProducts ?? false,
            canCreateCustomers: payload.canCreateCustomers ?? false,
          },
        },
      },
      include: {
        memberships: true,
      },
    })

    await createAuditLog({
      actorUserId: adminUser.id,
      action: "DEBT_COLLECTOR_CREATED",
      entityType: "User",
      entityId: newUser.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        collectorName: newUser.name,
        collectorEmail: newUser.email,
      },
    })

    // Get business details for email
    const business = await prisma.business.findUnique({
      where: { id: shop.businessId },
      select: { name: true, logoUrl: true },
    })

    // Send account creation email
    if (business) {
      await sendAccountCreationEmail({
        businessId: shop.businessId,
        recipientEmail: newUser.email,
        recipientName: payload.name.trim(),
        businessName: business.name,
        businessLogoUrl: business.logoUrl,
        accountEmail: newUser.email,
        temporaryPassword: payload.password,
        role: "DEBT_COLLECTOR",
        shopName: shop.name,
      })
    }

    revalidatePath(`/shop-admin/${shop.shopSlug}/collectors`)

    return {
      success: true,
      data: {
        id: newUser.memberships[0]?.id,
        name: newUser.name,
        email: newUser.email,
      },
    }
  } catch (error) {
    console.error("Error creating debt collector:", error)
    return { success: false, error: "Failed to create debt collector" }
  }
}

/**
 * Toggle debt collector active status
 */
export async function toggleDebtCollectorStatus(
  shopSlug: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { user: adminUser, shop } = await requireShopAdminForShop(shopSlug)

    const member = await prisma.shopMember.findFirst({
      where: { id: memberId, shopId: shop.id, role: "DEBT_COLLECTOR" },
      include: { user: true },
    })

    if (!member) {
      return { success: false, error: "Debt collector not found" }
    }

    const updated = await prisma.shopMember.update({
      where: { id: memberId },
      data: { isActive: !member.isActive },
    })

    await createAuditLog({
      actorUserId: adminUser.id,
      action: updated.isActive ? "DEBT_COLLECTOR_ACTIVATED" : "DEBT_COLLECTOR_DEACTIVATED",
      entityType: "ShopMember",
      entityId: memberId,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        collectorName: member.user.name,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/collectors`)

    return { success: true, data: { isActive: updated.isActive } }
  } catch (error) {
    console.error("Error toggling debt collector status:", error)
    return { success: false, error: "Failed to update status" }
  }
}

/**
 * Interface for collector's assigned customer data
 */
export interface CollectorAssignedCustomer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  address: string | null
  isActive: boolean
  activePurchases: number
  outstandingBalance: number
}

/**
 * Interface for collector's payment history
 */
export interface CollectorPaymentHistory {
  id: string
  amount: number
  paymentMethod: string
  status: string
  isConfirmed: boolean
  customerName: string
  customerPhone: string
  purchaseNumber: string
  paidAt: Date | null
  createdAt: Date
}

/**
 * Interface for comprehensive collector performance data
 */
export interface CollectorPerformanceData {
  // Summary stats
  totalCollected: number
  totalPending: number
  totalProductsSold: number
  totalPaymentsCount: number
  confirmedPaymentsCount: number
  pendingPaymentsCount: number
  // Assigned customers
  assignedCustomers: CollectorAssignedCustomer[]
  // Payment history
  paymentHistory: CollectorPaymentHistory[]
}

/**
 * Get comprehensive performance data for a specific debt collector
 */
export async function getCollectorPerformanceData(
  shopSlug: string,
  collectorId: string
): Promise<{ success: boolean; data?: CollectorPerformanceData; error?: string }> {
  try {
    const { shop } = await requireShopAdminForShop(shopSlug)

    // Verify the collector belongs to this shop
    const collector = await prisma.shopMember.findFirst({
      where: {
        id: collectorId,
        shopId: shop.id,
        role: "DEBT_COLLECTOR",
      },
    })

    if (!collector) {
      return { success: false, error: "Collector not found" }
    }

    // Get all payments made by this collector
    const payments = await prisma.payment.findMany({
      where: {
        collectorId: collectorId,
        purchase: { customer: { shopId: shop.id } },
      },
      include: {
        purchase: {
          include: {
            customer: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Get assigned customers with their purchase data
    const customers = await prisma.customer.findMany({
      where: {
        assignedCollectorId: collectorId,
        shopId: shop.id,
      },
      include: {
        purchases: {
          where: { status: { in: ["ACTIVE", "OVERDUE"] } },
          select: {
            id: true,
            outstandingBalance: true,
          },
        },
      },
      orderBy: { firstName: "asc" },
    })

    // Calculate stats
    const confirmedPayments = payments.filter(p => p.isConfirmed && p.status === "COMPLETED")
    const pendingPayments = payments.filter(p => !p.isConfirmed || p.status === "PENDING")

    const totalCollected = confirmedPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )
    const totalPending = pendingPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )

    // Count products sold (from purchases with confirmed payments by this collector)
    const purchaseIdsWithConfirmedPayments = new Set(
      confirmedPayments.map(p => p.purchaseId)
    )
    const totalProductsSold = payments
      .filter(p => purchaseIdsWithConfirmedPayments.has(p.purchaseId))
      .reduce((sum, p) => {
        // Count items in the purchase (only count once per unique purchase)
        return sum
      }, 0)

    // Get unique purchases with confirmed payments and count their items
    const uniquePurchasesWithItems = new Map<string, number>()
    for (const payment of confirmedPayments) {
      if (!uniquePurchasesWithItems.has(payment.purchaseId)) {
        uniquePurchasesWithItems.set(
          payment.purchaseId,
          payment.purchase.items.reduce((sum, item) => sum + item.quantity, 0)
        )
      }
    }
    const productsSoldCount = Array.from(uniquePurchasesWithItems.values()).reduce(
      (sum, qty) => sum + qty,
      0
    )

    // Map assigned customers
    const assignedCustomers: CollectorAssignedCustomer[] = customers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      isActive: c.isActive,
      activePurchases: c.purchases.length,
      outstandingBalance: c.purchases.reduce(
        (sum, p) => sum + Number(p.outstandingBalance),
        0
      ),
    }))

    // Map payment history
    const paymentHistory: CollectorPaymentHistory[] = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      status: p.status,
      isConfirmed: p.isConfirmed,
      customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
      customerPhone: p.purchase.customer.phone,
      purchaseNumber: p.purchase.purchaseNumber,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }))

    return {
      success: true,
      data: {
        totalCollected,
        totalPending,
        totalProductsSold: productsSoldCount,
        totalPaymentsCount: payments.length,
        confirmedPaymentsCount: confirmedPayments.length,
        pendingPaymentsCount: pendingPayments.length,
        assignedCustomers,
        paymentHistory,
      },
    }
  } catch (error) {
    console.error("Error getting collector performance data:", error)
    return { success: false, error: "Failed to load performance data" }
  }
}

/**
 * Delete a debt collector (removes membership, not user)
 */
export async function deleteDebtCollector(
  shopSlug: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { user: adminUser, shop } = await requireShopAdminForShop(shopSlug)

    const member = await prisma.shopMember.findFirst({
      where: { id: memberId, shopId: shop.id, role: "DEBT_COLLECTOR" },
      include: { user: true, _count: { select: { assignedCustomers: true } } },
    })

    if (!member) {
      return { success: false, error: "Debt collector not found" }
    }

    if (member._count.assignedCustomers > 0) {
      return { 
        success: false, 
        error: `Cannot delete: ${member._count.assignedCustomers} customers are assigned to this collector. Reassign them first.` 
      }
    }

    await prisma.shopMember.delete({
      where: { id: memberId },
    })

    await createAuditLog({
      actorUserId: adminUser.id,
      action: "DEBT_COLLECTOR_REMOVED",
      entityType: "ShopMember",
      entityId: memberId,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        collectorName: member.user.name,
        collectorEmail: member.user.email,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/collectors`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting debt collector:", error)
    return { success: false, error: "Failed to delete debt collector" }
  }
}

// ============================================
// SALES STAFF ACTIONS
// ============================================

export interface SalesStaffPayload {
  name: string
  email: string
  password: string
}

export interface SalesStaffData {
  id: string          // ShopMember ID
  userId: string
  name: string | null
  email: string
  isActive: boolean
  createdAt: Date
}

/**
 * Get all sales staff for a shop
 */
export async function getSalesStaff(shopSlug: string): Promise<SalesStaffData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const members = await prisma.shopMember.findMany({
    where: {
      shopId: shop.id,
      role: "SALES_STAFF",
    },
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    isActive: m.isActive,
    createdAt: m.createdAt,
  }))
}

/**
 * Create a new sales staff member
 */
export async function createSalesStaff(
  shopSlug: string,
  payload: SalesStaffPayload
): Promise<ActionResult> {
  try {
    const { user: adminUser, shop } = await requireShopAdminForShop(shopSlug)

    // Validation
    if (!payload.name || payload.name.trim().length === 0) {
      return { success: false, error: "Name is required" }
    }

    if (!payload.email || !payload.email.includes("@")) {
      return { success: false, error: "Valid email is required" }
    }

    if (!payload.password || payload.password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" }
    }

    const normalizedEmail = payload.email.toLowerCase().trim()

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      // Check if already a member of this shop
      const existingMember = await prisma.shopMember.findFirst({
        where: { userId: existingUser.id, shopId: shop.id },
      })

      if (existingMember) {
        return { success: false, error: "This user is already a member of your shop" }
      }

      return { success: false, error: "A user with this email already exists" }
    }

    // Hash password and create user + membership
    const passwordHash = await bcrypt.hash(payload.password, 12)

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: payload.name.trim(),
        passwordHash,
        role: "SALES_STAFF",
        memberships: {
          create: {
            shopId: shop.id,
            role: "SALES_STAFF",
            isActive: true,
          },
        },
      },
      include: {
        memberships: true,
      },
    })

    await createAuditLog({
      actorUserId: adminUser.id,
      action: "SALES_STAFF_CREATED",
      entityType: "User",
      entityId: newUser.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        staffName: newUser.name,
        staffEmail: newUser.email,
      },
    })

    // Get business details for email
    const business = await prisma.business.findUnique({
      where: { id: shop.businessId },
      select: { name: true, logoUrl: true },
    })

    // Send account creation email
    if (business) {
      await sendAccountCreationEmail({
        businessId: shop.businessId,
        recipientEmail: newUser.email,
        recipientName: payload.name.trim(),
        businessName: business.name,
        businessLogoUrl: business.logoUrl,
        accountEmail: newUser.email,
        temporaryPassword: payload.password,
        role: "SALES_STAFF",
        shopName: shop.name,
      })
    }

    revalidatePath(`/shop-admin/${shop.shopSlug}/staff`)

    return {
      success: true,
      data: {
        id: newUser.memberships[0]?.id,
        name: newUser.name,
        email: newUser.email,
      },
    }
  } catch (error) {
    console.error("Error creating sales staff:", error)
    return { success: false, error: "Failed to create sales staff" }
  }
}

/**
 * Toggle sales staff active status
 */
export async function toggleSalesStaffStatus(
  shopSlug: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { user: adminUser, shop } = await requireShopAdminForShop(shopSlug)

    const member = await prisma.shopMember.findFirst({
      where: { id: memberId, shopId: shop.id, role: "SALES_STAFF" },
      include: { user: true },
    })

    if (!member) {
      return { success: false, error: "Sales staff not found" }
    }

    const updated = await prisma.shopMember.update({
      where: { id: memberId },
      data: { isActive: !member.isActive },
    })

    await createAuditLog({
      actorUserId: adminUser.id,
      action: updated.isActive ? "SALES_STAFF_ACTIVATED" : "SALES_STAFF_DEACTIVATED",
      entityType: "ShopMember",
      entityId: memberId,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        staffName: member.user.name,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/staff`)

    return { success: true, data: { isActive: updated.isActive } }
  } catch (error) {
    console.error("Error toggling sales staff status:", error)
    return { success: false, error: "Failed to update status" }
  }
}

/**
 * Delete a sales staff member (removes membership, not user)
 */
export async function deleteSalesStaff(
  shopSlug: string,
  memberId: string
): Promise<ActionResult> {
  try {
    const { user: adminUser, shop } = await requireShopAdminForShop(shopSlug)

    const member = await prisma.shopMember.findFirst({
      where: { id: memberId, shopId: shop.id, role: "SALES_STAFF" },
      include: { user: true },
    })

    if (!member) {
      return { success: false, error: "Sales staff not found" }
    }

    await prisma.shopMember.delete({
      where: { id: memberId },
    })

    await createAuditLog({
      actorUserId: adminUser.id,
      action: "SALES_STAFF_REMOVED",
      entityType: "ShopMember",
      entityId: memberId,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        staffName: member.user.name,
        staffEmail: member.user.email,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/staff`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting sales staff:", error)
    return { success: false, error: "Failed to delete sales staff" }
  }
}

// ============================================
// CUSTOMER ACTIONS
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
  assignedCollectorId?: string | null
  notes?: string | null
  // Customer portal account fields
  createAccount?: boolean
  accountEmail?: string
  accountPassword?: string
}

export interface CustomerData {
  id: string
  shopId: string
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
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all customers for a shop
 */
export async function getCustomers(shopSlug: string): Promise<CustomerData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    include: {
      assignedCollector: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return customers.map((c) => ({
    id: c.id,
    shopId: c.shopId,
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
    notes: c.notes,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }))
}

/**
 * Create a new customer
 */
export async function createCustomer(
  shopSlug: string,
  payload: CustomerPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Validation
    if (!payload.firstName || payload.firstName.trim().length === 0) {
      return { success: false, error: "First name is required" }
    }

    if (!payload.lastName || payload.lastName.trim().length === 0) {
      return { success: false, error: "Last name is required" }
    }

    if (!payload.phone || payload.phone.trim().length === 0) {
      return { success: false, error: "Phone number is required" }
    }

    // Normalize phone
    const normalizedPhone = payload.phone.trim().replace(/\s+/g, "")

    // Check for duplicate phone in this shop
    const existingCustomer = await prisma.customer.findFirst({
      where: { shopId: shop.id, phone: normalizedPhone },
    })

    if (existingCustomer) {
      return { success: false, error: "A customer with this phone number already exists" }
    }

    // Validate assigned collector if provided
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
        return { success: false, error: "Invalid debt collector selected" }
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
        phone: normalizedPhone,
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
        notes: payload.notes?.trim() || null,
        isActive: true,
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
        customerPhone: customer.phone,
        hasAccount: !!userAccount,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/customers`)

    return {
      success: true,
      data: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        hasAccount: !!userAccount,
      },
    }
  } catch (error) {
    console.error("Error creating customer:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

/**
 * Update a customer
 */
export async function updateCustomer(
  shopSlug: string,
  customerId: string,
  payload: Partial<CustomerPayload>
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId, shopId: shop.id },
    })

    if (!existingCustomer) {
      return { success: false, error: "Customer not found" }
    }

    // Check for phone duplicates if phone is being changed
    if (payload.phone && payload.phone !== existingCustomer.phone) {
      const normalizedPhone = payload.phone.trim().replace(/\s+/g, "")
      const duplicate = await prisma.customer.findFirst({
        where: { shopId: shop.id, phone: normalizedPhone, id: { not: customerId } },
      })
      if (duplicate) {
        return { success: false, error: "A customer with this phone number already exists" }
      }
    }

    // Validate assigned collector if provided
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
        ...(payload.preferredPayment !== undefined && { preferredPayment: payload.preferredPayment }),
        ...(payload.assignedCollectorId !== undefined && { assignedCollectorId: payload.assignedCollectorId || null }),
        ...(payload.notes !== undefined && { notes: payload.notes?.trim() || null }),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: customer.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
        changes: payload,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/customers`)

    return { success: true, data: { id: customer.id } }
  } catch (error) {
    console.error("Error updating customer:", error)
    return { success: false, error: "Failed to update customer" }
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(
  shopSlug: string,
  customerId: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    await prisma.customer.delete({
      where: { id: customerId },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CUSTOMER_DELETED",
      entityType: "Customer",
      entityId: customerId,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/customers`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting customer:", error)
    return { success: false, error: "Failed to delete customer" }
  }
}

/**
 * Toggle customer active status
 */
export async function toggleCustomerStatus(
  shopSlug: string,
  customerId: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: !customer.isActive },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: updated.isActive ? "CUSTOMER_ACTIVATED" : "CUSTOMER_DEACTIVATED",
      entityType: "Customer",
      entityId: customerId,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        customerName: `${customer.firstName} ${customer.lastName}`,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/customers`)

    return { success: true, data: { isActive: updated.isActive } }
  } catch (error) {
    console.error("Error toggling customer status:", error)
    return { success: false, error: "Failed to update customer status" }
  }
}

// ==========================================
// PURCHASE ACTIONS
// ==========================================

export interface PurchaseItemPayload {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export type PurchaseTypeOption = "CASH" | "LAYAWAY" | "CREDIT"

export interface PurchasePayload {
  customerId: string
  items: PurchaseItemPayload[]
  downPayment?: number
  installments: number // Number of payment installments
  notes?: string
  useWalletAmount?: number // Amount to use from customer's wallet
  purchaseType?: PurchaseTypeOption // CASH = full payment + delivered, LAYAWAY/CREDIT = installments
}

export interface PurchaseData {
  id: string
  purchaseNumber: string
  customerId: string
  customerName: string
  status: PurchaseStatus
  purchaseType: PurchaseType
  subtotal: number
  interestAmount: number
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  downPayment: number
  installments: number
  startDate: Date
  dueDate: Date
  interestType: InterestType
  interestRate: number
  notes: string | null
  createdAt: Date
  items: {
    id: string
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  payments: {
    id: string
    amount: number
    paymentMethod: PaymentMethod
    status: PaymentStatus
    paidAt: Date | null
    reference: string | null
    isConfirmed: boolean
    rejectedAt: Date | null
    rejectionReason: string | null
  }[]
}

/**
 * Generate next purchase number for a shop
 */
async function generatePurchaseNumber(customerId: string): Promise<string> {
  const count = await prisma.purchase.count({
    where: { customerId },
  })
  return `HP-${String(count + 1).padStart(4, "0")}`
}

/**
 * Get all purchases for a customer
 */
export async function getCustomerPurchases(
  shopSlug: string,
  customerId: string
): Promise<PurchaseData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  // Verify customer belongs to shop
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId: shop.id },
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
    purchaseType: p.purchaseType,
    subtotal: Number(p.subtotal),
    interestAmount: Number(p.interestAmount),
    totalAmount: Number(p.totalAmount),
    amountPaid: Number(p.amountPaid),
    outstandingBalance: Number(p.outstandingBalance),
    downPayment: Number(p.downPayment),
    installments: p.installments,
    startDate: p.startDate,
    dueDate: p.dueDate,
    interestType: p.interestType,
    interestRate: Number(p.interestRate),
    notes: p.notes,
    createdAt: p.createdAt,
    items: p.items.map((item) => ({
      id: item.id,
      productId: item.productId,
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
      isConfirmed: pay.isConfirmed,
      rejectedAt: pay.rejectedAt,
      rejectionReason: pay.rejectionReason,
    })),
  }))
}

/**
 * Get all purchases for a shop with customer info
 */
export async function getAllPurchases(shopSlug: string): Promise<PurchaseData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: shop.id },
    },
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
    purchaseType: p.purchaseType,
    subtotal: Number(p.subtotal),
    interestAmount: Number(p.interestAmount),
    totalAmount: Number(p.totalAmount),
    amountPaid: Number(p.amountPaid),
    outstandingBalance: Number(p.outstandingBalance),
    downPayment: Number(p.downPayment),
    installments: p.installments,
    startDate: p.startDate,
    dueDate: p.dueDate,
    interestType: p.interestType,
    interestRate: Number(p.interestRate),
    notes: p.notes,
    createdAt: p.createdAt,
    items: p.items.map((item) => ({
      id: item.id,
      productId: item.productId,
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
      isConfirmed: pay.isConfirmed,
      rejectedAt: pay.rejectedAt,
      rejectionReason: pay.rejectionReason,
    })),
  }))
}

/**
 * Create a new purchase for a customer
 */
export async function createPurchase(
  shopSlug: string,
  payload: PurchasePayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Validate customer belongs to shop
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    if (payload.items.length === 0) {
      return { success: false, error: "At least one item is required" }
    }

    // Get business policy for interest calculation (optional - use defaults if not configured)
    const policy = await prisma.businessPolicy.findFirst({
      where: { 
        business: { 
          shops: { some: { id: shop.id } } 
        } 
      },
    })

    // Default policy values if no policy is configured
    const defaultPolicy = {
      interestRate: 0,
      interestType: "FLAT" as const,
      maxTenorDays: 60,
      graceDays: 3,
    }

    // Calculate subtotal
    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )

    // Calculate interest based on policy (use defaults if no policy)
    let interestAmount = 0
    const interestRate = policy ? Number(policy.interestRate) : defaultPolicy.interestRate
    const interestType = policy?.interestType || defaultPolicy.interestType

    if (interestRate > 0) {
      if (interestType === "FLAT") {
        // Flat interest: one-time percentage
        interestAmount = subtotal * (interestRate / 100)
      } else {
        // Monthly interest: simple calculation based on installments
        const months = Math.ceil(payload.installments / 4) // Assuming weekly payments
        interestAmount = subtotal * (interestRate / 100) * months
      }
    }

    const totalAmount = subtotal + interestAmount
    const walletAmountToUse = payload.useWalletAmount || 0
    
    // Validate wallet balance if using wallet
    if (walletAmountToUse > 0) {
      if (walletAmountToUse > Number(customer.walletBalance || 0)) {
        return { success: false, error: "Insufficient wallet balance" }
      }
      if (walletAmountToUse > totalAmount) {
        return { success: false, error: "Wallet amount cannot exceed total amount" }
      }
    }
    
    const downPayment = (payload.downPayment || 0) + walletAmountToUse
    const outstandingBalance = totalAmount - downPayment

    // Calculate due date based on policy maxTenorDays (use default if no policy)
    const maxDays = policy?.maxTenorDays || defaultPolicy.maxTenorDays
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + maxDays)

    const purchaseNumber = await generatePurchaseNumber(customer.id)

    // Validate stock availability for all items (check ShopProduct for shop-specific stock)
    for (const item of payload.items) {
      const shopProduct = await prisma.shopProduct.findFirst({
        where: { 
          shopId: shop.id,
          productId: item.productId 
        },
        include: { product: { select: { name: true } } },
      })
      
      // Fall back to Product table if no ShopProduct exists
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

    // Determine purchase type and status
    const purchaseType = payload.purchaseType || "CREDIT"
    const isCashPurchase = purchaseType === "CASH"
    
    // For CASH purchases: full payment, completed status, delivered immediately
    // For LAYAWAY/CREDIT: normal installment flow
    const purchaseStatus = isCashPurchase ? "COMPLETED" : (downPayment > 0 ? "ACTIVE" : "PENDING")
    const deliveryStatus = isCashPurchase ? "DELIVERED" : "PENDING"
    const finalAmountPaid = isCashPurchase ? totalAmount : downPayment
    const finalOutstanding = isCashPurchase ? 0 : outstandingBalance

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        customerId: customer.id,
        status: purchaseStatus,
        purchaseType,
        subtotal,
        interestAmount,
        totalAmount,
        amountPaid: finalAmountPaid,
        outstandingBalance: finalOutstanding,
        downPayment: isCashPurchase ? totalAmount : downPayment,
        installments: isCashPurchase ? 1 : payload.installments,
        startDate: new Date(),
        dueDate,
        interestType,
        interestRate,
        deliveryStatus,
        deliveredAt: isCashPurchase ? new Date() : null,
        notes: payload.notes,
        items: {
          create: payload.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
    })

    // For CASH purchases, deduct stock immediately since it's paid and delivered
    if (isCashPurchase) {
      for (const item of payload.items) {
        // Try to deduct from ShopProduct first
        const shopProduct = await prisma.shopProduct.findFirst({
          where: { shopId: shop.id, productId: item.productId },
        })
        
        if (shopProduct) {
          await prisma.shopProduct.update({
            where: { id: shopProduct.id },
            data: { stockQuantity: { decrement: item.quantity } },
          })
        } else {
          // Fall back to Product table
          await prisma.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } },
          })
        }
      }

      // Create full payment record for CASH purchase
      const cashAmount = totalAmount - walletAmountToUse
      if (cashAmount > 0) {
        await prisma.payment.create({
          data: {
            purchaseId: purchase.id,
            amount: cashAmount,
            paymentMethod: "CASH",
            status: "COMPLETED",
            isConfirmed: true,
            confirmedAt: new Date(),
            paidAt: new Date(),
            notes: "Full cash payment",
          },
        })
      }
    }

    // Stock deduction for non-CASH purchases is deferred until payment is completed
    // This ensures stock is only deducted when customer fully pays (waybill + delivery)

    // Handle wallet deduction if using wallet
    if (walletAmountToUse > 0) {
      // Deduct from customer wallet
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          walletBalance: {
            decrement: walletAmountToUse,
          },
        },
      })

      // Create wallet transaction record
      await prisma.walletTransaction.create({
        data: {
          customerId: customer.id,
          shopId: shop.id,
          type: "PURCHASE",
          amount: walletAmountToUse,
          balanceBefore: Number(customer.walletBalance || 0),
          balanceAfter: Number(customer.walletBalance || 0) - walletAmountToUse,
          status: "CONFIRMED",
          description: `Purchase payment for ${purchaseNumber}`,
          reference: purchaseNumber,
          confirmedAt: new Date(),
        },
      })

      // Record wallet payment
      await prisma.payment.create({
        data: {
          purchaseId: purchase.id,
          amount: walletAmountToUse,
          paymentMethod: "WALLET",
          status: "COMPLETED",
          isConfirmed: true,
          confirmedAt: new Date(),
          paidAt: new Date(),
          notes: "Payment from wallet",
        },
      })
    }

    // If cash down payment was made (separate from wallet), record it
    // Skip for CASH purchases since full payment is already recorded above
    const cashDownPayment = payload.downPayment || 0
    if (cashDownPayment > 0 && !isCashPurchase) {
      await prisma.payment.create({
        data: {
          purchaseId: purchase.id,
          amount: cashDownPayment,
          paymentMethod: "CASH", // Default for in-store down payments
          status: "COMPLETED",
          isConfirmed: true,
          confirmedAt: new Date(),
          paidAt: new Date(),
          notes: "Down payment (cash)",
        },
      })
    }

    // For LAYAWAY/CREDIT purchases, debit the total amount from wallet (as debt)
    // This creates a negative wallet balance representing what the customer owes
    if (!isCashPurchase && finalOutstanding > 0) {
      const currentWalletBalance = Number(customer.walletBalance || 0)
      const newWalletBalance = currentWalletBalance - finalOutstanding
      
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
          amount: finalOutstanding,
          balanceBefore: currentWalletBalance,
          balanceAfter: newWalletBalance,
          status: "CONFIRMED",
          description: `${purchaseType} purchase debt for ${purchaseNumber}`,
          reference: purchaseNumber,
          confirmedAt: new Date(),
        },
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "PURCHASE_CREATED",
      entityType: "Purchase",
      entityId: purchase.id,
      metadata: {
        purchaseNumber,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        totalAmount,
        itemsWithStock: payload.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      },
    })

    // Get shop payment configuration for invoice
    const shopWithPayment = await prisma.shop.findUnique({
      where: { id: shop.id },
      include: { business: true },
    })

    // Generate invoice number
    const invoiceCount = await prisma.purchase.count()
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(5, "0")}`

    const invoiceData = {
      invoiceNumber,
      purchaseNumber,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: customer.address,
      shopName: shop.name,
      businessName: shopWithPayment?.business?.name || shop.name,
      purchaseType: purchaseType as "CASH" | "LAYAWAY" | "CREDIT",
      items: payload.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
      })),
      subtotal,
      interestAmount: isCashPurchase ? 0 : interestAmount,
      totalAmount,
      downPayment: isCashPurchase ? totalAmount : downPayment,
      amountPaid: finalAmountPaid,
      outstandingBalance: finalOutstanding,
      installments: isCashPurchase ? 1 : payload.installments,
      dueDate: dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      purchaseDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      bankName: shopWithPayment?.bankName,
      bankAccountName: shopWithPayment?.bankAccountName,
      bankAccountNumber: shopWithPayment?.bankAccountNumber,
      mobileMoneyProvider: shopWithPayment?.mobileMoneyProvider,
      mobileMoneyName: shopWithPayment?.mobileMoneyName,
      mobileMoneyNumber: shopWithPayment?.mobileMoneyNumber,
    }

    // Send purchase invoice email to customer if they have an email
    if (customer.email) {
      try {
        await sendPurchaseInvoice({
          businessId: shop.businessId,
          customerEmail: customer.email, // Non-null here due to if check
          invoiceNumber: invoiceData.invoiceNumber,
          customerName: invoiceData.customerName,
          customerPhone: invoiceData.customerPhone,
          shopName: invoiceData.shopName,
          businessName: invoiceData.businessName,
          purchaseNumber: invoiceData.purchaseNumber,
          purchaseType: invoiceData.purchaseType,
          items: invoiceData.items,
          subtotal: invoiceData.subtotal,
          interestAmount: invoiceData.interestAmount,
          totalAmount: invoiceData.totalAmount,
          downPayment: invoiceData.downPayment,
          outstandingBalance: invoiceData.outstandingBalance,
          installments: invoiceData.installments,
          dueDate: invoiceData.dueDate,
          purchaseDate: invoiceData.purchaseDate,
          bankName: invoiceData.bankName,
          bankAccountName: invoiceData.bankAccountName,
          bankAccountNumber: invoiceData.bankAccountNumber,
          mobileMoneyProvider: invoiceData.mobileMoneyProvider,
          mobileMoneyName: invoiceData.mobileMoneyName,
          mobileMoneyNumber: invoiceData.mobileMoneyNumber,
        })
      } catch (emailError) {
        console.error("Failed to send purchase invoice email:", emailError)
        // Don't fail the purchase if email fails
      }
    }

    // Send in-app message with invoice PDF to customer
    try {
      const invoicePdfBase64 = await generateInvoicePDF(invoiceData)
      await sendPurchaseInvoiceMessage({
        customerId: customer.id,
        staffUserId: user.id,
        businessId: shop.businessId,
        shopId: shop.id,
        invoicePdfBase64,
        purchaseNumber,
        totalAmount,
        outstandingBalance,
      })
    } catch (msgError) {
      console.error("Failed to send in-app invoice message:", msgError)
      // Don't fail the purchase if messaging fails
    }

    revalidatePath(`/shop-admin/${shopSlug}/customers`)
    revalidatePath(`/shop-admin/${shopSlug}/purchases`)
    revalidatePath(`/shop-admin/${shopSlug}/products`) // Refresh products to show updated stock

    return { success: true, data: { purchaseId: purchase.id, purchaseNumber } }
  } catch (error) {
    console.error("Error creating purchase:", error)
    return { success: false, error: "Failed to create purchase" }
  }
}

/**
 * Update purchase items (change products for layaway/credit purchases)
 */
export interface UpdatePurchaseItemsPayload {
  items: PurchaseItemPayload[]
}

export async function updatePurchaseItems(
  shopSlug: string,
  purchaseId: string,
  payload: UpdatePurchaseItemsPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Get purchase and verify it belongs to this shop
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: { shopId: shop.id },
      },
      include: {
        customer: true,
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

    // Validate stock availability for new items
    for (const item of payload.items) {
      const shopProduct = await prisma.shopProduct.findFirst({
        where: { 
          shopId: shop.id,
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
      where: { 
        business: { 
          shops: { some: { id: shop.id } } 
        } 
      },
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
        oldItems: purchase.items.map(i => ({ productName: i.productName, quantity: i.quantity })),
        newItems: payload.items.map(i => ({ productName: i.productName, quantity: i.quantity })),
        oldTotal: Number(purchase.totalAmount),
        newTotal: totalAmount,
      },
    })

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

// ==========================================
// PAYMENT ACTIONS
// ==========================================

export interface PaymentPayload {
  purchaseId: string
  amount: number
  paymentMethod: PaymentMethod
  collectorId?: string
  reference?: string
  notes?: string
  autoConfirm?: boolean // If true, payment is immediately confirmed. Default false for pending workflow.
}

/**
 * Record a payment for a purchase (creates pending payment for confirmation workflow)
 */
export async function recordPayment(
  shopSlug: string,
  payload: PaymentPayload
): Promise<ActionResult> {
  try {
    const { user, shop, membership } = await requireShopAdminForShop(shopSlug)

    // Get purchase and verify it belongs to this shop's customer
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: payload.purchaseId,
        customer: { shopId: shop.id },
      },
      include: { customer: true },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
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

    // For wallet payments, verify and deduct balance
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
            shopId: shop.id,
            type: "PURCHASE",
            amount: payload.amount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            description: `Payment for purchase ${purchase.purchaseNumber}`,
            reference: payload.reference || `PAY-${purchase.purchaseNumber}`,
            paymentMethod: "WALLET",
            status: "CONFIRMED",
            createdById: membership?.id || null,
            confirmedById: membership?.id || null,
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
          notes: `${payload.notes || ""} [Recorded by Shop Admin: ${user.name}]${isWalletPayment ? " [Wallet Payment]" : ""}`.trim(),
          isConfirmed: autoConfirm,
          confirmedAt: autoConfirm ? new Date() : null,
          confirmedById: autoConfirm ? membership?.id : null,
        },
      })

      // Update purchase totals if auto-confirming
      if (autoConfirm) {
        const newAmountPaid = Number(purchase.amountPaid) + payload.amount
        const newOutstanding = Number(purchase.totalAmount) - newAmountPaid
        let newStatus: PurchaseStatus = "ACTIVE"
        if (newOutstanding <= 0) {
          newStatus = "COMPLETED"
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
        recordedBy: user.name,
        awaitingConfirmation: !autoConfirm,
        isWalletPayment,
      },
    })

    // Send in-app message to customer about the pending payment (only for non-wallet, non-auto-confirm)
    if (!autoConfirm) {
      try {
        // Get collector name if available
        let collectorName: string | null = null
        if (payload.collectorId) {
          const collector = await prisma.shopMember.findUnique({
            where: { id: payload.collectorId },
            include: { user: true },
          })
          collectorName = collector?.user?.name || null
        }

        await sendPendingPaymentMessage({
          customerId: purchase.customerId,
          staffUserId: user.id,
          businessId: shop.businessId,
          shopId: shop.id,
          purchaseNumber: purchase.purchaseNumber,
          paymentAmount: payload.amount,
          paymentMethod: payload.paymentMethod,
          reference: payload.reference,
          collectorName: collectorName || user.name,
        })
      } catch (msgError) {
        console.error("Failed to send pending payment message:", msgError)
        // Don't fail the payment if messaging fails
      }
    }

    revalidatePath(`/shop-admin/${shopSlug}/customers`)
    revalidatePath(`/shop-admin/${shopSlug}/purchases`)
    revalidatePath(`/shop-admin/${shopSlug}/pending-payments`)

    return {
      success: true,
      data: {
        paymentId: result.id,
        awaitingConfirmation: !autoConfirm,
        isWalletPayment,
      },
    }
  } catch (error) {
    console.error("Error recording payment:", error)
    return { success: false, error: "Failed to record payment" }
  }
}

/**
 * Get customer summary with purchase stats
 */
export interface CustomerSummary {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  isActive: boolean
  totalPurchases: number
  activePurchases: number
  totalOwed: number
  totalPaid: number
  assignedCollectorName: string | null
  walletBalance: number
}

export async function getCustomersWithSummary(shopSlug: string): Promise<CustomerSummary[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    include: {
      assignedCollector: {
        include: { user: true },
      },
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

  return customers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    isActive: c.isActive,
    totalPurchases: c.purchases.length,
    activePurchases: c.purchases.filter((p) => p.status === "ACTIVE" || p.status === "PENDING").length,
    totalOwed: c.purchases.reduce((sum, p) => sum + Number(p.outstandingBalance), 0),
    totalPaid: c.purchases.reduce((sum, p) => sum + Number(p.amountPaid), 0),
    assignedCollectorName: c.assignedCollector?.user.name || null,
    walletBalance: Number(c.walletBalance || 0),
  }))
}

// ============================================================================
// CATEGORY ACTIONS
// ============================================================================

export interface CategoryPayload {
  name: string
  description?: string
  color?: string
}

export interface CategoryData {
  id: string
  name: string
  description: string | null
  color: string | null
  productCount: number
  isActive: boolean
  createdAt: Date
}

/**
 * Get all categories for a shop (from business level)
 * Categories are now managed at the business level, so we fetch categories
 * from the shop's parent business
 */
export async function getShopCategories(shopSlug: string): Promise<CategoryData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const categories = await prisma.category.findMany({
    where: { businessId: shop.businessId },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    color: c.color,
    productCount: c._count.products,
    isActive: c.isActive,
    createdAt: c.createdAt,
  }))
}

// ============================================
// PAYMENT MANAGEMENT (ALL PAYMENTS)
// ============================================

export interface PaymentForAdmin {
  id: string
  amount: number
  paymentMethod: PaymentMethod
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
  rejectedAt: Date | null
  rejectionReason: string | null
}

/**
 * Get all payments for shop with optional date filtering
 */
export async function getAllShopPayments(
  shopSlug: string,
  filters?: {
    status?: "pending" | "confirmed" | "rejected" | "all"
    startDate?: Date
    endDate?: Date
  }
): Promise<PaymentForAdmin[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const whereClause: Prisma.PaymentWhereInput = {
    purchase: {
      customer: {
        shopId: shop.id,
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
      // Include the entire end date
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
          customer: true,
        },
      },
      collector: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500, // Limit for performance
  })

  return payments.map((p) => ({
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
    rejectedAt: p.rejectedAt,
    rejectionReason: p.rejectionReason,
  }))
}

/**
 * Get payment stats with date range
 */
export async function getPaymentStats(
  shopSlug: string,
  startDate?: Date,
  endDate?: Date
) {
  const { shop } = await requireShopAdminForShop(shopSlug)

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
    purchase: { customer: { shopId: shop.id } },
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

// ============================================
// PAYMENT CONFIRMATION (COLLECTED BY DEBT COLLECTORS)
// ============================================

export interface PendingPaymentForAdmin {
  id: string
  amount: number
  paymentMethod: PaymentMethod
  reference: string | null
  notes: string | null
  paidAt: Date | null
  createdAt: Date
  purchaseId: string
  purchaseNumber: string
  customerName: string
  customerId: string
  collectorName: string
  collectorId: string
  recordedBy: string // Extracted from notes: "[Recorded by: Name]"
}

/**
 * Get all pending payments awaiting confirmation
 * Includes payments from collectors, shop admins, and business admins
 */
export async function getPendingCollectorPayments(shopSlug: string): Promise<PendingPaymentForAdmin[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const payments = await prisma.payment.findMany({
    where: {
      isConfirmed: false,
      rejectedAt: null,
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
      collector: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Helper to extract "Recorded by" from notes
  const extractRecordedBy = (notes: string | null): string => {
    if (!notes) return "Collector"
    const match = notes.match(/\[Recorded by (?:Shop Admin|Business Admin|Collector): ([^\]]+)\]/)
    if (match) return match[1]
    return "Collector"
  }

  return payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    notes: p.notes,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    purchaseId: p.purchaseId,
    purchaseNumber: p.purchase.purchaseNumber,
    customerName: `${p.purchase.customer.firstName} ${p.purchase.customer.lastName}`,
    customerId: p.purchase.customerId,
    collectorName: p.collector?.user?.name || extractRecordedBy(p.notes),
    collectorId: p.collectorId || "",
    recordedBy: extractRecordedBy(p.notes),
  }))
}

/**
 * Confirm a payment collected by a debt collector
 * This will update the customer's account balance
 */
export async function confirmPayment(
  shopSlug: string,
  paymentId: string
): Promise<ActionResult> {
  try {
    const { user, shop, membership } = await requireShopAdminForShop(shopSlug)

    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        purchase: {
          include: {
            customer: true,
            items: true, // Include items for stock deduction on completion
          },
        },
      },
    })

    if (!payment) {
      return { success: false, error: "Payment not found" }
    }

    // Verify payment belongs to this shop
    if (payment.purchase.customer.shopId !== shop.id) {
      return { success: false, error: "Payment not found in this shop" }
    }

    if (payment.isConfirmed) {
      return { success: false, error: "Payment already confirmed" }
    }

    if (payment.rejectedAt) {
      return { success: false, error: "Cannot confirm a rejected payment" }
    }

    // Get current shop member for confirmedById
    const shopMember = membership

    // Update the payment as confirmed
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        isConfirmed: true,
        confirmedAt: new Date(),
        confirmedById: shopMember?.id || null,
        status: "COMPLETED",
        notes: payment.notes 
          ? `${payment.notes} | Confirmed by: ${user.name}` 
          : `Confirmed by: ${user.name}`,
      },
    })

    // Update purchase totals - NOW the balance is updated
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
        shopId: shop.id,
        type: "DEPOSIT",
        amount: paymentAmount,
        balanceBefore: currentWalletBalance,
        balanceAfter: newWalletBalance,
        status: "CONFIRMED",
        description: `Payment confirmed for ${purchase.purchaseNumber}`,
        reference: purchase.purchaseNumber,
        confirmedAt: new Date(),
        confirmedById: shopMember?.id || null,
      },
    })

    // Generate Receipt for this payment
    const year = new Date().getFullYear()
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const receiptNumber = `RCT-${year}-${timestamp}${random}`

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
        for (const item of purchase.items) {
          if (item.productId) {
            await prisma.shopProduct.updateMany({
              where: { 
                shopId: shop.id,
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

      // Check if waybill already exists
      const existingWaybill = await prisma.waybill.findUnique({
        where: { purchaseId: purchase.id },
      })

      if (!existingWaybill) {
        // Generate waybill number
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

        // Update delivery status to SCHEDULED (ready for delivery)
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
            reason: "Payment completed",
          },
        })
      } else {
        waybillNumber = existingWaybill.waybillNumber
        waybillGenerated = true
      }
    }

    // Create the progress invoice
    const progressInvoice = await prisma.progressInvoice.create({
      data: {
        invoiceNumber: receiptNumber,
        paymentId: payment.id,
        purchaseId: purchase.id,
        paymentAmount: payment.amount,
        previousBalance,
        newBalance: Math.max(0, newOutstanding),
        totalPurchaseAmount: purchase.totalAmount,
        totalAmountPaid: newAmountPaid,
        collectorId: payment.collectorId,
        collectorName,
        confirmedById: shopMember?.id,
        confirmedByName: user.name,
        paymentMethod: payment.paymentMethod,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        customerPhone: purchase.customer.phone,
        customerAddress: purchase.customer.address,
        purchaseNumber: purchase.purchaseNumber,
        purchaseType: purchase.purchaseType,
        shopId: shop.id,
        shopName: shop.name,
        businessId: shop.businessId,
        businessName: shop.name, // Will get business name below
        isPurchaseCompleted: isCompleted,
        waybillGenerated,
        waybillNumber,
        notes: payment.notes,
      },
    })

    // Update invoice with actual business name
    const business = await prisma.business.findUnique({
      where: { id: shop.businessId },
    })
    if (business) {
      await prisma.progressInvoice.update({
        where: { id: progressInvoice.id },
        data: { businessName: business.name },
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "PROGRESS_INVOICE_GENERATED",
      entityType: "ProgressInvoice",
      entityId: progressInvoice.id,
      metadata: {
        receiptNumber,
        paymentId: payment.id,
        purchaseId: purchase.id,
        amount: Number(payment.amount),
        isCompleted,
        waybillGenerated,
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
        confirmedById: shopMember?.id,
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

        // Get business admin email
        const businessAdmin = await prisma.businessMember.findFirst({
          where: { businessId: shop.businessId, role: "BUSINESS_ADMIN" },
          include: { user: true },
        })

        const now = new Date()
        await sendCollectionReceipt({
          businessId: shop.businessId,
          receiptNumber,
          customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
          customerPhone: purchase.customer.phone,
          customerEmail: purchase.customer.email,
          shopName: shop.name,
          businessName: business?.name || shop.name,
          collectorName: collector?.user?.name || collectorName || "Shop Staff",
          collectorEmail: collector?.user?.email || "",
          collectorPhone: collector?.user?.phone || undefined,
          shopAdminEmail: shopAdmin?.user?.email || null,
          businessAdminEmail: businessAdmin?.user?.email || null,
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

    // Send in-app message with receipt PDF to customer
    try {
      const now = new Date()
      const receiptPdfBase64 = await generateReceiptPDF({
        receiptNumber,
        purchaseNumber: purchase.purchaseNumber,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        customerPhone: purchase.customer.phone,
        customerEmail: purchase.customer.email,
        shopName: shop.name,
        businessName: business?.name || shop.name,
        paymentAmount: Number(payment.amount),
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        previousBalance,
        newBalance: Math.max(0, newOutstanding),
        totalPurchaseAmount: Number(purchase.totalAmount),
        totalAmountPaid: newAmountPaid,
        collectorName,
        paymentDate: now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        paymentTime: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        notes: payment.notes,
        isFullyPaid: isCompleted,
      })

      await sendPaymentReceiptMessage({
        customerId: purchase.customerId,
        staffUserId: user.id,
        businessId: shop.businessId,
        shopId: shop.id,
        receiptPdfBase64,
        receiptNumber,
        purchaseNumber: purchase.purchaseNumber,
        paymentAmount: Number(payment.amount),
        newBalance: Math.max(0, newOutstanding),
        isFullyPaid: isCompleted,
      })
    } catch (msgError) {
      console.error("Failed to send receipt message:", msgError)
      // Don't fail the confirmation if messaging fails
    }

    revalidatePath(`/shop-admin/${shopSlug}/pending-payments`)
    revalidatePath(`/shop-admin/${shopSlug}/customers/${purchase.customerId}`)
    revalidatePath(`/shop-admin/${shopSlug}/waybills`)
    revalidatePath(`/shop-admin/${shopSlug}/invoices`)
    revalidatePath(`/collector/${shopSlug}/payments`)
    revalidatePath(`/sales-staff/${shopSlug}/deliveries`)
    return { 
      success: true, 
      data: { 
        purchaseCompleted: isCompleted,
        invoiceId: progressInvoice.id,
        receiptNumber,
        waybillGenerated,
        waybillNumber,
      } 
    }
  } catch (error) {
    console.error("Confirm payment error:", error)
    return { success: false, error: "Failed to confirm payment" }
  }
}

/**
 * Reject a payment collected by a debt collector
 */
export async function rejectPayment(
  shopSlug: string,
  paymentId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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

    // Verify payment belongs to this shop
    if (payment.purchase.customer.shopId !== shop.id) {
      return { success: false, error: "Payment not found in this shop" }
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
        status: "MISSED", // Mark as missed/failed
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
      },
    })

    revalidatePath(`/shop-admin/${shopSlug}/pending-payments`)
    revalidatePath(`/collector/${shopSlug}/payments`)
    return { success: true }
  } catch (error) {
    console.error("Reject payment error:", error)
    return { success: false, error: "Failed to reject payment" }
  }
}

/**
 * Get payment confirmation stats for dashboard
 */
export async function getPaymentConfirmationStats(shopSlug: string) {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const [pendingCount, pendingTotal, confirmedToday, rejectedToday] = await Promise.all([
    prisma.payment.count({
      where: {
        isConfirmed: false,
        rejectedAt: null,
        collectorId: { not: null },
        purchase: { customer: { shopId: shop.id } },
      },
    }),
    prisma.payment.aggregate({
      where: {
        isConfirmed: false,
        rejectedAt: null,
        collectorId: { not: null },
        purchase: { customer: { shopId: shop.id } },
      },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: {
        isConfirmed: true,
        confirmedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        purchase: { customer: { shopId: shop.id } },
      },
    }),
    prisma.payment.count({
      where: {
        rejectedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        purchase: { customer: { shopId: shop.id } },
      },
    }),
  ])

  return {
    pendingCount,
    pendingTotal: pendingTotal._sum.amount ? Number(pendingTotal._sum.amount) : 0,
    confirmedToday,
    rejectedToday,
  }
}

// ============================================
// WAYBILL MANAGEMENT (Shop Admin)
// ============================================

export interface WaybillForAdmin {
  id: string
  waybillNumber: string
  purchaseId: string
  purchaseNumber: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryCity: string | null
  deliveryRegion: string | null
  deliveryStatus: string
  items: Array<{
    productName: string
    quantity: number
  }>
  totalAmount: number
  specialInstructions: string | null
  generatedAt: Date
  receivedBy: string | null
  isDelivered: boolean
}

/**
 * Get all waybills for shop admin view
 */
export async function getWaybills(shopSlug: string): Promise<WaybillForAdmin[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const waybills = await prisma.waybill.findMany({
    where: {
      purchase: { customer: { shopId: shop.id } },
    },
    include: {
      purchase: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  })

  return waybills.map((w) => ({
    id: w.id,
    waybillNumber: w.waybillNumber,
    purchaseId: w.purchaseId,
    purchaseNumber: w.purchase.purchaseNumber,
    customerName: `${w.purchase.customer.firstName} ${w.purchase.customer.lastName}`,
    customerPhone: w.recipientPhone,
    deliveryAddress: w.deliveryAddress,
    deliveryCity: w.deliveryCity,
    deliveryRegion: w.deliveryRegion,
    deliveryStatus: w.purchase.deliveryStatus,
    items: w.purchase.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
    })),
    totalAmount: Number(w.purchase.totalAmount),
    specialInstructions: w.specialInstructions,
    generatedAt: w.generatedAt,
    receivedBy: w.receivedBy,
    isDelivered: w.purchase.deliveryStatus === "DELIVERED",
  }))
}

/**
 * Get waybills that are ready for delivery (not yet delivered)
 */
export async function getPendingWaybills(shopSlug: string): Promise<WaybillForAdmin[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const waybills = await prisma.waybill.findMany({
    where: {
      purchase: {
        customer: { shopId: shop.id },
        deliveryStatus: { in: ["PENDING", "SCHEDULED", "IN_TRANSIT"] },
      },
    },
    include: {
      purchase: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
  })

  return waybills.map((w) => ({
    id: w.id,
    waybillNumber: w.waybillNumber,
    purchaseId: w.purchaseId,
    purchaseNumber: w.purchase.purchaseNumber,
    customerName: `${w.purchase.customer.firstName} ${w.purchase.customer.lastName}`,
    customerPhone: w.recipientPhone,
    deliveryAddress: w.deliveryAddress,
    deliveryCity: w.deliveryCity,
    deliveryRegion: w.deliveryRegion,
    deliveryStatus: w.purchase.deliveryStatus,
    items: w.purchase.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
    })),
    totalAmount: Number(w.purchase.totalAmount),
    specialInstructions: w.specialInstructions,
    generatedAt: w.generatedAt,
    receivedBy: w.receivedBy,
    isDelivered: false,
  }))
}

/**
 * Get waybill stats for shop admin
 */
export async function getWaybillStats(shopSlug: string) {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const [total, pendingDelivery, inTransit, delivered] = await Promise.all([
    prisma.waybill.count({
      where: { purchase: { customer: { shopId: shop.id } } },
    }),
    prisma.waybill.count({
      where: {
        purchase: {
          customer: { shopId: shop.id },
          deliveryStatus: { in: ["PENDING", "SCHEDULED"] },
        },
      },
    }),
    prisma.waybill.count({
      where: {
        purchase: {
          customer: { shopId: shop.id },
          deliveryStatus: "IN_TRANSIT",
        },
      },
    }),
    prisma.waybill.count({
      where: {
        purchase: {
          customer: { shopId: shop.id },
          deliveryStatus: "DELIVERED",
        },
      },
    }),
  ])

  return { total, pendingDelivery, inTransit, delivered }
}

export interface WaybillDetailData {
  id: string
  waybillNumber: string
  purchaseNumber: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryCity: string | null
  deliveryRegion: string | null
  specialInstructions: string | null
  items: {
    productName: string
    quantity: number
    unitPrice: number
  }[]
  subtotal: number
  generatedAt: Date
  receivedBy: string | null
  shopName: string
  businessName: string
  generatedByName: string | null
}

/**
 * Get a single waybill by purchase ID for shop admin
 */
export async function getWaybillByPurchaseId(shopSlug: string, purchaseId: string): Promise<WaybillDetailData | null> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const waybill = await prisma.waybill.findUnique({
    where: { purchaseId },
    include: {
      purchase: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
  })

  if (!waybill || waybill.purchase.customer.shopId !== shop.id) {
    return null
  }

  // Get generated by user name
  let generatedByName: string | null = null
  if (waybill.generatedById) {
    const user = await prisma.user.findUnique({
      where: { id: waybill.generatedById },
    })
    generatedByName = user?.name || null
  }

  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
  })

  return {
    id: waybill.id,
    waybillNumber: waybill.waybillNumber,
    purchaseNumber: waybill.purchase.purchaseNumber,
    recipientName: waybill.recipientName,
    recipientPhone: waybill.recipientPhone,
    deliveryAddress: waybill.deliveryAddress,
    deliveryCity: waybill.deliveryCity,
    deliveryRegion: waybill.deliveryRegion,
    specialInstructions: waybill.specialInstructions,
    items: waybill.purchase.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
    subtotal: Number(waybill.purchase.subtotal),
    generatedAt: waybill.generatedAt,
    receivedBy: waybill.receivedBy,
    shopName: shop.name,
    businessName: business?.name || shop.name,
    generatedByName,
  }
}

// ============================================
// MESSAGING SYSTEM
// ============================================

export interface SendMessagePayload {
  customerId: string
  type: "EMAIL" | "SMS" | "IN_APP"
  subject?: string
  body: string
}

export interface MessageData {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  type: "EMAIL" | "SMS" | "IN_APP"
  subject: string | null
  body: string
  status: string
  sentAt: Date | null
  createdAt: Date
}

/**
 * Send a message to a customer (email, SMS, or in-app)
 */
export async function sendMessageToCustomer(
  shopSlug: string,
  payload: SendMessagePayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Validate customer belongs to shop
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, shopId: shop.id },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Validate based on message type
    if (payload.type === "EMAIL" && !customer.email) {
      return { success: false, error: "Customer does not have an email address" }
    }

    if (payload.type === "SMS" && !customer.phone) {
      return { success: false, error: "Customer does not have a phone number" }
    }

    if (payload.type === "IN_APP" && !customer.userId) {
      return { success: false, error: "Customer does not have an account for in-app messages" }
    }

    // Create the message record
    const message = await prisma.message.create({
      data: {
        shopId: shop.id,
        customerId: customer.id,
        senderId: user.id,
        type: payload.type,
        subject: payload.subject || null,
        body: payload.body,
        status: "PENDING",
      },
    })

    // Handle different message types
    if (payload.type === "EMAIL") {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      // For now, mark as sent (simulate)
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "SENT", sentAt: new Date() },
      })
      console.log(`[EMAIL] To: ${customer.email}, Subject: ${payload.subject}, Body: ${payload.body}`)
    } else if (payload.type === "SMS") {
      // TODO: Integrate with SMS service (Twilio, Africa's Talking, etc.)
      // For now, mark as sent (simulate)
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "SENT", sentAt: new Date() },
      })
      console.log(`[SMS] To: ${customer.phone}, Body: ${payload.body}`)
    } else if (payload.type === "IN_APP") {
      // Create notification for customer
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
        data: { status: "DELIVERED", sentAt: new Date(), deliveredAt: new Date() },
      })
    }

    await createAuditLog({
      actorUserId: user.id,
      action: "MESSAGE_SENT",
      entityType: "Message",
      entityId: message.id,
      metadata: {
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        messageType: payload.type,
      },
    })

    revalidatePath(`/shop-admin/${shopSlug}/customers`)
    revalidatePath(`/shop-admin/${shopSlug}/messages`)

    return { success: true, data: { messageId: message.id } }
  } catch (error) {
    console.error("Send message error:", error)
    return { success: false, error: "Failed to send message" }
  }
}

/**
 * Send bulk message to multiple customers
 */
export async function sendBulkMessage(
  shopSlug: string,
  customerIds: string[],
  payload: Omit<SendMessagePayload, "customerId">
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Get all valid customers
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        shopId: shop.id,
      },
    })

    if (customers.length === 0) {
      return { success: false, error: "No valid customers found" }
    }

    let sentCount = 0
    let failedCount = 0

    for (const customer of customers) {
      // Skip if customer doesn't have required contact info
      if (payload.type === "EMAIL" && !customer.email) {
        failedCount++
        continue
      }
      if (payload.type === "SMS" && !customer.phone) {
        failedCount++
        continue
      }
      if (payload.type === "IN_APP" && !customer.userId) {
        failedCount++
        continue
      }

      try {
        const message = await prisma.message.create({
          data: {
            shopId: shop.id,
            customerId: customer.id,
            senderId: user.id,
            type: payload.type,
            subject: payload.subject || null,
            body: payload.body,
            status: "SENT",
            sentAt: new Date(),
          },
        })

        if (payload.type === "IN_APP") {
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
            data: { status: "DELIVERED", deliveredAt: new Date() },
          })
        }

        sentCount++
      } catch {
        failedCount++
      }
    }

    revalidatePath(`/shop-admin/${shopSlug}/messages`)

    return {
      success: true,
      data: { sentCount, failedCount, totalCustomers: customers.length },
    }
  } catch (error) {
    console.error("Bulk message error:", error)
    return { success: false, error: "Failed to send bulk messages" }
  }
}

/**
 * Get message history for a customer
 */
export async function getCustomerMessages(
  shopSlug: string,
  customerId: string
): Promise<MessageData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const messages = await prisma.message.findMany({
    where: {
      shopId: shop.id,
      customerId,
    },
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return messages.map((m) => ({
    id: m.id,
    customerId: m.customerId,
    customerName: `${m.customer.firstName} ${m.customer.lastName}`,
    customerPhone: m.customer.phone,
    customerEmail: m.customer.email,
    type: m.type as "EMAIL" | "SMS" | "IN_APP",
    subject: m.subject,
    body: m.body,
    status: m.status,
    sentAt: m.sentAt,
    createdAt: m.createdAt,
  }))
}

/**
 * Get all messages for the shop
 */
export async function getShopMessages(shopSlug: string): Promise<MessageData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const messages = await prisma.message.findMany({
    where: { shopId: shop.id },
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return messages.map((m) => ({
    id: m.id,
    customerId: m.customerId,
    customerName: `${m.customer.firstName} ${m.customer.lastName}`,
    customerPhone: m.customer.phone,
    customerEmail: m.customer.email,
    type: m.type as "EMAIL" | "SMS" | "IN_APP",
    subject: m.subject,
    body: m.body,
    status: m.status,
    sentAt: m.sentAt,
    createdAt: m.createdAt,
  }))
}

/**
 * Send payment reminder to customer
 */
export async function sendPaymentReminder(
  shopSlug: string,
  customerId: string,
  purchaseId: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customerId,
        customer: { shopId: shop.id },
      },
      include: { customer: true },
    })

    if (!purchase) {
      return { success: false, error: "Purchase not found" }
    }

    const customer = purchase.customer
    const outstanding = Number(purchase.outstandingBalance)
    const dueDate = purchase.dueDate
      ? purchase.dueDate.toLocaleDateString("en-GB")
      : "N/A"

    const body = `Dear ${customer.firstName}, this is a reminder that you have an outstanding balance of GHS ${outstanding.toLocaleString()} for purchase ${purchase.purchaseNumber}. Due date: ${dueDate}. Please make your payment at your earliest convenience. Thank you.`

    // Send SMS if phone available
    if (customer.phone && customer.smsNotifications) {
      await prisma.message.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          senderId: user.id,
          type: "SMS",
          body,
          status: "SENT",
          sentAt: new Date(),
        },
      })
      console.log(`[SMS REMINDER] To: ${customer.phone}`)
    }

    // Send email if available
    if (customer.email && customer.emailNotifications) {
      await prisma.message.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          senderId: user.id,
          type: "EMAIL",
          subject: `Payment Reminder - ${purchase.purchaseNumber}`,
          body,
          status: "SENT",
          sentAt: new Date(),
        },
      })
      console.log(`[EMAIL REMINDER] To: ${customer.email}`)
    }

    // Send in-app if customer has account
    if (customer.userId) {
      await prisma.notification.create({
        data: {
          customerId: customer.id,
          title: "Payment Reminder",
          body: `Your outstanding balance of GHS ${outstanding.toLocaleString()} for ${purchase.purchaseNumber} is due on ${dueDate}.`,
          type: "PAYMENT_REMINDER",
          link: `/customer/purchases/${purchase.id}`,
        },
      })
    }

    revalidatePath(`/shop-admin/${shopSlug}/customers`)

    return { success: true }
  } catch (error) {
    console.error("Payment reminder error:", error)
    return { success: false, error: "Failed to send reminder" }
  }
}

// ============================================
// PROGRESS INVOICES
// ============================================

export interface ProgressInvoiceData {
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
  shopName: string
  businessName: string
  isPurchaseCompleted: boolean
  waybillGenerated: boolean
  waybillNumber: string | null
  notes: string | null
  generatedAt: Date
  // Purchase items for the invoice
  items: {
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  // Payment configuration from shop
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bankBranch: string | null
  mobileMoneyProvider: string | null
  mobileMoneyNumber: string | null
  mobileMoneyName: string | null
}

/**
 * Get all progress invoices for a shop
 */
export async function getShopInvoices(shopSlug: string): Promise<ProgressInvoiceData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

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
    recordedByRole: inv.recordedByRole,
    recordedByName: inv.recordedByName,
    shopAdminName: inv.shopAdminName,
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
    // Payment configuration from shop
    bankName: shop.bankName,
    bankAccountNumber: shop.bankAccountNumber,
    bankAccountName: shop.bankAccountName,
    bankBranch: shop.bankBranch,
    mobileMoneyProvider: shop.mobileMoneyProvider,
    mobileMoneyNumber: shop.mobileMoneyNumber,
    mobileMoneyName: shop.mobileMoneyName,
  }))
}

/**
 * Get a single progress invoice by ID
 */
export async function getProgressInvoice(shopSlug: string, invoiceId: string): Promise<ProgressInvoiceData | null> {
  const { shop } = await requireShopAdminForShop(shopSlug)

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
    recordedByRole: invoice.recordedByRole,
    recordedByName: invoice.recordedByName,
    shopAdminName: invoice.shopAdminName,
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
    // Payment configuration from shop
    bankName: shop.bankName,
    bankAccountNumber: shop.bankAccountNumber,
    bankAccountName: shop.bankAccountName,
    bankBranch: shop.bankBranch,
    mobileMoneyProvider: shop.mobileMoneyProvider,
    mobileMoneyNumber: shop.mobileMoneyNumber,
    mobileMoneyName: shop.mobileMoneyName,
  }
}

/**
 * Wallet Deposit Receipt data for shop-admin
 */
export interface ShopWalletDepositReceiptData {
  id: string
  receiptNumber: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  reference: string | null
  paymentMethod: string | null
  status: string
  customerName: string
  customerPhone: string
  customerAddress: string | null
  shopName: string
  businessName: string
  collectorName: string | null
  confirmedByName: string | null
  confirmedAt: Date | null
  createdAt: Date
}

/**
 * Get confirmed wallet deposit transactions as receipts for a shop
 */
export async function getShopWalletDepositReceipts(shopSlug: string): Promise<ShopWalletDepositReceiptData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      shopId: shop.id,
      status: "CONFIRMED",
      type: { in: ["DEPOSIT", "REFUND", "ADJUSTMENT"] },
    },
    include: {
      customer: { include: { user: true } },
      createdBy: { include: { user: true } },
      confirmedBy: { include: { user: true } },
    },
    orderBy: { confirmedAt: "desc" },
    take: 300,
  })

  const business = await prisma.business.findUnique({
    where: { id: shop.businessId },
  })

  return transactions.map((tx) => {
    const year = new Date(tx.confirmedAt || tx.createdAt).getFullYear()
    const ts = (tx.confirmedAt || tx.createdAt).getTime().toString(36)
    return {
      id: tx.id,
      receiptNumber: `WDR-${year}-${ts}`,
      type: tx.type as string,
      amount: Number(tx.amount),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      description: tx.description,
      reference: tx.reference,
      paymentMethod: tx.paymentMethod,
      status: tx.status as string,
      customerName: tx.customer.user?.name || "Unknown",
      customerPhone: tx.customer.user?.phone || "",
      customerAddress: tx.customer.user?.address || null,
      shopName: shop.name,
      businessName: business?.name || "",
      collectorName: tx.createdBy?.user?.name || null,
      confirmedByName: tx.confirmedBy?.user?.name || null,
      confirmedAt: tx.confirmedAt,
      createdAt: tx.createdAt,
    }
  })
}

/**
 * Get invoices for a specific purchase
 */
export async function getPurchaseInvoices(shopSlug: string, purchaseId: string): Promise<ProgressInvoiceData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const invoices = await prisma.progressInvoice.findMany({
    where: { 
      purchaseId,
      shopId: shop.id,
    },
    include: {
      purchase: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { generatedAt: "asc" },
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
    recordedByRole: inv.recordedByRole,
    recordedByName: inv.recordedByName,
    shopAdminName: inv.shopAdminName,
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
    // Payment configuration from shop
    bankName: shop.bankName,
    bankAccountNumber: shop.bankAccountNumber,
    bankAccountName: shop.bankAccountName,
    bankBranch: shop.bankBranch,
    mobileMoneyProvider: shop.mobileMoneyProvider,
    mobileMoneyNumber: shop.mobileMoneyNumber,
    mobileMoneyName: shop.mobileMoneyName,
  }))
}

// ============================================
// NEW SALE FUNCTIONS FOR SHOP ADMIN
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
  await requireShopAdminForShop(shopSlug)

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

export interface CustomerForSale {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
}

export async function getCustomersForSale(shopSlug: string): Promise<CustomerForSale[]> {
  await requireShopAdminForShop(shopSlug)

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

export interface CollectorOption {
  id: string
  name: string
  email: string | null
}

export async function getCollectorsForDropdown(shopSlug: string): Promise<CollectorOption[]> {
  await requireShopAdminForShop(shopSlug)

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
  preferredPayment?: "ONLINE" | "DEBT_COLLECTOR" | "BOTH"
  assignedCollectorId?: string | null
  notes?: string | null
}

export async function createQuickCustomer(
  shopSlug: string,
  payload: QuickCustomerPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    if (!payload.firstName || payload.firstName.trim().length === 0) {
      return { success: false, error: "First name is required" }
    }

    if (!payload.lastName || payload.lastName.trim().length === 0) {
      return { success: false, error: "Last name is required" }
    }

    if (!payload.phone || payload.phone.trim().length === 0) {
      return { success: false, error: "Phone number is required" }
    }

    // Check for duplicate phone
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        shopId: shop.id,
        phone: payload.phone.trim(),
      },
    })

    if (existingCustomer) {
      return { success: false, error: "A customer with this phone number already exists" }
    }

    // Validate collector if specified
    let assignedCollector = null
    if (payload.assignedCollectorId) {
      assignedCollector = await prisma.shopMember.findFirst({
        where: {
          id: payload.assignedCollectorId,
          shopId: shop.id,
          role: "DEBT_COLLECTOR",
          isActive: true,
        },
      })
      if (!assignedCollector) {
        return { success: false, error: "Selected collector not found or inactive" }
      }
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        email: payload.email?.trim() || null,
        idType: payload.idType || null,
        idNumber: payload.idNumber?.trim() || null,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        region: payload.region || null,
        preferredPayment: payload.preferredPayment || "BOTH",
        assignedCollectorId: assignedCollector?.id || null,
        notes: payload.notes?.trim() || null,
        isActive: true,
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
        method: "Quick add during sale",
      },
    })

    revalidatePath(`/shop-admin/${shopSlug}/customers`)

    return {
      success: true,
      data: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
      },
    }
  } catch (error) {
    console.error("Create quick customer error:", error)
    return { success: false, error: "Failed to create customer" }
  }
}

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
    const { user, shop } = await requireShopAdminForShop(shopSlug)

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

    // Get policy for interest calculation (check shop policy first, then fall back to business policy)
    // Only required for non-CASH purchases
    let policy = await prisma.shopPolicy.findFirst({
      where: { shopId: shop.id },
    })

    // If no shop policy, try business policy
    if (!policy) {
      const businessPolicy = await prisma.businessPolicy.findFirst({
        where: { 
          business: { 
            shops: { some: { id: shop.id } } 
          } 
        },
      })
      if (businessPolicy) {
        // Map business policy to same shape as shop policy for consistent usage
        policy = {
          id: businessPolicy.id,
          shopId: shop.id,
          interestType: businessPolicy.interestType,
          interestRate: businessPolicy.interestRate,
          graceDays: businessPolicy.graceDays,
          maxTenorDays: businessPolicy.maxTenorDays,
          lateFeeFixed: businessPolicy.lateFeeFixed,
          lateFeeRate: businessPolicy.lateFeeRate,
          createdAt: businessPolicy.createdAt,
          updatedAt: businessPolicy.updatedAt,
        }
      }
    }

    // CASH sales don't require policy
    if (payload.purchaseType !== "CASH" && !policy) {
      return { success: false, error: "No policy configured. Please configure either a shop policy or business policy first." }
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

    // Create audit log
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
          specialInstructions: `Cash sale - Ready for delivery`,
          generatedById: user.id,
        },
      })
    }

    revalidatePath(`/shop-admin/${shopSlug}/customers`)
    revalidatePath(`/shop-admin/${shopSlug}/products`)

    return {
      success: true,
      data: {
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        totalAmount,
        downPayment,
        outstandingBalance,
      },
    }
  } catch (error) {
    console.error("Create sale error:", error)
    return { success: false, error: "Failed to create sale" }
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
  const { user, shop } = await requireShopAdminForShop(shopSlug)

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

// ===== PURCHASE INVOICE TYPES =====

export interface ShopPurchaseInvoiceListData {
  id: string
  invoiceNumber: string
  purchaseNumber: string
  purchaseType: string
  customerName: string
  customerPhone: string
  collectorName: string | null
  totalAmount: number
  downPayment: number
  status: string
  createdAt: Date
}

export interface ShopPurchaseInvoiceDetailData {
  id: string
  invoiceNumber: string
  purchaseNumber: string
  purchaseType: string
  subtotal: number
  interestAmount: number
  totalAmount: number
  downPayment: number
  installments: number
  dueDate: Date | null
  customerId: string
  customerName: string
  customerPhone: string
  customerAddress: string | null
  collectorId: string | null
  collectorName: string | null
  collectorPhone: string | null
  shopId: string
  shopName: string
  shopAdminName: string | null
  businessId: string
  businessName: string
  paymentMethods: string[]
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bankBranch: string | null
  mobileMoneyProvider: string | null
  mobileMoneyNumber: string | null
  mobileMoneyName: string | null
  itemsSnapshot: {
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  status: string
  createdAt: Date
}

/**
 * Get all purchase invoices for a shop
 */
export async function getShopPurchaseInvoices(shopSlug: string): Promise<ShopPurchaseInvoiceListData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    purchaseNumber: inv.purchaseNumber,
    purchaseType: inv.purchaseType,
    customerName: inv.customerName,
    customerPhone: inv.customerPhone,
    collectorName: inv.collectorName,
    totalAmount: Number(inv.totalAmount),
    downPayment: Number(inv.downPayment),
    status: inv.status,
    createdAt: inv.createdAt,
  }))
}

/**
 * Get a single purchase invoice by ID
 */
export async function getShopPurchaseInvoice(shopSlug: string, invoiceId: string): Promise<ShopPurchaseInvoiceDetailData | null> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const invoice = await prisma.purchaseInvoice.findFirst({
    where: {
      id: invoiceId,
      shopId: shop.id,
    },
  })

  if (!invoice) return null

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
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,
    collectorId: invoice.collectorId,
    collectorName: invoice.collectorName,
    collectorPhone: invoice.collectorPhone,
    shopId: invoice.shopId,
    shopName: invoice.shopName,
    shopAdminName: invoice.shopAdminName,
    businessId: invoice.businessId,
    businessName: invoice.businessName,
    paymentMethods: invoice.paymentMethods,
    bankName: invoice.bankName,
    bankAccountNumber: invoice.bankAccountNumber,
    bankAccountName: invoice.bankAccountName,
    bankBranch: invoice.bankBranch,
    mobileMoneyProvider: invoice.mobileMoneyProvider,
    mobileMoneyNumber: invoice.mobileMoneyNumber,
    mobileMoneyName: invoice.mobileMoneyName,
    itemsSnapshot: (invoice.itemsSnapshot as { productName: string; quantity: number; unitPrice: number; totalPrice: number }[]) || [],
    status: invoice.status,
    createdAt: invoice.createdAt,
  }
}

/**
 * Generate a purchase invoice for a specific purchase (Shop Admin version)
 */
export async function generateShopPurchaseInvoice(
  shopSlug: string,
  purchaseId: string
): Promise<ActionResult> {
  try {
    const { shop } = await requireShopAdminForShop(shopSlug)

    // Get the business
    const business = await prisma.business.findUnique({
      where: { id: shop.businessId },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    // Get purchase with customer and items
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        customer: { shopId: shop.id },
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

    // Get shop admin from the included relation
    const shopWithMembers = purchase.customer.shop
    const shopAdmin = shopWithMembers.members[0]?.user
    const collector = purchase.customer.assignedCollector

    // Generate invoice number
    const invoiceCount = await prisma.purchaseInvoice.count({
      where: { shopId: shop.id },
    })
    const invoiceNumber = `INV-${shop.shopSlug.toUpperCase().slice(0, 3)}-${String(invoiceCount + 1).padStart(6, "0")}`

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

// ============================================
// STAFF DAILY REPORTS (Shop Admin View)
// ============================================

import { DailyReportType, DailyReportStatus } from "../generated/prisma/client"

export interface StaffDailyReportData {
  id: string
  reportDate: Date
  reportType: DailyReportType
  status: DailyReportStatus
  staffName: string
  staffRole: string
  // Sales fields
  totalSalesAmount: number | null
  newCustomersCount: number | null
  newPurchasesCount: number | null
  itemsSoldCount: number | null
  // Collection fields
  customersVisited: number | null
  paymentsCollected: number | null
  totalCollected: number | null
  // Common fields
  notes: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  reviewedByName: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all daily reports for a shop (for shop admin)
 */
export async function getShopDailyReports(
  shopSlug: string,
  filters?: {
    startDate?: string
    endDate?: string
    reportType?: DailyReportType
    status?: DailyReportStatus
  }
): Promise<StaffDailyReportData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  // Get date range - default to last 30 days
  const endDate = filters?.endDate ? new Date(filters.endDate) : new Date()
  const startDate = filters?.startDate ? new Date(filters.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999) 

  // Get all purchases (sales) for the date range
  const purchases = await prisma.purchase.findMany({
    where: {
      customer: { shopId: shop.id },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get all payments (collections) for the date range
  const payments = await prisma.payment.findMany({
    where: {
      purchase: { customer: { shopId: shop.id } },
      isConfirmed: true,
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      collector: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get new customers for the date range
  const newCustomers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
    },
  })

  // Helper to format date as YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Aggregate data by date
  const activityMap = new Map<string, {
    dateKey: string
    date: Date
    salesAmount: number
    purchasesCount: number
    itemsSold: number
    collectionsAmount: number
    paymentsCount: number
    newCustomersCount: number
    collectorNames: Set<string>
  }>()

  // Process purchases (sales)
  for (const purchase of purchases) {
    const dateKey = formatDateKey(new Date(purchase.createdAt))
    const key = `${dateKey}-SALES`
    
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        dateKey,
        date: new Date(purchase.createdAt),
        salesAmount: 0,
        purchasesCount: 0,
        itemsSold: 0,
        collectionsAmount: 0,
        paymentsCount: 0,
        newCustomersCount: 0,
        collectorNames: new Set(),
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
    const key = `${dateKey}-COLLECTION`
    
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        dateKey,
        date: new Date(payment.createdAt),
        salesAmount: 0,
        purchasesCount: 0,
        itemsSold: 0,
        collectionsAmount: 0,
        paymentsCount: 0,
        newCustomersCount: 0,
        collectorNames: new Set(),
      })
    }
    
    const activity = activityMap.get(key)!
    activity.collectionsAmount += Number(payment.amount)
    activity.paymentsCount += 1
    if (payment.collector?.user.name) {
      activity.collectorNames.add(payment.collector.user.name)
    }
  }

  // Process new customers
  for (const customer of newCustomers) {
    const dateKey = formatDateKey(new Date(customer.createdAt))
    const key = `${dateKey}-SALES`
    
    if (activityMap.has(key)) {
      activityMap.get(key)!.newCustomersCount += 1
    }
  }

  // Convert to reports array
  const reports: StaffDailyReportData[] = []
  
  for (const [key, activity] of activityMap) {
    const isSales = key.endsWith('-SALES')
    const isCollection = key.endsWith('-COLLECTION')
    
    // Skip if filtering by type
    if (filters?.reportType === "SALES" && !isSales) continue
    if (filters?.reportType === "COLLECTION" && !isCollection) continue
    
    // Create sales report
    if (isSales && activity.salesAmount > 0) {
      reports.push({
        id: `auto-sales-${activity.dateKey}`,
        reportDate: activity.date,
        reportType: "SALES",
        status: "REVIEWED",
        staffName: "Shop Sales",
        staffRole: "SALES_STAFF",
        totalSalesAmount: activity.salesAmount,
        newCustomersCount: activity.newCustomersCount,
        newPurchasesCount: activity.purchasesCount,
        itemsSoldCount: activity.itemsSold,
        customersVisited: null,
        paymentsCollected: null,
        totalCollected: null,
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
        id: `auto-collection-${activity.dateKey}`,
        reportDate: activity.date,
        reportType: "COLLECTION",
        status: "REVIEWED",
        staffName: collectorName,
        staffRole: "DEBT_COLLECTOR",
        totalSalesAmount: null,
        newCustomersCount: null,
        newPurchasesCount: null,
        itemsSoldCount: null,
        customersVisited: activity.paymentsCount,
        paymentsCollected: activity.paymentsCount,
        totalCollected: activity.collectionsAmount,
        notes: `Auto-generated from ${activity.paymentsCount} payment(s)`,
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
 * Review a daily report (approve or add notes)
 */
export async function reviewDailyReport(
  shopSlug: string,
  reportId: string,
  reviewNotes?: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const report = await prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        shopId: shop.id,
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

    revalidatePath(`/shop-admin/${shopSlug}/staff-reports`)
    return { success: true }
  } catch (error) {
    console.error("Error reviewing daily report:", error)
    return { success: false, error: "Failed to review report" }
  }
}