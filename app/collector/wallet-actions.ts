"use server"

import { revalidatePath } from "next/cache"
import prisma from "../../lib/prisma"
import { requireCollectorForShop, createAuditLog } from "../../lib/auth"
import { WalletTransactionType, WalletTransactionStatus, PaymentMethod } from "../generated/prisma/client"

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
 * Get customers assigned to this collector for wallet operations
 */
export async function getCollectorCustomersForWallet(shopSlug: string): Promise<CustomerForWallet[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  if (!membership) {
    return []
  }

  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      assignedCollectorId: membership.id,
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
 * Check if collector can load wallets
 */
export async function canCollectorLoadWallet(shopSlug: string): Promise<boolean> {
  const { membership } = await requireCollectorForShop(shopSlug)
  if (!membership) return false
  return membership.canLoadWallet
}

/**
 * Create a wallet deposit as collector
 */
export async function collectorCreateWalletDeposit(
  shopSlug: string,
  customerId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  reference?: string,
  description?: string
): Promise<ActionResult> {
  try {
    const { shop, membership, user } = await requireCollectorForShop(shopSlug)

    if (!membership) {
      return { success: false, error: "Access denied" }
    }

    // Check permission
    if (!membership.canLoadWallet) {
      return { success: false, error: "You don't have permission to load wallets" }
    }

    // Validate amount
    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" }
    }

    // Verify the customer is assigned to this collector
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        shopId: shop.id,
        assignedCollectorId: membership.id,
        isActive: true,
      },
    })

    if (!customer) {
      return { success: false, error: "Customer not found or not assigned to you" }
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
        balanceAfter: currentBalance + amount,
        description: description || "Wallet deposit by collector",
        reference: reference || null,
        paymentMethod,
        status: WalletTransactionStatus.PENDING,
        createdById: membership.id,
      },
    })

    await createAuditLog({
      actorUserId: user.id,
      action: "COLLECTOR_CREATE_WALLET_DEPOSIT",
      entityType: "WALLET_TRANSACTION",
      entityId: transaction.id,
      metadata: {
        customer: `${customer.firstName} ${customer.lastName}`,
        amount,
        paymentMethod,
      },
    })

    revalidatePath(`/collector/${shopSlug}/wallet`)
    return { success: true, data: { transactionId: transaction.id } }
  } catch (error) {
    console.error("Error creating wallet deposit:", error)
    return { success: false, error: "Failed to create deposit" }
  }
}

/**
 * Get pending deposits created by this collector
 */
export async function getCollectorPendingDeposits(shopSlug: string): Promise<WalletTransactionData[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  if (!membership) {
    return []
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      shopId: shop.id,
      createdById: membership.id,
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
    createdByName: t.createdBy?.user.name || "System",
    confirmedByName: t.confirmedBy?.user.name || null,
    confirmedAt: t.confirmedAt,
    rejectedReason: t.rejectedReason,
    createdAt: t.createdAt,
  }))
}

/**
 * Get wallet transactions for a customer (collector's view)
 */
export async function getCollectorCustomerWalletHistory(
  shopSlug: string,
  customerId: string
): Promise<WalletTransactionData[]> {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  if (!membership) {
    return []
  }

  // Verify customer is assigned to this collector
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      shopId: shop.id,
      assignedCollectorId: membership.id,
    },
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
    createdByName: t.createdBy?.user.name || "System",
    confirmedByName: t.confirmedBy?.user.name || null,
    confirmedAt: t.confirmedAt,
    rejectedReason: t.rejectedReason,
    createdAt: t.createdAt,
  }))
}

/**
 * Get wallet stats for collector dashboard
 */
export async function getCollectorWalletStats(shopSlug: string) {
  const { shop, membership } = await requireCollectorForShop(shopSlug)

  if (!membership) {
    return {
      totalBalance: 0,
      customersWithBalance: 0,
      pendingDeposits: 0,
      todayDeposits: 0,
      canLoadWallet: false,
      assignedCustomers: 0,
    }
  }

  // Get assigned customers
  const customers = await prisma.customer.findMany({
    where: {
      shopId: shop.id,
      assignedCollectorId: membership.id,
    },
    select: { walletBalance: true },
  })

  const totalBalance = customers.reduce((sum, c) => sum + Number(c.walletBalance), 0)
  const customersWithBalance = customers.filter((c) => Number(c.walletBalance) > 0).length

  // Pending deposits by this collector
  const pendingCount = await prisma.walletTransaction.count({
    where: {
      shopId: shop.id,
      createdById: membership.id,
      status: WalletTransactionStatus.PENDING,
    },
  })

  // Today's confirmed deposits by this collector
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayDeposits = await prisma.walletTransaction.findMany({
    where: {
      shopId: shop.id,
      createdById: membership.id,
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
    canLoadWallet: membership.canLoadWallet,
    assignedCustomers: customers.length,
  }
}
