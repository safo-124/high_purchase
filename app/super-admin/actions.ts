"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireSuperAdmin, createAuditLog } from "../../lib/auth"

// Validation regex for shop slug: lowercase, alphanumeric, hyphens only
const SHOP_SLUG_REGEX = /^[a-z0-9-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export async function createShop(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

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

    if (!SHOP_SLUG_REGEX.test(normalizedSlug)) {
      return {
        success: false,
        error: "Shop slug must contain only lowercase letters, numbers, and hyphens",
      }
    }

    // Check if slug already exists
    const existingShop = await prisma.shop.findUnique({
      where: { shopSlug: normalizedSlug },
    })

    if (existingShop) {
      return { success: false, error: "A shop with this slug already exists" }
    }

    // Validate shop admin fields if creating admin
    if (createAdmin) {
      if (!adminName || adminName.trim().length === 0) {
        return { success: false, error: "Admin name is required" }
      }
      if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) {
        return { success: false, error: "Valid admin email is required" }
      }
      if (!adminPassword || adminPassword.length < 8) {
        return { success: false, error: "Admin password must be at least 8 characters" }
      }
      
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail.toLowerCase().trim() },
      })
      if (existingUser) {
        return { success: false, error: "A user with this email already exists" }
      }
    }

    // Create shop
    const shop = await prisma.shop.create({
      data: {
        name: name.trim(),
        shopSlug: normalizedSlug,
      },
    })

    // Audit log for shop creation
    await createAuditLog({
      actorUserId: user.id,
      action: "SHOP_CREATED",
      entityType: "Shop",
      entityId: shop.id,
      metadata: {
        shopName: shop.name,
        shopSlug: shop.shopSlug,
      },
    })

    // Create shop admin if requested
    let shopAdmin = null
    if (createAdmin && adminName && adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      
      shopAdmin = await prisma.user.create({
        data: {
          email: adminEmail.toLowerCase().trim(),
          name: adminName.trim(),
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

      // Audit log for admin creation
      await createAuditLog({
        actorUserId: user.id,
        action: "USER_CREATED",
        entityType: "User",
        entityId: shopAdmin.id,
        metadata: {
          userName: shopAdmin.name,
          userEmail: shopAdmin.email,
          userRole: "SHOP_ADMIN",
          assignedShop: shop.name,
        },
      })
    }

    revalidatePath("/super-admin/shops")
    revalidatePath("/super-admin")

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

export async function setShopActive(
  shopId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
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
        previousStatus: shop.isActive,
        newStatus: isActive,
      },
    })

    revalidatePath("/super-admin/shops")
    revalidatePath("/super-admin")

    return { success: true, data: updatedShop }
  } catch (error) {
    console.error("Error updating shop status:", error)
    return { success: false, error: "Failed to update shop status" }
  }
}

export async function deleteShop(shopId: string): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
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
      },
    })

    revalidatePath("/super-admin/shops")
    revalidatePath("/super-admin")

    return { success: true }
  } catch (error) {
    console.error("Error deleting shop:", error)
    return { success: false, error: "Failed to delete shop" }
  }
}
