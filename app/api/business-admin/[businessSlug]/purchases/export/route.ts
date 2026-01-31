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

    // Fetch all purchases with related data
    const purchases = await prisma.purchase.findMany({
      where: {
        customer: { shop: { businessId: business.id } },
      },
      include: {
        customer: {
          include: {
            shop: { select: { name: true, shopSlug: true } },
          },
        },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
        payments: {
          where: { isConfirmed: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform to Excel format
    const excelData = purchases.map((purchase) => {
      const totalPaid = purchase.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const productNames = purchase.items.map(i => i.productName).join("; ")
      const productSkus = purchase.items.map(i => i.product?.sku || "N/A").join("; ")
      const quantities = purchase.items.map(i => i.quantity).join("; ")
      const unitPrices = purchase.items.map(i => Number(i.unitPrice)).join("; ")

      return {
        "Purchase Number": purchase.purchaseNumber,
        "Shop Slug": purchase.customer.shop.shopSlug,
        "Shop Name": purchase.customer.shop.name,
        "Customer Name": `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        "Customer Phone": purchase.customer.phone,
        "Products": productNames,
        "SKUs": productSkus,
        "Quantities": quantities,
        "Unit Prices": unitPrices,
        "Purchase Type": purchase.purchaseType || "CREDIT",
        "Subtotal": Number(purchase.subtotal),
        "Interest Amount": Number(purchase.interestAmount),
        "Total Amount": Number(purchase.totalAmount),
        "Down Payment": Number(purchase.downPayment),
        "Amount Paid": totalPaid,
        "Outstanding": Number(purchase.totalAmount) - totalPaid,
        "Installments": purchase.installments,
        "Status": purchase.status,
        "Start Date": purchase.startDate?.toISOString().split("T")[0] || "",
        "Due Date": purchase.dueDate?.toISOString().split("T")[0] || "",
        "Notes": purchase.notes || "",
        "Created At": purchase.createdAt.toISOString().split("T")[0],
      }
    })

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws["!cols"] = [
      { wch: 18 }, // Purchase Number
      { wch: 15 }, // Shop Slug
      { wch: 20 }, // Shop Name
      { wch: 25 }, // Customer Name
      { wch: 15 }, // Customer Phone
      { wch: 40 }, // Products
      { wch: 20 }, // SKUs
      { wch: 15 }, // Quantities
      { wch: 20 }, // Unit Prices
      { wch: 12 }, // Purchase Type
      { wch: 12 }, // Subtotal
      { wch: 12 }, // Interest Amount
      { wch: 12 }, // Total Amount
      { wch: 12 }, // Down Payment
      { wch: 12 }, // Amount Paid
      { wch: 12 }, // Outstanding
      { wch: 12 }, // Installments
      { wch: 12 }, // Status
      { wch: 12 }, // Start Date
      { wch: 12 }, // Due Date
      { wch: 30 }, // Notes
      { wch: 12 }, // Created At
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Purchases")

    // Add template sheet for imports
    const templateData = [{
      "Shop Slug": "your-shop-slug (required)",
      "Customer Phone": "0551234567 (required - must exist)",
      "Products": "Product Name 1; Product Name 2 (required, semicolon-separated)",
      "Quantities": "1; 2 (required, semicolon-separated)",
      "Unit Prices": "100; 200 (required, semicolon-separated)",
      "Purchase Type": "CASH, LAYAWAY, or CREDIT (optional, defaults to CREDIT)",
      "Down Payment": "50 (optional, defaults to 0)",
      "Amount Paid": "100 (optional, additional amount paid beyond down payment)",
      "Installments": "3 (optional, defaults to 3)",
      "Due Date": "2026-03-31 (optional, YYYY-MM-DD format)",
      "Notes": "Any notes (optional)",
    }]
    const templateWs = XLSX.utils.json_to_sheet(templateData)
    templateWs["!cols"] = [
      { wch: 30 },
      { wch: 35 },
      { wch: 55 },
      { wch: 35 },
      { wch: 40 },
      { wch: 50 },
      { wch: 35 },
      { wch: 55 },
      { wch: 35 },
      { wch: 40 },
      { wch: 25 },
    ]
    XLSX.utils.book_append_sheet(wb, templateWs, "Import Template")

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="purchases_${businessSlug}_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Export purchases error:", error)
    return NextResponse.json(
      { error: "Failed to export purchases" },
      { status: 500 }
    )
  }
}
