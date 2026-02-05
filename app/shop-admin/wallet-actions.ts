"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireShopAdminForShop, createAuditLog } from "../../lib/auth"
import { WalletTransactionType, WalletTransactionStatus, PaymentMethod, Role } from "../generated/prisma/client"

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

export interface CustomerForWallet {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  walletBalance: number
  pendingDeposits: number
}

export interface WalletTransactionData {
  id: string
  customerId: string
  customerName: string
  type: WalletTransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  reference: string | null
  paymentMethod: PaymentMethod | null
  status: WalletTransactionStatus
  createdByName: string
  confirmedByName: string | null
  confirmedAt: Date | null
  rejectedReason: string | null
  createdAt: Date
}

/**
 * Get customers visible to the current staff member based on their role
 * - Shop Admin: All customers in their shops
 * - Sales Staff: All customers in the shop they work at
 * - Debt Collector: Only customers assigned to them
 */
export async function getVisibleCustomersForWallet(shopSlug: string): Promise<CustomerForWallet[]> {
  const { shop, membership } = await requireShopAdminForShop(shopSlug)

  // SUPER_ADMIN or Shop Admin sees all customers
  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
    },
    include: {
      walletTransactions: {
        where: { status: WalletTransactionStatus.PENDING },
      },
    },
    orderBy: { firstName: "asc" },
  })

  return customers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    walletBalance: Number(c.walletBalance),
    pendingDeposits: c.walletTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
  }))
}

/**
 * Check if current staff member can load wallets
 */
export async function canStaffLoadWallet(shopSlug: string): Promise<boolean> {
  const { membership } = await requireShopAdminForShop(shopSlug)
  // SUPER_ADMIN can always load
  if (!membership) return true
  return membership.canLoadWallet
}

/**
 * Create a wallet deposit (pending confirmation)
 */
export async function createWalletDeposit(
  shopSlug: string,
  customerId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  reference?: string,
  description?: string
): Promise<ActionResult> {
  try {
    const { shop, membership, user } = await requireShopAdminForShop(shopSlug)

    // Check if staff can load wallet (SUPER_ADMIN always can)
    if (membership && !membership.canLoadWallet) {
      return { success: false, error: "You don't have permission to load customer wallets" }
    }

    // Validate amount
    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" }
    }

    // Get customer and verify visibility
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shopId: shop.id, isActive: true },
    })

    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    const currentBalance = Number(customer.walletBalance)

    // Create pending transaction
    const transaction = await prisma.walletTransaction.create({
      data: {
        customerId,
        shopId: shop.id,
        type: WalletTransactionType.DEPOSIT,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + amount, // Will be applied on confirmation
        description: description || "Wallet deposit",
        reference: reference || null,
        paymentMethod,
        status: WalletTransactionStatus.PENDING,
        createdById: membership?.id || null,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "CREATE_WALLET_DEPOSIT",
      entityType: "WALLET_TRANSACTION",
      entityId: transaction.id,
      metadata: {
        customer: `${customer.firstName} ${customer.lastName}`,
        amount,
        paymentMethod,
      },
    })

    revalidatePath(`/shop-admin/${shopSlug}/wallet`)
    return { success: true, data: { transactionId: transaction.id } }
  } catch (error) {
    console.error("Error creating wallet deposit:", error)
    return { success: false, error: "Failed to create deposit" }
  }
}

/**
 * Get wallet transactions for a specific customer
 */
export async function getCustomerWalletTransactions(
  shopSlug: string,
  customerId: string
): Promise<WalletTransactionData[]> {
  const { shop } = await requireShopAdminForShop(shopSlug)

  // Verify customer visibility
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId: shop.id },
  })

  if (!customer) {
    return []
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: { customerId },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      createdBy: { include: { user: { select: { name: true } } } },
      confirmedBy: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return transactions.map((t) => ({
    id: t.id,
    customerId: t.customerId,
    customerName: `${t.customer.firstName} ${t.customer.lastName}`,
    type: t.type,
    amount: Number(t.amount),
    balanceBefore: Number(t.balanceBefore),
    balanceAfter: Number(t.balanceAfter),
    description: t.description,
    reference: t.reference,
    paymentMethod: t.paymentMethod,
    status: t.status,
    createdByName: t.createdBy?.user.name || "Unknown",
    confirmedByName: t.confirmedBy?.user.name || null,
    confirmedAt: t.confirmedAt,
    rejectedReason: t.rejectedReason,
    createdAt: t.createdAt,
  }))
}

/**
 * Get pending deposits created by this staff (for tracking)
 */
export async function getMyPendingDeposits(shopSlug: string): Promise<WalletTransactionData[]> {
  const { shop, membership } = await requireShopAdminForShop(shopSlug)

  // For SUPER_ADMIN (no membership), return all pending deposits in the shop
  const whereClause = membership
    ? { shopId: shop.id, createdById: membership.id, status: WalletTransactionStatus.PENDING }
    : { shopId: shop.id, status: WalletTransactionStatus.PENDING }

  const transactions = await prisma.walletTransaction.findMany({
    where: whereClause,
    include: {
      customer: { select: { firstName: true, lastName: true } },
      createdBy: { include: { user: { select: { name: true } } } },
      confirmedBy: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return transactions.map((t) => ({
    id: t.id,
    customerId: t.customerId,
    customerName: `${t.customer.firstName} ${t.customer.lastName}`,
    type: t.type,
    amount: Number(t.amount),
    balanceBefore: Number(t.balanceBefore),
    balanceAfter: Number(t.balanceAfter),
    description: t.description,
    reference: t.reference,
    paymentMethod: t.paymentMethod,
    status: t.status,
    createdByName: t.createdBy?.user.name || "Unknown",
    confirmedByName: t.confirmedBy?.user.name || null,
    confirmedAt: t.confirmedAt,
    rejectedReason: t.rejectedReason,
    createdAt: t.createdAt,
  }))
}

/**
 * Shop Admin: Confirm a pending wallet deposit (if business allows)
 */
export async function shopAdminConfirmDeposit(
  shopSlug: string,
  transactionId: string
): Promise<ActionResult> {
  try {
    const { shop, membership, user } = await requireShopAdminForShop(shopSlug)

    // Shop admin or SUPER_ADMIN can confirm
    if (membership && membership.role !== Role.SHOP_ADMIN) {
      return { success: false, error: "Only shop admins can confirm deposits" }
    }

    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        shopId: shop.id,
        status: WalletTransactionStatus.PENDING,
      },
      include: { customer: true },
    })

    if (!transaction) {
      return { success: false, error: "Transaction not found or already processed" }
    }

    // Update transaction and customer balance
    await prisma.$transaction(async (tx) => {
      await tx.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: WalletTransactionStatus.CONFIRMED,
          confirmedById: membership?.id || null,
          confirmedAt: new Date(),
        },
      })

      // Update customer wallet balance
      const balanceChange =
        transaction.type === WalletTransactionType.DEPOSIT ||
        transaction.type === WalletTransactionType.REFUND
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
      action: "SHOP_CONFIRM_WALLET_DEPOSIT",
      entityType: "WALLET_TRANSACTION",
      entityId: transactionId,
      metadata: {
        customer: `${transaction.customer.firstName} ${transaction.customer.lastName}`,
        amount: Number(transaction.amount),
      },
    })

    revalidatePath(`/shop-admin/${shopSlug}/wallet`)
    return { success: true }
  } catch (error) {
    console.error("Error confirming deposit:", error)
    return { success: false, error: "Failed to confirm deposit" }
  }
}

/**
 * Get all pending deposits in the shop (for shop admin)
 */
export async function getShopPendingDeposits(shopSlug: string): Promise<WalletTransactionData[]> {
  const { shop, membership } = await requireShopAdminForShop(shopSlug)

  // Shop admins and SUPER_ADMIN see all pending
  const transactions = await prisma.walletTransaction.findMany({
    where: {
      shopId: shop.id,
      status: WalletTransactionStatus.PENDING,
    },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      createdBy: { include: { user: { select: { name: true } } } },
      confirmedBy: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return transactions.map((t) => ({
    id: t.id,
    customerId: t.customerId,
    customerName: `${t.customer.firstName} ${t.customer.lastName}`,
    type: t.type,
    amount: Number(t.amount),
    balanceBefore: Number(t.balanceBefore),
    balanceAfter: Number(t.balanceAfter),
    description: t.description,
    reference: t.reference,
    paymentMethod: t.paymentMethod,
    status: t.status,
    createdByName: t.createdBy?.user.name || "Unknown",
    confirmedByName: t.confirmedBy?.user.name || null,
    confirmedAt: t.confirmedAt,
    rejectedReason: t.rejectedReason,
    createdAt: t.createdAt,
  }))
}

/**
 * Get wallet dashboard stats for shop
 */
export async function getShopWalletStats(shopSlug: string) {
  const { shop, membership } = await requireShopAdminForShop(shopSlug)

  // Total wallet balance for all customers in shop
  const customers = await prisma.customer.findMany({
    where: { shopId: shop.id },
    select: { walletBalance: true },
  })

  const totalBalance = customers.reduce((sum, c) => sum + Number(c.walletBalance), 0)
  const customersWithBalance = customers.filter((c) => Number(c.walletBalance) > 0).length

  // Pending deposits
  const pendingCount = await prisma.walletTransaction.count({
    where: {
      shopId: shop.id,
      status: WalletTransactionStatus.PENDING,
    },
  })

  // Today's deposits
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayDeposits = await prisma.walletTransaction.findMany({
    where: {
      shopId: shop.id,
      status: WalletTransactionStatus.CONFIRMED,
      type: WalletTransactionType.DEPOSIT,
      confirmedAt: { gte: today },
    },
  })

  const todayTotal = todayDeposits.reduce((sum, t) => sum + Number(t.amount), 0)

  return {
    totalBalance,
    customersWithBalance,
    pendingDeposits: pendingCount,
    todayDeposits: todayTotal,
    canLoadWallet: !membership || membership.canLoadWallet,
    isShopAdmin: !membership || membership.role === Role.SHOP_ADMIN,
  }
}
