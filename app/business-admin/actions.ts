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
