"use client"

import { useState, useEffect, useRef, useCallback, useTransition } from "react"
import { MessageCircle, Search, Send, User, ChevronLeft, Check, CheckCheck, Building2, Store, Briefcase, Truck, FileText, Download, Clock, MoreVertical, Pencil, Trash2, X } from "lucide-react"
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
  getCustomerConversations,
  getCustomerConversationMessages,
  sendCustomerMessage,
  getCustomerAvailableContacts,
  createCustomerConversation,
  editCustomerMessage,
  deleteCustomerMessage,
  updateCustomerLastSeen,
  getStaffOnlineStatusForCustomer,
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
      return "📄 Invoice"
    case "RECEIPT_PDF":
      return "✅ Receipt"
    case "PENDING_PAYMENT":
      return "⏳ Payment Pending"
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
    default:
      return role
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

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
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

function canModifyCustomerMessage(msg: MessageWithSender, customerId: string): { canEdit: boolean; canDelete: boolean } {
  // Check if customer is the sender
  if (msg.senderCustomer?.id !== customerId) {
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

function OnlineIndicator({ online = true, className }: { online?: boolean; className?: string }) {
  if (!online) {
    return (
      <span className={cn("relative flex h-2 w-2", className)}>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500" />
      </span>
    )
  }
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  )
}

// ============================================================================
// CUSTOMER CONTACT SELECTOR
// ============================================================================

interface CustomerContactSelectorProps {
  customerId: string
  onSelectContact: (contact: ContactInfo) => void
  onClose: () => void
}

function CustomerContactSelector({ customerId, onSelectContact, onClose }: CustomerContactSelectorProps) {
  const [contacts, setContacts] = useState<ContactInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContacts() {
      setLoading(true)
      const result = await getCustomerAvailableContacts(customerId)
      if (result.success && result.data) {
        setContacts(result.data)
      }
      setLoading(false)
    }
    loadContacts()
  }, [customerId])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-slate-700/50">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-lg text-white">New Message</h2>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 p-4">
            <User className="h-8 w-8 mb-2" />
            <p className="text-sm text-center">No staff contacts available</p>
          </div>
        ) : (
          <div className="p-2">
            <p className="px-3 py-2 text-xs text-slate-500 uppercase tracking-wider">Shop Staff</p>
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-indigo-500/20 text-indigo-400">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{contact.name}</span>
                    {contact.role && (
                      <Badge variant="secondary" className="text-xs bg-indigo-500/20 text-indigo-300">
                        {getRoleIcon(contact.role)}
                        <span className="ml-1">{getRoleLabel(contact.role)}</span>
                      </Badge>
                    )}
                  </div>
                  {contact.phone && (
                    <p className="text-sm text-slate-400">{contact.phone}</p>
                  )}
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
// CUSTOMER CONVERSATION LIST
// ============================================================================

interface CustomerConversationListProps {
  customerId: string
  selectedConversationId?: string | null
  onSelectConversation: (conversation: ConversationWithDetails) => void
  onNewMessage: () => void
}

function CustomerConversationList({
  customerId,
  selectedConversationId,
  onSelectConversation,
  onNewMessage,
}: CustomerConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    const result = await getCustomerConversations(customerId)
    if (result.success && result.data) {
      setConversations(result.data)
    }
    setLoading(false)
  }, [customerId])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 10000)
    return () => clearInterval(interval)
  }, [loadConversations])

  const getConversationName = (conv: ConversationWithDetails): string => {
    return conv.participant1?.name || conv.participant1?.email || "Staff"
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-indigo-400" />
            Messages
          </h2>
          <Button size="sm" onClick={onNewMessage} className="bg-indigo-600 hover:bg-indigo-700">
            <Send className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 p-4">
            <MessageCircle className="h-8 w-8 mb-2" />
            <p className="text-sm text-center">No messages yet. Start a conversation with our staff!</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conv) => {
              const name = getConversationName(conv)
              const isSelected = selectedConversationId === conv.id

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    isSelected ? "bg-indigo-500/20" : "hover:bg-slate-700/50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-indigo-500/20 text-indigo-400">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("font-medium text-white truncate", conv.unreadCount > 0 && "font-semibold")}>
                        {name}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-slate-500 shrink-0">
                          {formatMessageTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {conv.participant1?.role && (
                      <Badge variant="secondary" className="text-xs bg-slate-700/50 text-slate-400 mb-1">
                        {getRoleLabel(conv.participant1.role)}
                      </Badge>
                    )}
                    {conv.lastMessagePreview && (
                      <p className={cn(
                        "text-sm truncate",
                        conv.unreadCount > 0 ? "text-slate-200 font-medium" : "text-slate-400"
                      )}>
                        {conv.lastMessagePreview}
                      </p>
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
// CUSTOMER MESSAGE THREAD
// ============================================================================

interface CustomerMessageThreadProps {
  conversationId: string
  customerId: string
  onBack: () => void
  staffName: string
  staffRole?: Role | null
}

function CustomerMessageThread({
  conversationId,
  customerId,
  onBack,
  staffName,
  staffRole,
}: CustomerMessageThreadProps) {
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
  const [staffOnline, setStaffOnline] = useState(false)
  const [staffLastSeenAt, setStaffLastSeenAt] = useState<Date | null>(null)

  const loadMessages = useCallback(async () => {
    const result = await getCustomerConversationMessages(conversationId, customerId)
    if (result.success && result.data) {
      setMessages(result.data.messages)
    }
    setLoading(false)
  }, [conversationId, customerId])

  const loadStaffStatus = useCallback(async () => {
    const result = await getStaffOnlineStatusForCustomer(conversationId, customerId)
    if (result.success && result.data) {
      setStaffOnline(result.data.isOnline)
      setStaffLastSeenAt(result.data.lastSeenAt)
    }
  }, [conversationId, customerId])

  useEffect(() => {
    loadMessages()
    loadStaffStatus()
    updateCustomerLastSeen(customerId)
    
    const messageInterval = setInterval(loadMessages, 5000)
    const statusInterval = setInterval(() => {
      loadStaffStatus()
      updateCustomerLastSeen(customerId)
    }, 30000)
    
    return () => {
      clearInterval(messageInterval)
      clearInterval(statusInterval)
    }
  }, [loadMessages, loadStaffStatus, customerId])

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
      const result = await sendCustomerMessage(conversationId, customerId, content)
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
    const result = await editCustomerMessage(editingMessageId, customerId, editContent.trim())
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

    const result = await deleteCustomerMessage(deleteMessageId, customerId)
    if (result.success) {
      setMessages((prev) => prev.filter((msg) => msg.id !== deleteMessageId))
    }
    setDeleteDialogOpen(false)
    setDeleteMessageId(null)
  }

  const isOwnMessage = (msg: MessageWithSender): boolean => {
    return !!msg.senderCustomer
  }

  return (
    <div className="flex flex-col h-full">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Message</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">Cancel</AlertDialogCancel>
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
      <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-white md:hidden">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-indigo-500/20 text-indigo-400">
              {getInitials(staffName)}
            </AvatarFallback>
          </Avatar>
          <OnlineIndicator online={staffOnline} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{staffName}</h3>
          <p className={cn(
            "text-xs",
            staffOnline ? "text-emerald-400" : "text-slate-500"
          )}>
            {formatLastSeen(staffLastSeenAt)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <MessageCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = isOwnMessage(msg)
              const senderName = msg.sender?.name || msg.sender?.email || "Staff"
              const parsed = parseMessageContent(msg.content)
              const { canEdit, canDelete } = canModifyCustomerMessage(msg, customerId)
              const isEditing = editingMessageId === msg.id

              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-2 group/msg", isOwn ? "justify-end" : "justify-start")}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-slate-700 text-slate-400 text-xs">
                        {getInitials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-[80%] space-y-1", isOwn && "items-end")}>
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="min-h-[60px] max-h-[120px] resize-none bg-slate-800 border-slate-600 text-white text-sm"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!editContent.trim() || editSaving}
                            className="h-7 px-2 text-xs bg-indigo-600 hover:bg-indigo-700"
                          >
                            {editSaving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="relative group/bubble">
                        {/* Edit/Delete Menu for own messages */}
                        {isOwn && (canEdit || canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -left-9 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full opacity-0 group-hover/bubble:opacity-100 transition-opacity text-slate-400 hover:text-white hover:bg-slate-700"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-slate-800 border-slate-700">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleStartEdit(msg)} className="text-slate-200 focus:text-white focus:bg-slate-700">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(msg.id)}
                                  className="text-red-400 focus:text-red-300 focus:bg-slate-700"
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
                            "rounded-2xl px-4 py-3",
                            isOwn
                              ? "bg-indigo-600 text-white rounded-br-md"
                              : "bg-slate-700 text-slate-200 rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{parsed.content}</p>
                          
                          {/* Edited indicator */}
                          {msg.isEdited && (
                            <span className="text-[10px] italic text-white/60 mt-1 block">
                              (edited)
                            </span>
                          )}
                      
                          {/* Attachment Display */}
                          {parsed.attachment && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              {parsed.attachment.type === "PENDING_PAYMENT" ? (
                                <div className="flex items-center gap-2 bg-yellow-500/20 rounded-lg p-2">
                                  <Clock className="h-5 w-5 text-yellow-400" />
                                  <span className="text-sm font-medium text-yellow-300">
                                    Payment Awaiting Confirmation
                                  </span>
                                </div>
                              ) : (
                                <a
                                  href={parsed.attachment.data}
                                  download={`${parsed.attachment.type === "INVOICE_PDF" ? "invoice" : "receipt"}.pdf`}
                                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-colors"
                                >
                                  <FileText className="h-5 w-5 text-indigo-300" />
                                  <span className="text-sm font-medium flex-1">
                                    {getAttachmentLabel(parsed.attachment.type)}
                                  </span>
                                  <Download className="h-4 w-4 text-indigo-300" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className={cn("flex items-center gap-1 px-1", isOwn && "justify-end")}>
                      <span className="text-xs text-slate-500">
                        {formatFullTime(msg.createdAt)}
                      </span>
                      {msg.isEdited && (
                        <span className="text-xs text-slate-600">• edited</span>
                      )}
                      {isOwn && (
                        msg.isRead ? (
                          <CheckCheck className="h-3 w-3 text-indigo-400" />
                        ) : (
                          <Check className="h-3 w-3 text-slate-500" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-[120px] resize-none bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending || isPending}
            size="icon"
            className="shrink-0 h-11 w-11 bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN CUSTOMER MESSAGING PAGE
// ============================================================================

interface CustomerMessagingPageProps {
  customerId: string
}

export function CustomerMessagingPage({ customerId }: CustomerMessagingPageProps) {
  const [view, setView] = useState<"list" | "new" | "thread">("list")
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSelectContact = async (contact: ContactInfo) => {
    startTransition(async () => {
      const result = await createCustomerConversation(customerId, contact.id)
      if (result.success && result.data) {
        const convsResult = await getCustomerConversations(customerId)
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

  const getStaffName = (conv: ConversationWithDetails): string => {
    return conv.participant1?.name || conv.participant1?.email || "Staff"
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden bg-slate-800/50 border-slate-700/50">
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className={cn(
            "w-full md:w-80 lg:w-96 border-r border-slate-700/50 flex flex-col",
            view === "thread" && "hidden md:flex"
          )}>
            {view === "new" ? (
              <CustomerContactSelector
                customerId={customerId}
                onSelectContact={handleSelectContact}
                onClose={() => setView("list")}
              />
            ) : (
              <CustomerConversationList
                customerId={customerId}
                selectedConversationId={selectedConversation?.id}
                onSelectConversation={handleSelectConversation}
                onNewMessage={() => setView("new")}
              />
            )}
          </div>

          {/* Main Content */}
          <div className={cn(
            "flex-1 flex flex-col",
            view !== "thread" && "hidden md:flex"
          )}>
            {selectedConversation ? (
              <CustomerMessageThread
                conversationId={selectedConversation.id}
                customerId={customerId}
                onBack={() => {
                  setView("list")
                  setSelectedConversation(null)
                }}
                staffName={getStaffName(selectedConversation)}
                staffRole={selectedConversation.participant1?.role}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
                <p className="text-sm text-center max-w-sm">
                  Choose an existing conversation or start a new one with our staff
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
