import { requireAccountant } from "../../../../lib/auth"

export default async function ExportsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const { membership } = await requireAccountant(businessSlug)

  if (!membership.canExportData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">You don&apos;t have permission to export data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Export Data</h1>
        <p className="text-slate-400">Download financial data and reports as CSV files</p>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Payments Export */}
        <ExportCard
          title="Payments"
          description="Export all payment records including customer details, amounts, and payment methods"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          href={`/accountant/${businessSlug}/payments`}
          hrefLabel="Go to Payments to Export"
        />

        {/* Customers Export */}
        <ExportCard
          title="Customers"
          description="Export customer information with purchase history and outstanding balances"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          href={`/accountant/${businessSlug}/customers`}
          hrefLabel="Go to Customers to Export"
        />

        {/* Aging Report Export */}
        <ExportCard
          title="Aging Report"
          description="Export accounts receivable aging breakdown by customer and date bucket"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          href={`/accountant/${businessSlug}/aging`}
          hrefLabel="Go to Aging Report to Export"
        />
      </div>

      {/* Instructions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">How to Export</h2>
        <ol className="list-decimal list-inside space-y-3 text-slate-300">
          <li>Navigate to the report page you want to export</li>
          <li>Apply any filters to narrow down the data (optional)</li>
          <li>Click the &quot;Export CSV&quot; button in the top right</li>
          <li>The CSV file will download automatically to your device</li>
        </ol>
        <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-emerald-400 font-medium text-sm">Tip</p>
              <p className="text-slate-400 text-sm mt-1">
                CSV files can be opened in Microsoft Excel, Google Sheets, or any spreadsheet application for further analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExportCard({
  title,
  description,
  icon,
  href,
  hrefLabel,
}: {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  hrefLabel: string
}) {
  return (
    <div className="glass-card p-6 flex flex-col">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm flex-1 mb-4">{description}</p>
      <a
        href={href}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
      >
        <span>{hrefLabel}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </a>
    </div>
  )
}
