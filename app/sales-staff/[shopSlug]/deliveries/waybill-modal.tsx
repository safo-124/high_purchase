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
              color: #111;
            }
            * { box-sizing: border-box; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-2xl { font-size: 24px; }
            .text-xl { font-size: 20px; }
            .text-lg { font-size: 18px; }
            .text-base { font-size: 16px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .uppercase { text-transform: uppercase; }
            .text-gray-900 { color: #111; }
            .text-gray-700 { color: #374151; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-500 { color: #6b7280; }
            .border-gray-900 { border-color: #111; }
            .border-gray-400 { border-color: #9ca3af; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
            .border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
            .border-t { border-top-width: 1px; border-top-style: solid; }
            .border { border-width: 1px; border-style: solid; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .gap-4 { gap: 16px; }
            .gap-10 { gap: 40px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-5 { margin-bottom: 20px; }
            .mt-3 { margin-top: 12px; }
            .mt-4 { margin-top: 16px; }
            .mt-8 { margin-top: 32px; }
            .mt-10 { margin-top: 40px; }
            .pb-1 { padding-bottom: 4px; }
            .pb-5 { padding-bottom: 20px; }
            .pt-2 { padding-top: 8px; }
            .pt-5 { padding-top: 20px; }
            .p-2 { padding: 8px; }
            .h-8 { height: 32px; }
            .h-16 { height: 64px; }
            .w-full { width: 100%; }
            .col-span-2 { grid-column: span 2; }
            .block { display: block; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 8px; }
            th { background: #f3f4f6; font-size: 12px; text-transform: uppercase; font-weight: 600; }
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
            <div ref={printRef} className="text-gray-900">
              {/* Header */}
              <div className="text-center border-b-2 border-gray-900 pb-5 mb-5">
                <div className="text-2xl font-bold text-gray-900">{waybill.businessName}</div>
                <div className="text-base text-gray-600">{waybill.shopName}</div>
                <div className="text-lg font-semibold text-gray-700 mt-3">WAYBILL</div>
                <div className="text-sm text-gray-500">#{waybill.waybillNumber}</div>
              </div>

              {/* Order Info */}
              <div className="mb-5">
                <div className="text-xs font-bold uppercase text-gray-600 border-b border-gray-200 pb-1 mb-3">Order Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase block">Purchase Number</label>
                    <span className="text-sm font-medium text-gray-900">{waybill.purchaseNumber}</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase block">Date Generated</label>
                    <span className="text-sm font-medium text-gray-900">{new Date(waybill.generatedAt).toLocaleDateString()}</span>
                  </div>
                  {waybill.generatedByName && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase block">Generated By</label>
                      <span className="text-sm font-medium text-gray-900">{waybill.generatedByName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Info */}
              <div className="mb-5">
                <div className="text-xs font-bold uppercase text-gray-600 border-b border-gray-200 pb-1 mb-3">Recipient Details</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase block">Name</label>
                    <span className="text-sm font-medium text-gray-900">{waybill.recipientName}</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase block">Phone</label>
                    <span className="text-sm font-medium text-gray-900">{waybill.recipientPhone}</span>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 uppercase block">Delivery Address</label>
                    <span className="text-sm font-medium text-gray-900">
                      {waybill.deliveryAddress}
                      {waybill.deliveryCity && `, ${waybill.deliveryCity}`}
                      {waybill.deliveryRegion && `, ${waybill.deliveryRegion}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mb-5">
                <div className="text-xs font-bold uppercase text-gray-600 border-b border-gray-200 pb-1 mb-3">Items</div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left text-xs uppercase font-semibold text-gray-700">Item</th>
                      <th className="border border-gray-300 p-2 text-center text-xs uppercase font-semibold text-gray-700">Qty</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-gray-700">Unit Price</th>
                      <th className="border border-gray-300 p-2 text-right text-xs uppercase font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waybill.items.map((item, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 p-2 text-gray-900">{item.productName}</td>
                        <td className="border border-gray-300 p-2 text-center text-gray-900">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">GHS {item.unitPrice.toLocaleString()}</td>
                        <td className="border border-gray-300 p-2 text-right text-gray-900">GHS {(item.unitPrice * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={3} className="border border-gray-300 p-2 text-gray-900">Subtotal</td>
                      <td className="border border-gray-300 p-2 text-right text-gray-900">GHS {waybill.subtotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Special Instructions */}
              {waybill.specialInstructions && (
                <div className="mb-5">
                  <div className="text-xs font-bold uppercase text-gray-600 border-b border-gray-200 pb-1 mb-3">Special Instructions</div>
                  <p className="text-sm text-gray-900">{waybill.specialInstructions}</p>
                </div>
              )}

              {/* Signature Section */}
              <div className="mt-10">
                <div className="text-xs font-bold uppercase text-gray-600 border-b border-gray-200 pb-1 mb-5">Authorization & Receipt</div>
                
                <div className="grid grid-cols-2 gap-10">
                  {/* Sales Staff Signature */}
                  <div>
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 uppercase block">Sales Staff</label>
                      <span className="text-sm font-medium text-gray-900">{waybill.generatedByName || "-"}</span>
                    </div>
                    <div className="h-16 border-b-2 border-gray-400 mb-2"></div>
                    <div className="text-xs text-gray-600 text-center">Signature</div>
                    <div className="h-8 border-b border-gray-300 mt-4 mb-1"></div>
                    <div className="text-xs text-gray-600 text-center">Date</div>
                  </div>

                  {/* Shop Admin Signature */}
                  <div>
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 uppercase block">Authorized By (Shop Admin)</label>
                      <span className="text-sm font-medium text-gray-900">_____________________</span>
                    </div>
                    <div className="h-16 border-b-2 border-gray-400 mb-2"></div>
                    <div className="text-xs text-gray-600 text-center">Signature</div>
                    <div className="h-8 border-b border-gray-300 mt-4 mb-1"></div>
                    <div className="text-xs text-gray-600 text-center">Date</div>
                  </div>
                </div>

                {/* Delivery Person & Receiver */}
                <div className="grid grid-cols-2 gap-10 mt-8">
                  {/* Delivery Person */}
                  <div>
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 uppercase block">Delivered By</label>
                      <span className="text-sm font-medium text-gray-900">_____________________</span>
                    </div>
                    <div className="h-16 border-b-2 border-gray-400 mb-2"></div>
                    <div className="text-xs text-gray-600 text-center">Signature</div>
                    <div className="h-8 border-b border-gray-300 mt-4 mb-1"></div>
                    <div className="text-xs text-gray-600 text-center">Date</div>
                  </div>

                  {/* Receiver */}
                  <div>
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 uppercase block">Received By</label>
                      <span className="text-sm font-medium text-gray-900">{waybill.receivedBy || "_____________________"}</span>
                    </div>
                    <div className="h-16 border-b-2 border-gray-400 mb-2"></div>
                    <div className="text-xs text-gray-600 text-center">Signature</div>
                    <div className="h-8 border-b border-gray-300 mt-4 mb-1"></div>
                    <div className="text-xs text-gray-600 text-center">Date</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 text-center text-xs text-gray-500 border-t border-gray-200 pt-5">
                <p>Thank you for shopping with {waybill.businessName}!</p>
                <p>For inquiries, please contact your sales representative.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
