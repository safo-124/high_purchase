"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// ============================================
// TYPES
// ============================================

export interface CustomerSession {
  customerId: string
  userId: string
  shopId: string
  firstName: string
  lastName: string
  email: string
}

export interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

// ============================================
// AUTH HELPERS
// ============================================

async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("customer_token")?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CustomerSession
    return decoded
  } catch {
    return null
  }
}

async function requireCustomerAuth(): Promise<CustomerSession> {
  const session = await getCustomerSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

// ============================================
// CUSTOMER REGISTRATION
// ============================================

export interface CustomerRegisterPayload {
  phone: string
  email: string
  password: string
}

export async function registerCustomerAccount(
  shopSlug: string,
  payload: CustomerRegisterPayload
): Promise<ActionResult> {
  try {
    // Find the shop
    const shop = await prisma.shop.findUnique({
      where: { shopSlug },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Find existing customer by phone
    const customer = await prisma.customer.findFirst({
      where: {
        shopId: shop.id,
        phone: payload.phone,
      },
    })

    if (!customer) {
      return {
        success: false,
        error: "No customer found with this phone number. Please contact the shop first.",
      }
    }

    if (customer.userId) {
      return {
        success: false,
        error: "This customer already has an account. Please login instead.",
      }
    }

    // Check if email is already used
    const normalizedEmail = payload.email.toLowerCase().trim()
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return {
        success: false,
        error: "This email is already registered. Please use a different email.",
      }
    }

    // Create user account and link to customer
    const passwordHash = await bcrypt.hash(payload.password, 12)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: `${customer.firstName} ${customer.lastName}`,
        passwordHash,
        role: "CUSTOMER",
      },
    })

    // Link user to customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        userId: user.id,
        email: payload.email,
      },
    })

    return { success: true, data: { customerId: customer.id } }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, error: "Registration failed" }
  }
}

// ============================================
// CUSTOMER LOGIN
// ============================================

export interface CustomerLoginPayload {
  shopSlug: string
  email: string
  password: string
}

export async function loginCustomer(
  payload: CustomerLoginPayload
): Promise<ActionResult> {
  try {
    const shop = await prisma.shop.findUnique({
      where: { shopSlug: payload.shopSlug },
    })

    if (!shop) {
      return { success: false, error: "Shop not found" }
    }

    // Find user by email (lowercase to match stored email)
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase().trim() },
    })

    if (!user || user.role !== "CUSTOMER") {
      return { success: false, error: "Invalid email or password" }
    }

    // Verify password
    const validPassword = await bcrypt.compare(payload.password, user.passwordHash)
    if (!validPassword) {
      return { success: false, error: "Invalid email or password" }
    }

    // Find customer profile linked to this user for this shop
    const customer = await prisma.customer.findFirst({
      where: {
        userId: user.id,
        shopId: shop.id,
      },
    })

    if (!customer) {
      return { success: false, error: "No customer account found for this shop" }
    }

    // Create session token
    const session: CustomerSession = {
      customerId: customer.id,
      userId: user.id,
      shopId: shop.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: user.email,
    }

    const token = jwt.sign(session, JWT_SECRET, { expiresIn: "7d" })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    return { success: true, data: { shopSlug: payload.shopSlug } }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "Login failed" }
  }
}

export async function logoutCustomer(): Promise<ActionResult> {
  const cookieStore = await cookies()
  cookieStore.delete("customer_token")
  return { success: true }
}

// ============================================
// CUSTOMER DASHBOARD DATA
// ============================================

export interface CustomerDashboardData {
  customer: {
    firstName: string
    lastName: string
    email: string | null
    phone: string
  }
  shop: {
    name: string
    shopSlug: string
    businessName: string
    businessLogoUrl: string | null
  }
  stats: {
    totalPurchases: number
    activePurchases: number
    totalOwed: number
    totalPaid: number
  }
  recentPurchases: Array<{
    id: string
    purchaseNumber: string
    status: string
    totalAmount: number
    outstandingBalance: number
    createdAt: Date
  }>
  notifications: Array<{
    id: string
    title: string
    body: string
    type: string
    isRead: boolean
    createdAt: Date
  }>
}

export async function getCustomerDashboard(): Promise<CustomerDashboardData | null> {
  try {
    const session = await requireCustomerAuth()

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      include: {
        shop: {
          include: {
            business: {
              select: { name: true, logoUrl: true },
            },
          },
        },
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 10,
          where: { isRead: false },
        },
      },
    })

    if (!customer) return null

    // Calculate stats
    const allPurchases = await prisma.purchase.findMany({
      where: { customerId: customer.id },
    })

    const totalOwed = allPurchases.reduce(
      (sum, p) => sum + Number(p.outstandingBalance),
      0
    )
    const totalPaid = allPurchases.reduce((sum, p) => sum + Number(p.amountPaid), 0)
    const activePurchases = allPurchases.filter((p) => p.status === "ACTIVE").length

    return {
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      shop: {
        name: customer.shop.name,
        shopSlug: customer.shop.shopSlug,
        businessName: customer.shop.business.name,
        businessLogoUrl: customer.shop.business.logoUrl,
      },
      stats: {
        totalPurchases: allPurchases.length,
        activePurchases,
        totalOwed,
        totalPaid,
      },
      recentPurchases: customer.purchases.map((p) => ({
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        status: p.status,
        totalAmount: Number(p.totalAmount),
        outstandingBalance: Number(p.outstandingBalance),
        createdAt: p.createdAt,
      })),
      notifications: customer.notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    }
  } catch {
    return null
  }
}

// ============================================
// CUSTOMER PURCHASES
// ============================================

export interface CustomerPurchaseDetail {
  id: string
  purchaseNumber: string
  status: string
  purchaseType: string
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  downPayment: number
  dueDate: Date | null
  createdAt: Date
  items: Array<{
    id: string
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  payments: Array<{
    id: string
    amount: number
    paymentMethod: string
    status: string
    paidAt: Date | null
    createdAt: Date
  }>
}

export async function getCustomerPurchases(): Promise<CustomerPurchaseDetail[]> {
  const session = await requireCustomerAuth()

  const purchases = await prisma.purchase.findMany({
    where: { customerId: session.customerId },
    include: {
      items: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return purchases.map((p) => ({
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    status: p.status,
    purchaseType: p.purchaseType,
    totalAmount: Number(p.totalAmount),
    amountPaid: Number(p.amountPaid),
    outstandingBalance: Number(p.outstandingBalance),
    downPayment: Number(p.downPayment),
    dueDate: p.dueDate,
    createdAt: p.createdAt,
    items: p.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
    payments: p.payments.map((pay) => ({
      id: pay.id,
      amount: Number(pay.amount),
      paymentMethod: pay.paymentMethod,
      status: pay.status,
      paidAt: pay.paidAt,
      createdAt: pay.createdAt,
    })),
  }))
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function markNotificationAsRead(
  notificationId: string
): Promise<ActionResult> {
  try {
    const session = await requireCustomerAuth()

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        customerId: session.customerId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath("/customer")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to mark as read" }
  }
}

export async function markAllNotificationsAsRead(): Promise<ActionResult> {
  try {
    const session = await requireCustomerAuth()

    await prisma.notification.updateMany({
      where: {
        customerId: session.customerId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath("/customer")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to mark all as read" }
  }
}

// ============================================
// GET ALL NOTIFICATIONS
// ============================================

export interface CustomerNotification {
  id: string
  title: string
  body: string
  type: string
  link: string | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

export async function getCustomerNotifications(): Promise<CustomerNotification[]> {
  try {
    const session = await requireCustomerAuth()

    const notifications = await prisma.notification.findMany({
      where: { customerId: session.customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      link: n.link,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }))
  } catch {
    return []
  }
}

// ============================================
// CHECK SESSION (for middleware/components)
// ============================================

export async function checkCustomerSession(): Promise<CustomerSession | null> {
  return await getCustomerSession()
}

// ============================================
// CUSTOMER RECEIPTS
// ============================================

export interface CustomerReceiptData {
  id: string
  invoiceNumber: string
  paymentAmount: number
  previousBalance: number
  newBalance: number
  totalPurchaseAmount: number
  totalAmountPaid: number
  collectorName: string | null
  paymentMethod: string
  purchaseNumber: string
  purchaseType: string
  shopName: string
  businessName: string
  isPurchaseCompleted: boolean
  generatedAt: Date
  items: {
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
}

/**
 * Get all receipts for the logged-in customer
 */
export async function getCustomerReceipts(): Promise<CustomerReceiptData[]> {
  try {
    const session = await requireCustomerAuth()

    // Get all purchases for this customer
    const purchases = await prisma.purchase.findMany({
      where: { customerId: session.customerId },
      select: { id: true },
    })

    const purchaseIds = purchases.map((p) => p.id)

    // Get all invoices for these purchases
    const invoices = await prisma.progressInvoice.findMany({
      where: { purchaseId: { in: purchaseIds } },
      include: {
        purchase: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { generatedAt: "desc" },
    })

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      paymentAmount: Number(inv.paymentAmount),
      previousBalance: Number(inv.previousBalance),
      newBalance: Number(inv.newBalance),
      totalPurchaseAmount: Number(inv.totalPurchaseAmount),
      totalAmountPaid: Number(inv.totalAmountPaid),
      collectorName: inv.collectorName,
      paymentMethod: inv.paymentMethod,
      purchaseNumber: inv.purchaseNumber,
      purchaseType: inv.purchaseType,
      shopName: inv.shopName,
      businessName: inv.businessName,
      isPurchaseCompleted: inv.isPurchaseCompleted,
      generatedAt: inv.generatedAt,
      items: inv.purchase.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }))
  } catch {
    return []
  }
}

/**
 * Get a single receipt by ID for the logged-in customer
 */
export async function getCustomerReceiptById(receiptId: string): Promise<CustomerReceiptData | null> {
  try {
    const session = await requireCustomerAuth()

    // Get all purchases for this customer to verify ownership
    const purchases = await prisma.purchase.findMany({
      where: { customerId: session.customerId },
      select: { id: true },
    })

    const purchaseIds = purchases.map((p) => p.id)

    const invoice = await prisma.progressInvoice.findFirst({
      where: { 
        id: receiptId,
        purchaseId: { in: purchaseIds },
      },
      include: {
        purchase: {
          include: {
            items: true,
          },
        },
      },
    })

    if (!invoice) return null

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentAmount: Number(invoice.paymentAmount),
      previousBalance: Number(invoice.previousBalance),
      newBalance: Number(invoice.newBalance),
      totalPurchaseAmount: Number(invoice.totalPurchaseAmount),
      totalAmountPaid: Number(invoice.totalAmountPaid),
      collectorName: invoice.collectorName,
      paymentMethod: invoice.paymentMethod,
      purchaseNumber: invoice.purchaseNumber,
      purchaseType: invoice.purchaseType,
      shopName: invoice.shopName,
      businessName: invoice.businessName,
      isPurchaseCompleted: invoice.isPurchaseCompleted,
      generatedAt: invoice.generatedAt,
      items: invoice.purchase.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }
  } catch {
    return null
  }
}
