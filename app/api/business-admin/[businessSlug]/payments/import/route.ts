import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import prisma from "@/lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma, PaymentMethod } from "@/app/generated/prisma/client"

interface PaymentRow {
  "Shop Slug"?: string
  "Customer Phone"?: string
  "Purchase Number"?: string
  "Amount"?: string | number
  "Payment Method"?: string
  "Reference"?: string
  "Date"?: string
  "Notes"?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  try {
    const { businessSlug } = await params
    const { business, user } = await requireBusinessAdmin(businessSlug)

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })

    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<PaymentRow>(worksheet)

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in the file" }, { status: 400 })
    }

    const results = {
      created: 0,
      errors: [] as string[],
    }

    // Get all shops for this business
    const businessShops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true, shopSlug: true, name: true },
    })

    const shopMap = new Map(businessShops.map((s) => [s.shopSlug.toLowerCase(), s]))

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel rows start at 1, plus header row

      try {
        // Validate required fields
        const shopSlug = String(row["Shop Slug"] || "").trim().toLowerCase()
        const customerPhone = String(row["Customer Phone"] || "").trim()
        const purchaseNumber = String(row["Purchase Number"] || "").trim().toUpperCase()
        const amount = parseFloat(String(row["Amount"] || "0")) || 0
        const paymentMethod = String(row["Payment Method"] || "CASH").trim().toUpperCase()
        const reference = String(row["Reference"] || "").trim() || null
        const dateStr = String(row["Date"] || "").trim()
        const notes = String(row["Notes"] || "").trim() || null

        // Validate shop
        if (!shopSlug) {
          results.errors.push(`Row ${rowNum}: Shop Slug is required`)
          continue
        }

        const shop = shopMap.get(shopSlug)
        if (!shop) {
          results.errors.push(`Row ${rowNum}: Shop "${shopSlug}" not found`)
          continue
        }

        // Validate customer phone
        if (!customerPhone) {
          results.errors.push(`Row ${rowNum}: Customer Phone is required`)
          continue
        }

        // Find customer by phone in this shop
        const customer = await prisma.customer.findFirst({
          where: {
            shopId: shop.id,
            phone: customerPhone,
          },
        })

        if (!customer) {
          results.errors.push(`Row ${rowNum}: Customer with phone "${customerPhone}" not found in shop "${shop.name}"`)
          continue
        }

        // Validate purchase number
        if (!purchaseNumber) {
          results.errors.push(`Row ${rowNum}: Purchase Number is required`)
          continue
        }

        // Find purchase
        const purchase = await prisma.purchase.findFirst({
          where: {
            purchaseNumber: purchaseNumber,
            customerId: customer.id,
          },
        })

        if (!purchase) {
          results.errors.push(`Row ${rowNum}: Purchase "${purchaseNumber}" not found for customer "${customerPhone}"`)
          continue
        }

        // Validate amount
        if (amount <= 0) {
          results.errors.push(`Row ${rowNum}: Amount must be greater than 0`)
          continue
        }

        // Validate payment method
        const validMethods = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CARD"]
        if (!validMethods.includes(paymentMethod)) {
          results.errors.push(`Row ${rowNum}: Invalid Payment Method "${paymentMethod}". Use: ${validMethods.join(", ")}`)
          continue
        }

        // Parse date
        let paymentDate = new Date()
        if (dateStr) {
          const parsedDate = new Date(dateStr)
          if (!isNaN(parsedDate.getTime())) {
            paymentDate = parsedDate
          }
        }

        // Create the payment
        const payment = await prisma.payment.create({
          data: {
            purchaseId: purchase.id,
            amount: new Prisma.Decimal(amount),
            paymentMethod: paymentMethod as PaymentMethod,
            status: "COMPLETED",
            reference: reference,
            notes: notes ? `[Imported by Business Admin: ${user.name}] ${notes}` : `[Imported by Business Admin: ${user.name}]`,
            paidAt: paymentDate,
            isConfirmed: true, // Auto-confirm imported payments
            confirmedAt: new Date(),
          },
        })

        // Update purchase amounts
        const newAmountPaid = Number(purchase.amountPaid) + amount
        const newOutstanding = Math.max(0, Number(purchase.totalAmount) - newAmountPaid)

        // Determine new status
        let newStatus = purchase.status
        if (newOutstanding <= 0) {
          newStatus = "COMPLETED"
        } else if (newAmountPaid > 0 && purchase.status === "PENDING") {
          newStatus = "ACTIVE"
        }

        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            amountPaid: new Prisma.Decimal(newAmountPaid),
            outstandingBalance: new Prisma.Decimal(newOutstanding),
            status: newStatus,
          },
        })

        // Create audit log
        await createAuditLog({
          actorUserId: user.id,
          action: "PAYMENT_IMPORTED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: {
            businessId: business.id,
            amount,
            purchaseNumber,
            description: `Imported payment of ${amount} for ${purchaseNumber}`,
          },
        })

        results.created++
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error)
        results.errors.push(`Row ${rowNum}: Processing error - ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    // Revalidate the payments page
    revalidatePath(`/business-admin/${businessSlug}/payments`)

    return NextResponse.json({
      success: true,
      created: results.created,
      errors: results.errors,
    })
  } catch (error) {
    console.error("Error importing payments:", error)
    return NextResponse.json(
      { error: "Failed to import payments" },
      { status: 500 }
    )
  }
}
