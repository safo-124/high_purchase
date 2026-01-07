import { EmailLogData } from "../../email-actions"
import { EmailStatus } from "../../../generated/prisma/client"

interface EmailLogsListProps {
  logs: EmailLogData[]
  businessSlug: string
}

function getStatusColor(status: EmailStatus) {
  switch (status) {
    case "SENT":
      return "bg-green-500/20 text-green-400"
    case "PENDING":
      return "bg-orange-500/20 text-orange-400"
    case "FAILED":
      return "bg-red-500/20 text-red-400"
    case "BOUNCED":
      return "bg-purple-500/20 text-purple-400"
    default:
      return "bg-slate-500/20 text-slate-400"
  }
}

function getStatusLabel(status: EmailStatus) {
  switch (status) {
    case "SENT":
      return "Sent"
    case "PENDING":
      return "Sending"
    case "FAILED":
      return "Failed"
    case "BOUNCED":
      return "Bounced"
    default:
      return status
  }
}

export function EmailLogsList({ logs, businessSlug }: EmailLogsListProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Recent Emails
      </h3>

      {logs.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-xl bg-slate-500/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-400">No emails sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-white truncate flex-1">
                  {log.subject}
                </p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                  {getStatusLabel(log.status)}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{log.recipientCount} recipient{log.recipientCount !== 1 ? "s" : ""}</span>
                <span>
                  {new Date(log.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
