import { requireSalesStaffForShop } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { MessagingPage } from "@/components/messaging/messaging-components"

interface Props {
  params: Promise<{ shopSlug: string }>
}

export default async function SalesStaffChatPage({ params }: Props) {
  const { shopSlug } = await params
  const { user, shop } = await requireSalesStaffForShop(shopSlug)

  // Get the businessId from the shop
  const shopWithBusiness = await prisma.shop.findUnique({
    where: { id: shop.id },
    select: { businessId: true },
  })

  if (!shopWithBusiness) {
    return <div>Shop not found</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with your team and customers
        </p>
      </div>

      <MessagingPage
        businessId={shopWithBusiness.businessId}
        currentUserId={user.id}
        includeAllBusiness={false}
        title="Staff Messages"
      />
    </div>
  )
}
