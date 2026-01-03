"use client"

import { useEffect, useState, useRef } from "react"
import { getWaybill, WaybillData } from "../../actions"

interface WaybillModalProps {
  shopSlug: string
  purchaseId: string
  onClose: () => void
}

export function WaybillModal({ shopSlug, purchaseId, onClose }: WaybillModalProps) {
  const [waybill, setWaybill] = useState<WaybillData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadWaybill() {
      try {
        const data = await getWaybill(shopSlug, purchaseId)
        setWaybill(data)
      } catch (error) {
        console.error("Failed to load waybill:", error)
      } finally {
        setLoading(false)
      }
    }
    loadWaybill()
  }, [shopSlug, purchaseId])

  function handlePrint() {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Waybill - ${waybill?.waybillNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .waybill-number {
              font-size: 18px;
              color: #666;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 10px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .info-item label {
              font-size: 12px;
              color: #888;
              display: block;
            }
            .info-item span {
              font-size: 14px;
              font-weight: 500;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 8px 12px;
              text-align: left;
            }
            .items-table th {
              background: #f5f5f5;
              font-size: 12px;
              text-transform: uppercase;
            }
            .total-row {
              font-weight: bold;
              background: #f5f5f5;
            }
            .signature-section {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-box {
              border-top: 1px solid #000;
              padding-top: 10px;
              text-align: center;
            }
            .signature-label {
              font-size: 12px;
              color: #666;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #888;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !waybill ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Waybill not found</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Actions */}
            <div className="flex items-center justify-between mb-6 no-print">
              <h2 className="text-xl font-bold text-gray-900">Waybill</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Waybill Content */}
            <div ref={printRef}>
              {/* Header */}
              <div className="header">
                <div className="title">HIGH PURCHASE</div>
                <div className="waybill-number">Waybill #{waybill.waybillNumber}</div>
              </div>

              {/* Order Info */}
              <div className="section">
                <div className="section-title">Order Information</div>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Purchase Number</label>
                    <span>{waybill.purchaseNumber}</span>
                  </div>
                  <div className="info-item">
                    <label>Date Generated</label>
                    <span>{new Date(waybill.generatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Info */}
              <div className="section">
                <div className="section-title">Recipient Details</div>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Name</label>
                    <span>{waybill.recipientName}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <span>{waybill.recipientPhone}</span>
                  </div>
                  <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                    <label>Delivery Address</label>
                    <span>
                      {waybill.deliveryAddress}
                      {waybill.deliveryCity && `, ${waybill.deliveryCity}`}
                      {waybill.deliveryRegion && `, ${waybill.deliveryRegion}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="section">
                <div className="section-title">Items</div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: "center" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Unit Price</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waybill.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.productName}</td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>GHS {item.unitPrice.toLocaleString()}</td>
                        <td style={{ textAlign: "right" }}>GHS {(item.unitPrice * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={3}>Subtotal</td>
                      <td style={{ textAlign: "right" }}>GHS {waybill.subtotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Special Instructions */}
              {waybill.specialInstructions && (
                <div className="section">
                  <div className="section-title">Special Instructions</div>
                  <p style={{ fontSize: "14px" }}>{waybill.specialInstructions}</p>
                </div>
              )}

              {/* Signature Section */}
              <div className="signature-section">
                <div>
                  <div className="signature-box">
                    <div className="signature-label">Delivered By (Signature & Date)</div>
                  </div>
                </div>
                <div>
                  <div className="signature-box">
                    <div className="signature-label">Received By (Signature & Date)</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="footer">
                <p>Thank you for shopping with High Purchase!</p>
                <p>For inquiries, please contact your sales representative.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
