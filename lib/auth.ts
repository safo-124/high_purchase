import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import prisma from "./prisma"
import { Role } from "../app/generated/prisma/client"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production"
)

const COOKIE_NAME = "hp_session"

export interface SessionPayload {
  userId: string
  email: string
  role: Role
  exp?: number
}

/**
 * Create a signed JWT token
 */
export async function createToken(payload: Omit<SessionPayload, "exp">): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/**
 * Set the session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  })
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Get the current session user from cookie
 * Returns null if not authenticated
 */
export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return null
  }

  // Fetch fresh user data from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  return user
}

/**
 * Require user to be logged in as SUPER_ADMIN
 * Redirects to /login if not authenticated or not SUPER_ADMIN
 */
export async function requireSuperAdmin() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "SUPER_ADMIN") {
    redirect("/login?error=unauthorized")
  }

  return user
}

/**
 * Require user to be a SHOP_ADMIN for a specific shop
 * Returns { user, shop, membership } if authorized
 * Redirects to appropriate error page if not
 */
export async function requireShopAdminForShop(shopSlug: string) {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  // SUPER_ADMIN can access any shop
  if (user.role === "SUPER_ADMIN") {
    const shop = await prisma.shop.findUnique({
      where: { shopSlug },
    })

    if (!shop) {
      redirect("/shop-admin/select-shop?error=shop-not-found")
    }

    if (!shop.isActive) {
      redirect("/shop-admin/select-shop?error=shop-suspended")
    }

    return { user, shop, membership: null }
  }

  // For SHOP_ADMIN users, verify membership
  if (user.role !== "SHOP_ADMIN") {
    redirect("/login?error=unauthorized")
  }

  // Load shop and membership in one query
  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
    include: {
      members: {
        where: {
          userId: user.id,
          role: "SHOP_ADMIN",
          isActive: true,
        },
      },
    },
  })

  if (!shop) {
    redirect("/shop-admin/select-shop?error=shop-not-found")
  }

  if (!shop.isActive) {
    redirect("/shop-admin/select-shop?error=shop-suspended")
  }

  const membership = shop.members[0]
  if (!membership) {
    redirect("/shop-admin/select-shop?error=no-access")
  }

  return { user, shop, membership }
}

/**
 * Get all shops a user has SHOP_ADMIN access to
 */
export async function getUserShopMemberships(userId: string) {
  return await prisma.shopMember.findMany({
    where: {
      userId,
      role: "SHOP_ADMIN",
      isActive: true,
      shop: {
        isActive: true,
      },
    },
    include: {
      shop: true,
    },
    orderBy: {
      shop: {
        name: "asc",
      },
    },
  })
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: {
  actorUserId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: object
}) {
  return await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? undefined,
    },
  })
}

/**
 * Require user to be a DEBT_COLLECTOR for a specific shop
 * Returns { user, shop, membership } if authorized
 * Redirects to appropriate error page if not
 */
export async function requireCollectorForShop(shopSlug: string) {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  // SUPER_ADMIN can access any shop as collector (for testing)
  if (user.role === "SUPER_ADMIN") {
    const shop = await prisma.shop.findUnique({
      where: { shopSlug },
    })

    if (!shop) {
      redirect("/collector/select-shop?error=shop-not-found")
    }

    if (!shop.isActive) {
      redirect("/collector/select-shop?error=shop-suspended")
    }

    return { user, shop, membership: null }
  }

  // For SHOP_ADMIN users (they can also be collectors)
  // Load shop and membership
  const shop = await prisma.shop.findUnique({
    where: { shopSlug },
    include: {
      members: {
        where: {
          userId: user.id,
          role: "DEBT_COLLECTOR",
          isActive: true,
        },
      },
    },
  })

  if (!shop) {
    redirect("/collector/select-shop?error=shop-not-found")
  }

  if (!shop.isActive) {
    redirect("/collector/select-shop?error=shop-suspended")
  }

  const membership = shop.members[0]
  if (!membership) {
    redirect("/collector/select-shop?error=no-access")
  }

  return { user, shop, membership }
}

/**
 * Get all shops a user has DEBT_COLLECTOR access to
 */
export async function getCollectorShopMemberships(userId: string) {
  return await prisma.shopMember.findMany({
    where: {
      userId,
      role: "DEBT_COLLECTOR",
      isActive: true,
      shop: {
        isActive: true,
      },
    },
    include: {
      shop: true,
    },
    orderBy: {
      shop: {
        name: "asc",
      },
    },
  })
}
