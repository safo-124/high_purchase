import { redirect } from "next/navigation"
import { getCollectorInvoices } from "../../actions"
import { ReceiptsContent } from "./receipts-content"
import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

interface CollectorSession {
  userId: string
  membershipId: string
  shopId: string
  role: string
  name: string
}

async function getCollectorSession(): Promise<CollectorSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("collector_token")?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CollectorSession
    return decoded
  } catch {
    return null
  }
}

export default async function CollectorReceiptsPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>
}) {
  const { shopSlug } = await params
  const session = await getCollectorSession()
  
  if (!session) {
    redirect("/login")
  }

  // Get the shop to verify
  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
    select: { id: true, name: true },
  })

  if (!shop || shop.id !== session.shopId) {
    redirect("/login")
  }

  const receipts = await getCollectorInvoices(shopSlug)

  return <ReceiptsContent receipts={receipts} shopSlug={shopSlug} />
}
