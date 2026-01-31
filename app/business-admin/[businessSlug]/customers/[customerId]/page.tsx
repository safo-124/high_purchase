import { notFound } from "next/navigation"
import Link from "next/link"
import { getBusinessCustomerDetails } from "../../../actions"

interface Props {
  params: Promise<{ businessSlug: string; customerId: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { businessSlug, customerId } = await params
  const customer = await getBusinessCustomerDetails(businessSlug, customerId)

  if (!customer) {
    notFound()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date))
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  return (
    <div className="p-8">
      {/* Back Button & Header */}
      <div className="mb-8">
        <Link
          href={`/business-admin/${businessSlug}/customers`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Customers
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-cyan-300">
                {customer.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{customer.fullName}</h1>
              <p className="text-slate-400">{customer.phone}</p>
              {customer.email && <p className="text-slate-500 text-sm">{customer.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              customer.outstanding <= 0
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : customer.activePurchases > 0
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
            }`}>
              {customer.outstanding <= 0 ? "Cleared" : customer.activePurchases > 0 ? "Active HP" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Info & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Customer Details Card */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Customer Info</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Shop</p>
              <p className="text-white">{customer.shopName}</p>
            </div>
            {customer.assignedCollectorName && (
              <div>
                <p className="text-xs text-slate-500">Assigned Collector</p>
                <p className="text-cyan-400">{customer.assignedCollectorName}</p>
              </div>
            )}
            {(customer.address || customer.city || customer.region) && (
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-white text-sm">
                  {[customer.address, customer.city, customer.region].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
            {customer.idType && customer.idNumber && (
              <div>
                <p className="text-xs text-slate-500">{customer.idType}</p>
                <p className="text-white text-sm">{customer.idNumber}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Customer Since</p>
              <p className="text-white text-sm">{formatDate(customer.createdAt)}</p>
            </div>
            {customer.hasAccount && (
              <div>
                <p className="text-xs text-slate-500">Portal Account</p>
                <p className="text-green-400 text-sm">{customer.accountEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Purchased</p>
          <p className="text-3xl font-bold text-blue-400">{formatCurrency(customer.totalPurchased)}</p>
          <p className="text-sm text-slate-500 mt-1">{customer.totalPurchases} purchase(s)</p>
        </div>
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Total Paid</p>
          <p className="text-3xl font-bold text-green-400">{formatCurrency(customer.totalPaid)}</p>
          <p className="text-sm text-slate-500 mt-1">
            {customer.totalPurchased > 0 
              ? `${Math.round((customer.totalPaid / customer.totalPurchased) * 100)}% collected`
              : "No purchases"
            }
          </p>
        </div>
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Outstanding</p>
          <p className={`text-3xl font-bold ${customer.outstanding > 0 ? "text-amber-400" : "text-green-400"}`}>
            {formatCurrency(customer.outstanding)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {customer.activePurchases} active purchase(s)
          </p>
        </div>
      </div>

      {/* Purchases List */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Purchase History</h2>
        
        {customer.purchases.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No Purchases Yet</h3>
            <p className="text-slate-400">This customer hasn&apos;t made any purchases.</p>
          </div>
        ) : (
          customer.purchases.map((purchase) => (
            <div key={purchase.id} className="glass-card rounded-2xl overflow-hidden">
              {/* Purchase Header */}
              <div className={`p-6 border-b border-white/5 ${
                purchase.status === "COMPLETED" 
                  ? "bg-green-500/5" 
                  : purchase.isOverdue 
                  ? "bg-red-500/5" 
                  : "bg-white/[0.02]"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      purchase.status === "COMPLETED"
                        ? "bg-green-500/20 border border-green-500/30"
                        : purchase.isOverdue
                        ? "bg-red-500/20 border border-red-500/30"
                        : "bg-cyan-500/20 border border-cyan-500/30"
                    }`}>
                      <svg className={`w-6 h-6 ${
                        purchase.status === "COMPLETED" ? "text-green-400" : purchase.isOverdue ? "text-red-400" : "text-cyan-400"
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{purchase.purchaseNumber}</h3>
                      <p className="text-sm text-slate-400">{formatDate(purchase.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      purchase.purchaseType === "CASH"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : purchase.purchaseType === "LAYAWAY"
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {purchase.purchaseType}
                    </span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      purchase.status === "COMPLETED"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : purchase.isOverdue
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : purchase.status === "ACTIVE"
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}>
                      {purchase.isOverdue ? "OVERDUE" : purchase.status}
                    </span>
                  </div>
                </div>
                
                {/* Purchase Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs text-slate-500">Subtotal</p>
                    <p className="text-white font-medium">{formatCurrency(purchase.subtotal)}</p>
                  </div>
                  {purchase.interestAmount > 0 && (
                    <div>
                      <p className="text-xs text-slate-500">Interest</p>
                      <p className="text-amber-400 font-medium">{formatCurrency(purchase.interestAmount)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-white font-bold">{formatCurrency(purchase.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="text-green-400 font-medium">{formatCurrency(purchase.amountPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Outstanding</p>
                    <p className={`font-bold ${purchase.outstandingBalance > 0 ? "text-amber-400" : "text-green-400"}`}>
                      {formatCurrency(purchase.outstandingBalance)}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Payment Progress</span>
                    <span className="text-white">{Math.round((purchase.amountPaid / purchase.totalAmount) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        purchase.status === "COMPLETED"
                          ? "bg-green-500"
                          : purchase.isOverdue
                          ? "bg-red-500"
                          : "bg-cyan-500"
                      }`}
                      style={{ width: `${Math.min(100, (purchase.amountPaid / purchase.totalAmount) * 100)}%` }}
                    />
                  </div>
                </div>

                {purchase.dueDate && purchase.status !== "COMPLETED" && (
                  <p className={`text-sm mt-2 ${purchase.isOverdue ? "text-red-400" : "text-slate-400"}`}>
                    Due: {formatDate(purchase.dueDate)}
                  </p>
                )}
              </div>

              {/* Purchase Items */}
              <div className="p-6 border-b border-white/5">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Items</h4>
                <div className="space-y-2">
                  {purchase.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.productName}</p>
                          {item.productSku && <p className="text-xs text-slate-500 font-mono">{item.productSku}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                        <p className="text-sm text-slate-400">{formatCurrency(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment History */}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Payment History ({purchase.payments.length})
                </h4>
                {purchase.payments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {purchase.payments.map((payment) => (
                      <div key={payment.id} className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                        payment.rejectedAt 
                          ? "bg-red-500/5 border border-red-500/10" 
                          : payment.isConfirmed 
                          ? "bg-green-500/5 border border-green-500/10" 
                          : "bg-amber-500/5 border border-amber-500/10"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            payment.rejectedAt 
                              ? "bg-red-500/20" 
                              : payment.isConfirmed 
                              ? "bg-green-500/20" 
                              : "bg-amber-500/20"
                          }`}>
                            {payment.rejectedAt ? (
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : payment.isConfirmed ? (
                              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{formatCurrency(payment.amount)}</p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(payment.paidAt || payment.createdAt)} • {payment.paymentMethod}
                            </p>
                            {payment.reference && (
                              <p className="text-xs text-slate-600">Ref: {payment.reference}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.rejectedAt 
                              ? "bg-red-500/10 text-red-400" 
                              : payment.isConfirmed 
                              ? "bg-green-500/10 text-green-400" 
                              : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {payment.rejectedAt ? "Rejected" : payment.isConfirmed ? "Confirmed" : "Pending"}
                          </span>
                          {payment.confirmedAt && (
                            <p className="text-xs text-slate-500 mt-1">
                              Confirmed: {formatDateTime(payment.confirmedAt)}
                            </p>
                          )}
                          {payment.rejectedAt && (
                            <p className="text-xs text-red-400 mt-1">
                              {payment.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
