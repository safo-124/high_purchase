import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import prisma from "@/lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma, PurchaseType } from "@/app/generated/prisma/client"

interface PurchaseRow {
  "Shop Slug"?: string
  "Customer Phone"?: string
  "Products"?: string
  "Quantities"?: string
  "Unit Prices"?: string
  "Purchase Type"?: string
  "Down Payment"?: string | number
  "Amount Paid"?: string | number
  "Installments"?: string | number
  "Due Date"?: string
  "Notes"?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  try {
    const { businessSlug } = await params
    const { user, business } = await requireBusinessAdmin(businessSlug)

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })

    // Get the first sheet (skip template sheet)
    const sheetName = workbook.SheetNames.find(name => name !== "Import Template") || workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<PurchaseRow>(worksheet)

    if (data.length === 0) {
      return NextResponse.json({ error: "No data found in the file" }, { status: 400 })
    }

    // Get all shops for validation
    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      select: { id: true, shopSlug: true, name: true },
    })
    const shopMap = new Map(shops.map(s => [s.shopSlug.toLowerCase(), s]))

    // Get business policy for interest calculation
    const policy = await prisma.businessPolicy.findFirst({
      where: { businessId: business.id },
    })

    const results = {
      created: 0,
      errors: [] as string[],
    }

    const validPurchaseTypes = ["CASH", "LAYAWAY", "CREDIT"]

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // Excel rows start at 1, plus header

      try {
        // Validate required fields
        const shopSlug = String(row["Shop Slug"] || "").trim().toLowerCase()
        const customerPhone = String(row["Customer Phone"] || "").trim()
        const productsStr = String(row["Products"] || "").trim()
        const quantitiesStr = String(row["Quantities"] || "").trim()
        const unitPricesStr = String(row["Unit Prices"] || "").trim()

        if (!shopSlug || shopSlug.includes("required")) {
          results.errors.push(`Row ${rowNum}: Shop Slug is required`)
          continue
        }
        if (!customerPhone || customerPhone.includes("required")) {
          results.errors.push(`Row ${rowNum}: Customer Phone is required`)
          continue
        }
        if (!productsStr || productsStr.includes("required")) {
          results.errors.push(`Row ${rowNum}: Products is required`)
          continue
        }
        if (!quantitiesStr || quantitiesStr.includes("required")) {
          results.errors.push(`Row ${rowNum}: Quantities is required`)
          continue
        }
        if (!unitPricesStr || unitPricesStr.includes("required")) {
          results.errors.push(`Row ${rowNum}: Unit Prices is required`)
          continue
        }

        // Validate shop exists
        const shop = shopMap.get(shopSlug)
        if (!shop) {
          results.errors.push(`Row ${rowNum}: Shop "${shopSlug}" not found`)
          continue
        }

        // Find customer by phone in this shop
        const customer = await prisma.customer.findFirst({
          where: { phone: customerPhone, shopId: shop.id },
        })

        if (!customer) {
          results.errors.push(`Row ${rowNum}: Customer with phone "${customerPhone}" not found in shop "${shopSlug}"`)
          continue
        }

        // Parse products, quantities, and prices
        const productNames = productsStr.split(";").map(p => p.trim()).filter(p => p)
        const quantities = quantitiesStr.split(";").map(q => parseInt(q.trim()) || 1)
        const unitPrices = unitPricesStr.split(";").map(p => parseFloat(p.trim()) || 0)

        if (productNames.length === 0) {
          results.errors.push(`Row ${rowNum}: At least one product is required`)
          continue
        }

        // Ensure arrays are same length
        while (quantities.length < productNames.length) quantities.push(1)
        while (unitPrices.length < productNames.length) unitPrices.push(0)

        // Get optional fields
        const purchaseType = String(row["Purchase Type"] || "CREDIT").trim().toUpperCase()
        const downPayment = parseFloat(String(row["Down Payment"] || "0")) || 0
        const amountPaid = parseFloat(String(row["Amount Paid"] || "0")) || 0
        const installments = parseInt(String(row["Installments"] || "3")) || 3
        const dueDateStr = String(row["Due Date"] || "").trim()
        const notes = String(row["Notes"] || "").trim() || null

        // Validate purchase type
        if (!validPurchaseTypes.includes(purchaseType)) {
          results.errors.push(`Row ${rowNum}: Invalid Purchase Type "${purchaseType}"`)
          continue
        }

        // Calculate totals
        let subtotal = 0
        const items: Array<{
          productId: string | null
          productName: string
          quantity: number
          unitPrice: Prisma.Decimal
          totalPrice: Prisma.Decimal
        }> = []

        for (let j = 0; j < productNames.length; j++) {
          const productName = productNames[j]
          const quantity = quantities[j]
          const unitPrice = unitPrices[j]
          const totalPrice = unitPrice * quantity
          subtotal += totalPrice

          // Try to find product by name in this shop
          const shopProduct = await prisma.shopProduct.findFirst({
            where: {
              shopId: shop.id,
              product: {
                name: { contains: productName, mode: "insensitive" },
              },
            },
            include: { product: true },
          })

          items.push({
            productId: shopProduct?.productId || null,
            productName: shopProduct?.product?.name || productName,
            quantity,
            unitPrice: new Prisma.Decimal(unitPrice),
            totalPrice: new Prisma.Decimal(totalPrice),
          })
        }

        // Calculate interest
        let interestAmount = 0
        const interestRate = policy ? Number(policy.interestRate) / 100 : 0

        if (purchaseType !== "CASH" && policy) {
          if (policy.interestType === "FLAT") {
            interestAmount = subtotal * interestRate
          } else if (policy.interestType === "MONTHLY") {
            const months = installments
            interestAmount = subtotal * interestRate * months
          }
        }

        const totalAmount = subtotal + interestAmount
        const totalPaid = downPayment + amountPaid
        const outstandingBalance = Math.max(0, totalAmount - totalPaid)

        // Generate purchase number
        const purchaseCount = await prisma.purchase.count({
          where: { customerId: customer.id },
        })
        const purchaseNumber = `HP-${String(purchaseCount + 1).padStart(4, "0")}`

        // Calculate due date
        let dueDate: Date | null = null
        if (dueDateStr) {
          dueDate = new Date(dueDateStr)
          if (isNaN(dueDate.getTime())) {
            dueDate = null
          }
        }
        if (!dueDate) {
          const maxDays = policy?.maxTenorDays || 90
          dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + maxDays)
        }

        // Determine status
        let status: "PENDING" | "ACTIVE" | "COMPLETED" = "ACTIVE"
        if (outstandingBalance <= 0) {
          status = "COMPLETED"
        } else if (totalPaid === 0) {
          status = "PENDING"
        }

        // Create the purchase
        const purchase = await prisma.purchase.create({
          data: {
            purchaseNumber,
            customerId: customer.id,
            purchaseType: purchaseType as PurchaseType,
            status,
            subtotal: new Prisma.Decimal(subtotal),
            interestAmount: new Prisma.Decimal(interestAmount),
            totalAmount: new Prisma.Decimal(totalAmount),
            amountPaid: new Prisma.Decimal(totalPaid),
            outstandingBalance: new Prisma.Decimal(outstandingBalance),
            downPayment: new Prisma.Decimal(downPayment),
            installments,
            startDate: new Date(),
            dueDate,
            interestType: policy?.interestType || "FLAT",
            interestRate: policy ? Number(policy.interestRate) : 0,
            notes: notes ? `[Imported] ${notes}` : "[Imported from Excel]",
            items: {
              create: items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
        })

        // Record payments if any
        if (downPayment > 0) {
          await prisma.payment.create({
            data: {
              purchaseId: purchase.id,
              amount: new Prisma.Decimal(downPayment),
              paymentMethod: "CASH",
              status: "COMPLETED",
              isConfirmed: true,
              confirmedAt: new Date(),
              paidAt: new Date(),
              notes: "Down payment (imported)",
            },
          })
        }

        if (amountPaid > 0) {
          await prisma.payment.create({
            data: {
              purchaseId: purchase.id,
              amount: new Prisma.Decimal(amountPaid),
              paymentMethod: "CASH",
              status: "COMPLETED",
              isConfirmed: true,
              confirmedAt: new Date(),
              paidAt: new Date(),
              notes: "Payment (imported)",
            },
          })
        }

        await createAuditLog({
          actorUserId: user.id,
          action: "PURCHASE_CREATED",
          entityType: "Purchase",
          entityId: purchase.id,
          metadata: {
            shopId: shop.id,
            shopName: shop.name,
            customerName: `${customer.firstName} ${customer.lastName}`,
            purchaseNumber,
            totalAmount,
            importedFromExcel: true,
          },
        })

        results.created++
      } catch (rowError) {
        console.error(`Error processing row ${rowNum}:`, rowError)
        results.errors.push(`Row ${rowNum}: ${rowError instanceof Error ? rowError.message : "Unknown error"}`)
      }
    }

    revalidatePath(`/business-admin/${businessSlug}/purchases`)

    return NextResponse.json({
      success: true,
      created: results.created,
      errors: results.errors.slice(0, 10),
      totalErrors: results.errors.length,
    })
  } catch (error) {
    console.error("Import purchases error:", error)
    return NextResponse.json(
      { error: "Failed to import purchases" },
      { status: 500 }
    )
  }
}
