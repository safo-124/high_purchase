"use server"

import { requireSuperAdmin, createAuditLog } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export async function getAnnouncements(params?: {
  search?: string
  type?: string
  page?: number
  pageSize?: number
}) {
  await requireSuperAdmin()

  const page = params?.page || 1
  const pageSize = params?.pageSize || 20
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (params?.type && params.type !== "all") {
    where.type = params.type
  }
  if (params?.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { content: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.announcement.count({ where: where as any }),
  ])

  return {
    announcements: announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      targetAudience: a.targetAudience,
      targetValue: a.targetValue,
      priority: a.priority,
      isActive: a.isActive,
      scheduledAt: a.scheduledAt,
      sentAt: a.sentAt,
      sentById: a.sentById,
      createdAt: a.createdAt,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function createAnnouncement(data: {
  title: string
  content: string
  type: "IN_APP" | "EMAIL" | "BOTH"
  targetAudience: "ALL" | "BUSINESS_ADMINS" | "SHOP_ADMINS" | "COLLECTORS" | "CUSTOMERS" | "PLAN"
  targetValue?: string
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  scheduledAt?: string
}) {
  const user = await requireSuperAdmin()

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      content: data.content,
      type: data.type,
      targetAudience: data.targetAudience,
      targetValue: data.targetValue || null,
      priority: data.priority,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      sentAt: data.scheduledAt ? null : new Date(),
      sentById: user.id,
      isActive: true,
    },
  })

  await createAuditLog({
    action: "CREATE_ANNOUNCEMENT",
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { title: data.title, type: data.type, target: data.targetAudience }
  })

  revalidatePath("/super-admin/announcements")
  return { success: true, data: announcement }
}

export async function toggleAnnouncement(id: string) {
  await requireSuperAdmin()

  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) return { success: false, error: "Announcement not found" }

  await prisma.announcement.update({
    where: { id },
    data: { isActive: !existing.isActive },
  })

  revalidatePath("/super-admin/announcements")
  return { success: true }
}

export async function deleteAnnouncement(id: string) {
  await requireSuperAdmin()

  await prisma.announcement.delete({ where: { id } })
  revalidatePath("/super-admin/announcements")
  return { success: true }
}

// ============================================================================
// SUPPORT TICKETS
// ============================================================================

function generateTicketNumber(): string {
  const prefix = "TKT"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export async function getTickets(params?: {
  status?: string
  priority?: string
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
  if (params?.priority && params.priority !== "all") {
    where.priority = params.priority
  }
  if (params?.search) {
    where.OR = [
      { ticketNumber: { contains: params.search, mode: "insensitive" } },
      { subject: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [tickets, total, openCount, urgentCount] = await Promise.all([
    prisma.supportTicket.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { _count: { select: { comments: true } } },
    }),
    prisma.supportTicket.count({ where: where as any }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.supportTicket.count({ where: { priority: "URGENT", status: { not: "CLOSED" } } }),
  ])

  return {
    tickets: tickets.map(t => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      description: t.description,
      priority: t.priority,
      status: t.status,
      category: t.category,
      businessId: t.businessId,
      createdById: t.createdById,
      assignedToId: t.assignedToId,
      commentCount: t._count.comments,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
      createdAt: t.createdAt,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    openCount,
    urgentCount,
  }
}

export async function createTicket(data: {
  subject: string
  description: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  category: string
  businessId?: string
  contactMessageId?: string
}) {
  const user = await requireSuperAdmin()

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: generateTicketNumber(),
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      category: data.category,
      businessId: data.businessId || null,
      contactMessageId: data.contactMessageId || null,
      createdById: user.id,
    },
  })

  revalidatePath("/super-admin/tickets")
  return { success: true, data: ticket }
}

export async function updateTicketStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED") {
  await requireSuperAdmin()

  const updateData: Record<string, unknown> = { status }
  if (status === "RESOLVED") updateData.resolvedAt = new Date()
  if (status === "CLOSED") updateData.closedAt = new Date()

  await prisma.supportTicket.update({ where: { id }, data: updateData })
  revalidatePath("/super-admin/tickets")
  return { success: true }
}

export async function addTicketComment(ticketId: string, content: string, isInternal: boolean = false) {
  const user = await requireSuperAdmin()

  await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: user.id,
      content,
      isInternal,
    },
  })

  revalidatePath("/super-admin/tickets")
  return { success: true }
}

export async function getTicketDetail(id: string) {
  await requireSuperAdmin()

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  })

  if (!ticket) return null

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    category: ticket.category,
    businessId: ticket.businessId,
    createdById: ticket.createdById,
    assignedToId: ticket.assignedToId,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    createdAt: ticket.createdAt,
    comments: ticket.comments.map(c => ({
      id: c.id,
      authorId: c.authorId,
      content: c.content,
      isInternal: c.isInternal,
      createdAt: c.createdAt,
    })),
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export async function getEmailTemplates(params?: {
  category?: string
  search?: string
}) {
  await requireSuperAdmin()

  const where: Record<string, unknown> = {}
  if (params?.category && params.category !== "all") {
    where.category = params.category
  }
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { subject: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const templates = await prisma.emailTemplate.findMany({
    where: where as any,
    orderBy: { updatedAt: "desc" },
  })

  return templates.map(t => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    htmlContent: t.htmlContent,
    variables: t.variables,
    category: t.category,
    isActive: t.isActive,
    updatedBy: t.updatedBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))
}

export async function saveEmailTemplate(data: {
  id?: string
  name: string
  subject: string
  htmlContent: string
  variables?: string
  category: string
}) {
  const user = await requireSuperAdmin()

  if (data.id) {
    await prisma.emailTemplate.update({
      where: { id: data.id },
      data: {
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        variables: data.variables || null,
        category: data.category,
        updatedBy: user.id,
      },
    })
  } else {
    await prisma.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        variables: data.variables || null,
        category: data.category,
        updatedBy: user.id,
      },
    })
  }

  revalidatePath("/super-admin/email-templates")
  return { success: true }
}

export async function deleteEmailTemplate(id: string) {
  await requireSuperAdmin()
  await prisma.emailTemplate.delete({ where: { id } })
  revalidatePath("/super-admin/email-templates")
  return { success: true }
}
