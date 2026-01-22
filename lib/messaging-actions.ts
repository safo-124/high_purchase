"use server"

import prisma from "./prisma"
import { getSessionUser } from "./auth"
import { revalidatePath } from "next/cache"
import { ConversationType, Role } from "@/app/generated/prisma/client"

// ============================================================================
// TYPES
// ============================================================================

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ConversationWithDetails {
  id: string
  businessId: string
  shopId: string | null
  conversationType: ConversationType
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  createdAt: Date
  participant1: {
    id: string
    name: string | null
    email: string
    role: Role
  } | null
  participant2: {
    id: string
    name: string | null
    email: string
    role: Role
  } | null
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string | null
  } | null
  shop: {
    id: string
    name: string
    shopSlug: string
  } | null
  unreadCount: number
}

export interface MessageWithSender {
  id: string
  content: string
  isRead: boolean
  readAt: Date | null
  isSystemMessage: boolean
  isEdited: boolean
  editedAt: Date | null
  isDeleted: boolean
  createdAt: Date
  sender: {
    id: string
    name: string | null
    email: string
    role: Role
    lastSeenAt: Date | null
  } | null
  senderCustomer: {
    id: string
    firstName: string
    lastName: string
    lastSeenAt: Date | null
  } | null
}

export interface ContactInfo {
  id: string
  type: "staff" | "customer"
  name: string
  email?: string | null
  phone?: string | null
  role?: Role
  shopId?: string
  shopName?: string
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Check if a user can message another user/customer based on their role
 */
async function canUserMessage(
  senderUserId: string,
  senderRole: Role,
  targetType: "staff" | "customer",
  targetId: string,
  businessId: string
): Promise<boolean> {
  // Business admin can message anyone in their business
  if (senderRole === "BUSINESS_ADMIN" || senderRole === "SUPER_ADMIN") {
    if (targetType === "staff") {
      const targetMembership = await prisma.businessMember.findFirst({
        where: { userId: targetId, businessId, isActive: true },
      })
      if (targetMembership) return true
      
      // Check if target is a shop member in this business
      const shopMembership = await prisma.shopMember.findFirst({
        where: {
          userId: targetId,
          isActive: true,
          shop: { businessId },
        },
      })
      return !!shopMembership
    } else {
      // Check if customer belongs to business
      const customer = await prisma.customer.findFirst({
        where: {
          id: targetId,
          shop: { businessId },
        },
      })
      return !!customer
    }
  }

  // For shop-level staff (SHOP_ADMIN, SALES_STAFF, DEBT_COLLECTOR)
  // Get sender's shop memberships
  const senderShopMemberships = await prisma.shopMember.findMany({
    where: {
      userId: senderUserId,
      isActive: true,
      shop: { businessId },
    },
    include: { shop: true },
  })

  if (senderShopMemberships.length === 0) return false

  const senderShopIds = senderShopMemberships.map((m) => m.shopId)

  if (senderRole === "SHOP_ADMIN" || senderRole === "SALES_STAFF") {
    // Can message business admin
    if (targetType === "staff") {
      const targetBusinessMember = await prisma.businessMember.findFirst({
        where: { userId: targetId, businessId, role: "BUSINESS_ADMIN", isActive: true },
      })
      if (targetBusinessMember) return true

      // Can message staff in their shop(s)
      const targetShopMember = await prisma.shopMember.findFirst({
        where: {
          userId: targetId,
          shopId: { in: senderShopIds },
          isActive: true,
        },
      })
      return !!targetShopMember
    } else {
      // Can message customers in their shop(s)
      const customer = await prisma.customer.findFirst({
        where: {
          id: targetId,
          shopId: { in: senderShopIds },
        },
      })
      return !!customer
    }
  }

  if (senderRole === "DEBT_COLLECTOR") {
    // Can message business admin
    if (targetType === "staff") {
      const targetBusinessMember = await prisma.businessMember.findFirst({
        where: { userId: targetId, businessId, role: "BUSINESS_ADMIN", isActive: true },
      })
      if (targetBusinessMember) return true

      // Can message shop admin and sales staff in their shop
      const targetShopMember = await prisma.shopMember.findFirst({
        where: {
          userId: targetId,
          shopId: { in: senderShopIds },
          role: { in: ["SHOP_ADMIN", "SALES_STAFF"] },
          isActive: true,
        },
      })
      return !!targetShopMember
    } else {
      // Can only message assigned customers
      const senderMemberIds = senderShopMemberships.map((m) => m.id)
      const customer = await prisma.customer.findFirst({
        where: {
          id: targetId,
          assignedCollectorId: { in: senderMemberIds },
        },
      })
      return !!customer
    }
  }

  return false
}

// ============================================================================
// CONTACT LIST ACTIONS
// ============================================================================

/**
 * Get available contacts for messaging based on user role
 */
export async function getAvailableContacts(businessId: string): Promise<ActionResult<ContactInfo[]>> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const contacts: ContactInfo[] = []

    if (user.role === "BUSINESS_ADMIN" || user.role === "SUPER_ADMIN") {
      // Get all staff in business
      const businessMembers = await prisma.businessMember.findMany({
        where: { businessId, isActive: true, userId: { not: user.id } },
        include: { user: true },
      })

      for (const member of businessMembers) {
        contacts.push({
          id: member.userId,
          type: "staff",
          name: member.user.name || member.user.email,
          email: member.user.email,
          phone: member.user.phone,
          role: member.role as Role,
        })
      }

      // Get all shop members
      const shopMembers = await prisma.shopMember.findMany({
        where: {
          shop: { businessId },
          isActive: true,
          userId: { not: user.id },
        },
        include: { user: true, shop: true },
      })

      const addedUserIds = new Set(contacts.map((c) => c.id))
      for (const member of shopMembers) {
        if (!addedUserIds.has(member.userId)) {
          contacts.push({
            id: member.userId,
            type: "staff",
            name: member.user.name || member.user.email,
            email: member.user.email,
            phone: member.user.phone,
            role: member.role as Role,
            shopId: member.shopId,
            shopName: member.shop.name,
          })
          addedUserIds.add(member.userId)
        }
      }

      // Get all customers
      const customers = await prisma.customer.findMany({
        where: {
          shop: { businessId },
          isActive: true,
        },
        include: { shop: true },
      })

      for (const customer of customers) {
        contacts.push({
          id: customer.id,
          type: "customer",
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone,
          shopId: customer.shopId,
          shopName: customer.shop.name,
        })
      }
    } else {
      // Get sender's shop memberships
      const senderShopMemberships = await prisma.shopMember.findMany({
        where: {
          userId: user.id,
          isActive: true,
          shop: { businessId },
        },
        include: { shop: { include: { business: true } } },
      })

      if (senderShopMemberships.length === 0) {
        return { success: true, data: [] }
      }

      const senderShopIds = senderShopMemberships.map((m) => m.shopId)
      const senderMemberIds = senderShopMemberships.map((m) => m.id)

      // Get business admin
      const businessAdmins = await prisma.businessMember.findMany({
        where: { businessId, role: "BUSINESS_ADMIN", isActive: true },
        include: { user: true },
      })

      for (const admin of businessAdmins) {
        contacts.push({
          id: admin.userId,
          type: "staff",
          name: admin.user.name || admin.user.email,
          email: admin.user.email,
          phone: admin.user.phone,
          role: admin.role as Role,
        })
      }

      if (user.role === "SHOP_ADMIN" || user.role === "SALES_STAFF") {
        // Get all shop members in their shops
        const shopMembers = await prisma.shopMember.findMany({
          where: {
            shopId: { in: senderShopIds },
            isActive: true,
            userId: { not: user.id },
          },
          include: { user: true, shop: true },
        })

        const addedUserIds = new Set(contacts.map((c) => c.id))
        for (const member of shopMembers) {
          if (!addedUserIds.has(member.userId)) {
            contacts.push({
              id: member.userId,
              type: "staff",
              name: member.user.name || member.user.email,
              email: member.user.email,
              phone: member.user.phone,
              role: member.role as Role,
              shopId: member.shopId,
              shopName: member.shop.name,
            })
            addedUserIds.add(member.userId)
          }
        }

        // Get all customers in their shops
        const customers = await prisma.customer.findMany({
          where: {
            shopId: { in: senderShopIds },
            isActive: true,
          },
          include: { shop: true },
        })

        for (const customer of customers) {
          contacts.push({
            id: customer.id,
            type: "customer",
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone,
            shopId: customer.shopId,
            shopName: customer.shop.name,
          })
        }
      } else if (user.role === "DEBT_COLLECTOR") {
        // Get shop admins and sales staff in their shops
        const shopMembers = await prisma.shopMember.findMany({
          where: {
            shopId: { in: senderShopIds },
            role: { in: ["SHOP_ADMIN", "SALES_STAFF"] },
            isActive: true,
            userId: { not: user.id },
          },
          include: { user: true, shop: true },
        })

        const addedUserIds = new Set(contacts.map((c) => c.id))
        for (const member of shopMembers) {
          if (!addedUserIds.has(member.userId)) {
            contacts.push({
              id: member.userId,
              type: "staff",
              name: member.user.name || member.user.email,
              email: member.user.email,
              phone: member.user.phone,
              role: member.role as Role,
              shopId: member.shopId,
              shopName: member.shop.name,
            })
            addedUserIds.add(member.userId)
          }
        }

        // Get only assigned customers
        const customers = await prisma.customer.findMany({
          where: {
            assignedCollectorId: { in: senderMemberIds },
            isActive: true,
          },
          include: { shop: true },
        })

        for (const customer of customers) {
          contacts.push({
            id: customer.id,
            type: "customer",
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone,
            shopId: customer.shopId,
            shopName: customer.shop.name,
          })
        }
      }
    }

    return { success: true, data: contacts }
  } catch (error) {
    console.error("Error getting available contacts:", error)
    return { success: false, error: "Failed to get contacts" }
  }
}

// ============================================================================
// CONVERSATION ACTIONS
// ============================================================================

/**
 * Get or create a conversation between two participants
 */
export async function getOrCreateConversation(
  businessId: string,
  targetType: "staff" | "customer",
  targetId: string,
  shopId?: string
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Check permission
    const canMessage = await canUserMessage(user.id, user.role, targetType, targetId, businessId)
    if (!canMessage) {
      return { success: false, error: "You don't have permission to message this person" }
    }

    // Determine conversation type and participants
    const conversationType = targetType === "customer" ? "STAFF_TO_CUSTOMER" : "STAFF_TO_STAFF"

    // For staff-to-staff, ensure participant1Id < participant2Id for consistency
    let participant1Id = user.id
    let participant2Id = targetType === "staff" ? targetId : null
    let customerId = targetType === "customer" ? targetId : null

    // Normalize participant order for staff-to-staff
    if (conversationType === "STAFF_TO_STAFF" && participant2Id) {
      if (participant1Id > participant2Id) {
        ;[participant1Id, participant2Id] = [participant2Id, participant1Id]
      }
    }

    // Determine shopId for the conversation
    let conversationShopId = shopId
    if (!conversationShopId && targetType === "customer") {
      const customer = await prisma.customer.findUnique({
        where: { id: targetId },
        select: { shopId: true },
      })
      conversationShopId = customer?.shopId
    }

    // Try to find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        businessId,
        ...(conversationType === "STAFF_TO_STAFF"
          ? { participant1Id, participant2Id }
          : { participant1Id: user.id, customerId }),
      },
    })

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          shopId: conversationShopId,
          participant1Id: conversationType === "STAFF_TO_CUSTOMER" ? user.id : participant1Id,
          participant2Id: conversationType === "STAFF_TO_STAFF" ? participant2Id : null,
          customerId,
          conversationType,
        },
      })
    }

    return { success: true, data: { conversationId: conversation.id } }
  } catch (error) {
    console.error("Error getting/creating conversation:", error)
    return { success: false, error: "Failed to get or create conversation" }
  }
}

/**
 * Get conversations for a user
 */
export async function getConversations(
  businessId: string,
  options?: {
    shopId?: string
    includeAllBusiness?: boolean // For business admin to see all conversations
  }
): Promise<ActionResult<ConversationWithDetails[]>> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const isBusinessAdmin = user.role === "BUSINESS_ADMIN" || user.role === "SUPER_ADMIN"

    // Build where clause based on role and options
    let whereClause: Record<string, unknown> = { businessId }

    if (options?.shopId) {
      whereClause.shopId = options.shopId
    }

    if (isBusinessAdmin && options?.includeAllBusiness) {
      // Business admin can see all conversations in the business
      // No additional filtering needed
    } else {
      // Regular users only see their own conversations
      whereClause = {
        ...whereClause,
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id },
        ],
      }
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        participant1: {
          select: { id: true, name: true, email: true, role: true },
        },
        participant2: {
          select: { id: true, name: true, email: true, role: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        shop: {
          select: { id: true, name: true, shopSlug: true },
        },
        messages: {
          where: {
            isRead: false,
            // Don't count messages sent by current user as unread
            NOT: { senderId: user.id },
          },
          select: { id: true },
        },
      },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    })

    const result: ConversationWithDetails[] = conversations.map((conv) => ({
      id: conv.id,
      businessId: conv.businessId,
      shopId: conv.shopId,
      conversationType: conv.conversationType,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      createdAt: conv.createdAt,
      participant1: conv.participant1,
      participant2: conv.participant2,
      customer: conv.customer,
      shop: conv.shop,
      unreadCount: conv.messages.length,
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error("Error getting conversations:", error)
    return { success: false, error: "Failed to get conversations" }
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<ActionResult<{ messages: MessageWithSender[]; hasMore: boolean }>> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        shop: { include: { business: true } },
      },
    })

    if (!conversation) {
      return { success: false, error: "Conversation not found" }
    }

    const isBusinessAdmin = user.role === "BUSINESS_ADMIN" || user.role === "SUPER_ADMIN"
    const isParticipant =
      conversation.participant1Id === user.id || conversation.participant2Id === user.id

    if (!isBusinessAdmin && !isParticipant) {
      return { success: false, error: "You don't have access to this conversation" }
    }

    const skip = (page - 1) * limit

    const messages = await prisma.inAppMessage.findMany({
      where: { 
        conversationId,
        isDeleted: false, // Don't show deleted messages
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
        },
        senderCustomer: {
          select: { id: true, firstName: true, lastName: true, lastSeenAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit + 1, // Get one extra to check if there are more
    })

    const hasMore = messages.length > limit
    const resultMessages = hasMore ? messages.slice(0, limit) : messages

    // Mark messages as read if user is a participant
    if (isParticipant) {
      await prisma.inAppMessage.updateMany({
        where: {
          conversationId,
          isRead: false,
          NOT: { senderId: user.id },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    }

    return {
      success: true,
      data: {
        messages: resultMessages.reverse(), // Return in chronological order
        hasMore,
      },
    }
  } catch (error) {
    console.error("Error getting messages:", error)
    return { success: false, error: "Failed to get messages" }
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ActionResult<MessageWithSender>> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    if (!content.trim()) {
      return { success: false, error: "Message cannot be empty" }
    }

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return { success: false, error: "Conversation not found" }
    }

    const isParticipant =
      conversation.participant1Id === user.id || conversation.participant2Id === user.id

    if (!isParticipant) {
      return { success: false, error: "You don't have access to this conversation" }
    }

    // Create the message
    const message = await prisma.inAppMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
        },
        senderCustomer: {
          select: { id: true, firstName: true, lastName: true, lastSeenAt: true },
        },
      },
    })

    // Update conversation with last message info
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: content.length > 100 ? content.substring(0, 100) + "..." : content,
      },
    })

    revalidatePath("/")
    return { success: true, data: message }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, error: "Failed to send message" }
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(businessId: string): Promise<ActionResult<number>> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const count = await prisma.inAppMessage.count({
      where: {
        isRead: false,
        isDeleted: false,
        NOT: { senderId: user.id },
        conversation: {
          businessId,
          OR: [{ participant1Id: user.id }, { participant2Id: user.id }],
        },
      },
    })

    return { success: true, data: count }
  } catch (error) {
    console.error("Error getting unread count:", error)
    return { success: false, error: "Failed to get unread count" }
  }
}

/**
 * Get unread message count for a user in a specific shop
 */
export async function getUnreadMessageCountForShop(shopId: string): Promise<number> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return 0
    }

    const count = await prisma.inAppMessage.count({
      where: {
        isRead: false,
        isDeleted: false,
        NOT: { senderId: user.id },
        conversation: {
          shopId,
          OR: [{ participant1Id: user.id }, { participant2Id: user.id }],
        },
      },
    })

    return count
  } catch (error) {
    console.error("Error getting unread count for shop:", error)
    return 0
  }
}

/**
 * Mark all messages in a conversation as read
 */
export async function markConversationAsRead(conversationId: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    await prisma.inAppMessage.updateMany({
      where: {
        conversationId,
        isRead: false,
        NOT: { senderId: user.id },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error marking conversation as read:", error)
    return { success: false, error: "Failed to mark as read" }
  }
}

// ============================================================================
// CUSTOMER MESSAGING (for customer portal)
// ============================================================================

/**
 * Get conversations for a customer
 */
export async function getCustomerConversations(
  customerId: string
): Promise<ActionResult<ConversationWithDetails[]>> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { customerId },
      include: {
        participant1: {
          select: { id: true, name: true, email: true, role: true },
        },
        participant2: {
          select: { id: true, name: true, email: true, role: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        shop: {
          select: { id: true, name: true, shopSlug: true },
        },
        messages: {
          where: {
            isRead: false,
            senderCustomerId: null, // Only count messages not sent by customer
          },
          select: { id: true },
        },
      },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    })

    const result: ConversationWithDetails[] = conversations.map((conv) => ({
      id: conv.id,
      businessId: conv.businessId,
      shopId: conv.shopId,
      conversationType: conv.conversationType,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      createdAt: conv.createdAt,
      participant1: conv.participant1,
      participant2: conv.participant2,
      customer: conv.customer,
      shop: conv.shop,
      unreadCount: conv.messages.length,
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error("Error getting customer conversations:", error)
    return { success: false, error: "Failed to get conversations" }
  }
}

/**
 * Send a message as a customer
 */
export async function sendCustomerMessage(
  conversationId: string,
  customerId: string,
  content: string
): Promise<ActionResult<MessageWithSender>> {
  try {
    if (!content.trim()) {
      return { success: false, error: "Message cannot be empty" }
    }

    // Verify customer has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation || conversation.customerId !== customerId) {
      return { success: false, error: "You don't have access to this conversation" }
    }

    // Create the message
    const message = await prisma.inAppMessage.create({
      data: {
        conversationId,
        senderCustomerId: customerId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
        },
        senderCustomer: {
          select: { id: true, firstName: true, lastName: true, lastSeenAt: true },
        },
      },
    })

    // Update conversation with last message info
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: content.length > 100 ? content.substring(0, 100) + "..." : content,
      },
    })

    revalidatePath("/")
    return { success: true, data: message }
  } catch (error) {
    console.error("Error sending customer message:", error)
    return { success: false, error: "Failed to send message" }
  }
}

/**
 * Get messages for a customer conversation
 */
export async function getCustomerConversationMessages(
  conversationId: string,
  customerId: string,
  page: number = 1,
  limit: number = 50
): Promise<ActionResult<{ messages: MessageWithSender[]; hasMore: boolean }>> {
  try {
    // Verify customer has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation || conversation.customerId !== customerId) {
      return { success: false, error: "You don't have access to this conversation" }
    }

    const skip = (page - 1) * limit

    const messages = await prisma.inAppMessage.findMany({
      where: { 
        conversationId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
        },
        senderCustomer: {
          select: { id: true, firstName: true, lastName: true, lastSeenAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit + 1,
    })

    const hasMore = messages.length > limit
    const resultMessages = hasMore ? messages.slice(0, limit) : messages

    // Mark messages as read
    await prisma.inAppMessage.updateMany({
      where: {
        conversationId,
        isRead: false,
        senderCustomerId: null, // Only mark staff messages as read
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return {
      success: true,
      data: {
        messages: resultMessages.reverse(),
        hasMore,
      },
    }
  } catch (error) {
    console.error("Error getting customer messages:", error)
    return { success: false, error: "Failed to get messages" }
  }
}

/**
 * Get shop staff contacts for a customer to message
 */
export async function getCustomerAvailableContacts(
  customerId: string
): Promise<ActionResult<ContactInfo[]>> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        shop: {
          include: {
            members: {
              where: { isActive: true },
              include: { user: true },
            },
            business: {
              include: {
                members: {
                  where: { role: "BUSINESS_ADMIN", isActive: true },
                  include: { user: true },
                },
              },
            },
          },
        },
        assignedCollector: {
          include: { user: true },
        },
      },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    const contacts: ContactInfo[] = []

    // Add assigned collector first if exists
    if (customer.assignedCollector) {
      contacts.push({
        id: customer.assignedCollector.userId,
        type: "staff",
        name: customer.assignedCollector.user.name || customer.assignedCollector.user.email,
        email: customer.assignedCollector.user.email,
        phone: customer.assignedCollector.user.phone,
        role: customer.assignedCollector.role as Role,
        shopId: customer.shopId,
        shopName: customer.shop.name,
      })
    }

    // Add shop admins
    for (const member of customer.shop.members) {
      if (member.role === "SHOP_ADMIN" && !contacts.find((c) => c.id === member.userId)) {
        contacts.push({
          id: member.userId,
          type: "staff",
          name: member.user.name || member.user.email,
          email: member.user.email,
          phone: member.user.phone,
          role: member.role as Role,
          shopId: customer.shopId,
          shopName: customer.shop.name,
        })
      }
    }

    return { success: true, data: contacts }
  } catch (error) {
    console.error("Error getting customer contacts:", error)
    return { success: false, error: "Failed to get contacts" }
  }
}

/**
 * Create conversation for customer
 */
export async function createCustomerConversation(
  customerId: string,
  staffUserId: string
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { shop: true },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        customerId,
        participant1Id: staffUserId,
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId: customer.shop.businessId,
          shopId: customer.shopId,
          participant1Id: staffUserId,
          customerId,
          conversationType: "STAFF_TO_CUSTOMER",
        },
      })
    }

    return { success: true, data: { conversationId: conversation.id } }
  } catch (error) {
    console.error("Error creating customer conversation:", error)
    return { success: false, error: "Failed to create conversation" }
  }
}

// ============================================================================
// SYSTEM MESSAGING FUNCTIONS (For automated messages to customers)
// ============================================================================

/**
 * Send an automated system message to a customer
 * This creates a conversation if needed and sends the message from a staff member
 */
export async function sendSystemMessageToCustomer(params: {
  customerId: string
  staffUserId: string
  businessId: string
  shopId: string
  content: string
  attachmentType?: "INVOICE_PDF" | "RECEIPT_PDF" | "PENDING_PAYMENT"
  attachmentData?: string // Base64 PDF data or JSON for pending payment
}): Promise<ActionResult<{ messageId: string; conversationId: string }>> {
  try {
    const { customerId, staffUserId, businessId, shopId, content, attachmentType, attachmentData } = params

    // Get or create conversation between staff and customer
    let conversation = await prisma.conversation.findFirst({
      where: {
        customerId,
        participant1Id: staffUserId,
        conversationType: "STAFF_TO_CUSTOMER",
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          shopId,
          participant1Id: staffUserId,
          customerId,
          conversationType: "STAFF_TO_CUSTOMER",
        },
      })
    }

    // Build the message content with attachment info
    let fullContent = content
    if (attachmentType && attachmentData) {
      // Add attachment marker for frontend to parse
      fullContent = `${content}\n\n[ATTACHMENT:${attachmentType}:${attachmentData}]`
    }

    // Create the message
    const message = await prisma.inAppMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: staffUserId,
        content: fullContent,
      },
    })

    // Update conversation with last message info
    const preview = content.length > 100 ? content.substring(0, 100) + "..." : content
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: preview,
      },
    })

    return {
      success: true,
      data: { messageId: message.id, conversationId: conversation.id },
    }
  } catch (error) {
    console.error("Error sending system message to customer:", error)
    return { success: false, error: "Failed to send system message" }
  }
}

/**
 * Send purchase invoice message to customer
 */
export async function sendPurchaseInvoiceMessage(params: {
  customerId: string
  staffUserId: string
  businessId: string
  shopId: string
  invoicePdfBase64: string
  purchaseNumber: string
  totalAmount: number
  outstandingBalance: number
}): Promise<ActionResult<{ messageId: string }>> {
  const { customerId, staffUserId, businessId, shopId, invoicePdfBase64, purchaseNumber, totalAmount, outstandingBalance } = params

  const content = `📄 **New Purchase Invoice**

Thank you for your purchase!

**Purchase #:** ${purchaseNumber}
**Total Amount:** GHS ${totalAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
**Balance Due:** GHS ${outstandingBalance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}

Your invoice is attached below. Please review it and make your payments on time.

If you have any questions about your purchase, please don't hesitate to reach out.`

  return sendSystemMessageToCustomer({
    customerId,
    staffUserId,
    businessId,
    shopId,
    content,
    attachmentType: "INVOICE_PDF",
    attachmentData: invoicePdfBase64,
  })
}

/**
 * Send pending payment notification message to customer
 */
export async function sendPendingPaymentMessage(params: {
  customerId: string
  staffUserId: string
  businessId: string
  shopId: string
  purchaseNumber: string
  paymentAmount: number
  paymentMethod: string
  reference?: string | null
  collectorName?: string | null
}): Promise<ActionResult<{ messageId: string }>> {
  const { customerId, staffUserId, businessId, shopId, purchaseNumber, paymentAmount, paymentMethod, reference, collectorName } = params

  const content = `⏳ **Payment Pending Confirmation**

Your payment is being processed and awaiting confirmation.

**Payment Details:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Amount: GHS ${paymentAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
• Payment Method: ${paymentMethod}
${reference ? `• Reference: ${reference}` : ""}
${collectorName ? `• Collected By: ${collectorName}` : ""}

**Purchase #:** ${purchaseNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Status: PENDING**

You will receive a receipt once your payment has been confirmed.`

  return sendSystemMessageToCustomer({
    customerId,
    staffUserId,
    businessId,
    shopId,
    content,
    attachmentType: "PENDING_PAYMENT",
    attachmentData: JSON.stringify({
      amount: paymentAmount,
      method: paymentMethod,
      reference,
      purchaseNumber,
      status: "PENDING",
    }),
  })
}

/**
 * Send payment receipt message to customer
 */
export async function sendPaymentReceiptMessage(params: {
  customerId: string
  staffUserId: string
  businessId: string
  shopId: string
  receiptPdfBase64: string
  receiptNumber: string
  purchaseNumber: string
  paymentAmount: number
  newBalance: number
  isFullyPaid: boolean
}): Promise<ActionResult<{ messageId: string }>> {
  const { customerId, staffUserId, businessId, shopId, receiptPdfBase64, receiptNumber, purchaseNumber, paymentAmount, newBalance, isFullyPaid } = params

  const fullyPaidMessage = isFullyPaid
    ? `\n\n🎉 **Congratulations!** Your purchase has been fully paid. Thank you!`
    : `\n\n**Remaining Balance:** GHS ${newBalance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`

  const content = `✅ **Payment Confirmed - Receipt**

Your payment has been confirmed and processed successfully!

**Receipt #:** ${receiptNumber}
**Purchase #:** ${purchaseNumber}
**Amount Paid:** GHS ${paymentAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
${fullyPaidMessage}

Your receipt is attached below for your records.`

  return sendSystemMessageToCustomer({
    customerId,
    staffUserId,
    businessId,
    shopId,
    content,
    attachmentType: "RECEIPT_PDF",
    attachmentData: receiptPdfBase64,
  })
}
// ============================================================================
// MESSAGE EDIT & DELETE ACTIONS
// ============================================================================

/**
 * Edit a message - only the sender can edit, and only non-system messages
 */
export async function editMessage(
  messageId: string,
  newContent: string
): Promise<ActionResult<MessageWithSender>> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    if (!newContent.trim()) {
      return { success: false, error: "Message cannot be empty" }
    }

    // Get the message
    const message = await prisma.inAppMessage.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    })

    if (!message) {
      return { success: false, error: "Message not found" }
    }

    // Check if user is the sender
    if (message.senderId !== user.id) {
      return { success: false, error: "You can only edit your own messages" }
    }

    // Check if it's a system message (invoice/receipt)
    if (message.isSystemMessage) {
      return { success: false, error: "System messages cannot be edited" }
    }

    // Check if message has attachment (invoice/receipt PDF)
    if (message.content.includes("[ATTACHMENT:INVOICE_PDF:") || 
        message.content.includes("[ATTACHMENT:RECEIPT_PDF:")) {
      return { success: false, error: "Invoice and receipt messages cannot be edited" }
    }

    // Update the message
    const updatedMessage = await prisma.inAppMessage.update({
      where: { id: messageId },
      data: {
        content: newContent.trim(),
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
        },
        senderCustomer: {
          select: { id: true, firstName: true, lastName: true, lastSeenAt: true },
        },
      },
    })

    // Update conversation preview if this was the last message
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
    })

    if (conversation && conversation.lastMessageAt && 
        message.createdAt.getTime() === conversation.lastMessageAt.getTime()) {
      await prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessagePreview: newContent.length > 100 ? newContent.substring(0, 100) + "..." : newContent,
        },
      })
    }

    revalidatePath("/")
    return { success: true, data: updatedMessage }
  } catch (error) {
    console.error("Error editing message:", error)
    return { success: false, error: "Failed to edit message" }
  }
}

/**
 * Delete a message - only the sender can delete, and only non-system messages
 */
export async function deleteMessage(messageId: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get the message
    const message = await prisma.inAppMessage.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    })

    if (!message) {
      return { success: false, error: "Message not found" }
    }

    // Check if user is the sender
    if (message.senderId !== user.id) {
      return { success: false, error: "You can only delete your own messages" }
    }

    // Check if it's a system message (invoice/receipt)
    if (message.isSystemMessage) {
      return { success: false, error: "System messages cannot be deleted" }
    }

    // Check if message has attachment (invoice/receipt PDF)
    if (message.content.includes("[ATTACHMENT:INVOICE_PDF:") || 
        message.content.includes("[ATTACHMENT:RECEIPT_PDF:")) {
      return { success: false, error: "Invoice and receipt messages cannot be deleted" }
    }

    // Soft delete the message
    await prisma.inAppMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    // Update conversation preview if this was the last message
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
    })

    if (conversation && conversation.lastMessageAt && 
        message.createdAt.getTime() === conversation.lastMessageAt.getTime()) {
      // Get the new last message
      const lastMessage = await prisma.inAppMessage.findFirst({
        where: { 
          conversationId: message.conversationId,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
      })

      await prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessageAt: lastMessage?.createdAt || null,
          lastMessagePreview: lastMessage 
            ? (lastMessage.content.length > 100 ? lastMessage.content.substring(0, 100) + "..." : lastMessage.content)
            : null,
        },
      })
    }

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting message:", error)
    return { success: false, error: "Failed to delete message" }
  }
}

// ============================================================================
// ONLINE STATUS ACTIONS
// ============================================================================

/**
 * Update user's last seen timestamp
 */
export async function updateLastSeen(): Promise<ActionResult> {
  try {
    const user = await getSessionUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating last seen:", error)
    return { success: false, error: "Failed to update last seen" }
  }
}

/**
 * Update customer's last seen timestamp
 */
export async function updateCustomerLastSeen(customerId: string): Promise<ActionResult> {
  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { lastSeenAt: new Date() },
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating customer last seen:", error)
    return { success: false, error: "Failed to update last seen" }
  }
}

/**
 * Get online status for a conversation participant
 * Returns true if lastSeenAt is within the last 5 minutes
 */
export async function getParticipantOnlineStatus(
  conversationId: string,
  currentUserId: string
): Promise<ActionResult<{ isOnline: boolean; lastSeenAt: Date | null }>> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: { select: { id: true, lastSeenAt: true } },
        participant2: { select: { id: true, lastSeenAt: true } },
        customer: { select: { id: true, lastSeenAt: true } },
      },
    })

    if (!conversation) {
      return { success: false, error: "Conversation not found" }
    }

    // Determine the other participant
    let lastSeenAt: Date | null = null

    if (conversation.customer) {
      lastSeenAt = conversation.customer.lastSeenAt
    } else if (conversation.participant1Id === currentUserId) {
      lastSeenAt = conversation.participant2?.lastSeenAt || null
    } else {
      lastSeenAt = conversation.participant1?.lastSeenAt || null
    }

    // Consider online if seen within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isOnline = lastSeenAt ? lastSeenAt > fiveMinutesAgo : false

    return { success: true, data: { isOnline, lastSeenAt } }
  } catch (error) {
    console.error("Error getting participant status:", error)
    return { success: false, error: "Failed to get status" }
  }
}

// ============================================================================
// CUSTOMER EDIT/DELETE FUNCTIONS
// ============================================================================

/**
 * Edit a customer message
 */
export async function editCustomerMessage(
  messageId: string,
  customerId: string,
  newContent: string
): Promise<ActionResult<MessageWithSender>> {
  try {
    if (!newContent.trim()) {
      return { success: false, error: "Message cannot be empty" }
    }

    // Get the message
    const message = await prisma.inAppMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return { success: false, error: "Message not found" }
    }

    // Check if customer is the sender
    if (message.senderCustomerId !== customerId) {
      return { success: false, error: "You can only edit your own messages" }
    }

    // Check if it's a system message (invoice/receipt)
    if (message.isSystemMessage) {
      return { success: false, error: "System messages cannot be edited" }
    }

    // Check if message has attachment
    if (message.content.includes("[ATTACHMENT:INVOICE_PDF:") || 
        message.content.includes("[ATTACHMENT:RECEIPT_PDF:")) {
      return { success: false, error: "Invoice and receipt messages cannot be edited" }
    }

    // Update the message
    const updatedMessage = await prisma.inAppMessage.update({
      where: { id: messageId },
      data: {
        content: newContent.trim(),
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
        },
        senderCustomer: {
          select: { id: true, firstName: true, lastName: true, lastSeenAt: true },
        },
      },
    })

    revalidatePath("/")
    return { success: true, data: updatedMessage }
  } catch (error) {
    console.error("Error editing customer message:", error)
    return { success: false, error: "Failed to edit message" }
  }
}

/**
 * Delete a customer message (soft delete)
 */
export async function deleteCustomerMessage(
  messageId: string,
  customerId: string
): Promise<ActionResult> {
  try {
    // Get the message
    const message = await prisma.inAppMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return { success: false, error: "Message not found" }
    }

    // Check if customer is the sender
    if (message.senderCustomerId !== customerId) {
      return { success: false, error: "You can only delete your own messages" }
    }

    // Check if it's a system message
    if (message.isSystemMessage) {
      return { success: false, error: "System messages cannot be deleted" }
    }

    // Check if message has attachment
    if (message.content.includes("[ATTACHMENT:INVOICE_PDF:") || 
        message.content.includes("[ATTACHMENT:RECEIPT_PDF:")) {
      return { success: false, error: "Invoice and receipt messages cannot be deleted" }
    }

    // Soft delete the message
    await prisma.inAppMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting customer message:", error)
    return { success: false, error: "Failed to delete message" }
  }
}

/**
 * Get staff online status for a customer conversation
 */
export async function getStaffOnlineStatusForCustomer(
  conversationId: string,
  customerId: string
): Promise<ActionResult<{ isOnline: boolean; lastSeenAt: Date | null }>> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: {
          select: { id: true, lastSeenAt: true },
        },
      },
    })

    if (!conversation || conversation.customerId !== customerId) {
      return { success: false, error: "Conversation not found" }
    }

    const lastSeenAt = conversation.participant1?.lastSeenAt || null
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isOnline = lastSeenAt ? lastSeenAt > fiveMinutesAgo : false

    return { success: true, data: { isOnline, lastSeenAt } }
  } catch (error) {
    console.error("Error getting staff status:", error)
    return { success: false, error: "Failed to get status" }
  }
}