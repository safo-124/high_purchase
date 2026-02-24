"use server"

import prisma from "@/lib/prisma"

/**
 * Public platform stats shown on the landing page.
 * Cached and safe to expose — no sensitive data.
 */
export async function getPlatformStats() {
  try {
    const [
      businessCount,
      shopCount,
      customerCount,
      paymentAgg,
    ] = await Promise.all([
      prisma.business.count({ where: { isActive: true } }),
      prisma.shop.count({ where: { isActive: true } }),
      prisma.customer.count(),
      prisma.payment.aggregate({
        where: { status: "COMPLETED", isConfirmed: true },
        _sum: { amount: true },
      }),
    ])

    const totalCollected = Number(paymentAgg._sum.amount || 0)

    return {
      businesses: businessCount,
      shops: shopCount,
      customers: customerCount,
      totalCollected,
    }
  } catch {
    return {
      businesses: 0,
      shops: 0,
      customers: 0,
      totalCollected: 0,
    }
  }
}

/**
 * Submit a contact form message. Stores in DB for super admin review.
 */
export async function submitContactForm(data: {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}) {
  try {
    if (!data.name || !data.email || !data.subject || !data.message) {
      return { success: false, error: "Please fill in all required fields." }
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: "Please enter a valid email address." }
    }

    await prisma.contactMessage.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        subject: data.subject.trim(),
        message: data.message.trim(),
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}

/**
 * Submit a business registration request.
 */
export async function submitBusinessRegistration(data: {
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  businessName: string
  businessType: string
  city: string
  address: string
  numberOfShops: number
  numberOfStaff: number
  monthlyRevenue: string
  howHeard: string
  message: string
}) {
  try {
    if (!data.ownerName || !data.ownerEmail || !data.ownerPhone || !data.businessName) {
      return { success: false, error: "Please fill in all required fields." }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail)) {
      return { success: false, error: "Please enter a valid email address." }
    }

    // Check if there's already a pending registration with this email
    const existing = await prisma.businessRegistration.findFirst({
      where: {
        ownerEmail: data.ownerEmail.trim().toLowerCase(),
        status: "PENDING",
      },
    })

    if (existing) {
      return { success: false, error: "A registration request with this email is already pending. We'll review it shortly." }
    }

    // Check if email is already a user
    const existingUser = await prisma.user.findUnique({
      where: { email: data.ownerEmail.trim().toLowerCase() },
    })

    if (existingUser) {
      return { success: false, error: "An account with this email already exists. Please sign in instead." }
    }

    await prisma.businessRegistration.create({
      data: {
        ownerName: data.ownerName.trim(),
        ownerEmail: data.ownerEmail.trim().toLowerCase(),
        ownerPhone: data.ownerPhone.trim(),
        businessName: data.businessName.trim(),
        businessType: data.businessType?.trim() || null,
        city: data.city?.trim() || null,
        address: data.address?.trim() || null,
        numberOfShops: data.numberOfShops || 1,
        numberOfStaff: data.numberOfStaff || 1,
        monthlyRevenue: data.monthlyRevenue?.trim() || null,
        howHeard: data.howHeard?.trim() || null,
        message: data.message?.trim() || null,
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
