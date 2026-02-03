import { requireBusinessAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { PosContent } from "./pos-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function PosPage({ params }: Props) {
  const { businessSlug } = await params
  const { user, business } = await requireBusinessAdmin(businessSlug)

  // Redirect if POS is not enabled
  if (!business.posEnabled) {
    redirect(`/business-admin/${businessSlug}`)
  }

  // Get products from all shops in the business
  const products = await prisma.product.findMany({
    where: {
      businessId: business.id,
      isActive: true,
    },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  })

  // Get shops for shop selection
  const shops = await prisma.shop.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true, shopSlug: true },
  })

  // Get all staff members from this business
  const allStaff = await prisma.shopMember.findMany({
    where: {
      shop: { businessId: business.id },
      isActive: true,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      shop: { select: { name: true, shopSlug: true } },
    },
  })

  // Get today's transactions
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayTransactions = await prisma.posTransaction.findMany({
    where: {
      businessId: business.id,
      createdAt: { gte: today },
    },
    include: {
      items: true,
      cashier: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/15 border border-green-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">POS System</h1>
            <p className="text-slate-400">Point of Sale for quick cash transactions</p>
          </div>
        </div>
      </div>

      <PosContent
        businessSlug={businessSlug}
        products={products.map(p => ({
          id: p.id,
          name: p.name,
          cashPrice: Number(p.cashPrice),
          categoryId: p.categoryId,
          categoryName: p.category?.name || null,
          categoryColor: p.category?.color || null,
        }))}
        shops={shops}
        staffWithPosAccess={allStaff.map(s => ({
          id: s.id,
          userId: s.user.id,
          userName: s.user.name || "Unknown",
          userEmail: s.user.email,
          shopName: s.shop.name,
          posAccess: s.posAccess,
        }))}
        todayTransactions={todayTransactions.map(t => ({
          id: t.id,
          transactionNo: t.transactionNo,
          customerName: t.customerName,
          totalAmount: Number(t.totalAmount),
          paymentMethod: t.paymentMethod,
          cashierName: t.cashier.name || "Unknown",
          itemCount: t.items.length,
          createdAt: t.createdAt,
        }))}
        currentUserId={user.id}
      />
    </div>
  )
}
