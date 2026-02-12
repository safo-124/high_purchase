import { requireBusinessAdmin } from "../../../../../lib/auth"
import prisma from "../../../../../lib/prisma"
import { AccountantsContent } from "./accountants-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function AccountantsPage({ params }: Props) {
  const { businessSlug } = await params
  const { business } = await requireBusinessAdmin(businessSlug)

  // Get all accountants for this business
  const accountants = await prisma.businessMember.findMany({
    where: {
      businessId: business.id,
      role: "ACCOUNTANT",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const formattedAccountants = accountants.map((acc) => ({
    id: acc.id,
    userId: acc.user.id,
    name: acc.user.name || "Unknown",
    email: acc.user.email,
    phone: acc.user.phone || "",
    isActive: acc.isActive,
    canConfirmPayments: acc.canConfirmPayments,
    canExportData: acc.canExportData,
    canViewProfitMargins: acc.canViewProfitMargins,
    canRecordExpenses: acc.canRecordExpenses,
    createdAt: acc.createdAt,
  }))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Accountants</h1>
        <p className="text-slate-400">
          Manage staff with financial access to view reports and analytics
        </p>
      </div>

      <AccountantsContent accountants={formattedAccountants} businessSlug={businessSlug} />
    </div>
  )
}
