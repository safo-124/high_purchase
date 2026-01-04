"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  sendMessageToCustomer, 
  sendBulkMessage,
  MessageData, 
  CustomerSummary 
} from "../../actions"
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Users,
  User,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Filter
} from "lucide-react"
import { toast } from "sonner"

interface MessagesContentProps {
  shopSlug: string
  customers: CustomerSummary[]
  messages: MessageData[]
}

export function MessagesContent({ shopSlug, customers, messages }: MessagesContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose")
  const [messageType, setMessageType] = useState<"EMAIL" | "SMS" | "IN_APP">("EMAIL")
  const [recipientMode, setRecipientMode] = useState<"single" | "bulk">("single")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([])
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "EMAIL" | "SMS" | "IN_APP">("ALL")

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      SENT: { bg: "bg-blue-500/20 text-blue-400", icon: <CheckCircle className="w-3 h-3" /> },
      DELIVERED: { bg: "bg-green-500/20 text-green-400", icon: <CheckCircle className="w-3 h-3" /> },
      READ: { bg: "bg-emerald-500/20 text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
      PENDING: { bg: "bg-amber-500/20 text-amber-400", icon: <Clock className="w-3 h-3" /> },
      FAILED: { bg: "bg-red-500/20 text-red-400", icon: <XCircle className="w-3 h-3" /> },
    }
    return styles[status] || styles.PENDING
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      EMAIL: <Mail className="w-4 h-4" />,
      SMS: <Smartphone className="w-4 h-4" />,
      IN_APP: <MessageSquare className="w-4 h-4" />,
    }
    return icons[type] || <MessageSquare className="w-4 h-4" />
  }

  const filteredCustomers = customers.filter(c => 
    c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  const filteredMessages = historyFilter === "ALL" 
    ? messages 
    : messages.filter(m => m.type === historyFilter)

  const handleSingleSend = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer")
      return
    }
    if (!body.trim()) {
      toast.error("Please enter a message")
      return
    }
    if (messageType === "EMAIL" && !subject.trim()) {
      toast.error("Please enter a subject for email")
      return
    }

    setSending(true)
    try {
      const result = await sendMessageToCustomer(shopSlug, {
        customerId: selectedCustomerId,
        type: messageType,
        subject: subject.trim() || undefined,
        body: body.trim(),
      })

      if (result.success) {
        toast.success(`${messageType} sent successfully!`)
        setSubject("")
        setBody("")
        setSelectedCustomerId("")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to send message")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSending(false)
    }
  }

  const handleBulkSend = async () => {
    if (selectedCustomerIds.length === 0) {
      toast.error("Please select at least one customer")
      return
    }
    if (!body.trim()) {
      toast.error("Please enter a message")
      return
    }
    if (messageType === "EMAIL" && !subject.trim()) {
      toast.error("Please enter a subject for email")
      return
    }

    setSending(true)
    try {
      const result = await sendBulkMessage(
        shopSlug, 
        selectedCustomerIds,
        {
          type: messageType,
          subject: subject.trim() || undefined,
          body: body.trim(),
        }
      )

      if (result.success && result.data) {
        const data = result.data as { sentCount: number }
        toast.success(`Messages sent to ${data.sentCount} customers!`)
        setSubject("")
        setBody("")
        setSelectedCustomerIds([])
        router.refresh()
      } else {
        toast.error(result.error || "Failed to send messages")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSending(false)
    }
  }

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const selectAllCustomers = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([])
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Messages</h2>
        <p className="text-slate-400 mt-1">Send emails, SMS, and in-app messages to customers</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-4">
        <button
          onClick={() => setActiveTab("compose")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "compose"
              ? "bg-indigo-500/20 text-indigo-400"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          <Send className="w-4 h-4" />
          Compose
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "history"
              ? "bg-indigo-500/20 text-indigo-400"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          History
          {messages.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "compose" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Customer Selection */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Select Recipients
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRecipientMode("single")}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      recipientMode === "single"
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-700/50 text-slate-400 hover:text-white"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => setRecipientMode("bulk")}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      recipientMode === "bulk"
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-700/50 text-slate-400 hover:text-white"
                    }`}
                  >
                    Bulk
                  </button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 max-h-[400px] overflow-y-auto">
              {recipientMode === "bulk" && (
                <button
                  onClick={selectAllCustomers}
                  className="w-full mb-3 px-3 py-2 bg-slate-700/50 text-slate-300 hover:text-white rounded-lg text-sm transition-colors"
                >
                  {selectedCustomerIds.length === filteredCustomers.length
                    ? "Deselect All"
                    : `Select All (${filteredCustomers.length})`
                  }
                </button>
              )}
              
              <div className="space-y-2">
                {filteredCustomers.map((customer) => {
                  const isSelected = recipientMode === "single"
                    ? selectedCustomerId === customer.id
                    : selectedCustomerIds.includes(customer.id)

                  return (
                    <button
                      key={customer.id}
                      onClick={() => {
                        if (recipientMode === "single") {
                          setSelectedCustomerId(customer.id)
                        } else {
                          toggleCustomerSelection(customer.id)
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                        isSelected
                          ? "bg-indigo-500/20 border border-indigo-500/30"
                          : "bg-slate-800/30 border border-transparent hover:border-slate-600"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-indigo-500/30" : "bg-slate-700"
                      }`}>
                        <User className={`w-5 h-5 ${isSelected ? "text-indigo-400" : "text-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-slate-400">{customer.phone}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Compose Message */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                Compose Message
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Message Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "EMAIL", icon: Mail, label: "Email" },
                    { value: "SMS", icon: Smartphone, label: "SMS" },
                    { value: "IN_APP", icon: MessageSquare, label: "In-App" },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setMessageType(value as typeof messageType)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        messageType === value
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-700/50 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* In-App Notice */}
              {messageType === "IN_APP" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    In-app messages only work for customers with portal accounts.
                  </p>
                </div>
              )}

              {/* Subject (for email) */}
              {messageType === "EMAIL" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {messageType === "SMS" && (
                  <p className="text-xs text-slate-500 mt-1">
                    {body.length}/160 characters
                  </p>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={recipientMode === "single" ? handleSingleSend : handleBulkSend}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send {messageType} 
                    {recipientMode === "bulk" && selectedCustomerIds.length > 0 && 
                      ` to ${selectedCustomerIds.length} customers`
                    }
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Message History */
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="font-semibold text-white">Message History</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)}
                className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Types</option>
                <option value="EMAIL" className="bg-slate-900 text-white">Emails</option>
                <option value="SMS" className="bg-slate-900 text-white">SMS</option>
                <option value="IN_APP" className="bg-slate-900 text-white">In-App</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {filteredMessages.length > 0 ? (
              <div className="space-y-3">
                {filteredMessages.map((message) => {
                  const statusStyle = getStatusBadge(message.status)
                  return (
                    <div 
                      key={message.id}
                      className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center shrink-0">
                          {getTypeIcon(message.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-slate-400">To:</span>
                            <span className="font-medium text-white">
                              {message.customerName}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${statusStyle.bg}`}>
                              {statusStyle.icon}
                              {message.status}
                            </span>
                          </div>
                          {message.subject && (
                            <p className="text-sm font-medium text-slate-300 mb-1">
                              {message.subject}
                            </p>
                          )}
                          <p className="text-sm text-slate-400 line-clamp-2">{message.body}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            Sent {formatDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No messages sent yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
