"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin } from "../../lib/auth"
import { sendTestSms as sendTestSmsUtil, sendBulkSms as sendBulkSmsUtil } from "../../lib/sms"
import { SmsStatus, SmsProvider } from "../generated/prisma/client"

export type SmsActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface SmsSettingsData {
  id: string
  provider: SmsProvider
  senderId: string | null
  apiEndpoint: string | null
  httpMethod: string
  requestTemplate: string | null
  headersTemplate: string | null
  successField: string | null
  successValue: string | null
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
 * Get SMS settings for a business (business admin only)
 */
export async function getSmsSettings(businessSlug: string): Promise<SmsSettingsData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const settings = await prisma.smsSettings.findUnique({
    where: { businessId: business.id },
  })

  if (!settings) return null

  // Don't return sensitive data like apiKey/apiSecret
  return {
    id: settings.id,
    provider: settings.provider,
    senderId: settings.senderId,
    apiEndpoint: settings.apiEndpoint,
    httpMethod: settings.httpMethod,
    requestTemplate: settings.requestTemplate,
    headersTemplate: settings.headersTemplate,
    successField: settings.successField,
    successValue: settings.successValue,
    isEnabled: settings.isEnabled,
    isVerified: settings.isVerified,
  }
}

/**
 * Update SMS settings (business admin only)
 */
export async function updateSmsSettings(
  businessSlug: string,
  formData: FormData
): Promise<SmsActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const provider = formData.get("provider") as SmsProvider
    const senderId = formData.get("senderId") as string | null
    const apiEndpoint = formData.get("apiEndpoint") as string | null
    const apiKey = formData.get("apiKey") as string | null
    const apiSecret = formData.get("apiSecret") as string | null
    const httpMethod = (formData.get("httpMethod") as string) || "POST"
    const requestTemplate = formData.get("requestTemplate") as string | null
    const headersTemplate = formData.get("headersTemplate") as string | null
    const successField = formData.get("successField") as string | null
    const successValue = formData.get("successValue") as string | null
    const isEnabled = formData.get("isEnabled") === "true"

    // Validation for Custom API
    if (provider === SmsProvider.CUSTOM_API && !apiEndpoint) {
      return { success: false, error: "API endpoint is required for Custom API" }
    }

    // Check if settings already exist
    const existingSettings = await prisma.smsSettings.findUnique({
      where: { businessId: business.id },
    })

    // Prepare data
    const data: {
      provider: SmsProvider
      senderId: string | null
      apiEndpoint: string | null
      apiKey?: string | null
      apiSecret?: string | null
      httpMethod: string
      requestTemplate: string | null
      headersTemplate: string | null
      successField: string | null
      successValue: string | null
      isEnabled: boolean
      isVerified: boolean
    } = {
      provider,
      senderId: senderId || null,
      apiEndpoint: apiEndpoint || null,
      httpMethod,
      requestTemplate: requestTemplate || null,
      headersTemplate: headersTemplate || null,
      successField: successField || null,
      successValue: successValue || null,
      isEnabled,
      isVerified: false, // Reset verification when settings change
    }

    // Only update keys if provided
    if (apiKey && apiKey.trim().length > 0) {
      data.apiKey = apiKey
    }
    if (apiSecret && apiSecret.trim().length > 0) {
      data.apiSecret = apiSecret
    }

    if (existingSettings) {
      // Keep existing keys if not provided
      if (!apiKey || apiKey.trim().length === 0) {
        delete data.apiKey
      }
      if (!apiSecret || apiSecret.trim().length === 0) {
        delete data.apiSecret
      }
      await prisma.smsSettings.update({
        where: { businessId: business.id },
        data,
      })
    } else {
      await prisma.smsSettings.create({
        data: {
          ...data,
          businessId: business.id,
          apiKey: apiKey || null,
          apiSecret: apiSecret || null,
        },
      })
    }

    revalidatePath(`/business-admin/${businessSlug}/settings/sms`)
    return { success: true }
  } catch (error) {
    console.error("Update SMS settings error:", error)
    return { success: false, error: "Failed to update SMS settings" }
  }
}

/**
 * Send a test SMS (business admin only)
 */
export async function sendTestSmsAction(
  businessSlug: string,
  testPhone: string
): Promise<SmsActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const settings = await prisma.smsSettings.findUnique({
      where: { businessId: business.id },
    })

    if (!settings) {
      return { success: false, error: "SMS settings not configured" }
    }

    const result = await sendTestSmsUtil(
      {
        provider: settings.provider,
        senderId: settings.senderId,
        apiEndpoint: settings.apiEndpoint,
        apiKey: settings.apiKey,
        apiSecret: settings.apiSecret,
        httpMethod: settings.httpMethod,
        requestTemplate: settings.requestTemplate,
        headersTemplate: settings.headersTemplate,
        successField: settings.successField,
        successValue: settings.successValue,
      },
      testPhone
    )

    if (result.success) {
      // Mark settings as verified
      await prisma.smsSettings.update({
        where: { businessId: business.id },
        data: { isVerified: true },
      })
      revalidatePath(`/business-admin/${businessSlug}/settings/sms`)
    }

    return result.success
      ? { success: true, data: { messageId: result.messageId } }
      : { success: false, error: result.error }
  } catch (error) {
    console.error("Test SMS error:", error)
    return { success: false, error: "Failed to send test SMS" }
  }
}

/**
 * Get SMS logs for a business (paginated)
 */
export async function getSmsLogs(
  businessSlug: string,
  page: number = 1,
  limit: number = 20
): Promise<{ logs: SmsLogData[]; total: number }> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const [logs, total] = await Promise.all([
    prisma.smsLog.findMany({
      where: { businessId: business.id },
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
      where: { businessId: business.id },
    }),
  ])

  return { logs, total }
}

/**
 * Get customers for bulk SMS (with phone numbers)
 */
export async function getCustomersForSms(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  // Get all shops for this business
  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })

  const shopIds = shops.map((s) => s.id)

  // Get customers with phones from all shops
  const customers = await prisma.customer.findMany({
    where: {
      shopId: { in: shopIds },
      smsNotifications: true,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      shopId: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  return {
    customers,
    shops: shops.map((s) => ({ id: s.id, name: s.name })),
  }
}

/**
 * Send bulk SMS (business admin)
 */
export async function sendBulkSmsAction(
  businessSlug: string,
  formData: FormData
): Promise<SmsActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const message = formData.get("message") as string
    const recipientType = formData.get("recipientType") as string // "all" | "shop" | "selected"
    const shopId = formData.get("shopId") as string | null
    const selectedCustomerIds = formData.get("selectedCustomerIds") as string | null

    if (!message) {
      return { success: false, error: "Message is required" }
    }

    if (message.length > 160) {
      return { success: false, error: "Message must be 160 characters or less" }
    }

    // Get shops for this business
    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true },
    })
    const shopIds = shops.map((s) => s.id)

    // Build recipient query
    let recipientQuery: {
      shopId: { in: string[] } | string
      smsNotifications: boolean
      isActive: boolean
      id?: { in: string[] }
    } = {
      shopId: { in: shopIds },
      smsNotifications: true,
      isActive: true,
    }

    if (recipientType === "shop" && shopId) {
      recipientQuery.shopId = shopId
    } else if (recipientType === "selected" && selectedCustomerIds) {
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

    // Send bulk SMS
    const result = await sendBulkSmsUtil(business.id, {
      recipients: phones,
      message,
      shopId: shopId || undefined,
      sentByUserId: user.id,
      smsType: "BULK",
    })

    revalidatePath(`/business-admin/${businessSlug}/sms`)
    
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
    console.error("Bulk SMS error:", error)
    return { success: false, error: "Failed to send bulk SMS" }
  }
}
