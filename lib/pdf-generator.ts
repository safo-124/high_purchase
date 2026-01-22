import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// ============================================================================
// PDF GENERATION FOR INVOICES AND RECEIPTS
// ============================================================================

export interface InvoiceItem {
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface InvoicePDFData {
  invoiceNumber: string
  purchaseNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  customerAddress?: string | null
  shopName: string
  businessName: string
  businessLogoUrl?: string | null
  purchaseType: "CASH" | "LAYAWAY" | "CREDIT"
  items: InvoiceItem[]
  subtotal: number
  interestAmount: number
  totalAmount: number
  downPayment: number
  amountPaid: number
  outstandingBalance: number
  installments: number
  dueDate: string
  purchaseDate: string
  // Payment info for the invoice
  bankName?: string | null
  bankAccountName?: string | null
  bankAccountNumber?: string | null
  mobileMoneyProvider?: string | null
  mobileMoneyName?: string | null
  mobileMoneyNumber?: string | null
}

export interface ReceiptPDFData {
  receiptNumber: string
  purchaseNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  shopName: string
  businessName: string
  businessLogoUrl?: string | null
  paymentAmount: number
  paymentMethod: string
  reference?: string | null
  previousBalance: number
  newBalance: number
  totalPurchaseAmount: number
  totalAmountPaid: number
  collectorName?: string | null
  paymentDate: string
  paymentTime: string
  notes?: string | null
  isFullyPaid: boolean
}

export interface PendingPaymentData {
  purchaseNumber: string
  customerName: string
  shopName: string
  businessName: string
  paymentAmount: number
  paymentMethod: string
  reference?: string | null
  collectorName?: string | null
  paymentDate: string
  paymentTime: string
  notes?: string | null
}

/**
 * Generate a purchase invoice PDF as base64 string
 */
export async function generateInvoicePDF(data: InvoicePDFData): Promise<string> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Colors
  const primaryColor: [number, number, number] = [41, 128, 185]
  const textColor: [number, number, number] = [44, 62, 80]
  const lightGray: [number, number, number] = [189, 195, 199]
  
  let yPos = 20

  // Header
  doc.setFontSize(24)
  doc.setTextColor(...primaryColor)
  doc.text(data.businessName, 14, yPos)
  
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text(data.shopName, 14, yPos + 8)
  
  // Invoice label
  doc.setFontSize(28)
  doc.setTextColor(...primaryColor)
  doc.text("INVOICE", pageWidth - 14, yPos, { align: "right" })
  
  yPos += 20

  // Invoice details box
  doc.setFillColor(245, 247, 250)
  doc.rect(pageWidth - 80, yPos, 66, 30, "F")
  
  doc.setFontSize(9)
  doc.setTextColor(...textColor)
  doc.text("Invoice #:", pageWidth - 78, yPos + 8)
  doc.text(data.invoiceNumber, pageWidth - 16, yPos + 8, { align: "right" })
  doc.text("Purchase #:", pageWidth - 78, yPos + 16)
  doc.text(data.purchaseNumber, pageWidth - 16, yPos + 16, { align: "right" })
  doc.text("Date:", pageWidth - 78, yPos + 24)
  doc.text(data.purchaseDate, pageWidth - 16, yPos + 24, { align: "right" })
  
  // Customer info
  doc.setFontSize(11)
  doc.setTextColor(...primaryColor)
  doc.text("Bill To:", 14, yPos + 5)
  
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text(data.customerName, 14, yPos + 12)
  doc.text(data.customerPhone, 14, yPos + 18)
  if (data.customerEmail) {
    doc.text(data.customerEmail, 14, yPos + 24)
  }
  if (data.customerAddress) {
    doc.text(data.customerAddress, 14, yPos + 30)
  }
  
  yPos += 45
  
  // Purchase type badge
  const purchaseTypeColors: Record<string, [number, number, number]> = {
    CASH: [39, 174, 96],
    LAYAWAY: [241, 196, 15],
    CREDIT: [52, 152, 219],
  }
  const badgeColor = purchaseTypeColors[data.purchaseType] || primaryColor
  doc.setFillColor(...badgeColor)
  doc.roundedRect(14, yPos, 30, 8, 2, 2, "F")
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(data.purchaseType, 29, yPos + 5.5, { align: "center" })
  
  yPos += 15

  // Items table
  const tableData = data.items.map(item => [
    item.productName,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.totalPrice)
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [["Item", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPos = (doc as any).lastAutoTable.finalY + 10
  
  // Summary section
  const summaryX = pageWidth - 80
  const summaryWidth = 66
  
  doc.setFillColor(245, 247, 250)
  doc.rect(summaryX, yPos, summaryWidth, 50, "F")
  
  doc.setFontSize(9)
  doc.setTextColor(...textColor)
  
  const summaryItems = [
    ["Subtotal:", formatCurrency(data.subtotal)],
    ["Interest:", formatCurrency(data.interestAmount)],
    ["Total Amount:", formatCurrency(data.totalAmount)],
    ["Down Payment:", formatCurrency(data.downPayment)],
    ["Amount Paid:", formatCurrency(data.amountPaid)],
  ]
  
  let summaryY = yPos + 8
  summaryItems.forEach(([label, value]) => {
    doc.text(label, summaryX + 4, summaryY)
    doc.text(value, summaryX + summaryWidth - 4, summaryY, { align: "right" })
    summaryY += 8
  })
  
  // Outstanding balance (highlighted)
  doc.setFillColor(...primaryColor)
  doc.rect(summaryX, summaryY - 2, summaryWidth, 12, "F")
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text("Balance Due:", summaryX + 4, summaryY + 6)
  doc.setFontSize(11)
  doc.text(formatCurrency(data.outstandingBalance), summaryX + summaryWidth - 4, summaryY + 6, { align: "right" })
  
  yPos += 65
  
  // Payment terms
  if (data.purchaseType !== "CASH" && data.outstandingBalance > 0) {
    doc.setFontSize(10)
    doc.setTextColor(...primaryColor)
    doc.text("Payment Terms", 14, yPos)
    
    doc.setFontSize(9)
    doc.setTextColor(...textColor)
    doc.text(`Installments: ${data.installments} payments`, 14, yPos + 7)
    doc.text(`Due Date: ${data.dueDate}`, 14, yPos + 14)
    
    yPos += 25
    
    // Payment methods
    if (data.bankAccountNumber || data.mobileMoneyNumber) {
      doc.setFontSize(10)
      doc.setTextColor(...primaryColor)
      doc.text("Payment Methods", 14, yPos)
      
      doc.setFontSize(9)
      doc.setTextColor(...textColor)
      let paymentY = yPos + 7
      
      if (data.bankAccountNumber) {
        doc.text(`Bank: ${data.bankName || "N/A"}`, 14, paymentY)
        doc.text(`Account: ${data.bankAccountName || "N/A"} - ${data.bankAccountNumber}`, 14, paymentY + 6)
        paymentY += 14
      }
      
      if (data.mobileMoneyNumber) {
        doc.text(`Mobile Money: ${data.mobileMoneyProvider || "N/A"}`, 14, paymentY)
        doc.text(`Number: ${data.mobileMoneyName || ""} - ${data.mobileMoneyNumber}`, 14, paymentY + 6)
      }
    }
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setDrawColor(...lightGray)
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5)
  
  doc.setFontSize(8)
  doc.setTextColor(...lightGray)
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" })
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: "center" })
  
  // Return as base64
  return doc.output("datauristring")
}

/**
 * Generate a payment receipt PDF as base64 string
 */
export async function generateReceiptPDF(data: ReceiptPDFData): Promise<string> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Colors
  const primaryColor: [number, number, number] = [39, 174, 96]
  const textColor: [number, number, number] = [44, 62, 80]
  const lightGray: [number, number, number] = [189, 195, 199]
  
  let yPos = 20

  // Header
  doc.setFontSize(24)
  doc.setTextColor(...primaryColor)
  doc.text(data.businessName, 14, yPos)
  
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text(data.shopName, 14, yPos + 8)
  
  // Receipt label
  doc.setFontSize(28)
  doc.setTextColor(...primaryColor)
  doc.text("RECEIPT", pageWidth - 14, yPos, { align: "right" })
  
  yPos += 20

  // Receipt details box
  doc.setFillColor(232, 245, 233)
  doc.rect(pageWidth - 80, yPos, 66, 30, "F")
  
  doc.setFontSize(9)
  doc.setTextColor(...textColor)
  doc.text("Receipt #:", pageWidth - 78, yPos + 8)
  doc.text(data.receiptNumber, pageWidth - 16, yPos + 8, { align: "right" })
  doc.text("Purchase #:", pageWidth - 78, yPos + 16)
  doc.text(data.purchaseNumber, pageWidth - 16, yPos + 16, { align: "right" })
  doc.text("Date:", pageWidth - 78, yPos + 24)
  doc.text(`${data.paymentDate} ${data.paymentTime}`, pageWidth - 16, yPos + 24, { align: "right" })
  
  // Customer info
  doc.setFontSize(11)
  doc.setTextColor(...primaryColor)
  doc.text("Received From:", 14, yPos + 5)
  
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text(data.customerName, 14, yPos + 12)
  doc.text(data.customerPhone, 14, yPos + 18)
  if (data.customerEmail) {
    doc.text(data.customerEmail, 14, yPos + 24)
  }
  
  yPos += 45
  
  // Payment amount highlight
  doc.setFillColor(...primaryColor)
  doc.roundedRect(14, yPos, pageWidth - 28, 30, 3, 3, "F")
  
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text("Payment Received", pageWidth / 2, yPos + 10, { align: "center" })
  doc.setFontSize(24)
  doc.text(formatCurrency(data.paymentAmount), pageWidth / 2, yPos + 24, { align: "center" })
  
  yPos += 40
  
  // Payment details table
  const paymentDetails = [
    ["Payment Method:", data.paymentMethod],
    ["Reference:", data.reference || "N/A"],
    ["Collected By:", data.collectorName || "N/A"],
  ]
  
  if (data.notes) {
    paymentDetails.push(["Notes:", data.notes])
  }
  
  autoTable(doc, {
    startY: yPos,
    body: paymentDetails,
    theme: "plain",
    bodyStyles: {
      fontSize: 10,
      textColor: textColor,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: 120 },
    },
    margin: { left: 14, right: 14 },
  })
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPos = (doc as any).lastAutoTable.finalY + 15
  
  // Balance summary
  doc.setFillColor(245, 247, 250)
  doc.rect(14, yPos, pageWidth - 28, 50, "F")
  
  doc.setFontSize(11)
  doc.setTextColor(...primaryColor)
  doc.text("Account Summary", 20, yPos + 10)
  
  doc.setFontSize(9)
  doc.setTextColor(...textColor)
  
  const balanceSummary = [
    ["Total Purchase Amount:", formatCurrency(data.totalPurchaseAmount)],
    ["Previous Balance:", formatCurrency(data.previousBalance)],
    ["This Payment:", formatCurrency(data.paymentAmount)],
    ["Total Amount Paid:", formatCurrency(data.totalAmountPaid)],
    ["Remaining Balance:", formatCurrency(data.newBalance)],
  ]
  
  let balanceY = yPos + 18
  balanceSummary.forEach(([label, value]) => {
    doc.text(label, 20, balanceY)
    doc.text(value, pageWidth - 20, balanceY, { align: "right" })
    balanceY += 6
  })
  
  yPos += 55
  
  // Fully paid badge
  if (data.isFullyPaid) {
    doc.setFillColor(39, 174, 96)
    doc.roundedRect(pageWidth / 2 - 40, yPos, 80, 20, 3, 3, "F")
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text("FULLY PAID", pageWidth / 2, yPos + 13, { align: "center" })
    yPos += 30
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setDrawColor(...lightGray)
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5)
  
  doc.setFontSize(8)
  doc.setTextColor(...lightGray)
  doc.text("Thank you for your payment!", pageWidth / 2, footerY, { align: "center" })
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: "center" })
  
  return doc.output("datauristring")
}

/**
 * Generate pending payment message content (no PDF, just formatted text)
 */
export function generatePendingPaymentMessage(data: PendingPaymentData): string {
  return `
📋 **Payment Pending Confirmation**

Your payment is being processed and awaiting confirmation.

**Payment Details:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Amount: ${formatCurrency(data.paymentAmount)}
• Payment Method: ${data.paymentMethod}
${data.reference ? `• Reference: ${data.reference}` : ""}
${data.collectorName ? `• Collected By: ${data.collectorName}` : ""}

**Purchase:** ${data.purchaseNumber}
**Date:** ${data.paymentDate} at ${data.paymentTime}
${data.notes ? `\n**Notes:** ${data.notes}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ **Status: PENDING CONFIRMATION**

You will receive a receipt once your payment has been confirmed by the shop.

If you have any questions, please contact ${data.shopName}.
`.trim()
}

/**
 * Format currency (GHS)
 */
function formatCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
