"use client"

import { useState, useEffect, useRef, useCallback, useTransition } from "react"
import { 
  MessageCircle, Search, Send, User, Users, ChevronLeft, Check, CheckCheck, 
  Building2, Store, Shield, Briefcase, Truck, FileText, Download, Clock,
  Plus, Sparkles, MessagesSquare, UserCircle2, MoreVertical, Pencil, Trash2, X
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  getConversations,
  getConversationMessages,
  sendMessage,
  getAvailableContacts,
  getOrCreateConversation,
  markConversationAsRead,
  editMessage,
  deleteMessage,
  updateLastSeen,
  getParticipantOnlineStatus,
  type ConversationWithDetails,
  type MessageWithSender,
  type ContactInfo,
} from "@/lib/messaging-actions"
import type { Role } from "@/app/generated/prisma/client"

// ============================================================================
// ATTACHMENT PARSING
// ============================================================================

interface ParsedMessage {
  content: string
  attachment?: {
    type: "INVOICE_PDF" | "RECEIPT_PDF" | "PENDING_PAYMENT"
    data: string
  }
}

function parseMessageContent(content: string): ParsedMessage {
  const attachmentMatch = content.match(/\[ATTACHMENT:(\w+):(.+)\]$/)
  if (attachmentMatch) {
    return {
      content: content.replace(/\n\n\[ATTACHMENT:.+\]$/, "").trim(),
      attachment: {
        type: attachmentMatch[1] as "INVOICE_PDF" | "RECEIPT_PDF" | "PENDING_PAYMENT",
        data: attachmentMatch[2],
      },
    }
  }
  return { content }
}

function getAttachmentLabel(type: string): string {
  switch (type) {
    case "INVOICE_PDF":
      return "Invoice"
    case "RECEIPT_PDF":
      return "Receipt"
    case "PENDING_PAYMENT":
      return "Pending Payment"
    default:
      return "Attachment"
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRoleIcon(role: Role) {
  switch (role) {
    case "BUSINESS_ADMIN":
      return <Building2 className="h-3 w-3" />
    case "SHOP_ADMIN":
      return <Store className="h-3 w-3" />
    case "SALES_STAFF":
      return <Briefcase className="h-3 w-3" />
    case "DEBT_COLLECTOR":
      return <Truck className="h-3 w-3" />
    case "SUPER_ADMIN":
      return <Shield className="h-3 w-3" />
    default:
      return <User className="h-3 w-3" />
  }
}

function getRoleLabel(role: Role) {
  switch (role) {
    case "BUSINESS_ADMIN":
      return "Business Admin"
    case "SHOP_ADMIN":
      return "Shop Admin"
    case "SALES_STAFF":
      return "Sales Staff"
    case "DEBT_COLLECTOR":
      return "Collector"
    case "SUPER_ADMIN":
      return "Super Admin"
    default:
      return role
  }
}

function getRoleGradient(role: Role) {
  switch (role) {
    case "BUSINESS_ADMIN":
      return "from-violet-500 to-purple-600"
    case "SHOP_ADMIN":
      return "from-blue-500 to-indigo-600"
    case "SALES_STAFF":
      return "from-emerald-500 to-teal-600"
    case "DEBT_COLLECTOR":
      return "from-orange-500 to-amber-600"
    default:
      return "from-slate-500 to-gray-600"
  }
}

function getRoleBadgeStyle(role: Role) {
  switch (role) {
    case "BUSINESS_ADMIN":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
    case "SHOP_ADMIN":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    case "SALES_STAFF":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    case "DEBT_COLLECTOR":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatMessageTime(date: Date): string {
  const now = new Date()
  const messageDate = new Date(date)
  const diffMs = now.getTime() - messageDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Now"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return messageDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function formatFullTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function formatLastSeen(date: Date | null): string {
  if (!date) return "Offline"
  
  const now = new Date()
  const lastSeen = new Date(date)
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 5) return "Online"
  if (diffMins < 60) return `Last seen ${diffMins}m ago`
  if (diffHours < 24) return `Last seen ${diffHours}h ago`
  if (diffDays < 7) return `Last seen ${diffDays}d ago`
  return `Last seen ${lastSeen.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
}

function isOnline(lastSeenAt: Date | null): boolean {
  if (!lastSeenAt) return false
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  return new Date(lastSeenAt) > fiveMinutesAgo
}

function canModifyMessage(msg: MessageWithSender, currentUserId: string): { canEdit: boolean; canDelete: boolean } {
  // Check if user is the sender
  if (msg.sender?.id !== currentUserId) {
    return { canEdit: false, canDelete: false }
  }

  // Check if it's a system message
  if (msg.isSystemMessage) {
    return { canEdit: false, canDelete: false }
  }

  // Check if message has invoice/receipt attachment
  if (msg.content.includes("[ATTACHMENT:INVOICE_PDF:") || 
      msg.content.includes("[ATTACHMENT:RECEIPT_PDF:")) {
    return { canEdit: false, canDelete: false }
  }

  return { canEdit: true, canDelete: true }
}

// ============================================================================
// ONLINE STATUS INDICATOR
// ============================================================================

function OnlineIndicator({ className, online = true }: { className?: string; online?: boolean }) {
  if (!online) {
    return (
      <span className={cn("relative flex h-2.5 w-2.5", className)}>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />
      </span>
    )
  }
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  )
}

// ============================================================================
// CONTACT SELECTOR COMPONENT
// ============================================================================

interface ContactSelectorProps {
  businessId: string
  onSelectContact: (contact: ContactInfo) => void
  onClose: () => void
}

export function ContactSelector({ businessId, onSelectContact, onClose }: ContactSelectorProps) {
  const [contacts, setContacts] = useState<ContactInfo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"staff" | "customer">("staff")

  useEffect(() => {
    async function loadContacts() {
      setLoading(true)
      const result = await getAvailableContacts(businessId)
      if (result.success && result.data) {
        setContacts(result.data)
      }
      setLoading(false)
    }
    loadContacts()
  }, [businessId])

  const filteredContacts = contacts.filter((contact) => {
    if (contact.type !== activeTab) return false
    const searchLower = searchTerm.toLowerCase()
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.phone?.toLowerCase().includes(searchLower) ||
      contact.shopName?.toLowerCase().includes(searchLower)
    )
  })

  const staffCount = contacts.filter((c) => c.type === "staff").length
  const customerCount = contacts.filter((c) => c.type === "customer").length

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-950">
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">New Conversation</h2>
            <p className="text-xs text-muted-foreground">Choose who you want to message</p>
          </div>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or shop..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border-0 focus-visible:ring-2 focus-visible:ring-violet-500/50"
          />
        </div>
        
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab("staff")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              activeTab === "staff" 
                ? "bg-white dark:bg-slate-700 shadow-sm text-violet-600 dark:text-violet-400" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Users className="h-4 w-4" />
            Staff ({staffCount})
          </button>
          <button
            onClick={() => setActiveTab("customer")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              activeTab === "customer" 
                ? "bg-white dark:bg-slate-700 shadow-sm text-violet-600 dark:text-violet-400" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <UserCircle2 className="h-4 w-4" />
            Customers ({customerCount})
          </button>
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1 px-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground">No contacts found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filteredContacts.map((contact) => (
              <button
                key={`${contact.type}-${contact.id}`}
                onClick={() => onSelectContact(contact)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:shadow-md hover:shadow-violet-500/5 hover:border-violet-500/30 group"
              >
                <div className={cn(
                  "relative h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm shadow-lg",
                  contact.role ? getRoleGradient(contact.role) : "from-slate-400 to-slate-500"
                )}>
                  {getInitials(contact.name)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {contact.name}
                    </span>
                    {contact.role && (
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] px-1.5 py-0 h-5 border", getRoleBadgeStyle(contact.role))}
                      >
                        {getRoleIcon(contact.role)}
                        <span className="ml-1">{getRoleLabel(contact.role)}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.shopName && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="truncate flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {contact.shopName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center">
                    <Send className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// CONVERSATION LIST COMPONENT
// ============================================================================

interface ConversationListProps {
  businessId: string
  currentUserId: string
  selectedConversationId?: string | null
  onSelectConversation: (conversation: ConversationWithDetails) => void
  onNewMessage: () => void
  includeAllBusiness?: boolean
}

export function ConversationList({
  businessId,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  onNewMessage,
  includeAllBusiness = false,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    const result = await getConversations(businessId, { includeAllBusiness })
    if (result.success && result.data) {
      setConversations(result.data)
    }
    setLoading(false)
  }, [businessId, includeAllBusiness])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 10000)
    return () => clearInterval(interval)
  }, [loadConversations])

  const getConversationName = (conv: ConversationWithDetails): string => {
    if (conv.customer) {
      return `${conv.customer.firstName} ${conv.customer.lastName}`
    }
    if (conv.conversationType === "STAFF_TO_STAFF") {
      const otherParticipant =
        conv.participant1?.id === currentUserId ? conv.participant2 : conv.participant1
      return otherParticipant?.name || otherParticipant?.email || "Unknown"
    }
    return conv.participant1?.name || conv.participant1?.email || "Unknown"
  }

  const getConversationRole = (conv: ConversationWithDetails): Role | null => {
    if (conv.customer) return null
    if (conv.conversationType === "STAFF_TO_STAFF") {
      const otherParticipant =
        conv.participant1?.id === currentUserId ? conv.participant2 : conv.participant1
      return otherParticipant?.role || null
    }
    return conv.participant1?.role || null
  }

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv).toLowerCase()
    const shopName = conv.shop?.name.toLowerCase() || ""
    const search = searchTerm.toLowerCase()
    return name.includes(search) || shopName.includes(search)
  })

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-950">
      {/* Header */}
      <div className="px-3 py-3 sm:px-5 sm:py-5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <MessagesSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">Messages</h2>
              {totalUnread > 0 && (
                <p className="text-[11px] sm:text-xs text-violet-600 dark:text-violet-400 font-medium">
                  {totalUnread} unread
                </p>
              )}
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={onNewMessage}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 border-0 h-9 px-3"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 sm:h-11 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border-0 focus-visible:ring-2 focus-visible:ring-violet-500/50"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-5">
              <Sparkles className="h-10 w-10 text-violet-500" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              {searchTerm ? "No results found" : "Start a conversation"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              {searchTerm 
                ? "Try searching with different keywords" 
                : "Click the New button to send your first message"
              }
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {filteredConversations.map((conv) => {
              const name = getConversationName(conv)
              const role = getConversationRole(conv)
              const isSelected = selectedConversationId === conv.id
              const hasUnread = conv.unreadCount > 0

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
                    isSelected 
                      ? "bg-violet-500/10 dark:bg-violet-500/20 ring-1 ring-violet-500/30" 
                      : "hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                  )}
                >
                  <div className="relative">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg bg-gradient-to-br",
                      role ? getRoleGradient(role) : "from-slate-400 to-slate-500"
                    )}>
                      {getInitials(name)}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-rose-500/30">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "font-medium truncate text-slate-900 dark:text-white",
                          hasUnread && "font-semibold"
                        )}>
                          {name}
                        </span>
                        {role && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-5 border shrink-0",
                              getRoleBadgeStyle(role)
                            )}
                          >
                            {getRoleIcon(role)}
                          </Badge>
                        )}
                        {conv.customer && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0 h-5 shrink-0 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                          >
                            Customer
                          </Badge>
                        )}
                      </div>
                      {conv.lastMessageAt && (
                        <span className={cn(
                          "text-xs shrink-0",
                          hasUnread ? "text-violet-600 dark:text-violet-400 font-medium" : "text-muted-foreground"
                        )}>
                          {formatMessageTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    
                    {conv.lastMessagePreview && (
                      <p className={cn(
                        "text-sm truncate",
                        hasUnread 
                          ? "text-slate-700 dark:text-slate-300 font-medium" 
                          : "text-muted-foreground"
                      )}>
                        {conv.lastMessagePreview}
                      </p>
                    )}
                    
                    {conv.shop && includeAllBusiness && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{conv.shop.name}</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// MESSAGE THREAD COMPONENT
// ============================================================================

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  onBack: () => void
  conversationName: string
  conversationRole?: Role | null
  isCustomer?: boolean
}

export function MessageThread({
  conversationId,
  currentUserId,
  onBack,
  conversationName,
  conversationRole,
  isCustomer = false,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  
  // Delete state
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Online status
  const [participantOnline, setParticipantOnline] = useState(false)
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null)

  const loadMessages = useCallback(async () => {
    const result = await getConversationMessages(conversationId)
    if (result.success && result.data) {
      setMessages(result.data.messages)
    }
    setLoading(false)
  }, [conversationId])

  const loadOnlineStatus = useCallback(async () => {
    const result = await getParticipantOnlineStatus(conversationId, currentUserId)
    if (result.success && result.data) {
      setParticipantOnline(result.data.isOnline)
      setLastSeenAt(result.data.lastSeenAt)
    }
  }, [conversationId, currentUserId])

  useEffect(() => {
    loadMessages()
    loadOnlineStatus()
    markConversationAsRead(conversationId)
    updateLastSeen() // Update current user's last seen
    
    const messageInterval = setInterval(loadMessages, 5000)
    const statusInterval = setInterval(() => {
      loadOnlineStatus()
      updateLastSeen()
    }, 30000) // Update online status every 30 seconds
    
    return () => {
      clearInterval(messageInterval)
      clearInterval(statusInterval)
    }
  }, [conversationId, loadMessages, loadOnlineStatus])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage("")

    startTransition(async () => {
      const result = await sendMessage(conversationId, content)
      if (result.success && result.data) {
        setMessages((prev) => [...prev, result.data!])
      }
      setSending(false)
      textareaRef.current?.focus()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStartEdit = (msg: MessageWithSender) => {
    const parsed = parseMessageContent(msg.content)
    setEditingMessageId(msg.id)
    setEditContent(parsed.content)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent("")
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim() || editSaving) return

    setEditSaving(true)
    const result = await editMessage(editingMessageId, editContent.trim())
    if (result.success && result.data) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === editingMessageId ? result.data! : msg))
      )
    }
    setEditSaving(false)
    setEditingMessageId(null)
    setEditContent("")
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  const handleDeleteClick = (msgId: string) => {
    setDeleteMessageId(msgId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteMessageId) return

    const result = await deleteMessage(deleteMessageId)
    if (result.success) {
      setMessages((prev) => prev.filter((msg) => msg.id !== deleteMessageId))
    }
    setDeleteDialogOpen(false)
    setDeleteMessageId(null)
  }

  const isOwnMessage = (msg: MessageWithSender): boolean => {
    return msg.sender?.id === currentUserId
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: MessageWithSender[] }[] = []
  let currentDate = ""
  
  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt).toLocaleDateString("en-GB", { 
      weekday: "long", 
      day: "numeric", 
      month: "long" 
    })
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groupedMessages.push({ date: msgDate, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  })

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="md:hidden rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="relative">
          <div className={cn(
            "h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-lg bg-gradient-to-br",
            conversationRole ? getRoleGradient(conversationRole) : "from-slate-400 to-slate-500"
          )}>
            {getInitials(conversationName)}
          </div>
          <OnlineIndicator 
            online={participantOnline} 
            className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-slate-900" 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate">{conversationName}</h3>
            {conversationRole && (
              <Badge 
                variant="outline" 
                className={cn("text-[10px] px-1.5 py-0 h-5 border hidden sm:inline-flex", getRoleBadgeStyle(conversationRole))}
              >
                {getRoleIcon(conversationRole)}
                <span className="ml-1">{getRoleLabel(conversationRole)}</span>
              </Badge>
            )}
            {isCustomer && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
              >
                Customer
              </Badge>
            )}
          </div>
          <p className={cn(
            "text-[11px] sm:text-xs font-medium",
            participantOnline 
              ? "text-emerald-600 dark:text-emerald-400" 
              : "text-slate-500 dark:text-slate-400"
          )}>
            {formatLastSeen(lastSeenAt)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 sm:px-5" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-5">
              <MessageCircle className="h-10 w-10 text-violet-500" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                  <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                </div>
                
                {/* Messages */}
                <div className="space-y-4">
                  {group.messages.map((msg) => {
                    const isOwn = isOwnMessage(msg)
                    const senderName = msg.senderCustomer
                      ? `${msg.senderCustomer.firstName} ${msg.senderCustomer.lastName}`
                      : msg.sender?.name || msg.sender?.email || "Unknown"
                    const parsed = parseMessageContent(msg.content)
                    const { canEdit, canDelete } = canModifyMessage(msg, currentUserId)
                    const isEditing = editingMessageId === msg.id

                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-3 group/msg", isOwn ? "justify-end" : "justify-start")}
                      >
                        {!isOwn && (
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-white text-xs font-medium shrink-0 mt-1">
                            {getInitials(senderName)}
                          </div>
                        )}
                        
                        <div className={cn("max-w-[75%] space-y-1.5", isOwn && "items-end")}>
                          {!isOwn && (
                            <span className="text-xs text-muted-foreground font-medium px-1">{senderName}</span>
                          )}
                          
                          {isEditing ? (
                            // Edit Mode
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                className="min-h-[60px] max-h-[120px] resize-none rounded-xl text-sm"
                                autoFocus
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-8 px-3 text-xs"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={!editContent.trim() || editSaving}
                                  className="h-8 px-3 text-xs bg-violet-500 hover:bg-violet-600"
                                >
                                  {editSaving ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="relative group/bubble">
                              {/* Edit/Delete Menu */}
                              {isOwn && (canEdit || canDelete) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute -left-10 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {canEdit && (
                                      <DropdownMenuItem onClick={() => handleStartEdit(msg)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteClick(msg.id)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-3 shadow-sm",
                                  isOwn
                                    ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-br-md shadow-violet-500/20"
                                    : "bg-white dark:bg-slate-800 rounded-bl-md border border-slate-200/60 dark:border-slate-700/60"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{parsed.content}</p>
                                
                                {/* Edited indicator */}
                                {msg.isEdited && (
                                  <span className={cn(
                                    "text-[10px] italic mt-1 block",
                                    isOwn ? "text-white/60" : "text-muted-foreground"
                                  )}>
                                    (edited)
                                  </span>
                                )}
                            
                                {/* Attachment Display */}
                                {parsed.attachment && (
                                  <div className={cn(
                                    "mt-3 pt-3 border-t",
                                    isOwn ? "border-white/20" : "border-slate-200 dark:border-slate-700"
                                  )}>
                                    {parsed.attachment.type === "PENDING_PAYMENT" ? (
                                      <div className={cn(
                                        "flex items-center gap-2.5 rounded-xl p-3",
                                        isOwn ? "bg-white/10" : "bg-amber-50 dark:bg-amber-900/20"
                                      )}>
                                        <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <span className={cn(
                                          "text-sm font-medium",
                                          isOwn ? "text-white" : "text-amber-700 dark:text-amber-300"
                                        )}>
                                          Payment Awaiting Confirmation
                                        </span>
                                      </div>
                                    ) : (
                                      <a
                                        href={parsed.attachment.data}
                                        download={`${parsed.attachment.type === "INVOICE_PDF" ? "invoice" : "receipt"}.pdf`}
                                        className={cn(
                                          "flex items-center gap-3 rounded-xl p-3 transition-all group/dl",
                                          isOwn 
                                            ? "bg-white/10 hover:bg-white/20" 
                                            : "bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                                        )}
                                      >
                                        <div className={cn(
                                          "h-10 w-10 rounded-xl flex items-center justify-center",
                                          isOwn ? "bg-white/20" : "bg-violet-500/10"
                                        )}>
                                          <FileText className={cn(
                                            "h-5 w-5",
                                            isOwn ? "text-white" : "text-violet-600 dark:text-violet-400"
                                          )} />
                                        </div>
                                        <div className="flex-1">
                                          <p className={cn(
                                            "text-sm font-medium",
                                            isOwn ? "text-white" : "text-violet-700 dark:text-violet-300"
                                          )}>
                                            {getAttachmentLabel(parsed.attachment.type)}
                                          </p>
                                          <p className={cn(
                                            "text-xs",
                                            isOwn ? "text-white/70" : "text-violet-600/70 dark:text-violet-400/70"
                                          )}>
                                            PDF Document
                                          </p>
                                        </div>
                                        <div className={cn(
                                          "h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover/dl:scale-110",
                                          isOwn ? "bg-white/20" : "bg-violet-500 text-white"
                                        )}>
                                          <Download className="h-4 w-4" />
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className={cn("flex items-center gap-1.5 px-1", isOwn && "justify-end")}>
                            <span className="text-[11px] text-muted-foreground">
                              {formatFullTime(msg.createdAt)}
                            </span>
                            {msg.isEdited && (
                              <span className="text-[11px] text-muted-foreground">• edited</span>
                            )}
                            {isOwn && (
                              msg.isRead ? (
                                <CheckCheck className="h-3.5 w-3.5 text-violet-500" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-muted-foreground" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="px-3 py-2 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
        <div className="flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] sm:min-h-[52px] max-h-[100px] sm:max-h-[140px] resize-none rounded-2xl pr-4 pl-4 py-3 sm:py-3.5 bg-slate-100/80 dark:bg-slate-800/80 border-0 focus-visible:ring-2 focus-visible:ring-violet-500/50 text-sm"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending || isPending}
            size="icon"
            className={cn(
              "shrink-0 h-[44px] w-[44px] sm:h-[52px] sm:w-[52px] rounded-2xl transition-all",
              newMessage.trim() 
                ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25" 
                : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <Send className={cn(
              "h-5 w-5 transition-transform",
              newMessage.trim() && "translate-x-0.5 -translate-y-0.5"
            )} />
          </Button>
        </div>
        <p className="hidden sm:block text-xs text-muted-foreground mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN MESSAGING PAGE COMPONENT
// ============================================================================

interface MessagingPageProps {
  businessId: string
  currentUserId: string
  includeAllBusiness?: boolean
  title?: string
}

export function MessagingPage({
  businessId,
  currentUserId,
  includeAllBusiness = false,
  title = "Messages",
}: MessagingPageProps) {
  const [view, setView] = useState<"list" | "new" | "thread">("list")
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSelectContact = async (contact: ContactInfo) => {
    startTransition(async () => {
      const result = await getOrCreateConversation(
        businessId,
        contact.type,
        contact.id,
        contact.shopId
      )
      if (result.success && result.data) {
        const convsResult = await getConversations(businessId, { includeAllBusiness })
        if (convsResult.success && convsResult.data) {
          const conv = convsResult.data.find((c) => c.id === result.data!.conversationId)
          if (conv) {
            setSelectedConversation(conv)
            setView("thread")
          }
        }
      }
    })
  }

  const handleSelectConversation = (conv: ConversationWithDetails) => {
    setSelectedConversation(conv)
    setView("thread")
  }

  const getConversationDisplayName = (conv: ConversationWithDetails): string => {
    if (conv.customer) {
      return `${conv.customer.firstName} ${conv.customer.lastName}`
    }
    if (conv.conversationType === "STAFF_TO_STAFF") {
      const otherParticipant =
        conv.participant1?.id === currentUserId ? conv.participant2 : conv.participant1
      return otherParticipant?.name || otherParticipant?.email || "Unknown"
    }
    return conv.participant1?.name || conv.participant1?.email || "Unknown"
  }

  const getConversationRole = (conv: ConversationWithDetails): Role | null => {
    if (conv.customer) return null
    if (conv.conversationType === "STAFF_TO_STAFF") {
      const otherParticipant =
        conv.participant1?.id === currentUserId ? conv.participant2 : conv.participant1
      return otherParticipant?.role || null
    }
    return conv.participant1?.role || null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] sm:h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200/60 dark:border-slate-800/60 shadow-none sm:shadow-xl sm:shadow-slate-200/50 dark:sm:shadow-slate-900/50">
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Conversation List or Contact Selector */}
          <div className={cn(
            "w-full md:w-[360px] lg:w-[400px] border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col overflow-hidden",
            (view === "thread") && "hidden md:flex"
          )}>
            {view === "new" ? (
              <ContactSelector
                businessId={businessId}
                onSelectContact={handleSelectContact}
                onClose={() => setView("list")}
              />
            ) : (
              <ConversationList
                businessId={businessId}
                currentUserId={currentUserId}
                selectedConversationId={selectedConversation?.id}
                onSelectConversation={handleSelectConversation}
                onNewMessage={() => setView("new")}
                includeAllBusiness={includeAllBusiness}
              />
            )}
          </div>

          {/* Main Content - Message Thread */}
          <div className={cn(
            "flex-1 flex flex-col overflow-hidden",
            view !== "thread" && "hidden md:flex"
          )}>
            {selectedConversation ? (
              <MessageThread
                conversationId={selectedConversation.id}
                currentUserId={currentUserId}
                onBack={() => {
                  setView("list")
                  setSelectedConversation(null)
                }}
                conversationName={getConversationDisplayName(selectedConversation)}
                conversationRole={getConversationRole(selectedConversation)}
                isCustomer={!!selectedConversation.customer}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-6 shadow-xl shadow-violet-500/10">
                  <MessageCircle className="h-12 w-12 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Select a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Choose an existing conversation from the list or start a new one
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
