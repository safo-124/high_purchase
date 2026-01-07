"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, MessageSquare, Users, History, AlertCircle, CheckCircle, Clock, Info } from "lucide-react"
import { toast } from "sonner"
import {
  getShopSmsSettings,
  getShopCustomersForSms,
  sendShopBulkSmsAction,
  getShopSmsLogs,
  type ShopSmsSettingsData,
  type SmsLogData,
} from "../../sms-actions"

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
}

export default function ShopBulkSmsPage() {
  const params = useParams()
  const shopSlug = params.shopSlug as string

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [settings, setSettings] = useState<ShopSmsSettingsData | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [logs, setLogs] = useState<SmsLogData[]>([])
  const [logsTotal, setLogsTotal] = useState(0)

  // Form state
  const [message, setMessage] = useState("")
  const [recipientType, setRecipientType] = useState<"all" | "selected">("all")
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [shopSlug])

  async function loadData() {
    try {
      const [settingsData, customersData, logsData] = await Promise.all([
        getShopSmsSettings(shopSlug),
        getShopCustomersForSms(shopSlug),
        getShopSmsLogs(shopSlug, 1, 20),
      ])

      setSettings(settingsData)
      setCustomers(customersData.customers)
      setLogs(logsData.logs)
      setLogsTotal(logsData.total)
    } catch {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  function getRecipientCount() {
    if (recipientType === "all") {
      return customers.length
    } else if (recipientType === "selected") {
      return selectedCustomers.length
    }
    return 0
  }

  function getEstimatedCost() {
    const count = getRecipientCount()
    // Assuming approximately 0.02 GHS per SMS
    return (count * 0.02).toFixed(2)
  }

  function toggleCustomerSelection(customerId: string) {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    )
  }

  function selectAllCustomers() {
    setSelectedCustomers(customers.map((c) => c.id))
  }

  function deselectAllCustomers() {
    setSelectedCustomers([])
  }

  async function handleSendSms() {
    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    if (getRecipientCount() === 0) {
      toast.error("Please select at least one recipient")
      return
    }

    setSending(true)
    try {
      const formData = new FormData()
      formData.set("message", message)
      formData.set("recipientType", recipientType)
      if (recipientType === "selected") {
        formData.set("selectedCustomerIds", JSON.stringify(selectedCustomers))
      }

      const result = await sendShopBulkSmsAction(shopSlug, formData)

      if (result.success) {
        const data = result.data as { sentCount: number; failedCount: number }
        toast.success(`SMS sent to ${data.sentCount} recipients`)
        if (data.failedCount > 0) {
          toast.warning(`${data.failedCount} SMS failed to send`)
        }
        setMessage("")
        loadData() // Refresh logs
      } else {
        toast.error(result.error || "Failed to send SMS")
      }
    } catch {
      toast.error("An error occurred while sending SMS")
    } finally {
      setSending(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "SENT":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Sent
          </Badge>
        )
      case "DELIVERED":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Delivered
          </Badge>
        )
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!settings || !settings.isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">SMS Not Available</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {!settings
            ? "SMS has not been configured by your business administrator."
            : "SMS is currently disabled. Please contact your business administrator."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk SMS</h1>
        <p className="text-muted-foreground">
          Send SMS messages to your shop's customers
        </p>
      </div>

      {/* SMS Configuration Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Info className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">
                SMS is configured by your business administrator.{" "}
                <span className="text-muted-foreground">
                  Sender ID: {settings.senderId || "Not set"}
                </span>
              </p>
            </div>
            {settings.isVerified ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Not Verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History ({logsTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Message Composer */}
            <Card>
              <CardHeader>
                <CardTitle>Compose Message</CardTitle>
                <CardDescription>
                  Write your SMS message (max 160 characters)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                    rows={5}
                    maxLength={160}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{message.length}/160 characters</span>
                    <span>{Math.ceil(message.length / 160)} SMS</span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Recipients:</span>
                    <span className="text-sm">{getRecipientCount()} customers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Cost:</span>
                    <span className="text-sm">GHS {getEstimatedCost()}</span>
                  </div>
                </div>

                <Button
                  onClick={handleSendSms}
                  disabled={sending || getRecipientCount() === 0 || !message.trim()}
                  className="w-full"
                  size="lg"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to {getRecipientCount()} Recipients
                </Button>
              </CardContent>
            </Card>

            {/* Recipients Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Recipients
                </CardTitle>
                <CardDescription>
                  Choose who will receive this SMS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipient Type</Label>
                  <Select
                    value={recipientType}
                    onValueChange={(v) => {
                      setRecipientType(v as "all" | "selected")
                      setSelectedCustomers([])
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers ({customers.length})</SelectItem>
                      <SelectItem value="selected">Select Individually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recipientType === "selected" && (
                  <>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllCustomers}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllCustomers}>
                        Deselect All
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-lg">
                      <div className="p-4 space-y-2">
                        {customers.map((customer) => (
                          <label
                            key={customer.id}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedCustomers.includes(customer.id)}
                              onCheckedChange={() => toggleCustomerSelection(customer.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {customer.phone}
                              </p>
                            </div>
                          </label>
                        ))}
                        {customers.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No customers with SMS notifications enabled
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS History</CardTitle>
              <CardDescription>
                View previously sent SMS messages from this shop
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No SMS messages sent yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.recipientPhone}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.message}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.smsType || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.sentAt
                            ? new Date(log.sentAt).toLocaleString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
