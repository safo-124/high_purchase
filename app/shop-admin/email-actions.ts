"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireShopAdminForShop } from "../../lib/auth"
import { sendBulkEmail as sendBulkEmailUtil } from "../../lib/email"
import { EmailStatus } from "../generated/prisma/client"

export type ShopEmailActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface ShopEmailSettingsData {
  fromEmail: string
  fromName: string
  isEnabled: boolean
  isVerified: boolean
}

export interface ShopEmailLogData {
  id: string
  subject: string
  recipientCount: number
  status: EmailStatus
  sentAt: Date | null
  emailType: string | null
  createdAt: Date
}

/**
 * Get email settings for a shop (read-only - from business level)
 */
export async function getShopEmailSettings(shopSlug: string): Promise<ShopEmailSettingsData | null> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  // Get the business email settings
  const shopWithBusiness = await prisma.shop.findUnique({
    where: { id: shop.id },
    include: {
      business: {
        include: {
          emailSettings: true,
        },
      },
    },
  })

  if (!shopWithBusiness?.business.emailSettings) return null

  const settings = shopWithBusiness.business.emailSettings

  // Return read-only settings (no password, SMTP details)
  return {
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    isEnabled: settings.isEnabled,
    isVerified: settings.isVerified,
  }
}

/**
 * Get email logs for a shop (only shop-specific emails)
 */
export async function getShopEmailLogs(
  shopSlug: string,
  page: number = 1,
  limit: number = 20
): Promise<{ logs: ShopEmailLogData[]; total: number }> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  // Get business ID
  const shopWithBusiness = await prisma.shop.findUnique({
    where: { id: shop.id },
    select: { businessId: true },
  })

  if (!shopWithBusiness) {
    return { logs: [], total: 0 }
  }

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where: { 
        businessId: shopWithBusiness.businessId,
        shopId: shop.id,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        subject: true,
        recipientCount: true,
        status: true,
        sentAt: true,
        emailType: true,
        createdAt: true,
      },
    }),
    prisma.emailLog.count({
      where: { 
        businessId: shopWithBusiness.businessId,
        shopId: shop.id,
      },
    }),
  ])

  return { logs, total }
}

/**
 * Get customers for bulk email (shop-specific)
 */
export async function getShopCustomersForEmail(shopSlug: string) {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      email: { not: null },
      emailNotifications: true,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return customers
}

/**
 * Send bulk email (shop admin)
 */
export async function sendShopBulkEmailAction(
  shopSlug: string,
  formData: FormData
): Promise<ShopEmailActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const subject = formData.get("subject") as string
    const body = formData.get("body") as string
    const recipientType = formData.get("recipientType") as string // "all" | "selected"
    const selectedCustomerIds = formData.get("selectedCustomerIds") as string | null

    if (!subject || !body) {
      return { success: false, error: "Subject and body are required" }
    }

    // Get business ID
    const shopWithBusiness = await prisma.shop.findUnique({
      where: { id: shop.id },
      include: {
        business: {
          include: { emailSettings: true },
        },
      },
    })

    if (!shopWithBusiness) {
      return { success: false, error: "Shop not found" }
    }

    if (!shopWithBusiness.business.emailSettings) {
      return { success: false, error: "Email settings not configured by business admin" }
    }

    if (!shopWithBusiness.business.emailSettings.isEnabled) {
      return { success: false, error: "Email sending is disabled by business admin" }
    }

    // Build recipient query
    const recipientQuery: {
      shopId: string
      email: { not: null }
      emailNotifications: boolean
      isActive: boolean
      id?: { in: string[] }
    } = {
      shopId: shop.id,
      email: { not: null },
      emailNotifications: true,
      isActive: true,
    }

    if (recipientType === "selected" && selectedCustomerIds) {
      const ids = JSON.parse(selectedCustomerIds) as string[]
      recipientQuery.id = { in: ids }
    }

    // Get recipients
    const customers = await prisma.customer.findMany({
      where: recipientQuery,
      select: { email: true },
    })

    const emails = customers
      .map((c) => c.email)
      .filter((e): e is string => e !== null)

    if (emails.length === 0) {
      return { success: false, error: "No recipients with valid email addresses" }
    }

    // Send bulk email
    const result = await sendBulkEmailUtil(shopWithBusiness.businessId, {
      recipients: emails,
      subject,
      html: body,
      shopId: shop.id,
      sentByUserId: user.id,
      emailType: "BULK",
    })

    revalidatePath(`/shop-admin/${shopSlug}/email`)
    
    if (result.success) {
      return {
        success: true,
        data: {
          sentCount: result.sentCount,
          failedCount: result.failedCount,
        },
      }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("Shop bulk email error:", error)
    return { success: false, error: "Failed to send bulk email" }
  }
}
