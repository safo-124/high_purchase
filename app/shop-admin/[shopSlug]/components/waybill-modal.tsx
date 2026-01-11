"use client"

import { useEffect, useState, useRef } from "react"
import { getWaybillByPurchaseId, WaybillDetailData } from "../../actions"
import { Truck, Printer, X } from "lucide-react"

interface WaybillModalProps {
  shopSlug: string
  purchaseId: string
  onClose: () => void
}

export function WaybillModal({ shopSlug, purchaseId, onClose }: WaybillModalProps) {
  const [waybill, setWaybill] = useState<WaybillDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadWaybill() {
      try {
        const data = await getWaybillByPurchaseId(shopSlug, purchaseId)
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
              color: #111;
            }
            * { box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .business-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .shop-name { font-size: 14px; color: #666; }
            .waybill-title { font-size: 20px; font-weight: bold; margin-top: 15px; letter-spacing: 2px; }
            .waybill-number { font-size: 14px; color: #666; margin-top: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .info-label { color: #666; }
            .info-value { font-weight: 500; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .items-table th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; }
            .items-table .number { text-align: right; }
            .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
            .signature-box { border-top: 1px solid #000; padding-top: 10px; margin-top: 40px; }
            .signature-label { font-size: 12px; color: #666; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
            @media print { body { padding: 0; } }
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

  const formatCurrency = (amount: number) => {
    return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !waybill ? (
          <div className="text-center py-20">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Waybill not found</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Actions */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-600" />
                Waybill / Delivery Note
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div ref={printRef} className="text-gray-900">
              {/* Header */}
              <div className="header text-center border-b-2 border-black pb-4 mb-5">
                <div className="business-name text-2xl font-bold">{waybill.businessName}</div>
                <div className="shop-name text-sm text-gray-600">{waybill.shopName}</div>
                <div className="waybill-title text-xl font-bold mt-4 tracking-widest">WAYBILL / DELIVERY NOTE</div>
                <div className="waybill-number text-gray-600">{waybill.waybillNumber}</div>
              </div>

              {/* Info Grid */}
              <div className="info-grid grid grid-cols-2 gap-5 mb-5">
                <div>
                  <div className="info-title text-xs font-bold uppercase text-gray-500 border-b border-gray-200 pb-1 mb-2">Delivery Details</div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Purchase #</span>
                    <span className="info-value font-medium">{waybill.purchaseNumber}</span>
                  </div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Date</span>
                    <span className="info-value font-medium">{formatDate(waybill.generatedAt)}</span>
                  </div>
                  {waybill.generatedByName && (
                    <div className="info-row flex justify-between py-1 text-sm">
                      <span className="info-label text-gray-500">Generated By</span>
                      <span className="info-value font-medium">{waybill.generatedByName}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="info-title text-xs font-bold uppercase text-gray-500 border-b border-gray-200 pb-1 mb-2">Recipient Details</div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Name</span>
                    <span className="info-value font-medium">{waybill.recipientName}</span>
                  </div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Phone</span>
                    <span className="info-value font-medium">{waybill.recipientPhone}</span>
                  </div>
                  <div className="info-row flex justify-between py-1 text-sm">
                    <span className="info-label text-gray-500">Address</span>
                    <span className="info-value font-medium text-right max-w-[200px]">
                      {waybill.deliveryAddress}
                      {waybill.deliveryCity && `, ${waybill.deliveryCity}`}
                      {waybill.deliveryRegion && `, ${waybill.deliveryRegion}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-5">
                <div className="text-xs font-bold uppercase text-gray-500 border-b border-gray-200 pb-1 mb-2">Items for Delivery</div>
                <table className="items-table w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left text-xs uppercase font-semibold">Item</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold">Qty</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold">Unit Price</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waybill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-2 text-sm">{item.productName}</td>
                        <td className="border border-gray-300 p-2 text-right text-sm">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                        <td className="border border-gray-300 p-2 text-right text-sm">{formatCurrency(item.unitPrice * item.quantity)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={3} className="border border-gray-300 p-2 text-right">Subtotal</td>
                      <td className="border border-gray-300 p-2 text-right">{formatCurrency(waybill.subtotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Special Instructions */}
              {waybill.specialInstructions && (
                <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-xs font-bold uppercase text-amber-700 mb-1">Special Instructions</div>
                  <p className="text-sm text-amber-800">{waybill.specialInstructions}</p>
                </div>
              )}

              {/* Signature Section */}
              <div className="signature-section grid grid-cols-2 gap-10 mt-10">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500 mb-2">Delivered By</div>
                  <div className="signature-box border-t border-black pt-2 mt-10">
                    <p className="text-xs text-gray-500">Signature & Date</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500 mb-2">Received By</div>
                  {waybill.receivedBy ? (
                    <p className="text-sm font-medium">{waybill.receivedBy}</p>
                  ) : (
                    <div className="signature-box border-t border-black pt-2 mt-10">
                      <p className="text-xs text-gray-500">Signature, Name & Date</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="footer mt-8 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                <p>Please verify all items before signing</p>
                <p className="mt-1 text-gray-400">Generated on {new Date().toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
