"use server"

import prisma from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import bcrypt from "bcryptjs"

export type ActionResult = {
  success: boolean
  error?: string
}

export async function changeFirstTimePassword(newPassword: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Validate password
    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" }
    }

    // Get full user with mustChangePassword field
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!fullUser) {
      return { success: false, error: "User not found" }
    }

    if (!fullUser.mustChangePassword) {
      return { success: false, error: "Password change not required" }
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error changing password:", error)
    return { success: false, error: "Failed to change password" }
  }
}

export async function checkMustChangePassword(): Promise<boolean> {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return false
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mustChangePassword: true },
    })

    return fullUser?.mustChangePassword ?? false
  } catch {
    return false
  }
}
