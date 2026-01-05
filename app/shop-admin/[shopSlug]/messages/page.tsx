import { requireShopAdminForShop } from "../../../../lib/auth"
import { getCustomersWithSummary, getShopMessages } from "../../actions"
import { MessagesContent } from "./messages-content"

interface MessagesPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { shopSlug } = await params
  const { user, shop } = await requireShopAdminForShop(shopSlug)
  
  const [customers, messages] = await Promise.all([
    getCustomersWithSummary(shopSlug),
    getShopMessages(shopSlug),
  ])

  return (
    <div className="p-6">
      <MessagesContent 
        shopSlug={shopSlug} 
        customers={customers} 
        messages={messages}
      />
    </div>
  )
}
