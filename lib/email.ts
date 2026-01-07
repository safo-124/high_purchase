import nodemailer from "nodemailer"
import prisma from "./prisma"
import { EmailStatus } from "../app/generated/prisma/client"

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

interface BulkEmailOptions {
  recipients: string[]
  subject: string
  html: string
  text?: string
  shopId?: string
  sentByUserId?: string
  emailType?: string
  metadata?: Record<string, unknown>
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Get email settings for a business
 */
export async function getBusinessEmailSettings(businessId: string) {
  const settings = await prisma.emailSettings.findUnique({
    where: { businessId },
  })
  return settings
}

/**
 * Create nodemailer transporter from email settings
 */
function createTransporter(settings: {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpSecure: boolean
}) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure, // true for 465, false for other ports
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
  })
}

/**
 * Send a single email using business email settings
 */
export async function sendEmail(
  businessId: string,
  options: EmailOptions
): Promise<EmailResult> {
  try {
    const settings = await getBusinessEmailSettings(businessId)
    
    if (!settings) {
      return { success: false, error: "Email settings not configured" }
    }
    
    if (!settings.isEnabled) {
      return { success: false, error: "Email sending is disabled" }
    }
    
    const transporter = createTransporter(settings)
    
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    
    const mailOptions = {
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: recipients.join(", "),
      replyTo: settings.replyToEmail || settings.fromEmail,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for plain text
    }
    
    const result = await transporter.sendMail(mailOptions)
    
    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error("Email sending error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send bulk email to multiple recipients and log the result
 */
export async function sendBulkEmail(
  businessId: string,
  options: BulkEmailOptions
): Promise<{ success: boolean; logId?: string; error?: string; sentCount?: number; failedCount?: number }> {
  try {
    const settings = await getBusinessEmailSettings(businessId)
    
    if (!settings) {
      return { success: false, error: "Email settings not configured" }
    }
    
    if (!settings.isEnabled) {
      return { success: false, error: "Email sending is disabled" }
    }
    
    // Create email log entry
    const emailLog = await prisma.emailLog.create({
      data: {
        businessId,
        shopId: options.shopId,
        subject: options.subject,
        body: options.html,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        recipientEmails: options.recipients,
        recipientCount: options.recipients.length,
        status: EmailStatus.PENDING,
        sentByUserId: options.sentByUserId,
        emailType: options.emailType || "BULK",
        metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
      },
    })
    
    const transporter = createTransporter(settings)
    
    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []
    
    // Send emails in batches to avoid rate limiting
    const batchSize = 10
    for (let i = 0; i < options.recipients.length; i += batchSize) {
      const batch = options.recipients.slice(i, i + batchSize)
      
      const promises = batch.map(async (recipient) => {
        try {
          await transporter.sendMail({
            from: `"${settings.fromName}" <${settings.fromEmail}>`,
            to: recipient,
            replyTo: settings.replyToEmail || settings.fromEmail,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ""),
          })
          sentCount++
        } catch (error) {
          failedCount++
          const errorMsg = error instanceof Error ? error.message : "Unknown error"
          errors.push(`${recipient}: ${errorMsg}`)
        }
      })
      
      await Promise.all(promises)
      
      // Small delay between batches
      if (i + batchSize < options.recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    
    // Update email log with results
    const finalStatus = failedCount === options.recipients.length
      ? EmailStatus.FAILED
      : EmailStatus.SENT
    
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        errorMessage: errors.length > 0 ? errors.join("; ") : null,
      },
    })
    
    return {
      success: sentCount > 0,
      logId: emailLog.id,
      sentCount,
      failedCount,
    }
  } catch (error) {
    console.error("Bulk email error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send a test email to verify SMTP settings
 */
export async function sendTestEmail(
  settings: {
    fromEmail: string
    fromName: string
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    smtpSecure: boolean
    replyToEmail?: string
  },
  testEmail: string
): Promise<EmailResult> {
  try {
    const transporter = createTransporter(settings)
    
    // Verify connection
    await transporter.verify()
    
    // Send test email
    const result = await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: testEmail,
      replyTo: settings.replyToEmail || settings.fromEmail,
      subject: "Test Email - High Purchase",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">✓ Email Configuration Successful!</h2>
          <p>This is a test email to confirm your email settings are working correctly.</p>
          <p style="color: #64748b; font-size: 14px;">Sent from: ${settings.fromName} &lt;${settings.fromEmail}&gt;</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px;">This is an automated test email from High Purchase.</p>
        </div>
      `,
      text: "Email Configuration Successful! This is a test email to confirm your email settings are working correctly.",
    })
    
    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error("Test email error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Email template for payment reminders
 */
export function getPaymentReminderTemplate(data: {
  customerName: string
  shopName: string
  amount: number
  dueDate: string
  purchaseNumber: string
}): { subject: string; html: string } {
  return {
    subject: `Payment Reminder - ${data.purchaseNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">Payment Reminder</h2>
        <p>Dear ${data.customerName},</p>
        <p>This is a friendly reminder that you have a payment due for your purchase.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Purchase:</strong> ${data.purchaseNumber}</p>
          <p style="margin: 10px 0 0;"><strong>Amount Due:</strong> GHS ${data.amount.toLocaleString()}</p>
          <p style="margin: 10px 0 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
        </div>
        <p>Please make your payment at your earliest convenience to avoid any late fees.</p>
        <p>Thank you for your business!</p>
        <p style="color: #64748b;">Best regards,<br>${data.shopName}</p>
      </div>
    `,
  }
}

/**
 * Email template for welcome messages
 */
export function getWelcomeTemplate(data: {
  customerName: string
  shopName: string
}): { subject: string; html: string } {
  return {
    subject: `Welcome to ${data.shopName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">Welcome!</h2>
        <p>Dear ${data.customerName},</p>
        <p>Thank you for joining ${data.shopName}! We're excited to have you as a customer.</p>
        <p>With our Buy Now, Pay Later service, you can shop with confidence and pay in convenient installments.</p>
        <p>If you have any questions, feel free to reach out to us.</p>
        <p style="color: #64748b;">Best regards,<br>${data.shopName}</p>
      </div>
    `,
  }
}
