import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import prisma from "@/lib/prisma"
import { requireBusinessAdmin } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  try {
    const { businessSlug } = await params
    const { business } = await requireBusinessAdmin(businessSlug)

    // Fetch all shops for the business
    const shops = await prisma.shop.findMany({
      where: { businessId: business.id },
      orderBy: { name: "asc" },
    })

    // Fetch all products for the business with shop assignments
    const products = await prisma.product.findMany({
      where: { businessId: business.id },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        shopProducts: {
          include: {
            shop: { select: { id: true, name: true, shopSlug: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    // Transform products into Excel-friendly format - ONE ROW PER PRODUCT with shop columns
    const excelData: Record<string, unknown>[] = []
    
    for (const product of products) {
      // Build the base row
      const row: Record<string, unknown> = {
        "Product ID": product.id,
        "Name": product.name,
        "SKU": product.sku || "",
        "Description": product.description || "",
        "Category": product.category?.name || "",
        "Brand": product.brand?.name || "",
        "Cost Price": Number(product.costPrice),
        "Cash Price": Number(product.cashPrice),
        "Layaway Price": Number(product.layawayPrice),
        "Credit Price": Number(product.creditPrice),
        "Low Stock Threshold": product.lowStockThreshold,
        "Active": product.isActive ? "Yes" : "No",
        "Created At": product.createdAt.toISOString().split("T")[0],
      }

      // Add a column for each shop with stock quantity (checkbox style)
      // Format: "[Shop Name] Stock" = quantity (or empty/0 if not assigned)
      for (const shop of shops) {
        const shopProduct = product.shopProducts.find(sp => sp.shopId === shop.id)
        // Use checkbox-style: ✓ with stock number if assigned, empty if not
        row[`[${shop.name}] Assigned`] = shopProduct ? "✓" : ""
        row[`[${shop.name}] Stock`] = shopProduct ? shopProduct.stockQuantity : ""
      }

      excelData.push(row)
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    const baseColWidths = [
      { wch: 28 }, // Product ID
      { wch: 30 }, // Name
      { wch: 15 }, // SKU
      { wch: 35 }, // Description
      { wch: 15 }, // Category
      { wch: 15 }, // Brand
      { wch: 12 }, // Cost Price
      { wch: 12 }, // Cash Price
      { wch: 14 }, // Layaway Price
      { wch: 12 }, // Credit Price
      { wch: 18 }, // Low Stock Threshold
      { wch: 8 },  // Active
      { wch: 12 }, // Created At
    ]
    // Add widths for shop columns (Assigned + Stock for each shop)
    for (const shop of shops) {
      baseColWidths.push({ wch: 12 }) // [Shop] Assigned
      baseColWidths.push({ wch: 14 }) // [Shop] Stock
    }
    worksheet["!cols"] = baseColWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, "Products")

    // Create Shops reference sheet
    const shopsData = shops.map(shop => ({
      "Shop Name": shop.name,
      "Shop Slug": shop.shopSlug,
      "Address": shop.address || "",
    }))
    const shopsSheet = XLSX.utils.json_to_sheet(shopsData)
    shopsSheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(workbook, shopsSheet, "Shops")

    // Add instructions sheet
    const shopColumns = shops.map(s => `[${s.name}] Assigned, [${s.name}] Stock`).join(", ")
    const instructions = [
      { "Instructions": "HOW TO UPDATE PRODUCTS VIA EXCEL" },
      { "Instructions": "" },
      { "Instructions": "SHOP COLUMNS FORMAT:" },
      { "Instructions": `Each shop has two columns: ${shopColumns || "(No shops created yet)"}` },
      { "Instructions": "" },
      { "Instructions": "1. ASSIGNING PRODUCT TO A SHOP:" },
      { "Instructions": "   - Put ✓ (checkmark) or 'Y' or 'YES' in [Shop Name] Assigned column" },
      { "Instructions": "   - Enter the stock quantity in [Shop Name] Stock column" },
      { "Instructions": "" },
      { "Instructions": "2. REMOVING PRODUCT FROM A SHOP:" },
      { "Instructions": "   - Clear the [Shop Name] Assigned column (leave empty or put 'N'/'NO')" },
      { "Instructions": "   - The stock column will be ignored" },
      { "Instructions": "" },
      { "Instructions": "3. UPDATING STOCK:" },
      { "Instructions": "   - Keep ✓ in Assigned column" },
      { "Instructions": "   - Change the stock number in the Stock column" },
      { "Instructions": "" },
      { "Instructions": "4. ADDING NEW PRODUCTS:" },
      { "Instructions": "   - Leave 'Product ID' empty or use 'NEW'" },
      { "Instructions": "   - Fill in product details and shop assignments" },
      { "Instructions": "" },
      { "Instructions": "5. DELETING/DEACTIVATING:" },
      { "Instructions": "   - Set 'Active' column to 'DELETE' or 'NO' to deactivate" },
      { "Instructions": "" },
      { "Instructions": "6. IMPORTANT NOTES:" },
      { "Instructions": "   - Do not modify 'Product ID' of existing products" },
      { "Instructions": "   - Do not rename shop column headers" },
      { "Instructions": "   - Category and Brand must match existing names" },
      { "Instructions": "   - Prices must be numbers (no currency symbols)" },
      { "Instructions": "   - See 'Shops' tab for list of all shops" },
      { "Instructions": "" },
      { "Instructions": `Export Date: ${new Date().toLocaleString()}` },
      { "Instructions": `Business: ${business.name}` },
    ]
    const instructionSheet = XLSX.utils.json_to_sheet(instructions)
    instructionSheet["!cols"] = [{ wch: 65 }]
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions")

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Create filename with date
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `products_${business.name.replace(/\s+/g, "_")}_${dateStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export products error:", error)
    return NextResponse.json(
      { error: "Failed to export products" },
      { status: 500 }
    )
  }
}
