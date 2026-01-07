"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin } from "../../lib/auth"
import { sendTestEmail as sendTestEmailUtil, sendBulkEmail as sendBulkEmailUtil } from "../../lib/email"
import { EmailStatus } from "../generated/prisma/client"

export type EmailActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface EmailSettingsData {
  id: string
  fromEmail: string
  fromName: string
  replyToEmail: string | null
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpSecure: boolean
  isEnabled: boolean
  isVerified: boolean
}

export interface EmailLogData {
  id: string
  subject: string
  recipientCount: number
  status: EmailStatus
  sentAt: Date | null
  emailType: string | null
  createdAt: Date
}

/**
 * Get email settings for a business (business admin only)
 */
export async function getEmailSettings(businessSlug: string): Promise<EmailSettingsData | null> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const settings = await prisma.emailSettings.findUnique({
    where: { businessId: business.id },
  })

  if (!settings) return null

  // Don't return the password
  return {
    id: settings.id,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    replyToEmail: settings.replyToEmail,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpSecure: settings.smtpSecure,
    isEnabled: settings.isEnabled,
    isVerified: settings.isVerified,
  }
}

/**
 * Update email settings (business admin only)
 */
export async function updateEmailSettings(
  businessSlug: string,
  formData: FormData
): Promise<EmailActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const fromEmail = formData.get("fromEmail") as string
    const fromName = formData.get("fromName") as string
    const replyToEmail = formData.get("replyToEmail") as string | null
    const smtpHost = formData.get("smtpHost") as string
    const smtpPort = parseInt(formData.get("smtpPort") as string, 10)
    const smtpUser = formData.get("smtpUser") as string
    const smtpPassword = formData.get("smtpPassword") as string | null
    const smtpSecure = formData.get("smtpSecure") === "true"
    const isEnabled = formData.get("isEnabled") === "true"

    // Validation
    if (!fromEmail || !fromName || !smtpHost || !smtpUser) {
      return { success: false, error: "All required fields must be filled" }
    }

    if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return { success: false, error: "Invalid SMTP port" }
    }

    // Check if settings already exist
    const existingSettings = await prisma.emailSettings.findUnique({
      where: { businessId: business.id },
    })

    // Prepare data for update/create
    const data: {
      fromEmail: string
      fromName: string
      replyToEmail: string | null
      smtpHost: string
      smtpPort: number
      smtpUser: string
      smtpSecure: boolean
      isEnabled: boolean
      smtpPassword?: string
      isVerified: boolean
    } = {
      fromEmail,
      fromName,
      replyToEmail: replyToEmail || null,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpSecure,
      isEnabled,
      isVerified: false, // Reset verification when settings change
    }

    // Only update password if provided
    if (smtpPassword && smtpPassword.trim().length > 0) {
      data.smtpPassword = smtpPassword
    }

    if (existingSettings) {
      // Update existing settings
      if (!smtpPassword || smtpPassword.trim().length === 0) {
        // Keep existing password
        delete data.smtpPassword
      }
      await prisma.emailSettings.update({
        where: { businessId: business.id },
        data,
      })
    } else {
      // Create new settings - password is required
      if (!smtpPassword || smtpPassword.trim().length === 0) {
        return { success: false, error: "SMTP password is required for new configuration" }
      }
      await prisma.emailSettings.create({
        data: {
          ...data,
          businessId: business.id,
          smtpPassword: smtpPassword,
        },
      })
    }

    revalidatePath(`/business-admin/${businessSlug}/settings/email`)
    return { success: true }
  } catch (error) {
    console.error("Update email settings error:", error)
    return { success: false, error: "Failed to update email settings" }
  }
}

/**
 * Send a test email (business admin only)
 */
export async function sendTestEmailAction(
  businessSlug: string,
  testEmail: string
): Promise<EmailActionResult> {
  try {
    const { business } = await requireBusinessAdmin(businessSlug)

    const settings = await prisma.emailSettings.findUnique({
      where: { businessId: business.id },
    })

    if (!settings) {
      return { success: false, error: "Email settings not configured" }
    }

    const result = await sendTestEmailUtil(
      {
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPassword: settings.smtpPassword,
        smtpSecure: settings.smtpSecure,
        replyToEmail: settings.replyToEmail || undefined,
      },
      testEmail
    )

    if (result.success) {
      // Mark settings as verified
      await prisma.emailSettings.update({
        where: { businessId: business.id },
        data: { isVerified: true },
      })
      revalidatePath(`/business-admin/${businessSlug}/settings/email`)
    }

    return result.success
      ? { success: true, data: { messageId: result.messageId } }
      : { success: false, error: result.error }
  } catch (error) {
    console.error("Test email error:", error)
    return { success: false, error: "Failed to send test email" }
  }
}

/**
 * Get email logs for a business (paginated)
 */
export async function getEmailLogs(
  businessSlug: string,
  page: number = 1,
  limit: number = 20
): Promise<{ logs: EmailLogData[]; total: number }> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where: { businessId: business.id },
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
      where: { businessId: business.id },
    }),
  ])

  return { logs, total }
}

/**
 * Get customers for bulk email (with email addresses)
 */
export async function getCustomersForEmail(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  // Get all shops for this business
  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })

  const shopIds = shops.map((s) => s.id)

  // Get customers with emails from all shops
  const customers = await prisma.customer.findMany({
    where: {
      shopId: { in: shopIds },
      email: { not: null },
      emailNotifications: true,
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
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
 * Send bulk email (business admin)
 */
export async function sendBulkEmailAction(
  businessSlug: string,
  formData: FormData
): Promise<EmailActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const subject = formData.get("subject") as string
    const body = formData.get("body") as string
    const recipientType = formData.get("recipientType") as string // "all" | "shop" | "selected"
    const shopId = formData.get("shopId") as string | null
    const selectedCustomerIds = formData.get("selectedCustomerIds") as string | null

    if (!subject || !body) {
      return { success: false, error: "Subject and body are required" }
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
      email: { not: null }
      emailNotifications: boolean
      isActive: boolean
      id?: { in: string[] }
    } = {
      shopId: { in: shopIds },
      email: { not: null },
      emailNotifications: true,
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
      select: { email: true },
    })

    const emails = customers
      .map((c) => c.email)
      .filter((e): e is string => e !== null)

    if (emails.length === 0) {
      return { success: false, error: "No recipients with valid email addresses" }
    }

    // Send bulk email
    const result = await sendBulkEmailUtil(business.id, {
      recipients: emails,
      subject,
      html: body,
      shopId: shopId || undefined,
      sentByUserId: user.id,
      emailType: "BULK",
    })

    revalidatePath(`/business-admin/${businessSlug}/email`)
    
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
    console.error("Bulk email error:", error)
    return { success: false, error: "Failed to send bulk email" }
  }
}
