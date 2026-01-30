import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import prisma from "@/lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "@/lib/auth"

interface CustomerRow {
  "Customer ID"?: string
  "First Name"?: string
  "Last Name"?: string
  "Phone"?: string
  "Email"?: string
  "ID Type"?: string
  "ID Number"?: string
  "Address"?: string
  "City"?: string
  "Region"?: string
  "Notes"?: string
  "Shop Slug"?: string
  "Email Notifications"?: string
  "SMS Notifications"?: string
  "Active"?: string
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
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    
    // Get the first sheet (Customers sheet)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const rows: CustomerRow[] = XLSX.utils.sheet_to_json(worksheet)

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel file is empty" }, { status: 400 })
    }

    // Track results
    const results = {
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: [] as string[],
    }

    // Get all shops for the business
    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
    })

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel row number (1-based + header)

      try {
        const customerId = row["Customer ID"]?.toString().trim()
        const firstName = row["First Name"]?.toString().trim()
        const lastName = row["Last Name"]?.toString().trim()
        const phone = row["Phone"]?.toString().trim()
        const email = row["Email"]?.toString().trim() || null
        const idType = row["ID Type"]?.toString().trim() || null
        const idNumber = row["ID Number"]?.toString().trim() || null
        const address = row["Address"]?.toString().trim() || null
        const city = row["City"]?.toString().trim() || null
        const region = row["Region"]?.toString().trim() || null
        const notes = row["Notes"]?.toString().trim() || null
        const shopSlug = row["Shop Slug"]?.toString().trim()
        const emailNotificationsValue = row["Email Notifications"]?.toString().toUpperCase().trim()
        const smsNotificationsValue = row["SMS Notifications"]?.toString().toUpperCase().trim()
        const activeValue = row["Active"]?.toString().toUpperCase().trim()

        // Skip empty rows
        if (!firstName && !lastName && !customerId) {
          continue
        }

        // Validate required fields
        if (!firstName) {
          results.errors.push(`Row ${rowNum}: First name is required`)
          continue
        }
        if (!lastName) {
          results.errors.push(`Row ${rowNum}: Last name is required`)
          continue
        }
        if (!phone) {
          results.errors.push(`Row ${rowNum}: Phone is required`)
          continue
        }
        if (!shopSlug) {
          results.errors.push(`Row ${rowNum}: Shop Slug is required`)
          continue
        }

        // Find the shop
        const shop = shops.find((s) => s.shopSlug.toLowerCase() === shopSlug.toLowerCase())
        if (!shop) {
          results.errors.push(`Row ${rowNum}: Shop "${shopSlug}" not found`)
          continue
        }

        const emailNotifications = emailNotificationsValue !== "NO"
        const smsNotifications = smsNotificationsValue !== "NO"
        const isActive = activeValue !== "NO" && activeValue !== "DELETE"

        // Check for DELETE action
        if (activeValue === "DELETE") {
          if (customerId && customerId !== "NEW") {
            await prisma.customer.update({
              where: { id: customerId },
              data: { isActive: false },
            })
            results.deactivated++
            
            await createAuditLog({
              actorUserId: user.id,
              action: "CUSTOMER_DEACTIVATED_VIA_EXCEL",
              entityType: "Customer",
              entityId: customerId,
              metadata: { firstName, lastName, source: "Excel Import" },
            })
          }
          continue
        }

        // Determine if creating new or updating existing
        if (!customerId || customerId === "NEW" || customerId === "") {
          // CREATE NEW CUSTOMER
          // Check for duplicate phone in the same shop
          const existingPhone = await prisma.customer.findFirst({
            where: { shopId: shop.id, phone },
          })
          if (existingPhone) {
            results.errors.push(`Row ${rowNum}: Phone "${phone}" already exists in shop "${shop.name}"`)
            continue
          }

          const newCustomer = await prisma.customer.create({
            data: {
              shopId: shop.id,
              firstName,
              lastName,
              phone,
              email,
              idType,
              idNumber,
              address,
              city,
              region,
              notes,
              emailNotifications,
              smsNotifications,
              isActive,
            },
          })

          results.created++

          await createAuditLog({
            actorUserId: user.id,
            action: "CUSTOMER_CREATED_VIA_EXCEL",
            entityType: "Customer",
            entityId: newCustomer.id,
            metadata: { firstName, lastName, phone, shopSlug: shop.shopSlug, source: "Excel Import" },
          })
        } else {
          // UPDATE EXISTING CUSTOMER
          const existingCustomer = await prisma.customer.findFirst({
            where: {
              id: customerId,
              shop: { businessId: business.id },
            },
          })

          if (!existingCustomer) {
            results.errors.push(`Row ${rowNum}: Customer ID "${customerId}" not found`)
            continue
          }

          // Check for duplicate phone (excluding current customer)
          if (phone !== existingCustomer.phone) {
            const existingPhone = await prisma.customer.findFirst({
              where: {
                shopId: shop.id,
                phone,
                id: { not: customerId },
              },
            })
            if (existingPhone) {
              results.errors.push(`Row ${rowNum}: Phone "${phone}" already exists in shop "${shop.name}"`)
              continue
            }
          }

          await prisma.customer.update({
            where: { id: customerId },
            data: {
              shopId: shop.id,
              firstName,
              lastName,
              phone,
              email,
              idType,
              idNumber,
              address,
              city,
              region,
              notes,
              emailNotifications,
              smsNotifications,
              isActive,
            },
          })
          
          results.updated++

          await createAuditLog({
            actorUserId: user.id,
            action: "CUSTOMER_UPDATED_VIA_EXCEL",
            entityType: "Customer",
            entityId: customerId,
            metadata: { firstName, lastName, phone, shopSlug: shop.shopSlug, source: "Excel Import" },
          })
        }
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error)
        results.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.deactivated} deactivated`,
      results,
    })
  } catch (error) {
    console.error("Import customers error:", error)
    return NextResponse.json(
      { error: "Failed to import customers" },
      { status: 500 }
    )
  }
}
