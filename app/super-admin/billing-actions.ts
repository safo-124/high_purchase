"use server"

import { requireSuperAdmin, createAuditLog } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ============================================================================
// COUPONS / PROMO CODES
// ============================================================================

export async function getCoupons(params?: {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  await requireSuperAdmin()

  const page = params?.page || 1
  const pageSize = params?.pageSize || 20
  const skip = (page - 1) * pageSize

  const now = new Date()
  const where: Record<string, unknown> = {}

  if (params?.status === "active") {
    where.isActive = true
    where.validUntil = { gte: now }
  } else if (params?.status === "expired") {
    where.validUntil = { lt: now }
  } else if (params?.status === "inactive") {
    where.isActive = false
  }

  if (params?.search) {
    where.OR = [
      { code: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.coupon.count({ where: where as any }),
  ])

  return {
    coupons: coupons.map(c => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      appliesTo: c.appliesTo,
      minAmount: c.minAmount ? Number(c.minAmount) : null,
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      isActive: c.isActive,
      createdAt: c.createdAt,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function createCoupon(data: {
  code: string
  description?: string
  discountType: "PERCENTAGE" | "FIXED"
  discountValue: number
  appliesTo?: string
  minAmount?: number
  maxDiscount?: number
  validFrom: string
  validUntil: string
  maxUses: number
}) {
  const user = await requireSuperAdmin()

  // Check for duplicate code
  const existing = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } })
  if (existing) return { success: false, error: "Coupon code already exists" }

  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      description: data.description || null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      appliesTo: data.appliesTo || null,
      minAmount: data.minAmount || null,
      maxDiscount: data.maxDiscount || null,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      maxUses: data.maxUses,
      createdById: user.id,
    },
  })

  await createAuditLog({ action: "CREATE_COUPON", entityType: "Coupon", entityId: coupon.id, metadata: { code: coupon.code } })
  revalidatePath("/super-admin/coupons")
  return { success: true }
}

export async function toggleCoupon(id: string) {
  await requireSuperAdmin()
  const existing = await prisma.coupon.findUnique({ where: { id } })
  if (!existing) return { success: false, error: "Coupon not found" }

  await prisma.coupon.update({ where: { id }, data: { isActive: !existing.isActive } })
  revalidatePath("/super-admin/coupons")
  return { success: true }
}

export async function deleteCoupon(id: string) {
  await requireSuperAdmin()
  await prisma.coupon.delete({ where: { id } })
  revalidatePath("/super-admin/coupons")
  return { success: true }
}

// ============================================================================
// SUBSCRIPTION INVOICES
// ============================================================================

function generateInvoiceNumber(): string {
  const prefix = "INV"
  const year = new Date().getFullYear()
  const timestamp = Date.now().toString(36).toUpperCase()
  return `${prefix}-${year}-${timestamp}`
}

export async function getInvoices(params?: {
  status?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  await requireSuperAdmin()

  const page = params?.page || 1
  const pageSize = params?.pageSize || 20
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (params?.status && params.status !== "all") {
    where.status = params.status
  }
  if (params?.search) {
    where.OR = [
      { invoiceNumber: { contains: params.search, mode: "insensitive" } },
      { businessName: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [invoices, total] = await Promise.all([
    prisma.subscriptionInvoice.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.subscriptionInvoice.count({ where: where as any }),
  ])

  return {
    invoices: invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      subscriptionId: inv.subscriptionId,
      businessId: inv.businessId,
      businessName: inv.businessName,
      planName: inv.planName,
      amount: Number(inv.amount),
      tax: Number(inv.tax),
      totalAmount: Number(inv.totalAmount),
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      notes: inv.notes,
      createdAt: inv.createdAt,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function createInvoice(data: {
  subscriptionId: string
  businessId: string
  businessName: string
  planName: string
  amount: number
  tax?: number
  dueDate: string
  notes?: string
}) {
  await requireSuperAdmin()

  const taxAmount = data.tax || 0
  const totalAmount = data.amount + taxAmount

  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      subscriptionId: data.subscriptionId,
      businessId: data.businessId,
      businessName: data.businessName,
      planName: data.planName,
      amount: data.amount,
      tax: taxAmount,
      totalAmount,
      dueDate: new Date(data.dueDate),
      notes: data.notes || null,
    },
  })

  revalidatePath("/super-admin/invoices")
  return { success: true, data: invoice }
}

export async function updateInvoiceStatus(id: string, status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" | "VOID") {
  await requireSuperAdmin()

  const updateData: Record<string, unknown> = { status }
  if (status === "PAID") updateData.paidAt = new Date()

  await prisma.subscriptionInvoice.update({ where: { id }, data: updateData })
  revalidatePath("/super-admin/invoices")
  return { success: true }
}

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

export async function getSystemSettings(group?: string) {
  await requireSuperAdmin()

  const where: Record<string, unknown> = {}
  if (group && group !== "all") where.group = group

  const settings = await prisma.systemSetting.findMany({
    where: where as any,
    orderBy: [{ group: "asc" }, { key: "asc" }],
  })

  return settings.map(s => ({
    id: s.id,
    key: s.key,
    value: s.value,
    type: s.type,
    label: s.label,
    group: s.group,
    updatedAt: s.updatedAt,
  }))
}

export async function saveSystemSetting(data: {
  key: string
  value: string
  type?: string
  label?: string
  group?: string
}) {
  const user = await requireSuperAdmin()

  await prisma.systemSetting.upsert({
    where: { key: data.key },
    update: {
      value: data.value,
      type: data.type || "string",
      label: data.label,
      group: data.group || "general",
      updatedBy: user.id,
    },
    create: {
      key: data.key,
      value: data.value,
      type: data.type || "string",
      label: data.label || data.key,
      group: data.group || "general",
      updatedBy: user.id,
    },
  })

  await createAuditLog({ action: "UPDATE_SETTING", entityType: "SystemSetting", entityId: data.key, metadata: { value: data.value } })
  revalidatePath("/super-admin/settings")
  return { success: true }
}

export async function initializeDefaultSettings() {
  await requireSuperAdmin()

  const defaults = [
    { key: "platform_name", value: "High Purchase", type: "string", label: "Platform Name", group: "general" },
    { key: "platform_currency", value: "GHS", type: "string", label: "Currency", group: "general" },
    { key: "platform_country", value: "Ghana", type: "string", label: "Country", group: "general" },
    { key: "platform_timezone", value: "Africa/Accra", type: "string", label: "Timezone", group: "general" },
    { key: "maintenance_mode", value: "false", type: "boolean", label: "Maintenance Mode", group: "maintenance" },
    { key: "maintenance_message", value: "We are currently performing maintenance. Please check back later.", type: "string", label: "Maintenance Message", group: "maintenance" },
    { key: "session_timeout_minutes", value: "60", type: "number", label: "Session Timeout (minutes)", group: "security" },
    { key: "max_login_attempts", value: "5", type: "number", label: "Max Login Attempts", group: "security" },
    { key: "lockout_duration_minutes", value: "15", type: "number", label: "Lockout Duration (minutes)", group: "security" },
    { key: "require_2fa", value: "false", type: "boolean", label: "Require 2FA", group: "security" },
    { key: "default_trial_days", value: "14", type: "number", label: "Default Trial Days", group: "billing" },
    { key: "tax_rate", value: "0", type: "number", label: "Tax Rate (%)", group: "billing" },
    { key: "late_payment_grace_days", value: "7", type: "number", label: "Payment Grace Period (days)", group: "billing" },
    { key: "email_notifications_enabled", value: "true", type: "boolean", label: "Email Notifications", group: "notifications" },
    { key: "sms_notifications_enabled", value: "false", type: "boolean", label: "SMS Notifications", group: "notifications" },
    { key: "welcome_email_enabled", value: "true", type: "boolean", label: "Send Welcome Email", group: "notifications" },
  ]

  for (const setting of defaults) {
    const existing = await prisma.systemSetting.findUnique({ where: { key: setting.key } })
    if (!existing) {
      await prisma.systemSetting.create({ data: setting })
    }
  }

  revalidatePath("/super-admin/settings")
  return { success: true }
}
