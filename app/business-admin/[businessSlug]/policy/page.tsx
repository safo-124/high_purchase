import { requireBusinessAdmin } from "../../../../lib/auth"
import { getBusinessPolicy } from "../../actions"
import Link from "next/link"
import { PolicyForm } from "./policy-form"

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const { user, business } = await requireBusinessAdmin(businessSlug)

  // Get current policy
  const policy = await getBusinessPolicy(businessSlug)

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href={`/business-admin/${businessSlug}`} className="text-slate-400 hover:text-white transition-colors">
          Dashboard
        </Link>
        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-white">BNPL Policy</span>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">BNPL Policy</h2>
            <p className="text-slate-400">Configure Buy Now Pay Later terms for all shops</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-cyan-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-cyan-300 font-medium">Business-Wide Policy</p>
            <p className="text-sm text-slate-400 mt-1">
              This policy applies to all shops under your business. Cash sales do not require a policy - only CREDIT and LAYAWAY purchases use these settings.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Form Card */}
      <div className="glass-card p-6">
        <PolicyForm businessSlug={businessSlug} initialPolicy={policy} />
      </div>

      {/* Help Section */}
      <div className="mt-8 glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Policy Guide</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">Interest Type:</strong> Choose between a one-time flat rate applied to the total, or monthly compounding interest.
              </p>
              <p>
                <strong className="text-slate-300">Grace Period:</strong> Number of days before interest or late fees start applying after the due date.
              </p>
              <p>
                <strong className="text-slate-300">Max Tenor:</strong> Maximum number of days a customer can take to repay their purchase.
              </p>
              <p>
                <strong className="text-slate-300">Late Fees:</strong> Optional fees applied when payments are overdue. Can be a fixed amount, a percentage, or both.
              </p>
              <p>
                <strong className="text-green-400">Cash Sales:</strong> Cash purchases do not use this policy - they are paid in full at the time of sale.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
