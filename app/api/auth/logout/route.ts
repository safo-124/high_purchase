import { NextResponse } from "next/server"
import { clearSessionCookie } from "../../../../lib/auth"

export async function POST() {
  try {
    await clearSessionCookie()
    // Redirect to login page after clearing session
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))
  }
}
