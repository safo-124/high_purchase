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
  totalOutstanding: number
  activePurchases: number
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
      purchases: {
        where: {
          status: { in: ["ACTIVE", "OVERDUE"] },
          outstandingBalance: { gt: 0 },
        },
        select: { outstandingBalance: true },
      },
    },
    orderBy: { walletBalance: "desc" },
  })

  return customers.map((c) => {
    const deposits = c.walletTransactions.filter(
      (t) => t.type === WalletTransactionType.DEPOSIT || t.type === WalletTransactionType.REFUND
    )
    const walletPurchases = c.walletTransactions.filter((t) => t.type === WalletTransactionType.PURCHASE)
    const pendingDeposits = c.walletTransactions.filter(
      (t) => t.type === WalletTransactionType.DEPOSIT && t.status === WalletTransactionStatus.PENDING
    )

    // Calculate total outstanding from active purchases
    const totalOutstanding = c.purchases.reduce((sum, p) => sum + Number(p.outstandingBalance), 0)

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
      totalSpent: walletPurchases.reduce((sum, t) => sum + Number(t.amount), 0),
      totalOutstanding,
      activePurchases: c.purchases.length,
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

    const depositAmount = Number(transaction.amount)
    const customer = transaction.customer
    const shop = transaction.shop

    // Get outstanding purchases to apply wallet funds
    const outstandingPurchases = await prisma.purchase.findMany({
      where: {
        customerId: transaction.customerId,
        status: { in: ["ACTIVE", "PENDING"] },
        outstandingBalance: { gt: 0 },
      },
      orderBy: { dueDate: "asc" },
    })

    let paymentsApplied: { purchaseId: string; purchaseNumber: string; amountApplied: number }[] = []
    let remainingFunds = depositAmount

    for (const purchase of outstandingPurchases) {
      if (remainingFunds <= 0) break
      const outstanding = Number(purchase.outstandingBalance)
      const paymentAmount = Math.min(remainingFunds, outstanding)
      if (paymentAmount > 0) {
        paymentsApplied.push({
          purchaseId: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          amountApplied: paymentAmount,
        })
        remainingFunds -= paymentAmount
      }
    }

    // Get collector info for receipts
    let creatorName: string | null = null
    if (transaction.createdById) {
      const creatorMember = await prisma.shopMember.findUnique({
        where: { id: transaction.createdById },
        include: { user: { select: { name: true } } },
      })
      creatorName = creatorMember?.user.name || null
    }

    // Update transaction, customer balance, apply payments, and generate receipts
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

      // Apply wallet funds to outstanding purchases and generate receipts
      for (const payment of paymentsApplied) {
        const purchase = await tx.purchase.findUnique({
          where: { id: payment.purchaseId },
        })
        if (!purchase) continue

        const newAmountPaid = Number(purchase.amountPaid) + payment.amountApplied
        const newOutstanding = Number(purchase.totalAmount) - newAmountPaid
        const isCompleted = newOutstanding <= 0
        const previousBalance = Number(purchase.outstandingBalance)

        // Create payment record
        const createdPayment = await tx.payment.create({
          data: {
            purchaseId: payment.purchaseId,
            amount: payment.amountApplied,
            paymentMethod: "WALLET",
            status: "COMPLETED",
            isConfirmed: true,
            confirmedById: confirmerMember!.id,
            confirmedAt: new Date(),
            paidAt: new Date(),
            notes: `Wallet deposit payment (confirmed by business admin)`,
          },
        })

        // Update purchase
        await tx.purchase.update({
          where: { id: payment.purchaseId },
          data: {
            amountPaid: newAmountPaid,
            outstandingBalance: Math.max(0, newOutstanding),
            status: isCompleted ? "COMPLETED" : purchase.status === "PENDING" ? "ACTIVE" : purchase.status,
          },
        })

        let waybillGenerated = false
        let waybillNumber: string | null = null

        // If purchase is completed, auto-generate waybill and deduct stock
        if (isCompleted && purchase.purchaseType !== "CASH") {
          const purchaseItems = await tx.purchaseItem.findMany({
            where: { purchaseId: purchase.id },
          })
          for (const item of purchaseItems) {
            if (item.productId) {
              await tx.shopProduct.updateMany({
                where: { shopId: shop.id, productId: item.productId },
                data: { stockQuantity: { decrement: item.quantity } },
              })
            }
          }
          const existingWaybill = await tx.waybill.findUnique({
            where: { purchaseId: purchase.id },
          })
          if (!existingWaybill) {
            const wYear = new Date().getFullYear()
            const wTs = Date.now().toString(36).toUpperCase()
            const wRnd = Math.random().toString(36).substring(2, 6).toUpperCase()
            waybillNumber = `WB-${wYear}-${wTs}${wRnd}`
            await tx.waybill.create({
              data: {
                waybillNumber,
                purchaseId: purchase.id,
                recipientName: `${customer.firstName} ${customer.lastName}`,
                recipientPhone: customer.phone,
                deliveryAddress: customer.address || "N/A",
                deliveryCity: customer.city,
                deliveryRegion: customer.region,
                specialInstructions: `Payment completed via wallet deposit. Ready for delivery.`,
                generatedById: user.id,
              },
            })
            waybillGenerated = true
            await tx.purchase.update({
              where: { id: purchase.id },
              data: { deliveryStatus: "SCHEDULED" },
            })
          } else {
            waybillNumber = existingWaybill.waybillNumber
            waybillGenerated = true
          }
        }

        // Generate receipt (ProgressInvoice)
        const invYear = new Date().getFullYear()
        const invTs = Date.now().toString(36).toUpperCase()
        const invRnd = Math.random().toString(36).substring(2, 6).toUpperCase()
        const invoiceNumber = `INV-${invYear}-${invTs}${invRnd}`

        await tx.progressInvoice.create({
          data: {
            invoiceNumber,
            paymentId: createdPayment.id,
            purchaseId: purchase.id,
            paymentAmount: payment.amountApplied,
            previousBalance,
            newBalance: Math.max(0, newOutstanding),
            totalPurchaseAmount: purchase.totalAmount,
            totalAmountPaid: newAmountPaid,
            collectorId: transaction.createdById,
            collectorName: creatorName,
            confirmedById: confirmerMember!.id,
            confirmedByName: user.name,
            recordedByRole: "WALLET",
            recordedByName: creatorName,
            paymentMethod: "WALLET",
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerPhone: customer.phone,
            customerAddress: customer.address,
            purchaseNumber: purchase.purchaseNumber,
            purchaseType: purchase.purchaseType,
            shopId: shop.id,
            shopName: shop.name,
            businessId: shop.businessId,
            businessName: business.name,
            isPurchaseCompleted: isCompleted,
            waybillGenerated,
            waybillNumber,
            notes: `Wallet deposit payment (confirmed by business admin)`,
          },
        })
      }
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
        paymentsApplied: paymentsApplied.length > 0 ? paymentsApplied : undefined,
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
 * Confirm all pending wallet transactions for a specific collector - Business Admin
 */
export async function confirmAllCollectorWalletTransactions(
  businessSlug: string,
  collectorName: string
): Promise<ActionResult> {
  try {
    const { user, business } = await requireBusinessAdmin(businessSlug)

    // Find all pending transactions created by staff matching this collector name
    const pendingTransactions = await prisma.walletTransaction.findMany({
      where: {
        shop: { businessId: business.id },
        status: WalletTransactionStatus.PENDING,
        createdBy: {
          user: {
            name: {
              equals: collectorName,
              mode: "insensitive",
            },
          },
        },
      },
      include: {
        customer: true,
        shop: true,
      },
    })

    if (pendingTransactions.length === 0) {
      return { success: false, error: "No pending transactions found for this collector" }
    }

    let confirmedCount = 0

    for (const transaction of pendingTransactions) {
      // Find or create a shop member record for the business admin in this shop
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

      const depositAmount = Number(transaction.amount)
      const customer = transaction.customer
      const shop = transaction.shop

      // Get outstanding purchases to apply wallet funds
      const outstandingPurchases = await prisma.purchase.findMany({
        where: {
          customerId: transaction.customerId,
          status: { in: ["ACTIVE", "PENDING"] },
          outstandingBalance: { gt: 0 },
        },
        orderBy: { dueDate: "asc" },
      })

      let paymentsApplied: { purchaseId: string; purchaseNumber: string; amountApplied: number }[] = []
      let remainingFunds = depositAmount

      for (const purchase of outstandingPurchases) {
        if (remainingFunds <= 0) break
        const outstanding = Number(purchase.outstandingBalance)
        const paymentAmount = Math.min(remainingFunds, outstanding)
        if (paymentAmount > 0) {
          paymentsApplied.push({
            purchaseId: purchase.id,
            purchaseNumber: purchase.purchaseNumber,
            amountApplied: paymentAmount,
          })
          remainingFunds -= paymentAmount
        }
      }

      // Get collector info for receipts
      let creatorName: string | null = null
      if (transaction.createdById) {
        const creatorMember = await prisma.shopMember.findUnique({
          where: { id: transaction.createdById },
          include: { user: { select: { name: true } } },
        })
        creatorName = creatorMember?.user.name || null
      }

      await prisma.$transaction(async (tx) => {
        await tx.walletTransaction.update({
          where: { id: transaction.id },
          data: {
            status: WalletTransactionStatus.CONFIRMED,
            confirmedById: confirmerMember!.id,
            confirmedAt: new Date(),
          },
        })

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

        // Apply wallet funds to outstanding purchases and generate receipts
        for (const payment of paymentsApplied) {
          const purchase = await tx.purchase.findUnique({
            where: { id: payment.purchaseId },
          })
          if (!purchase) continue

          const newAmountPaid = Number(purchase.amountPaid) + payment.amountApplied
          const newOutstanding = Number(purchase.totalAmount) - newAmountPaid
          const isCompleted = newOutstanding <= 0
          const previousBalance = Number(purchase.outstandingBalance)

          const createdPayment = await tx.payment.create({
            data: {
              purchaseId: payment.purchaseId,
              amount: payment.amountApplied,
              paymentMethod: "WALLET",
              status: "COMPLETED",
              isConfirmed: true,
              confirmedById: confirmerMember!.id,
              confirmedAt: new Date(),
              paidAt: new Date(),
              notes: `Wallet deposit payment (bulk confirmed by business admin)`,
            },
          })

          await tx.purchase.update({
            where: { id: payment.purchaseId },
            data: {
              amountPaid: newAmountPaid,
              outstandingBalance: Math.max(0, newOutstanding),
              status: isCompleted ? "COMPLETED" : purchase.status === "PENDING" ? "ACTIVE" : purchase.status,
            },
          })

          let waybillGenerated = false
          let waybillNumber: string | null = null

          if (isCompleted && purchase.purchaseType !== "CASH") {
            const purchaseItems = await tx.purchaseItem.findMany({
              where: { purchaseId: purchase.id },
            })
            for (const item of purchaseItems) {
              if (item.productId) {
                await tx.shopProduct.updateMany({
                  where: { shopId: shop.id, productId: item.productId },
                  data: { stockQuantity: { decrement: item.quantity } },
                })
              }
            }
            const existingWaybill = await tx.waybill.findUnique({
              where: { purchaseId: purchase.id },
            })
            if (!existingWaybill) {
              const wYear = new Date().getFullYear()
              const wTs = Date.now().toString(36).toUpperCase()
              const wRnd = Math.random().toString(36).substring(2, 6).toUpperCase()
              waybillNumber = `WB-${wYear}-${wTs}${wRnd}`
              await tx.waybill.create({
                data: {
                  waybillNumber,
                  purchaseId: purchase.id,
                  recipientName: `${customer.firstName} ${customer.lastName}`,
                  recipientPhone: customer.phone,
                  deliveryAddress: customer.address || "N/A",
                  deliveryCity: customer.city,
                  deliveryRegion: customer.region,
                  specialInstructions: `Payment completed via wallet deposit. Ready for delivery.`,
                  generatedById: user.id,
                },
              })
              waybillGenerated = true
              await tx.purchase.update({
                where: { id: purchase.id },
                data: { deliveryStatus: "SCHEDULED" },
              })
            } else {
              waybillNumber = existingWaybill.waybillNumber
              waybillGenerated = true
            }
          }

          // Generate receipt (ProgressInvoice)
          const invYear = new Date().getFullYear()
          const invTs = Date.now().toString(36).toUpperCase()
          const invRnd = Math.random().toString(36).substring(2, 6).toUpperCase()
          const invoiceNumber = `INV-${invYear}-${invTs}${invRnd}`

          await tx.progressInvoice.create({
            data: {
              invoiceNumber,
              paymentId: createdPayment.id,
              purchaseId: purchase.id,
              paymentAmount: payment.amountApplied,
              previousBalance,
              newBalance: Math.max(0, newOutstanding),
              totalPurchaseAmount: purchase.totalAmount,
              totalAmountPaid: newAmountPaid,
              collectorId: transaction.createdById,
              collectorName: creatorName,
              confirmedById: confirmerMember!.id,
              confirmedByName: user.name,
              recordedByRole: "WALLET",
              recordedByName: creatorName,
              paymentMethod: "WALLET",
              customerName: `${customer.firstName} ${customer.lastName}`,
              customerPhone: customer.phone,
              customerAddress: customer.address,
              purchaseNumber: purchase.purchaseNumber,
              purchaseType: purchase.purchaseType,
              shopId: shop.id,
              shopName: shop.name,
              businessId: shop.businessId,
              businessName: business.name,
              isPurchaseCompleted: isCompleted,
              waybillGenerated,
              waybillNumber,
              notes: `Wallet deposit payment (bulk confirmed by business admin)`,
            },
          })
        }
      })

      confirmedCount++

      await createAuditLog({
        actorUserId: user.id,
        action: "CONFIRM_WALLET_TRANSACTION",
        entityType: "WALLET_TRANSACTION",
        entityId: transaction.id,
        metadata: {
          customer: `${transaction.customer.firstName} ${transaction.customer.lastName}`,
          amount: Number(transaction.amount),
          type: transaction.type,
          bulkConfirm: true,
          collectorName,
          paymentsApplied: paymentsApplied.length > 0 ? paymentsApplied : undefined,
        },
      })
    }

    revalidatePath(`/business-admin/${businessSlug}/wallet`)
    return { success: true, data: { confirmedCount } }
  } catch (error) {
    console.error("Error bulk confirming wallet transactions:", error)
    return { success: false, error: "Failed to confirm transactions" }
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
 * When adding funds, automatically applies them to outstanding purchases
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
    let newBalance = currentBalance + adjustmentAmount

    // For subtraction, prevent going below current balance into more debt
    if (!isAddition && newBalance < currentBalance) {
      // This is fine - we're subtracting
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

    // If adding funds, automatically apply to outstanding purchases
    let paymentsApplied: { purchaseId: string; purchaseNumber: string; amountApplied: number }[] = []
    
    if (isAddition && amount > 0) {
      // Get all active purchases with outstanding balance for this customer
      const outstandingPurchases = await prisma.purchase.findMany({
        where: {
          customerId,
          status: { in: ["ACTIVE", "PENDING"] },
          outstandingBalance: { gt: 0 },
        },
        orderBy: { dueDate: "asc" }, // Pay oldest due first
      })

      let remainingFunds = amount

      for (const purchase of outstandingPurchases) {
        if (remainingFunds <= 0) break

        const outstanding = Number(purchase.outstandingBalance)
        const paymentAmount = Math.min(remainingFunds, outstanding)

        if (paymentAmount > 0) {
          paymentsApplied.push({
            purchaseId: purchase.id,
            purchaseNumber: purchase.purchaseNumber,
            amountApplied: paymentAmount,
          })
          remainingFunds -= paymentAmount
        }
      }
    }

    // Create adjustment transaction, update balance, and apply payments in a transaction
    await prisma.$transaction(async (tx) => {
      // Create wallet adjustment transaction
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

      // Update customer wallet balance
      await tx.customer.update({
        where: { id: customerId },
        data: { walletBalance: newBalance },
      })

      // Apply payments to outstanding purchases
      for (const payment of paymentsApplied) {
        // Get current purchase data
        const purchase = await tx.purchase.findUnique({
          where: { id: payment.purchaseId },
        })

        if (!purchase) continue

        const newAmountPaid = Number(purchase.amountPaid) + payment.amountApplied
        const newOutstanding = Number(purchase.totalAmount) - newAmountPaid
        const isCompleted = newOutstanding <= 0

        // Create payment record
        await tx.payment.create({
          data: {
            purchaseId: payment.purchaseId,
            amount: payment.amountApplied,
            paymentMethod: "WALLET",
            status: "COMPLETED",
            isConfirmed: true,
            confirmedAt: new Date(),
            paidAt: new Date(),
            notes: `Wallet top-up payment - ${description}`,
          },
        })

        // Update purchase
        await tx.purchase.update({
          where: { id: payment.purchaseId },
          data: {
            amountPaid: newAmountPaid,
            outstandingBalance: Math.max(0, newOutstanding),
            status: isCompleted ? "COMPLETED" : purchase.status === "PENDING" ? "ACTIVE" : purchase.status,
          },
        })

        // If purchase is completed, auto-generate waybill and deduct stock
        if (isCompleted && purchase.purchaseType !== "CASH") {
          // Deduct stock
          const purchaseItems = await tx.purchaseItem.findMany({
            where: { purchaseId: purchase.id },
          })

          for (const item of purchaseItems) {
            if (item.productId) {
              await tx.shopProduct.updateMany({
                where: { 
                  shopId: customer.shopId,
                  productId: item.productId 
                },
                data: { stockQuantity: { decrement: item.quantity } },
              })
            }
          }

          // Check if waybill already exists
          const existingWaybill = await tx.waybill.findUnique({
            where: { purchaseId: purchase.id },
          })

          if (!existingWaybill) {
            const year = new Date().getFullYear()
            const timestamp = Date.now().toString(36).toUpperCase()
            const random = Math.random().toString(36).substring(2, 6).toUpperCase()
            const waybillNumber = `WB-${year}-${timestamp}${random}`

            await tx.waybill.create({
              data: {
                waybillNumber,
                purchaseId: purchase.id,
                recipientName: `${customer.firstName} ${customer.lastName}`,
                recipientPhone: customer.phone,
                deliveryAddress: customer.address || "N/A",
                deliveryCity: customer.city,
                deliveryRegion: customer.region,
                specialInstructions: `Payment completed via wallet top-up. Ready for delivery.`,
                generatedById: user.id,
              },
            })

            await tx.purchase.update({
              where: { id: purchase.id },
              data: { deliveryStatus: "SCHEDULED" },
            })
          }
        }
      }
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
        paymentsApplied: paymentsApplied.length > 0 ? paymentsApplied : undefined,
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

  // Get all-time confirmed deposits total
  const allConfirmedDeposits = await prisma.walletTransaction.findMany({
    where: {
      shopId: { in: shopIds },
      status: WalletTransactionStatus.CONFIRMED,
      type: WalletTransactionType.DEPOSIT,
    },
    select: { amount: true },
  })
  const totalDeposits = allConfirmedDeposits.reduce((sum, t) => sum + Number(t.amount), 0)

  // Get total wallet transactions count
  const totalTransactions = await prisma.walletTransaction.count({
    where: {
      shopId: { in: shopIds },
      status: WalletTransactionStatus.CONFIRMED,
    },
  })

  // Get daily wallet activity for the last 7 days (for trend chart)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const recentTransactions = await prisma.walletTransaction.findMany({
    where: {
      shopId: { in: shopIds },
      status: WalletTransactionStatus.CONFIRMED,
      confirmedAt: { gte: sevenDaysAgo },
    },
    select: {
      amount: true,
      type: true,
      confirmedAt: true,
    },
    orderBy: { confirmedAt: "asc" },
  })

  // Build 7-day trend data
  const walletTrend: { day: string; deposits: number; spent: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const nextD = new Date(d)
    nextD.setDate(nextD.getDate() + 1)

    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    const dayTxns = recentTransactions.filter((t) => {
      const txDate = t.confirmedAt!
      return txDate >= d && txDate < nextD
    })

    const deposits = dayTxns
      .filter((t) => t.type === WalletTransactionType.DEPOSIT || t.type === WalletTransactionType.REFUND)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const spent = dayTxns
      .filter((t) => t.type === WalletTransactionType.PURCHASE)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    walletTrend.push({ day: dayLabel, deposits, spent })
  }

  return {
    totalWalletBalance,
    customersWithBalance,
    pendingTransactions: pendingCount,
    todayDeposits,
    totalDeposits,
    totalTransactions,
    walletTrend,
  }
}
