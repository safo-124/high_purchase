"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireShopAdminForShop, createAuditLog } from "../../lib/auth"
import { InterestType, PaymentPreference, PaymentMethod, PurchaseStatus, PaymentStatus, Prisma } from "../generated/prisma/client"

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
  price: number
  imageUrl?: string | null
  isActive?: boolean
}

export interface ProductData {
  id: string
  shopId: string
  name: string
  description: string | null
  sku: string | null
  price: number
  imageUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all products for a shop
 */
export async function getProducts(shopSlug: string): Promise<ProductData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
  })

  // Convert Decimal prices to numbers
  return products.map((p) => ({
    id: p.id,
    shopId: p.shopId,
    name: p.name,
    description: p.description,
    sku: p.sku,
    price: Number(p.price),
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))
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

    // Validation
    if (!payload.name || payload.name.trim().length === 0) {
      return { success: false, error: "Product name is required" }
    }

    if (payload.price < 0) {
      return { success: false, error: "Price must be 0 or greater" }
    }

    // Check for duplicate SKU if provided
    if (payload.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          shopId: shop.id,
          sku: payload.sku.trim(),
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists" }
      }
    }

    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        sku: payload.sku?.trim() || null,
        price: new Prisma.Decimal(payload.price),
        imageUrl: payload.imageUrl || null,
        isActive: payload.isActive ?? true,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        productName: product.name,
        productSku: product.sku,
        price: Number(product.price),
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/products`)

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
      },
    }
  } catch (error) {
    console.error("Error creating product:", error)
    return { success: false, error: "Failed to create product" }
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  shopSlug: string,
  productId: string,
  payload: Partial<ProductPayload>
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Check product exists and belongs to shop
    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, shopId: shop.id },
    })

    if (!existingProduct) {
      return { success: false, error: "Product not found" }
    }

    // Validation
    if (payload.name !== undefined && payload.name.trim().length === 0) {
      return { success: false, error: "Product name cannot be empty" }
    }

    if (payload.price !== undefined && payload.price < 0) {
      return { success: false, error: "Price must be 0 or greater" }
    }

    // Check for duplicate SKU if changing
    if (payload.sku && payload.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          shopId: shop.id,
          sku: payload.sku.trim(),
          id: { not: productId },
        },
      })
      if (existingSku) {
        return { success: false, error: "A product with this SKU already exists" }
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(payload.name !== undefined && { name: payload.name.trim() }),
        ...(payload.description !== undefined && { description: payload.description?.trim() || null }),
        ...(payload.sku !== undefined && { sku: payload.sku?.trim() || null }),
        ...(payload.price !== undefined && { price: new Prisma.Decimal(payload.price) }),
        ...(payload.imageUrl !== undefined && { imageUrl: payload.imageUrl || null }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: product.id,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        productName: product.name,
        changes: payload,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/products`)

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
      },
    }
  } catch (error) {
    console.error("Error updating product:", error)
    return { success: false, error: "Failed to update product" }
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(
  shopSlug: string,
  productId: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    // Check product exists and belongs to shop
    const product = await prisma.product.findFirst({
      where: { id: productId, shopId: shop.id },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
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
        shopId: shop.id,
        shopName: shop.name,
        productName: product.name,
        productSku: product.sku,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/products`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting product:", error)
    return { success: false, error: "Failed to delete product" }
  }
}

/**
 * Toggle product active status
 */
export async function toggleProductStatus(
  shopSlug: string,
  productId: string
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const product = await prisma.product.findFirst({
      where: { id: productId, shopId: shop.id },
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isActive: !product.isActive },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: updated.isActive ? "PRODUCT_ACTIVATED" : "PRODUCT_DEACTIVATED",
      entityType: "Product",
      entityId: productId,
      metadata: {
        shopId: shop.id,
        shopName: shop.name,
        productName: product.name,
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

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: normalizedPhone,
        email: payload.email?.trim() || null,
        idType: payload.idType?.trim() || null,
        idNumber: payload.idNumber?.trim() || null,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        region: payload.region?.trim() || null,
        preferredPayment: payload.preferredPayment || "BOTH",
        assignedCollectorId: payload.assignedCollectorId || null,
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
        customerPhone: customer.phone,
      },
    })

    revalidatePath(`/shop-admin/${shop.shopSlug}/customers`)

    return {
      success: true,
      data: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
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

export interface PurchasePayload {
  customerId: string
  items: PurchaseItemPayload[]
  downPayment?: number
  installments: number // Number of payment installments
  notes?: string
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
  dueDate: Date
  interestType: InterestType
  interestRate: number
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
    status: PaymentStatus
    paidAt: Date | null
    reference: string | null
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

    // Get shop policy for interest calculation
    const policy = await prisma.shopPolicy.findUnique({
      where: { shopId: shop.id },
    })

    // Calculate subtotal
    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )

    // Calculate interest based on policy
    let interestAmount = 0
    const interestRate = policy ? Number(policy.interestRate) : 0
    const interestType = policy?.interestType || "FLAT"

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
    const downPayment = payload.downPayment || 0
    const outstandingBalance = totalAmount - downPayment

    // Calculate due date based on policy maxTenorDays
    const maxDays = policy?.maxTenorDays || 60
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + maxDays)

    const purchaseNumber = await generatePurchaseNumber(customer.id)

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        customerId: customer.id,
        status: downPayment > 0 ? "ACTIVE" : "PENDING",
        subtotal,
        interestAmount,
        totalAmount,
        amountPaid: downPayment,
        outstandingBalance,
        downPayment,
        installments: payload.installments,
        startDate: new Date(),
        dueDate,
        interestType,
        interestRate,
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

    // If down payment was made, record it as a payment
    if (downPayment > 0) {
      await prisma.payment.create({
        data: {
          purchaseId: purchase.id,
          amount: downPayment,
          paymentMethod: "CASH", // Default for in-store down payments
          status: "COMPLETED",
          paidAt: new Date(),
          notes: "Down payment",
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
      },
    })

    revalidatePath(`/shop-admin/${shopSlug}/customers`)
    revalidatePath(`/shop-admin/${shopSlug}/purchases`)

    return { success: true, data: { purchaseId: purchase.id, purchaseNumber } }
  } catch (error) {
    console.error("Error creating purchase:", error)
    return { success: false, error: "Failed to create purchase" }
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
}

/**
 * Record a payment for a purchase
 */
export async function recordPayment(
  shopSlug: string,
  payload: PaymentPayload
): Promise<ActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

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

    if (payload.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0" }
    }

    const newAmountPaid = Number(purchase.amountPaid) + payload.amount
    const newOutstanding = Number(purchase.totalAmount) - newAmountPaid

    // Determine new status
    let newStatus: PurchaseStatus = "ACTIVE"
    if (newOutstanding <= 0) {
      newStatus = "COMPLETED"
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        purchaseId: purchase.id,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        status: "COMPLETED",
        collectorId: payload.collectorId || null,
        paidAt: new Date(),
        reference: payload.reference,
        notes: payload.notes,
      },
    })

    // Update purchase totals
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        amountPaid: newAmountPaid,
        outstandingBalance: Math.max(0, newOutstanding),
        status: newStatus,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "PAYMENT_RECORDED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        amount: payload.amount,
        newOutstanding: Math.max(0, newOutstanding),
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
      },
    })

    revalidatePath(`/shop-admin/${shopSlug}/customers`)
    revalidatePath(`/shop-admin/${shopSlug}/purchases`)

    return {
      success: true,
      data: {
        paymentId: payment.id,
        newAmountPaid,
        newOutstanding: Math.max(0, newOutstanding),
        isFullyPaid: newOutstanding <= 0,
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
  }))
}
