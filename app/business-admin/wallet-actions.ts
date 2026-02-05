"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "../../lib/auth"
import { WalletTransactionType, WalletTransactionStatus, PaymentMethod } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// ========== WALLET TYPES ==========

export interface WalletTransactionData {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  shopId: string
  shopName: string
  type: WalletTransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  reference: string | null
  paymentMethod: PaymentMethod | null
  status: WalletTransactionStatus
  createdById: string | null
  createdByName: string
  confirmedById: string | null
  confirmedByName: string | null
  confirmedAt: Date | null
  rejectedReason: string | null
  createdAt: Date
}

export interface CustomerWalletData {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  shopId: string
  shopName: string
  walletBalance: number
  pendingDeposits: number
  totalDeposited: number
  totalSpent: number
}

export interface StaffWalletPermission {
  id: string
  name: string
  email: string
  role: string
  shopName: string
  canLoadWallet: boolean
  shopId: string
}

// ========== BUSINESS ADMIN WALLET ACTIONS ==========

/**
 * Get all wallet transactions across all shops for a business
 */
export async function getAllWalletTransactions(
  businessSlug: string,
  filters?: {
    shopId?: string
    status?: WalletTransactionStatus
    type?: WalletTransactionType
    fromDate?: Date
    toDate?: Date
  }
): Promise<WalletTransactionData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const shopIds = shops.map((s) => s.id)

  const whereClause: any = {
    shopId: filters?.shopId ? filters.shopId : { in: shopIds },
  }

  if (filters?.status) {
    whereClause.status = filters.status
  }
  if (filters?.type) {
    whereClause.type = filters.type
  }
  if (filters?.fromDate || filters?.toDate) {
    whereClause.createdAt = {}
    if (filters.fromDate) whereClause.createdAt.gte = filters.fromDate
    if (filters.toDate) whereClause.createdAt.lte = filters.toDate
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: whereClause,
    include: {
      customer: { select: { firstName: true, lastName: true, phone: true } },
      shop: { select: { name: true } },
      createdBy: { include: { user: { select: { name: true } } } },
      confirmedBy: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return transactions.map((t) => ({
    id: t.id,
    customerId: t.customerId,
    customerName: `${t.customer.firstName} ${t.customer.lastName}`,
    customerPhone: t.customer.phone,
    shopId: t.shopId,
    shopName: t.shop.name,
    type: t.type,
    amount: Number(t.amount),
    balanceBefore: Number(t.balanceBefore),
    balanceAfter: Number(t.balanceAfter),
    description: t.description,
    reference: t.reference,
    paymentMethod: t.paymentMethod,
    status: t.status,
    createdById: t.createdById,
    createdByName: t.createdBy?.user.name || "System",
    confirmedById: t.confirmedById,
    confirmedByName: t.confirmedBy?.user.name || null,
    confirmedAt: t.confirmedAt,
    rejectedReason: t.rejectedReason,
    createdAt: t.createdAt,
  }))
}

/**
 * Get pending wallet transactions that need confirmation
 */
export async function getPendingWalletTransactions(businessSlug: string): Promise<WalletTransactionData[]> {
  return getAllWalletTransactions(businessSlug, { status: WalletTransactionStatus.PENDING })
}

/**
 * Get all customers with wallet balances
 */
export async function getCustomersWithWallets(businessSlug: string): Promise<CustomerWalletData[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true },
  })
  const shopIds = shops.map((s) => s.id)
  const shopMap = new Map(shops.map((s) => [s.id, s.name]))

  const customers = await prisma.customer.findMany({
    where: { shopId: { in: shopIds } },
    include: {
      walletTransactions: {
        where: { status: WalletTransactionStatus.CONFIRMED },
      },
    },
    orderBy: { walletBalance: "desc" },
  })

  return customers.map((c) => {
    const deposits = c.walletTransactions.filter(
      (t) => t.type === WalletTransactionType.DEPOSIT || t.type === WalletTransactionType.REFUND
    )
    const purchases = c.walletTransactions.filter((t) => t.type === WalletTransactionType.PURCHASE)
    const pendingDeposits = c.walletTransactions.filter(
      (t) => t.type === WalletTransactionType.DEPOSIT && t.status === WalletTransactionStatus.PENDING
    )

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      shopId: c.shopId,
      shopName: shopMap.get(c.shopId) || "Unknown",
      walletBalance: Number(c.walletBalance),
      pendingDeposits: pendingDeposits.reduce((sum, t) => sum + Number(t.amount), 0),
      totalDeposited: deposits.reduce((sum, t) => sum + Number(t.amount), 0),
      totalSpent: purchases.reduce((sum, t) => sum + Number(t.amount), 0),
    }
  })
}

/**
 * Get staff with wallet loading permissions
 */
export async function getStaffWalletPermissions(businessSlug: string): Promise<StaffWalletPermission[]> {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    include: {
      members: {
        where: { isActive: true },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  })

  const staff: StaffWalletPermission[] = []

  for (const shop of shops) {
    for (const member of shop.members) {
      staff.push({
        id: member.id,
        name: member.user.name || "Unknown",
        email: member.user.email,
        role: member.role,
        shopName: shop.name,
        canLoadWallet: member.canLoadWallet,
        shopId: shop.id,
      })
    }
  }

  return staff
}

/**
 * Toggle wallet loading permission for a staff member
 */
export async function toggleStaffWalletPermission(
  businessSlug: string,
  shopMemberId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Verify the shop member belongs to this business
    const member = await prisma.shopMember.findFirst({
      where: {
        id: shopMemberId,
        shop: { businessId: business.id },
      },
      include: { shop: true, user: { select: { name: true } } },
    })

    if (!member) {
      return { success: false, error: "Staff member not found" }
    }

    await prisma.shopMember.update({
      where: { id: shopMemberId },
      data: { canLoadWallet: !member.canLoadWallet },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: member.canLoadWallet ? "REVOKE_WALLET_PERMISSION" : "GRANT_WALLET_PERMISSION",
      entityType: "SHOP_MEMBER",
      entityId: shopMemberId,
      metadata: { name: member.user.name, shop: member.shop.name },
    })

    revalidatePath(`/business-admin/${businessSlug}/wallet`)
    return { success: true }
  } catch (error) {
    console.error("Error toggling wallet permission:", error)
    return { success: false, error: "Failed to update permission" }
  }
}

/**
 * Confirm a pending wallet deposit - Business Admin
 */
export async function confirmWalletTransaction(
  businessSlug: string,
  transactionId: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get the transaction and verify it belongs to this business
    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        shop: { businessId: business.id },
        status: WalletTransactionStatus.PENDING,
      },
      include: {
        customer: true,
        shop: true,
      },
    })

    if (!transaction) {
      return { success: false, error: "Transaction not found or already processed" }
    }

    // Get business admin's shop member record (for audit trail)
    const businessMember = await prisma.businessMember.findFirst({
      where: { businessId: business.id, userId: user.id },
    })

    // Find or create a shop member record for the business admin in this shop
    let confirmerMember = await prisma.shopMember.findFirst({
      where: { userId: user.id, shopId: transaction.shopId },
    })

    if (!confirmerMember) {
      // Create a shop member record for business admin
      confirmerMember = await prisma.shopMember.create({
        data: {
          userId: user.id,
          shopId: transaction.shopId,
          role: "BUSINESS_ADMIN",
          isActive: true,
          canLoadWallet: true,
        },
      })
    }

    // Update transaction and customer balance in a transaction
    await prisma.$transaction(async (tx) => {
      // Update transaction status
      await tx.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: WalletTransactionStatus.CONFIRMED,
          confirmedById: confirmerMember!.id,
          confirmedAt: new Date(),
        },
      })

      // Update customer wallet balance based on transaction type
      const balanceChange =
        transaction.type === WalletTransactionType.DEPOSIT ||
        transaction.type === WalletTransactionType.REFUND ||
        transaction.type === WalletTransactionType.ADJUSTMENT
          ? Number(transaction.amount)
          : -Number(transaction.amount)

      await tx.customer.update({
        where: { id: transaction.customerId },
        data: {
          walletBalance: { increment: balanceChange },
        },
      })
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CONFIRM_WALLET_TRANSACTION",
      entityType: "WALLET_TRANSACTION",
      entityId: transactionId,
      metadata: {
        customer: `${transaction.customer.firstName} ${transaction.customer.lastName}`,
        amount: Number(transaction.amount),
        type: transaction.type,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/wallet`)
    return { success: true }
  } catch (error) {
    console.error("Error confirming wallet transaction:", error)
    return { success: false, error: "Failed to confirm transaction" }
  }
}

/**
 * Reject a pending wallet deposit - Business Admin
 */
export async function rejectWalletTransaction(
  businessSlug: string,
  transactionId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        shop: { businessId: business.id },
        status: WalletTransactionStatus.PENDING,
      },
      include: { customer: true },
    })

    if (!transaction) {
      return { success: false, error: "Transaction not found or already processed" }
    }

    // Get or create shop member for business admin
    let confirmerMember = await prisma.shopMember.findFirst({
      where: { userId: user.id, shopId: transaction.shopId },
    })

    if (!confirmerMember) {
      confirmerMember = await prisma.shopMember.create({
        data: {
          userId: user.id,
          shopId: transaction.shopId,
          role: "BUSINESS_ADMIN",
          isActive: true,
          canLoadWallet: true,
        },
      })
    }

    await prisma.walletTransaction.update({
      where: { id: transactionId },
      data: {
        status: WalletTransactionStatus.REJECTED,
        confirmedById: confirmerMember.id,
        confirmedAt: new Date(),
        rejectedReason: reason,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "REJECT_WALLET_TRANSACTION",
      entityType: "WALLET_TRANSACTION",
      entityId: transactionId,
      metadata: {
        customer: `${transaction.customer.firstName} ${transaction.customer.lastName}`,
        amount: Number(transaction.amount),
        reason,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/wallet`)
    return { success: true }
  } catch (error) {
    console.error("Error rejecting wallet transaction:", error)
    return { success: false, error: "Failed to reject transaction" }
  }
}

/**
 * Adjust customer wallet balance directly - Business Admin only
 */
export async function adjustCustomerWallet(
  businessSlug: string,
  customerId: string,
  amount: number,
  description: string,
  isAddition: boolean
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Get customer and verify they belong to this business
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shop: { businessId: business.id },
      },
      include: { shop: true },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    const currentBalance = Number(customer.walletBalance)
    const adjustmentAmount = isAddition ? amount : -amount
    const newBalance = currentBalance + adjustmentAmount

    if (newBalance < 0) {
      return { success: false, error: "Adjustment would result in negative balance" }
    }

    // Get or create shop member for business admin
    let adminMember = await prisma.shopMember.findFirst({
      where: { userId: user.id, shopId: customer.shopId },
    })

    if (!adminMember) {
      adminMember = await prisma.shopMember.create({
        data: {
          userId: user.id,
          shopId: customer.shopId,
          role: "BUSINESS_ADMIN",
          isActive: true,
          canLoadWallet: true,
        },
      })
    }

    // Create adjustment transaction and update balance
    await prisma.$transaction(async (tx) => {
      await tx.walletTransaction.create({
        data: {
          customerId,
          shopId: customer.shopId,
          type: WalletTransactionType.ADJUSTMENT,
          amount: Math.abs(amount),
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `${isAddition ? "+" : "-"} ${description}`,
          status: WalletTransactionStatus.CONFIRMED,
          createdById: adminMember!.id,
          confirmedById: adminMember!.id,
          confirmedAt: new Date(),
        },
      })

      await tx.customer.update({
        where: { id: customerId },
        data: { walletBalance: newBalance },
      })
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "ADJUST_WALLET_BALANCE",
      entityType: "CUSTOMER",
      entityId: customerId,
      metadata: {
        customer: `${customer.firstName} ${customer.lastName}`,
        previousBalance: currentBalance,
        adjustment: adjustmentAmount,
        newBalance,
        description,
      },
    })

    revalidatePath(`/business-admin/${businessSlug}/wallet`)
    return { success: true }
  } catch (error) {
    console.error("Error adjusting wallet balance:", error)
    return { success: false, error: "Failed to adjust wallet balance" }
  }
}

/**
 * Get wallet summary stats for business admin dashboard
 */
export async function getWalletSummary(businessSlug: string) {
  const { business } = await requireBusinessAdmin(businessSlug)

  const shops = await prisma.shop.findMany({
    where: { businessId: business.id },
    select: { id: true },
  })
  const shopIds = shops.map((s) => s.id)

  // Get total wallet balance across all customers
  const customers = await prisma.customer.findMany({
    where: { shopId: { in: shopIds } },
    select: { walletBalance: true },
  })

  const totalWalletBalance = customers.reduce((sum, c) => sum + Number(c.walletBalance), 0)
  const customersWithBalance = customers.filter((c) => Number(c.walletBalance) > 0).length

  // Get pending transactions count
  const pendingCount = await prisma.walletTransaction.count({
    where: {
      shopId: { in: shopIds },
      status: WalletTransactionStatus.PENDING,
    },
  })

  // Get today's confirmed transactions
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayTransactions = await prisma.walletTransaction.findMany({
    where: {
      shopId: { in: shopIds },
      status: WalletTransactionStatus.CONFIRMED,
      confirmedAt: { gte: today },
    },
  })

  const todayDeposits = todayTransactions
    .filter((t) => t.type === WalletTransactionType.DEPOSIT)
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return {
    totalWalletBalance,
    customersWithBalance,
    pendingTransactions: pendingCount,
    todayDeposits,
  }
}
