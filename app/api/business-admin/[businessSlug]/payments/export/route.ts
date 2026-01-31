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

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "all"

    // Build where clause
    const whereClause: {
      purchase: { customer: { shop: { businessId: string } } }
      isConfirmed?: boolean
      rejectedAt?: null | { not: null }
    } = {
      purchase: {
        customer: {
          shop: {
            businessId: business.id,
          },
        },
      },
    }

    if (status === "pending") {
      whereClause.isConfirmed = false
      whereClause.rejectedAt = null
    } else if (status === "confirmed") {
      whereClause.isConfirmed = true
    } else if (status === "rejected") {
      whereClause.rejectedAt = { not: null }
    }

    // Fetch all payments for this business
    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        purchase: {
          include: {
            customer: {
              include: {
                shop: {
                  select: { name: true, shopSlug: true },
                },
              },
            },
          },
        },
        collector: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Helper to extract from notes
    const extractFromNotes = (notes: string | null, pattern: RegExp): string | null => {
      if (!notes) return null
      const match = notes.match(pattern)
      return match ? match[1] : null
    }

    // Create worksheet data
    const wsData = payments.map((payment) => {
      const recordedByMatch = payment.notes?.match(/\[Recorded by (?:Shop Admin|Business Admin|Collector): ([^\]]+)\]/)
      const recordedBy = recordedByMatch ? recordedByMatch[1] : (payment.collector?.user?.name || "Unknown")
      
      const confirmedByMatch = payment.notes?.match(/Confirmed by: ([^|]+)/)
      const confirmedBy = confirmedByMatch ? confirmedByMatch[1].trim() : null

      // Determine status
      let paymentStatus = "Pending"
      if (payment.isConfirmed) {
        paymentStatus = "Confirmed"
      } else if (payment.rejectedAt) {
        paymentStatus = "Rejected"
      }

      return {
        "Payment ID": payment.id,
        "Date": payment.createdAt.toISOString().split("T")[0],
        "Time": payment.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        "Shop Slug": payment.purchase.customer.shop.shopSlug,
        "Shop Name": payment.purchase.customer.shop.name,
        "Customer Name": `${payment.purchase.customer.firstName} ${payment.purchase.customer.lastName}`,
        "Customer Phone": payment.purchase.customer.phone,
        "Purchase Number": payment.purchase.purchaseNumber,
        "Amount": Number(payment.amount),
        "Payment Method": payment.paymentMethod,
        "Reference": payment.reference || "",
        "Status": paymentStatus,
        "Recorded By": recordedBy,
        "Confirmed At": payment.confirmedAt ? payment.confirmedAt.toISOString().split("T")[0] : "",
        "Confirmed By": confirmedBy || "",
        "Rejected At": payment.rejectedAt ? payment.rejectedAt.toISOString().split("T")[0] : "",
        "Rejection Reason": payment.rejectionReason || "",
        "Notes": payment.notes ? payment.notes.replace(/\[.*?\]/g, "").trim() : "",
      }
    })

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(wsData)

    // Set column widths
    ws["!cols"] = [
      { wch: 36 }, // Payment ID
      { wch: 12 }, // Date
      { wch: 8 },  // Time
      { wch: 15 }, // Shop Slug
      { wch: 20 }, // Shop Name
      { wch: 25 }, // Customer Name
      { wch: 15 }, // Customer Phone
      { wch: 12 }, // Purchase Number
      { wch: 12 }, // Amount
      { wch: 15 }, // Payment Method
      { wch: 20 }, // Reference
      { wch: 12 }, // Status
      { wch: 20 }, // Recorded By
      { wch: 12 }, // Confirmed At
      { wch: 20 }, // Confirmed By
      { wch: 12 }, // Rejected At
      { wch: 30 }, // Rejection Reason
      { wch: 40 }, // Notes
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Payments")

    // Create import template sheet
    const templateData = [
      {
        "Shop Slug": "shop-slug",
        "Customer Phone": "0241234567",
        "Purchase Number": "HP-0001",
        "Amount": 100,
        "Payment Method": "CASH",
        "Reference": "Receipt #123",
        "Date": "2026-01-15",
        "Notes": "Partial payment",
      },
    ]
    const templateWs = XLSX.utils.json_to_sheet(templateData)
    templateWs["!cols"] = [
      { wch: 15 }, // Shop Slug
      { wch: 15 }, // Customer Phone
      { wch: 15 }, // Purchase Number
      { wch: 12 }, // Amount
      { wch: 15 }, // Payment Method
      { wch: 20 }, // Reference
      { wch: 12 }, // Date
      { wch: 30 }, // Notes
    ]
    XLSX.utils.book_append_sheet(wb, templateWs, "Import Template")

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    // Return file
    const statusSuffix = status !== "all" ? `-${status}` : ""
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="payments${statusSuffix}-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("Error exporting payments:", error)
    return NextResponse.json({ error: "Failed to export payments" }, { status: 500 })
  }
}
