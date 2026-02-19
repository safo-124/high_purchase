import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import prisma from "../../../../lib/prisma"
import { createToken, setSessionCookie, createAuditLog } from "../../../../lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Check if user has a valid role for login
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN", "SHOP_ADMIN", "SALES_STAFF", "DEBT_COLLECTOR", "ACCOUNTANT"].includes(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Authorized users only." },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set session cookie
    await setSessionCookie(token)

    // Create audit log
    await createAuditLog({
      actorUserId: user.id,
      action: "LOGIN",
      metadata: {
        email: user.email,
        ip: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    // Check if user must change password on first login
    const rolesRequiringChange: string[] = ["BUSINESS_ADMIN", "SHOP_ADMIN", "SALES_STAFF", "DEBT_COLLECTOR"]
    if (user.mustChangePassword && rolesRequiringChange.includes(user.role)) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        mustChangePassword: true,
        redirectPath: "/change-password",
      })
    }

    // Determine redirect path based on role
    let redirectPath = "/login"
    if (user.role === "SUPER_ADMIN") {
      redirectPath = "/super-admin"
    } else if (user.role === "BUSINESS_ADMIN") {
      redirectPath = "/business-admin/select-business"
    } else if (user.role === "SHOP_ADMIN") {
      redirectPath = "/shop-admin/select-shop"
    } else if (user.role === "SALES_STAFF") {
      redirectPath = "/sales-staff/select-shop"
    } else if (user.role === "DEBT_COLLECTOR") {
      redirectPath = "/collector/select-shop"
    } else if (user.role === "ACCOUNTANT") {
      redirectPath = "/accountant/select-business"
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectPath,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    )
  }
}
