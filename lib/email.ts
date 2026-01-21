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

/**
 * Email template for collection receipt
 */
export function getCollectionReceiptTemplate(data: {
  receiptNumber: string
  customerName: string
  customerPhone: string
  shopName: string
  businessName: string
  collectorName: string
  collectorPhone?: string
  amount: number
  paymentMethod: string
  reference?: string | null
  purchaseNumber: string
  totalPurchaseAmount: number
  previousAmountPaid: number
  newAmountPaid: number
  outstandingBalance: number
  collectionDate: string
  collectionTime: string
  notes?: string | null
  recipientType: "customer" | "collector" | "shop_admin" | "business_admin"
}): { subject: string; html: string } {
  const formatCurrency = (amount: number) => `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
  
  const recipientGreeting = {
    customer: `Dear ${data.customerName}`,
    collector: `Dear ${data.collectorName}`,
    shop_admin: `Dear Shop Admin`,
    business_admin: `Dear Business Admin`,
  }[data.recipientType]
  
  const introText = {
    customer: "Thank you for your payment! This is your official receipt for the payment collected.",
    collector: "This is a confirmation receipt for the payment you collected.",
    shop_admin: "A payment has been collected by a debt collector. This receipt is for your records.",
    business_admin: "A payment has been collected at one of your shops. This receipt is for your records.",
  }[data.recipientType]

  return {
    subject: `Payment Receipt #${data.receiptNumber} - ${data.shopName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f8fafc;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Receipt</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">${data.businessName}</p>
        </div>
        
        <!-- Receipt Number -->
        <div style="background: #0f172a; padding: 15px 20px; text-align: center;">
          <p style="color: #94a3b8; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Receipt Number</p>
          <p style="color: #22d3ee; margin: 5px 0 0; font-size: 20px; font-weight: bold;">${data.receiptNumber}</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px 20px; background: white;">
          <p style="color: #334155; margin: 0 0 20px;">${recipientGreeting},</p>
          <p style="color: #64748b; margin: 0 0 25px;">${introText}</p>
          
          <!-- Payment Details Card -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #0f172a; margin: 0 0 15px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${data.collectionDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${data.collectionTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Payment Method</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${data.paymentMethod.replace("_", " ")}</td>
              </tr>
              ${data.reference ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Reference</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${data.reference}</td>
              </tr>
              ` : ""}
            </table>
          </div>
          
          <!-- Amount Collected (Highlighted) -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 25px;">
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Amount Collected</p>
            <p style="color: white; margin: 10px 0 0; font-size: 32px; font-weight: bold;">${formatCurrency(data.amount)}</p>
          </div>
          
          <!-- Purchase Summary -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #0f172a; margin: 0 0 15px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Purchase Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Purchase Number</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${data.purchaseNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Total Purchase Amount</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.totalPurchaseAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Previous Amount Paid</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.previousAmountPaid)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">This Payment</td>
                <td style="padding: 8px 0; color: #10b981; font-size: 14px; text-align: right; font-weight: 600;">+ ${formatCurrency(data.amount)}</td>
              </tr>
              <tr style="border-top: 2px solid #e2e8f0;">
                <td style="padding: 12px 0 8px; color: #0f172a; font-size: 15px; font-weight: 600;">New Total Paid</td>
                <td style="padding: 12px 0 8px; color: #0f172a; font-size: 15px; text-align: right; font-weight: 600;">${formatCurrency(data.newAmountPaid)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: ${data.outstandingBalance > 0 ? '#f59e0b' : '#10b981'}; font-size: 15px; font-weight: 600;">Outstanding Balance</td>
                <td style="padding: 8px 0; color: ${data.outstandingBalance > 0 ? '#f59e0b' : '#10b981'}; font-size: 15px; text-align: right; font-weight: 600;">${formatCurrency(data.outstandingBalance)}</td>
              </tr>
            </table>
          </div>
          
          <!-- Customer & Collector Info -->
          <div style="display: flex; gap: 15px; margin-bottom: 25px;">
            <div style="flex: 1; background: #f1f5f9; border-radius: 12px; padding: 15px;">
              <h4 style="color: #64748b; margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Customer</h4>
              <p style="color: #0f172a; margin: 0; font-weight: 500;">${data.customerName}</p>
              <p style="color: #64748b; margin: 5px 0 0; font-size: 13px;">${data.customerPhone}</p>
            </div>
            <div style="flex: 1; background: #f1f5f9; border-radius: 12px; padding: 15px;">
              <h4 style="color: #64748b; margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Collected By</h4>
              <p style="color: #0f172a; margin: 0; font-weight: 500;">${data.collectorName}</p>
              ${data.collectorPhone ? `<p style="color: #64748b; margin: 5px 0 0; font-size: 13px;">${data.collectorPhone}</p>` : ""}
            </div>
          </div>
          
          ${data.notes ? `
          <!-- Notes -->
          <div style="background: #fef3c7; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
            <h4 style="color: #92400e; margin: 0 0 8px; font-size: 13px;">Notes</h4>
            <p style="color: #78350f; margin: 0; font-size: 14px;">${data.notes}</p>
          </div>
          ` : ""}
          
          <!-- Status Notice for Non-Customer -->
          ${data.recipientType !== "customer" ? `
          <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
            <p style="color: #854d0e; margin: 0; font-size: 13px;">
              <strong>⏳ Pending Confirmation:</strong> This payment is awaiting confirmation from the shop admin. The customer's balance will be updated once confirmed.
            </p>
          </div>
          ` : ""}
        </div>
        
        <!-- Footer -->
        <div style="background: #0f172a; padding: 25px 20px; text-align: center;">
          <p style="color: #94a3b8; margin: 0; font-size: 13px;">${data.shopName}</p>
          <p style="color: #64748b; margin: 10px 0 0; font-size: 12px;">This is an automated receipt. Please keep it for your records.</p>
          <p style="color: #475569; margin: 15px 0 0; font-size: 11px;">© ${new Date().getFullYear()} ${data.businessName}. All rights reserved.</p>
        </div>
      </div>
    `,
  }
}

/**
 * Send collection receipt to all relevant parties
 */
export async function sendCollectionReceipt(data: {
  businessId: string
  receiptNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  shopName: string
  businessName: string
  collectorName: string
  collectorEmail: string
  collectorPhone?: string
  shopAdminEmail?: string | null
  businessAdminEmail?: string | null
  amount: number
  paymentMethod: string
  reference?: string | null
  purchaseNumber: string
  totalPurchaseAmount: number
  previousAmountPaid: number
  newAmountPaid: number
  outstandingBalance: number
  collectionDate: string
  collectionTime: string
  notes?: string | null
}): Promise<{ success: boolean; sentTo: string[]; errors: string[] }> {
  const sentTo: string[] = []
  const errors: string[] = []
  
  const baseData = {
    receiptNumber: data.receiptNumber,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    shopName: data.shopName,
    businessName: data.businessName,
    collectorName: data.collectorName,
    collectorPhone: data.collectorPhone,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    reference: data.reference,
    purchaseNumber: data.purchaseNumber,
    totalPurchaseAmount: data.totalPurchaseAmount,
    previousAmountPaid: data.previousAmountPaid,
    newAmountPaid: data.newAmountPaid,
    outstandingBalance: data.outstandingBalance,
    collectionDate: data.collectionDate,
    collectionTime: data.collectionTime,
    notes: data.notes,
  }
  
  // Send to customer if email exists
  if (data.customerEmail) {
    const template = getCollectionReceiptTemplate({ ...baseData, recipientType: "customer" })
    const result = await sendEmail(data.businessId, {
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
    })
    if (result.success) {
      sentTo.push(`Customer (${data.customerEmail})`)
    } else {
      errors.push(`Customer: ${result.error}`)
    }
  }
  
  // Send to collector
  if (data.collectorEmail) {
    const template = getCollectionReceiptTemplate({ ...baseData, recipientType: "collector" })
    const result = await sendEmail(data.businessId, {
      to: data.collectorEmail,
      subject: template.subject,
      html: template.html,
    })
    if (result.success) {
      sentTo.push(`Collector (${data.collectorEmail})`)
    } else {
      errors.push(`Collector: ${result.error}`)
    }
  }
  
  // Send to shop admin if email exists
  if (data.shopAdminEmail) {
    const template = getCollectionReceiptTemplate({ ...baseData, recipientType: "shop_admin" })
    const result = await sendEmail(data.businessId, {
      to: data.shopAdminEmail,
      subject: template.subject,
      html: template.html,
    })
    if (result.success) {
      sentTo.push(`Shop Admin (${data.shopAdminEmail})`)
    } else {
      errors.push(`Shop Admin: ${result.error}`)
    }
  }
  
  // Send to business admin if email exists
  if (data.businessAdminEmail) {
    const template = getCollectionReceiptTemplate({ ...baseData, recipientType: "business_admin" })
    const result = await sendEmail(data.businessId, {
      to: data.businessAdminEmail,
      subject: template.subject,
      html: template.html,
    })
    if (result.success) {
      sentTo.push(`Business Admin (${data.businessAdminEmail})`)
    } else {
      errors.push(`Business Admin: ${result.error}`)
    }
  }
  
  return {
    success: sentTo.length > 0,
    sentTo,
    errors,
  }
}

// ============================================
// ACCOUNT CREATION EMAIL
// ============================================

interface AccountCreationEmailParams {
  businessId: string
  recipientEmail: string
  recipientName: string
  businessName: string
  businessLogoUrl?: string | null
  accountEmail: string
  temporaryPassword: string
  role: "BUSINESS_ADMIN" | "SHOP_ADMIN" | "SALES_STAFF" | "DEBT_COLLECTOR"
  shopName?: string | null
  loginUrl?: string
}

function getRoleDisplayName(role: AccountCreationEmailParams["role"]): string {
  switch (role) {
    case "BUSINESS_ADMIN":
      return "Business Administrator"
    case "SHOP_ADMIN":
      return "Shop Administrator"
    case "SALES_STAFF":
      return "Sales Staff"
    case "DEBT_COLLECTOR":
      return "Debt Collector"
    default:
      return "User"
  }
}

/**
 * Send account creation email with login credentials
 */
export async function sendAccountCreationEmail(params: AccountCreationEmailParams): Promise<{ success: boolean; error?: string }> {
  const {
    businessId,
    recipientEmail,
    recipientName,
    businessName,
    businessLogoUrl,
    accountEmail,
    temporaryPassword,
    role,
    shopName,
    loginUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  } = params

  const roleDisplay = getRoleDisplayName(role)

  const logoHtml = businessLogoUrl 
    ? `<img src="${businessLogoUrl}" alt="${businessName}" style="max-width: 120px; max-height: 80px; margin-bottom: 20px; border-radius: 8px;" />`
    : `<div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <span style="color: white; font-size: 24px; font-weight: bold;">${businessName.charAt(0).toUpperCase()}</span>
      </div>`

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${businessName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background: linear-gradient(145deg, #1e293b, #0f172a); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              ${logoHtml}
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Welcome to ${businessName}</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Your ${roleDisplay} account has been created</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Hello <strong style="color: #ffffff;">${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                Your account has been created for <strong style="color: #a78bfa;">${businessName}</strong>${shopName ? ` at <strong style="color: #a78bfa;">${shopName}</strong>` : ""}. Please use the credentials below to log in:
              </p>
              
              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email Address</span>
                          <p style="margin: 4px 0 0; color: #ffffff; font-size: 16px; font-weight: 600;">${accountEmail}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                          <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Temporary Password</span>
                          <p style="margin: 4px 0 0; color: #fbbf24; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 2px;">${temporaryPassword}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 0; border-top: 1px solid rgba(255,255,255,0.1);">
                          <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Role</span>
                          <p style="margin: 4px 0 0; color: #22c55e; font-size: 14px; font-weight: 600;">${roleDisplay}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Login Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${loginUrl}/login" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                      Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <div style="margin-top: 30px; padding: 16px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px;">
                <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.5;">
                  <strong>⚠️ Security Notice:</strong> For your security, please change your password immediately after your first login.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 12px;">
                This email was sent by ${businessName}
              </p>
              <p style="margin: 0; color: #475569; font-size: 11px;">
                If you didn't expect this email, please contact your administrator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const textContent = `
Welcome to ${businessName}!

Hello ${recipientName},

Your ${roleDisplay} account has been created for ${businessName}${shopName ? ` at ${shopName}` : ""}.

Your Login Credentials:
-----------------------
Email: ${accountEmail}
Temporary Password: ${temporaryPassword}
Role: ${roleDisplay}

Login URL: ${loginUrl}/login

SECURITY NOTICE: For your security, please change your password immediately after your first login.

If you didn't expect this email, please contact your administrator.

Best regards,
${businessName}
`

  try {
    // First try to use business email settings
    const settings = await getBusinessEmailSettings(businessId)
    
    if (settings && settings.isEnabled) {
      // Use business-specific email settings
      const result = await sendEmail(businessId, {
        to: recipientEmail,
        subject: `Welcome to ${businessName} - Your Account Details`,
        html: htmlContent,
        text: textContent,
      })

      if (result.success) {
        console.log(`Account creation email sent to ${recipientEmail} via business settings`)
      }
      
      return result
    } else {
      // Fallback to environment variables for SMTP
      const smtpHost = process.env.SMTP_HOST
      const smtpPort = parseInt(process.env.SMTP_PORT || "587")
      const smtpUser = process.env.SMTP_USER
      const smtpPassword = process.env.SMTP_PASSWORD
      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
      const fromName = process.env.SMTP_FROM_NAME || "High Purchase System"
      
      if (!smtpHost || !smtpUser || !smtpPassword) {
        console.error("No email settings found for business and no SMTP environment variables configured")
        return { 
          success: false, 
          error: "Email settings not configured. Please configure SMTP settings in environment variables or business email settings." 
        }
      }
      
      // Create transporter with environment variables
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      })
      
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipientEmail,
        subject: `Welcome to ${businessName} - Your Account Details`,
        html: htmlContent,
        text: textContent,
      })
      
      console.log(`Account creation email sent to ${recipientEmail} via environment SMTP`)
      return { success: true }
    }
  } catch (error) {
    console.error("Failed to send account creation email:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
    }
  }
}

/**
 * Helper function to generate a random password
 */
export function generateTemporaryPassword(length: number = 12): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lowercase = "abcdefghjkmnpqrstuvwxyz"
  const numbers = "23456789"
  const special = "!@#$%&*"
  
  const allChars = uppercase + lowercase + numbers + special
  
  // Ensure at least one of each type
  let password = ""
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += special.charAt(Math.floor(Math.random() * special.length))
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }
  
  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("")
}
