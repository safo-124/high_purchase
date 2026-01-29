import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import prisma from "@/lib/prisma"
import { requireBusinessAdmin, createAuditLog } from "@/lib/auth"
import { Prisma } from "@/app/generated/prisma/client"

interface ProductRow {
  "Product ID"?: string
  "Name"?: string
  "SKU"?: string
  "Description"?: string
  "Category"?: string
  "Brand"?: string
  "Cost Price"?: number | string
  "Cash Price"?: number | string
  "Layaway Price"?: number | string
  "Credit Price"?: number | string
  "Low Stock Threshold"?: number | string
  "Active"?: string
  // Dynamic shop columns: [Shop Name] Assigned, [Shop Name] Stock
  [key: string]: unknown
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
    
    // Get the first sheet (Products sheet)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const rows: ProductRow[] = XLSX.utils.sheet_to_json(worksheet)

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel file is empty" }, { status: 400 })
    }

    // Track results
    const results = {
      created: 0,
      updated: 0,
      deactivated: 0,
      shopAssignments: 0,
      shopRemovals: 0,
      errors: [] as string[],
    }

    // Get existing categories, brands, and shops for matching
    const categories = await prisma.category.findMany({
      where: { businessId: business.id },
    })
    const brands = await prisma.brand.findMany({
      where: { businessId: business.id },
    })
    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
    })

    // Extract shop column names from headers
    // Format: [Shop Name] Assigned, [Shop Name] Stock
    const shopColumnMap = new Map<string, { assignedKey: string; stockKey: string; shopId: string }>()
    
    for (const shop of shops) {
      const assignedKey = `[${shop.name}] Assigned`
      const stockKey = `[${shop.name}] Stock`
      shopColumnMap.set(shop.name, { assignedKey, stockKey, shopId: shop.id })
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel row number (1-based + header)

      try {
        const productId = row["Product ID"]?.toString().trim()
        const name = row["Name"]?.toString().trim()
        const sku = row["SKU"]?.toString().trim() || null
        const description = row["Description"]?.toString().trim() || null
        const categoryName = row["Category"]?.toString().trim()
        const brandName = row["Brand"]?.toString().trim()
        const costPrice = parseFloat(String(row["Cost Price"] || 0)) || 0
        const cashPrice = parseFloat(String(row["Cash Price"] || 0)) || 0
        const layawayPrice = parseFloat(String(row["Layaway Price"] || 0)) || 0
        const creditPrice = parseFloat(String(row["Credit Price"] || 0)) || 0
        const lowStockThreshold = parseInt(String(row["Low Stock Threshold"] || 5)) || 5
        const activeValue = row["Active"]?.toString().toUpperCase().trim()

        // Skip empty rows
        if (!name && !productId) {
          continue
        }

        // Validate required fields
        if (!name) {
          results.errors.push(`Row ${rowNum}: Product name is required`)
          continue
        }

        // Match category
        let categoryId: string | null = null
        if (categoryName) {
          const category = categories.find(
            (c) => c.name.toLowerCase() === categoryName.toLowerCase()
          )
          if (category) {
            categoryId = category.id
          }
        }

        // Match brand
        let brandId: string | null = null
        if (brandName) {
          const brand = brands.find(
            (b) => b.name.toLowerCase() === brandName.toLowerCase()
          )
          if (brand) {
            brandId = brand.id
          }
        }

        const isActive = activeValue !== "NO" && activeValue !== "DELETE"

        // Check for DELETE action
        if (activeValue === "DELETE") {
          if (productId && productId !== "NEW") {
            await prisma.product.update({
              where: { id: productId },
              data: { isActive: false },
            })
            results.deactivated++
            
            await createAuditLog({
              actorUserId: user.id,
              action: "PRODUCT_DEACTIVATED_VIA_EXCEL",
              entityType: "Product",
              entityId: productId,
              metadata: { name, source: "Excel Import" },
            })
          }
          continue
        }

        let currentProductId: string

        // Determine if creating new or updating existing
        if (!productId || productId === "NEW" || productId === "") {
          // CREATE NEW PRODUCT
          // Check for duplicate SKU
          if (sku) {
            const existingSku = await prisma.product.findFirst({
              where: { businessId: business.id, sku },
            })
            if (existingSku) {
              results.errors.push(`Row ${rowNum}: SKU "${sku}" already exists`)
              continue
            }
          }

          const newProduct = await prisma.product.create({
            data: {
              businessId: business.id,
              name,
              sku,
              description,
              categoryId,
              brandId,
              costPrice: new Prisma.Decimal(costPrice),
              cashPrice: new Prisma.Decimal(cashPrice),
              layawayPrice: new Prisma.Decimal(layawayPrice),
              creditPrice: new Prisma.Decimal(creditPrice),
              price: new Prisma.Decimal(cashPrice),
              lowStockThreshold,
              isActive,
            },
          })

          currentProductId = newProduct.id
          results.created++

          await createAuditLog({
            actorUserId: user.id,
            action: "PRODUCT_CREATED_VIA_EXCEL",
            entityType: "Product",
            entityId: newProduct.id,
            metadata: { name, sku, source: "Excel Import" },
          })
        } else {
          // UPDATE EXISTING PRODUCT
          const existingProduct = await prisma.product.findFirst({
            where: { id: productId, businessId: business.id },
          })

          if (!existingProduct) {
            results.errors.push(`Row ${rowNum}: Product ID "${productId}" not found`)
            continue
          }

          // Check for duplicate SKU (excluding current product)
          if (sku && sku !== existingProduct.sku) {
            const existingSku = await prisma.product.findFirst({
              where: {
                businessId: business.id,
                sku,
                id: { not: productId },
              },
            })
            if (existingSku) {
              results.errors.push(`Row ${rowNum}: SKU "${sku}" already exists`)
              continue
            }
          }

          // Update product master data
          await prisma.product.update({
            where: { id: productId },
            data: {
              name,
              sku,
              description,
              categoryId,
              brandId,
              costPrice: new Prisma.Decimal(costPrice),
              cashPrice: new Prisma.Decimal(cashPrice),
              layawayPrice: new Prisma.Decimal(layawayPrice),
              creditPrice: new Prisma.Decimal(creditPrice),
              price: new Prisma.Decimal(cashPrice),
              lowStockThreshold,
              isActive,
            },
          })
          
          currentProductId = productId
          results.updated++

          await createAuditLog({
            actorUserId: user.id,
            action: "PRODUCT_UPDATED_VIA_EXCEL",
            entityType: "Product",
            entityId: productId,
            metadata: { name, sku, source: "Excel Import" },
          })
        }

        // Process shop assignments from checkbox columns
        for (const [shopName, { assignedKey, stockKey, shopId }] of shopColumnMap) {
          const assignedValue = row[assignedKey]?.toString().trim().toUpperCase()
          const stockValue = row[stockKey]
          
          // Check if assigned (✓, Y, YES, 1, or any truthy value)
          const isAssigned = assignedValue === "✓" || 
                            assignedValue === "Y" || 
                            assignedValue === "YES" || 
                            assignedValue === "1" ||
                            assignedValue === "TRUE"
          
          const stockQuantity = parseInt(String(stockValue || 0)) || 0

          // Find existing shop product
          const existingShopProduct = await prisma.shopProduct.findFirst({
            where: { shopId, productId: currentProductId },
          })

          if (isAssigned) {
            if (existingShopProduct) {
              // Update existing shop product
              await prisma.shopProduct.update({
                where: { id: existingShopProduct.id },
                data: {
                  stockQuantity,
                  isActive: true,
                },
              })
            } else {
              // Create new shop product assignment
              await prisma.shopProduct.create({
                data: {
                  shopId,
                  productId: currentProductId,
                  stockQuantity,
                  lowStockThreshold,
                  isActive: true,
                },
              })
            }
            results.shopAssignments++
          } else if (existingShopProduct && !isAssigned) {
            // Remove from shop (deactivate)
            await prisma.shopProduct.update({
              where: { id: existingShopProduct.id },
              data: { isActive: false },
            })
            results.shopRemovals++
          }
        }
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error)
        results.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.shopAssignments} shop assignments, ${results.shopRemovals} shop removals, ${results.deactivated} deactivated`,
      results,
    })
  } catch (error) {
    console.error("Import products error:", error)
    return NextResponse.json(
      { error: "Failed to import products" },
      { status: 500 }
    )
  }
}
