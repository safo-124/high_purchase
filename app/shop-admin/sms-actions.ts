"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireShopAdminForShop } from "../../lib/auth"
import { sendBulkSms as sendBulkSmsUtil } from "../../lib/sms"
import { SmsStatus, SmsProvider } from "../generated/prisma/client"

export type SmsActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface ShopSmsSettingsData {
  provider: SmsProvider
  senderId: string | null
  isEnabled: boolean
  isVerified: boolean
}

export interface SmsLogData {
  id: string
  recipientPhone: string
  message: string
  status: SmsStatus
  sentAt: Date | null
  smsType: string | null
  createdAt: Date
}

/**
 * Get SMS settings for a shop (read-only, from business)
 */
export async function getShopSmsSettings(shopSlug: string): Promise<ShopSmsSettingsData | null> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const settings = await prisma.smsSettings.findUnique({
    where: { businessId: shop.businessId },
    select: {
      provider: true,
      senderId: true,
      isEnabled: true,
      isVerified: true,
    },
  })

  return settings
}

/**
 * Get SMS logs for a shop (only logs for this shop)
 */
export async function getShopSmsLogs(
  shopSlug: string,
  page: number = 1,
  limit: number = 20
): Promise<{ logs: SmsLogData[]; total: number }> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const [logs, total] = await Promise.all([
    prisma.smsLog.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        recipientPhone: true,
        message: true,
        status: true,
        sentAt: true,
        smsType: true,
        createdAt: true,
      },
    }),
    prisma.smsLog.count({
      where: { shopId: shop.id },
    }),
  ])

  return { logs, total }
}

/**
 * Get customers for bulk SMS (shop admin - only this shop's customers)
 */
export async function getShopCustomersForSms(shopSlug: string) {
  const { shop } = await requireShopAdminForShop(shopSlug)

  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      smsNotifications: true,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return { customers }
}

/**
 * Send bulk SMS (shop admin - only to this shop's customers)
 */
export async function sendShopBulkSmsAction(
  shopSlug: string,
  formData: FormData
): Promise<SmsActionResult> {
  try {
    const { user, shop } = await requireShopAdminForShop(shopSlug)

    const message = formData.get("message") as string
    const recipientType = formData.get("recipientType") as string // "all" | "selected"
    const selectedCustomerIds = formData.get("selectedCustomerIds") as string | null

    if (!message) {
      return { success: false, error: "Message is required" }
    }

    if (message.length > 160) {
      return { success: false, error: "Message must be 160 characters or less" }
    }

    // Build recipient query
    let recipientQuery: {
      shopId: string
      smsNotifications: boolean
      isActive: boolean
      id?: { in: string[] }
    } = {
      shopId: shop.id,
      smsNotifications: true,
      isActive: true,
    }

    if (recipientType === "selected" && selectedCustomerIds) {
      const ids = JSON.parse(selectedCustomerIds) as string[]
      recipientQuery.id = { in: ids }
    }

    // Get recipients
    const customers = await prisma.customer.findMany({
      where: recipientQuery,
      select: { phone: true },
    })

    const phones = customers.map((c) => c.phone)

    if (phones.length === 0) {
      return { success: false, error: "No recipients found" }
    }

    // Send bulk SMS using the business ID
    const result = await sendBulkSmsUtil(shop.businessId, {
      recipients: phones,
      message,
      shopId: shop.id,
      sentByUserId: user.id,
      smsType: "BULK",
    })

    revalidatePath(`/shop-admin/${shopSlug}/sms`)

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
    console.error("Shop bulk SMS error:", error)
    return { success: false, error: "Failed to send bulk SMS" }
  }
}
