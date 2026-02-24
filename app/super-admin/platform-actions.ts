"use server"

import { requireSuperAdmin } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ============================================================================
// CONTACT MESSAGES
// ============================================================================

export async function getContactMessages(params?: {
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
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { subject: { contains: params.search, mode: "insensitive" } },
      { message: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [messages, total, unreadCount] = await Promise.all([
    prisma.contactMessage.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.contactMessage.count({ where: where as any }),
    prisma.contactMessage.count({ where: { status: "UNREAD" } }),
  ])

  return {
    messages: messages.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      subject: m.subject,
      message: m.message,
      status: m.status,
      repliedAt: m.repliedAt,
      replyNote: m.replyNote,
      createdAt: m.createdAt,
    })),
    total,
    unreadCount,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function markMessageRead(messageId: string) {
  await requireSuperAdmin()
  await prisma.contactMessage.update({
    where: { id: messageId },
    data: { status: "READ" },
  })
  revalidatePath("/super-admin/messages")
  return { success: true }
}

export async function replyToMessage(messageId: string, replyNote: string) {
  const user = await requireSuperAdmin()
  await prisma.contactMessage.update({
    where: { id: messageId },
    data: {
      status: "REPLIED",
      repliedAt: new Date(),
      repliedBy: user.id,
      replyNote: replyNote.trim(),
    },
  })
  revalidatePath("/super-admin/messages")
  return { success: true }
}

export async function archiveMessages(messageIds: string[]) {
  await requireSuperAdmin()
  await prisma.contactMessage.updateMany({
    where: { id: { in: messageIds } },
    data: { status: "ARCHIVED" },
  })
  revalidatePath("/super-admin/messages")
  return { success: true }
}

export async function deleteMessages(messageIds: string[]) {
  await requireSuperAdmin()
  await prisma.contactMessage.deleteMany({
    where: { id: { in: messageIds } },
  })
  revalidatePath("/super-admin/messages")
  return { success: true }
}

// ============================================================================
// BUSINESS REGISTRATIONS
// ============================================================================

export async function getRegistrations(params?: {
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
      { ownerName: { contains: params.search, mode: "insensitive" } },
      { ownerEmail: { contains: params.search, mode: "insensitive" } },
      { businessName: { contains: params.search, mode: "insensitive" } },
      { city: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [registrations, total, pendingCount] = await Promise.all([
    prisma.businessRegistration.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.businessRegistration.count({ where: where as any }),
    prisma.businessRegistration.count({ where: { status: "PENDING" } }),
  ])

  return {
    registrations: registrations.map(r => ({
      id: r.id,
      ownerName: r.ownerName,
      ownerEmail: r.ownerEmail,
      ownerPhone: r.ownerPhone,
      businessName: r.businessName,
      businessType: r.businessType,
      city: r.city,
      address: r.address,
      numberOfShops: r.numberOfShops,
      numberOfStaff: r.numberOfStaff,
      monthlyRevenue: r.monthlyRevenue,
      howHeard: r.howHeard,
      message: r.message,
      status: r.status,
      reviewedAt: r.reviewedAt,
      reviewedByName: r.reviewedByName,
      rejectionReason: r.rejectionReason,
      businessId: r.businessId,
      createdAt: r.createdAt,
    })),
    total,
    pendingCount,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function approveRegistration(registrationId: string) {
  const user = await requireSuperAdmin()

  const reg = await prisma.businessRegistration.findUnique({
    where: { id: registrationId },
  })

  if (!reg || reg.status !== "PENDING") {
    return { success: false, error: "Registration not found or already processed." }
  }

  // Generate slug from business name
  const baseSlug = reg.businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  // Ensure unique slug
  let slug = baseSlug
  let counter = 1
  while (await prisma.business.findUnique({ where: { businessSlug: slug } })) {
    slug = `${baseSlug}-${counter++}`
  }

  // Generate a temporary password
  const tempPassword = `HP${Math.random().toString(36).slice(2, 10)}!`

  // Hash the password
  const bcrypt = await import("bcryptjs")
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  // Create business + admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the user
    const newUser = await tx.user.create({
      data: {
        email: reg.ownerEmail,
        name: reg.ownerName,
        passwordHash,
        plainPassword: tempPassword,
        role: "BUSINESS_ADMIN",
        phone: reg.ownerPhone,
        mustChangePassword: true,
      },
    })

    // Create the business
    const business = await tx.business.create({
      data: {
        name: reg.businessName,
        businessSlug: slug,
        country: "Ghana",
        address: reg.address,
        phone: reg.ownerPhone,
        email: reg.ownerEmail,
      },
    })

    // Create business membership
    await tx.businessMember.create({
      data: {
        userId: newUser.id,
        businessId: business.id,
        role: "BUSINESS_ADMIN",
      },
    })

    // Create a starter subscription with free plan (if exists)
    const freePlan = await tx.subscriptionPlan.findFirst({
      where: { name: "starter", isActive: true },
    })

    if (freePlan) {
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await tx.subscription.create({
        data: {
          businessId: business.id,
          planId: freePlan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      })
    }

    // Update the registration
    await tx.businessRegistration.update({
      where: { id: registrationId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: user.id,
        reviewedByName: user.name || user.email,
        businessId: business.id,
      },
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        action: "BUSINESS_REGISTRATION_APPROVED",
        entityType: "BUSINESS",
        entityId: business.id,
        metadata: { detail: `Approved registration for ${reg.businessName} (${reg.ownerEmail}). Business slug: ${slug}` },
        actorUserId: user.id,
      },
    })

    return { business, user: newUser, tempPassword }
  })

  // Try to send welcome email (platform-level — log for now)
  try {
    console.log(`[REGISTRATION APPROVED] Welcome email would be sent to ${reg.ownerEmail} with temp password for business: ${result.business.name} (/${slug})`)
  } catch {
    // Email failure shouldn't block approval
  }

  revalidatePath("/super-admin/registrations")
  return { success: true, slug, tempPassword: result.tempPassword }
}

export async function rejectRegistration(registrationId: string, reason: string) {
  const user = await requireSuperAdmin()

  const reg = await prisma.businessRegistration.findUnique({
    where: { id: registrationId },
  })

  if (!reg || reg.status !== "PENDING") {
    return { success: false, error: "Registration not found or already processed." }
  }

  await prisma.businessRegistration.update({
    where: { id: registrationId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: user.id,
      reviewedByName: user.name || user.email,
      rejectionReason: reason.trim(),
    },
  })

  await prisma.auditLog.create({
    data: {
      action: "BUSINESS_REGISTRATION_REJECTED",
      entityType: "BUSINESS_REGISTRATION",
      entityId: registrationId,
      metadata: { detail: `Rejected registration for ${reg.businessName} (${reg.ownerEmail}). Reason: ${reason}` },
      actorUserId: user.id,
    },
  })

  // Try to send rejection email
  try {
    console.log(`[REGISTRATION REJECTED] Rejection email would be sent to ${reg.ownerEmail} for business: ${reg.businessName}. Reason: ${reason}`)
  } catch {
    // Email failure shouldn't block rejection
  }

  revalidatePath("/super-admin/registrations")
  return { success: true }
}

// ============================================================================
// SITE CONTENT
// ============================================================================

export async function getSiteContent(group?: string) {
  await requireSuperAdmin()
  
  const where = group ? { group } : {}
  const content = await prisma.siteContent.findMany({
    where,
    orderBy: [{ group: "asc" }, { key: "asc" }],
  })

  return content.map(c => ({
    id: c.id,
    key: c.key,
    value: c.value,
    type: c.type,
    label: c.label,
    group: c.group,
    updatedAt: c.updatedAt,
  }))
}

export async function updateSiteContent(key: string, value: string) {
  const user = await requireSuperAdmin()

  await prisma.siteContent.upsert({
    where: { key },
    update: { value, updatedBy: user.id },
    create: { key, value, updatedBy: user.id },
  })

  revalidatePath("/")
  revalidatePath("/super-admin/site-content")
  return { success: true }
}

export async function updateSiteContentBatch(items: { key: string; value: string; type?: string; label?: string; group?: string }[]) {
  const user = await requireSuperAdmin()

  await prisma.$transaction(
    items.map(item =>
      prisma.siteContent.upsert({
        where: { key: item.key },
        update: { value: item.value, updatedBy: user.id },
        create: {
          key: item.key,
          value: item.value,
          type: item.type || "text",
          label: item.label || item.key,
          group: item.group || "general",
          updatedBy: user.id,
        },
      })
    )
  )

  revalidatePath("/")
  revalidatePath("/super-admin/site-content")
  return { success: true }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export async function getSubscriptionPlans() {
  await requireSuperAdmin()
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { subscriptions: true } },
    },
  })

  return plans.map(p => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    price: Number(p.price),
    currency: p.currency,
    billingPeriod: p.billingPeriod,
    maxShops: p.maxShops,
    maxCustomers: p.maxCustomers,
    maxStaff: p.maxStaff,
    maxSmsPerMonth: p.maxSmsPerMonth,
    advancedPos: p.advancedPos,
    advancedAnalytics: p.advancedAnalytics,
    prioritySupport: p.prioritySupport,
    customBranding: p.customBranding,
    apiAccess: p.apiAccess,
    accountingModule: p.accountingModule,
    bonusSystem: p.bonusSystem,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    subscriberCount: p._count.subscriptions,
  }))
}

export async function upsertSubscriptionPlan(data: {
  id?: string
  name: string
  displayName: string
  price: number
  billingPeriod: string
  maxShops: number
  maxCustomers: number
  maxStaff: number
  maxSmsPerMonth: number
  advancedPos: boolean
  advancedAnalytics: boolean
  prioritySupport: boolean
  customBranding: boolean
  apiAccess: boolean
  accountingModule: boolean
  bonusSystem: boolean
  sortOrder: number
}) {
  await requireSuperAdmin()

  const payload = {
    name: data.name,
    displayName: data.displayName,
    price: data.price,
    billingPeriod: data.billingPeriod as any,
    maxShops: data.maxShops,
    maxCustomers: data.maxCustomers,
    maxStaff: data.maxStaff,
    maxSmsPerMonth: data.maxSmsPerMonth,
    advancedPos: data.advancedPos,
    advancedAnalytics: data.advancedAnalytics,
    prioritySupport: data.prioritySupport,
    customBranding: data.customBranding,
    apiAccess: data.apiAccess,
    accountingModule: data.accountingModule,
    bonusSystem: data.bonusSystem,
    sortOrder: data.sortOrder,
  }

  if (data.id) {
    await prisma.subscriptionPlan.update({ where: { id: data.id }, data: payload })
  } else {
    await prisma.subscriptionPlan.create({ data: payload })
  }

  revalidatePath("/super-admin/subscriptions")
  return { success: true }
}

export async function getBusinessSubscriptions(params?: {
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

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where: where as any,
      include: {
        business: { select: { name: true, businessSlug: true, isActive: true } },
        plan: { select: { displayName: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.subscription.count({ where: where as any }),
  ])

  return {
    subscriptions: subscriptions.map(s => ({
      id: s.id,
      businessId: s.businessId,
      businessName: s.business.name,
      businessSlug: s.business.businessSlug,
      businessActive: s.business.isActive,
      planName: s.plan.displayName,
      planPrice: Number(s.plan.price),
      status: s.status,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      lastPaymentAt: s.lastPaymentAt,
      lastPaymentMethod: s.lastPaymentMethod,
      createdAt: s.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function updateSubscriptionStatus(subscriptionId: string, status: string) {
  await requireSuperAdmin()
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: status as any },
  })
  revalidatePath("/super-admin/subscriptions")
  return { success: true }
}
