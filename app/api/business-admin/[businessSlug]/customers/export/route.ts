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

    // Fetch all customers across all shops
    const customers = await prisma.customer.findMany({
      where: {
        shop: { businessId: business.id },
      },
      include: {
        shop: { select: { name: true, shopSlug: true } },
        assignedCollector: {
          select: {
            user: { select: { name: true } },
          },
        },
        user: { select: { email: true } },
      },
      orderBy: [{ shop: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    })

    // Transform customers into Excel-friendly format
    const excelData = customers.map((customer) => ({
      "Customer ID": customer.id,
      "First Name": customer.firstName,
      "Last Name": customer.lastName,
      "Phone": customer.phone,
      "Email": customer.email || "",
      "ID Type": customer.idType || "",
      "ID Number": customer.idNumber || "",
      "Address": customer.address || "",
      "City": customer.city || "",
      "Region": customer.region || "",
      "Notes": customer.notes || "",
      "Shop Name": customer.shop.name,
      "Shop Slug": customer.shop.shopSlug,
      "Assigned Collector": customer.assignedCollector?.user?.name || "",
      "Has Account": customer.userId ? "Yes" : "No",
      "Account Email": customer.user?.email || "",
      "Email Notifications": customer.emailNotifications ? "Yes" : "No",
      "SMS Notifications": customer.smsNotifications ? "Yes" : "No",
      "Active": customer.isActive ? "Yes" : "No",
      "Created At": customer.createdAt.toISOString().split("T")[0],
    }))

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    const colWidths = [
      { wch: 28 }, // Customer ID
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 12 }, // ID Type
      { wch: 15 }, // ID Number
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 15 }, // Region
      { wch: 30 }, // Notes
      { wch: 20 }, // Shop Name
      { wch: 15 }, // Shop Slug
      { wch: 20 }, // Assigned Collector
      { wch: 12 }, // Has Account
      { wch: 25 }, // Account Email
      { wch: 18 }, // Email Notifications
      { wch: 16 }, // SMS Notifications
      { wch: 8 },  // Active
      { wch: 12 }, // Created At
    ]
    worksheet["!cols"] = colWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers")

    // Create Shops reference sheet
    const shopsData = shops.map((shop) => ({
      "Shop Name": shop.name,
      "Shop Slug": shop.shopSlug,
    }))
    const shopsSheet = XLSX.utils.json_to_sheet(shopsData)
    shopsSheet["!cols"] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, shopsSheet, "Shops")

    // Add instructions sheet
    const instructions = [
      { "Instructions": "HOW TO IMPORT CUSTOMERS VIA EXCEL" },
      { "Instructions": "" },
      { "Instructions": "1. ADDING NEW CUSTOMERS:" },
      { "Instructions": "   - Leave 'Customer ID' empty or use 'NEW'" },
      { "Instructions": "   - Fill in First Name, Last Name, Phone (required fields)" },
      { "Instructions": "   - Set 'Shop Slug' to assign to a shop (required)" },
      { "Instructions": "" },
      { "Instructions": "2. UPDATING EXISTING CUSTOMERS:" },
      { "Instructions": "   - Keep 'Customer ID' unchanged" },
      { "Instructions": "   - Modify other fields as needed" },
      { "Instructions": "" },
      { "Instructions": "3. DELETING/DEACTIVATING CUSTOMERS:" },
      { "Instructions": "   - Set 'Active' column to 'DELETE' or 'NO'" },
      { "Instructions": "" },
      { "Instructions": "4. REQUIRED FIELDS:" },
      { "Instructions": "   - First Name" },
      { "Instructions": "   - Last Name" },
      { "Instructions": "   - Phone" },
      { "Instructions": "   - Shop Slug (must match an existing shop)" },
      { "Instructions": "" },
      { "Instructions": "5. ID TYPES (optional):" },
      { "Instructions": "   - National ID" },
      { "Instructions": "   - Passport" },
      { "Instructions": "   - Driver's License" },
      { "Instructions": "   - Voter ID" },
      { "Instructions": "" },
      { "Instructions": "6. IMPORTANT NOTES:" },
      { "Instructions": "   - Phone must be unique per shop" },
      { "Instructions": "   - See 'Shops' tab for list of valid shop slugs" },
      { "Instructions": "   - 'Has Account' and 'Account Email' are read-only" },
      { "Instructions": "   - To create customer accounts, use the web interface" },
      { "Instructions": "" },
      { "Instructions": `Export Date: ${new Date().toLocaleString()}` },
      { "Instructions": `Business: ${business.name}` },
    ]
    const instructionSheet = XLSX.utils.json_to_sheet(instructions)
    instructionSheet["!cols"] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions")

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Create filename with date
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `customers_${business.name.replace(/\s+/g, "_")}_${dateStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export customers error:", error)
    return NextResponse.json(
      { error: "Failed to export customers" },
      { status: 500 }
    )
  }
}
