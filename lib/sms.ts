import prisma from "./prisma"
import { SmsStatus, SmsProvider } from "../app/generated/prisma/client"

interface SmsOptions {
  phone: string
  message: string
  shopId?: string
  sentByUserId?: string
  smsType?: string
  metadata?: Record<string, unknown>
}

interface BulkSmsOptions {
  recipients: string[]
  message: string
  shopId?: string
  sentByUserId?: string
  smsType?: string
  metadata?: Record<string, unknown>
}

interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

interface SmsSettingsData {
  provider: SmsProvider
  senderId: string | null
  apiEndpoint: string | null
  apiKey: string | null
  apiSecret: string | null
  httpMethod: string
  requestTemplate: string | null
  headersTemplate: string | null
  successField: string | null
  successValue: string | null
  isEnabled: boolean
}

/**
 * Get SMS settings for a business
 */
export async function getBusinessSmsSettings(businessId: string): Promise<SmsSettingsData | null> {
  const settings = await prisma.smsSettings.findUnique({
    where: { businessId },
  })
  
  if (!settings) return null
  
  return {
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
    isEnabled: settings.isEnabled,
  }
}

/**
 * Replace template placeholders with actual values
 */
function replacePlaceholders(
  template: string,
  values: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value)
  }
  return result
}

/**
 * Send SMS using custom API
 */
async function sendViaCustomApi(
  settings: SmsSettingsData,
  phone: string,
  message: string
): Promise<SmsResult> {
  if (!settings.apiEndpoint) {
    return { success: false, error: "API endpoint not configured" }
  }

  try {
    // Prepare placeholder values
    const placeholderValues: Record<string, string> = {
      phone,
      message,
      senderId: settings.senderId || "",
      apiKey: settings.apiKey || "",
      apiSecret: settings.apiSecret || "",
    }

    // Build request body
    let body: string | undefined
    if (settings.requestTemplate) {
      body = replacePlaceholders(settings.requestTemplate, placeholderValues)
    } else {
      // Default request format
      body = JSON.stringify({
        to: phone,
        message,
        from: settings.senderId,
      })
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    
    if (settings.headersTemplate) {
      try {
        const customHeaders = JSON.parse(
          replacePlaceholders(settings.headersTemplate, placeholderValues)
        )
        Object.assign(headers, customHeaders)
      } catch {
        // Invalid headers template, use defaults
      }
    } else if (settings.apiKey) {
      // Default: Bearer token auth
      headers["Authorization"] = `Bearer ${settings.apiKey}`
    }

    // Make the request
    const response = await fetch(settings.apiEndpoint, {
      method: settings.httpMethod || "POST",
      headers,
      body: settings.httpMethod === "GET" ? undefined : body,
    })

    const responseText = await response.text()
    let responseData: Record<string, unknown> = {}
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // Response is not JSON
    }

    // Check for success
    if (response.ok) {
      // If success field is configured, check it
      if (settings.successField && settings.successValue) {
        const fieldValue = String(responseData[settings.successField] || "")
        if (fieldValue.toLowerCase() !== settings.successValue.toLowerCase()) {
          return {
            success: false,
            error: `Unexpected response: ${settings.successField} = ${fieldValue}`,
          }
        }
      }
      
      return {
        success: true,
        messageId: String(responseData.id || responseData.messageId || responseData.reference || ""),
      }
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText.slice(0, 200)}`,
      }
    }
  } catch (error) {
    console.error("SMS API error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send a single SMS
 */
export async function sendSms(
  businessId: string,
  options: SmsOptions
): Promise<SmsResult> {
  try {
    const settings = await getBusinessSmsSettings(businessId)
    
    if (!settings) {
      return { success: false, error: "SMS settings not configured" }
    }
    
    if (!settings.isEnabled) {
      return { success: false, error: "SMS sending is disabled" }
    }

    // Create log entry
    const smsLog = await prisma.smsLog.create({
      data: {
        businessId,
        shopId: options.shopId,
        recipientPhone: options.phone,
        message: options.message,
        senderId: settings.senderId,
        status: SmsStatus.PENDING,
        sentByUserId: options.sentByUserId,
        smsType: options.smsType || "INDIVIDUAL",
        metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
      },
    })

    let result: SmsResult

    // Send based on provider
    switch (settings.provider) {
      case SmsProvider.CUSTOM_API:
        result = await sendViaCustomApi(settings, options.phone, options.message)
        break
      // Add other providers here later
      case SmsProvider.HUBTEL:
      case SmsProvider.ARKESEL:
      case SmsProvider.MNOTIFY:
        result = { success: false, error: `${settings.provider} not yet implemented` }
        break
      default:
        result = { success: false, error: "Unknown SMS provider" }
    }

    // Update log with result
    await prisma.smsLog.update({
      where: { id: smsLog.id },
      data: {
        status: result.success ? SmsStatus.SENT : SmsStatus.FAILED,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error || null,
        providerRef: result.messageId || null,
      },
    })

    return result
  } catch (error) {
    console.error("Send SMS error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSms(
  businessId: string,
  options: BulkSmsOptions
): Promise<{ success: boolean; sentCount: number; failedCount: number; error?: string }> {
  try {
    const settings = await getBusinessSmsSettings(businessId)
    
    if (!settings) {
      return { success: false, sentCount: 0, failedCount: 0, error: "SMS settings not configured" }
    }
    
    if (!settings.isEnabled) {
      return { success: false, sentCount: 0, failedCount: 0, error: "SMS sending is disabled" }
    }

    let sentCount = 0
    let failedCount = 0

    // Send SMS in batches to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < options.recipients.length; i += batchSize) {
      const batch = options.recipients.slice(i, i + batchSize)
      
      const promises = batch.map(async (phone) => {
        const result = await sendSms(businessId, {
          phone,
          message: options.message,
          shopId: options.shopId,
          sentByUserId: options.sentByUserId,
          smsType: options.smsType || "BULK",
          metadata: options.metadata,
        })
        
        if (result.success) {
          sentCount++
        } else {
          failedCount++
        }
      })
      
      await Promise.all(promises)
      
      // Small delay between batches
      if (i + batchSize < options.recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
    }
  } catch (error) {
    console.error("Bulk SMS error:", error)
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send a test SMS to verify configuration
 */
export async function sendTestSms(
  settings: {
    provider: SmsProvider
    senderId: string | null
    apiEndpoint: string | null
    apiKey: string | null
    apiSecret: string | null
    httpMethod: string
    requestTemplate: string | null
    headersTemplate: string | null
    successField: string | null
    successValue: string | null
  },
  testPhone: string
): Promise<SmsResult> {
  const testMessage = `Test SMS from High Purchase - ${new Date().toLocaleTimeString()}`
  
  const fullSettings: SmsSettingsData = {
    ...settings,
    isEnabled: true,
  }
  
  return sendViaCustomApi(fullSettings, testPhone, testMessage)
}

/**
 * SMS template for payment reminders
 */
export function getPaymentReminderSms(data: {
  customerName: string
  amount: number
  dueDate: string
  shopName: string
}): string {
  return `Dear ${data.customerName}, your payment of GHS ${data.amount.toLocaleString()} is due on ${data.dueDate}. Please pay on time to avoid late fees. - ${data.shopName}`
}

/**
 * SMS template for payment confirmation
 */
export function getPaymentConfirmationSms(data: {
  customerName: string
  amount: number
  balance: number
  shopName: string
}): string {
  return `Dear ${data.customerName}, payment of GHS ${data.amount.toLocaleString()} received. ${data.balance > 0 ? `Balance: GHS ${data.balance.toLocaleString()}` : "Account fully paid!"}. Thank you! - ${data.shopName}`
}

/**
 * SMS template for welcome messages
 */
export function getWelcomeSms(data: {
  customerName: string
  shopName: string
}): string {
  return `Welcome ${data.customerName}! Thank you for joining ${data.shopName}. We're excited to serve you with our Buy Now, Pay Later service.`
}
