"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import prisma from "../../lib/prisma"
import { requireSuperAdmin, createAuditLog } from "../../lib/auth"

// Validation regex for business slug: lowercase, alphanumeric, hyphens only
const SLUG_REGEX = /^[a-z0-9-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface BusinessData {
  id: string
  name: string
  businessSlug: string
  country: string
  isActive: boolean
  createdAt: Date
  shopCount: number
  adminName: string | null
  adminEmail: string | null
}

/**
 * Get all businesses with stats
 */
export async function getBusinesses(): Promise<BusinessData[]> {
  await requireSuperAdmin()

  const businesses = await prisma.business.findMany({
    include: {
      _count: {
        select: { shops: true },
      },
      members: {
        where: { role: "BUSINESS_ADMIN", isActive: true },
        include: { user: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return businesses.map((b) => ({
    id: b.id,
    name: b.name,
    businessSlug: b.businessSlug,
    country: b.country,
    isActive: b.isActive,
    createdAt: b.createdAt,
    shopCount: b._count.shops,
    adminName: b.members[0]?.user.name || null,
    adminEmail: b.members[0]?.user.email || null,
  }))
}

/**
 * Create a new business with optional business admin
 */
export async function createBusiness(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const name = formData.get("name") as string
    const businessSlug = formData.get("businessSlug") as string
    
    // Business Admin fields
    const adminName = formData.get("adminName") as string | null
    const adminEmail = formData.get("adminEmail") as string | null
    const adminPassword = formData.get("adminPassword") as string | null

    // Validation
    if (!name || name.trim().length === 0) {
      return { success: false, error: "Business name is required" }
    }

    if (!businessSlug || businessSlug.trim().length === 0) {
      return { success: false, error: "Business slug is required" }
    }

    const normalizedSlug = businessSlug.toLowerCase().trim()

    if (!SLUG_REGEX.test(normalizedSlug)) {
      return {
        success: false,
        error: "Business slug must contain only lowercase letters, numbers, and hyphens",
      }
    }

    // Check if slug already exists
    const existingBusiness = await prisma.business.findUnique({
      where: { businessSlug: normalizedSlug },
    })

    if (existingBusiness) {
      return { success: false, error: "A business with this slug already exists" }
    }

    // Validate business admin fields (required)
    if (!adminName || adminName.trim().length === 0) {
      return { success: false, error: "Business admin name is required" }
    }
    if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) {
      return { success: false, error: "Valid business admin email is required" }
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

    // Create business
    const business = await prisma.business.create({
      data: {
        name: name.trim(),
        businessSlug: normalizedSlug,
      },
    })

    // Create business admin user
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    
    const businessAdmin = await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        name: adminName.trim(),
        passwordHash,
        role: "BUSINESS_ADMIN",
        businessMemberships: {
          create: {
            businessId: business.id,
            role: "BUSINESS_ADMIN",
            isActive: true,
          },
        },
      },
    })

    // Audit log for business creation
    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_CREATED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        adminEmail: businessAdmin.email,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { 
      success: true, 
      data: { 
        business, 
        businessAdmin: { 
          email: businessAdmin.email, 
          name: businessAdmin.name 
        }
      } 
    }
  } catch (error) {
    console.error("Error creating business:", error)
    return { success: false, error: "Failed to create business" }
  }
}

/**
 * Toggle business active status
 */
export async function setBusinessActive(
  businessId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: { isActive },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: isActive ? "BUSINESS_ACTIVATED" : "BUSINESS_SUSPENDED",
      entityType: "Business",
      entityId: business.id,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        previousStatus: business.isActive,
        newStatus: isActive,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { success: true, data: updatedBusiness }
  } catch (error) {
    console.error("Error updating business status:", error)
    return { success: false, error: "Failed to update business status" }
  }
}

/**
 * Delete a business (and all its shops)
 */
export async function deleteBusiness(businessId: string): Promise<ActionResult> {
  try {
    const user = await requireSuperAdmin()

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        _count: { select: { shops: true } },
      },
    })

    if (!business) {
      return { success: false, error: "Business not found" }
    }

    // Delete the business (cascades to shops)
    await prisma.business.delete({
      where: { id: businessId },
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "BUSINESS_DELETED",
      entityType: "Business",
      entityId: businessId,
      metadata: {
        businessName: business.name,
        businessSlug: business.businessSlug,
        shopsDeleted: business._count.shops,
      },
    })

    revalidatePath("/super-admin/businesses")
    revalidatePath("/super-admin")

    return { success: true }
  } catch (error) {
    console.error("Error deleting business:", error)
    return { success: false, error: "Failed to delete business" }
  }
}

/**
 * Get dashboard stats for super admin
 */
export async function getSuperAdminStats() {
  await requireSuperAdmin()

  const [businessCount, shopCount, userCount, activeBusinesses] = await Promise.all([
    prisma.business.count(),
    prisma.shop.count(),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.business.count({ where: { isActive: true } }),
  ])

  return {
    totalBusinesses: businessCount,
    activeBusinesses,
    totalShops: shopCount,
    totalUsers: userCount,
  }
}
