"use server"

import { requireSuperAdmin, createAuditLog } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ============================================================================
// LOGIN ACTIVITY
// ============================================================================

export async function getLoginActivity(params?: {
  search?: string
  success?: string
  page?: number
  pageSize?: number
}) {
  await requireSuperAdmin()

  const page = params?.page || 1
  const pageSize = params?.pageSize || 50
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (params?.success === "true") where.success = true
  else if (params?.success === "false") where.success = false

  if (params?.search) {
    where.OR = [
      { email: { contains: params.search, mode: "insensitive" } },
      { userName: { contains: params.search, mode: "insensitive" } },
      { ipAddress: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [activities, total, failedToday, totalToday] = await Promise.all([
    prisma.loginActivity.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.loginActivity.count({ where: where as any }),
    prisma.loginActivity.count({
      where: {
        success: false,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.loginActivity.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ])

  return {
    activities: activities.map(a => ({
      id: a.id,
      userId: a.userId,
      email: a.email,
      userName: a.userName,
      role: a.role,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      success: a.success,
      failureReason: a.failureReason,
      createdAt: a.createdAt,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    failedToday,
    totalToday,
  }
}

export async function logLoginActivity(data: {
  userId?: string
  email: string
  userName?: string
  role?: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  failureReason?: string
}) {
  // This doesn't require admin auth - it's called during login
  await prisma.loginActivity.create({
    data: {
      userId: data.userId || null,
      email: data.email,
      userName: data.userName || null,
      role: data.role || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      success: data.success,
      failureReason: data.failureReason || null,
    },
  })
}

// ============================================================================
// ADMIN PERMISSIONS (Sub-Admin)
// ============================================================================

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  businesses: false,
  users: false,
  auditLogs: false,
  messages: false,
  registrations: false,
  subscriptions: false,
  siteContent: false,
  analytics: false,
  health: false,
  settings: false,
  announcements: false,
  emailTemplates: false,
  tickets: false,
  revenue: false,
  coupons: false,
  invoices: false,
  loginActivity: false,
  permissions: false,
  export: false,
}

export async function getAdminPermissions() {
  await requireSuperAdmin()

  const permissions = await prisma.adminPermission.findMany({
    orderBy: { createdAt: "desc" },
  })

  return permissions.map(p => ({
    id: p.id,
    userId: p.userId,
    userName: p.userName,
    userEmail: p.userEmail,
    permissions: JSON.parse(p.permissions),
    grantedBy: p.grantedBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))
}

export async function saveAdminPermission(data: {
  userId: string
  permissions: Record<string, boolean>
}) {
  const user = await requireSuperAdmin()

  // Get user info
  const targetUser = await prisma.user.findUnique({ where: { id: data.userId } })
  if (!targetUser) return { success: false, error: "User not found" }
  if (targetUser.role !== "SUPER_ADMIN") return { success: false, error: "User must be a Super Admin" }

  await prisma.adminPermission.upsert({
    where: { userId: data.userId },
    update: {
      permissions: JSON.stringify(data.permissions),
      userName: targetUser.name,
      userEmail: targetUser.email,
    },
    create: {
      userId: data.userId,
      userName: targetUser.name,
      userEmail: targetUser.email,
      permissions: JSON.stringify(data.permissions),
      grantedBy: user.id,
    },
  })

  await createAuditLog({ action: "UPDATE_PERMISSIONS", entityType: "AdminPermission", entityId: data.userId, metadata: { permissions: data.permissions } })
  revalidatePath("/super-admin/permissions")
  return { success: true }
}

export async function deleteAdminPermission(id: string) {
  await requireSuperAdmin()
  await prisma.adminPermission.delete({ where: { id } })
  revalidatePath("/super-admin/permissions")
  return { success: true }
}

export async function getDefaultPermissions() {
  return { ...DEFAULT_PERMISSIONS }
}

// ============================================================================
// DATA EXPORT
// ============================================================================

export async function exportData(entity: string, format: "csv" | "json" = "csv") {
  await requireSuperAdmin()

  let data: Record<string, unknown>[] = []
  let headers: string[] = []

  switch (entity) {
    case "users": {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true, lastSeenAt: true },
        orderBy: { createdAt: "desc" },
      })
      headers = ["ID", "Email", "Name", "Role", "Phone", "Created At", "Last Seen"]
      data = users.map(u => ({
        ID: u.id,
        Email: u.email,
        Name: u.name || "",
        Role: u.role,
        Phone: u.phone || "",
        "Created At": u.createdAt.toISOString(),
        "Last Seen": u.lastSeenAt?.toISOString() || "",
      }))
      break
    }
    case "businesses": {
      const businesses = await prisma.business.findMany({
        include: { _count: { select: { shops: true, members: true } } },
        orderBy: { createdAt: "desc" },
      })
      headers = ["ID", "Name", "Slug", "Country", "Active", "Shops", "Members", "Created At"]
      data = businesses.map(b => ({
        ID: b.id,
        Name: b.name,
        Slug: b.businessSlug,
        Country: b.country,
        Active: b.isActive ? "Yes" : "No",
        Shops: b._count.shops,
        Members: b._count.members,
        "Created At": b.createdAt.toISOString(),
      }))
      break
    }
    case "subscriptions": {
      const subs = await prisma.subscription.findMany({
        include: { plan: true, business: true },
        orderBy: { createdAt: "desc" },
      })
      headers = ["ID", "Business", "Plan", "Status", "Start Date", "End Date", "Created At"]
      data = subs.map(s => ({
        ID: s.id,
        Business: s.business?.name || "",
        Plan: s.plan?.name || "",
        Status: s.status,
        "Start Date": s.currentPeriodStart?.toISOString() || "",
        "End Date": s.currentPeriodEnd?.toISOString() || "",
        "Created At": s.createdAt.toISOString(),
      }))
      break
    }
    case "payments": {
      const payments = await prisma.subscriptionPayment.findMany({
        include: { subscription: { include: { business: true, plan: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      })
      headers = ["ID", "Business", "Plan", "Amount", "Method", "Status", "Paid At", "Created At"]
      data = payments.map(p => ({
        ID: p.id,
        Business: p.subscription?.business?.name || "",
        Plan: p.subscription?.plan?.name || "",
        Amount: Number(p.amount),
        Method: p.paymentMethod,
        Status: p.status,
        "Paid At": p.paidAt?.toISOString() || "",
        "Created At": p.createdAt.toISOString(),
      }))
      break
    }
    case "login-activity": {
      const activities = await prisma.loginActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 5000,
      })
      headers = ["ID", "Email", "Name", "Role", "IP Address", "Success", "Failure Reason", "Date"]
      data = activities.map(a => ({
        ID: a.id,
        Email: a.email,
        Name: a.userName || "",
        Role: a.role || "",
        "IP Address": a.ipAddress || "",
        Success: a.success ? "Yes" : "No",
        "Failure Reason": a.failureReason || "",
        Date: a.createdAt.toISOString(),
      }))
      break
    }
    case "tickets": {
      const tickets = await prisma.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
      })
      headers = ["Ticket #", "Subject", "Priority", "Status", "Category", "Created At", "Resolved At"]
      data = tickets.map(t => ({
        "Ticket #": t.ticketNumber,
        Subject: t.subject,
        Priority: t.priority,
        Status: t.status,
        Category: t.category,
        "Created At": t.createdAt.toISOString(),
        "Resolved At": t.resolvedAt?.toISOString() || "",
      }))
      break
    }
    case "coupons": {
      const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } })
      headers = ["Code", "Type", "Value", "Max Uses", "Used", "Active", "Valid From", "Valid Until"]
      data = coupons.map(c => ({
        Code: c.code,
        Type: c.discountType,
        Value: Number(c.discountValue),
        "Max Uses": c.maxUses,
        Used: c.usedCount,
        Active: c.isActive ? "Yes" : "No",
        "Valid From": c.validFrom.toISOString(),
        "Valid Until": c.validUntil.toISOString(),
      }))
      break
    }
    default:
      return { success: false, error: "Unknown entity type" }
  }

  if (format === "csv") {
    const csvRows = [headers.join(",")]
    for (const row of data) {
      const values = headers.map(h => {
        const val = String(row[h] ?? "")
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val
      })
      csvRows.push(values.join(","))
    }
    return { success: true, content: csvRows.join("\n"), filename: `${entity}-${new Date().toISOString().split("T")[0]}.csv`, format: "csv" }
  } else {
    return { success: true, content: JSON.stringify(data, null, 2), filename: `${entity}-${new Date().toISOString().split("T")[0]}.json`, format: "json" }
  }
}
