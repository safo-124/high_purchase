import { requireBusinessAdmin } from "@/lib/auth"
import { MessagingPage } from "@/components/messaging/messaging-components"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessMessagesPage({ params }: Props) {
  const { businessSlug } = await params
  const { user, business } = await requireBusinessAdmin(businessSlug)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with your staff and customers. View all conversations across your business.
        </p>
      </div>

      <MessagingPage
        businessId={business.id}
        currentUserId={user.id}
        includeAllBusiness={true}
        title="Business Messages"
      />
    </div>
  )
}
