"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, Send, CheckCircle, AlertCircle, Info, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { getSmsSettings, updateSmsSettings, sendTestSmsAction, type SmsSettingsData } from "../../../sms-actions"

type SmsProvider = "CUSTOM_API" | "HUBTEL" | "ARKESEL" | "MNOTIFY"

export default function SmsSettingsPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [settings, setSettings] = useState<SmsSettingsData | null>(null)

  // Form fields
  const [provider, setProvider] = useState<SmsProvider>("CUSTOM_API")
  const [senderId, setSenderId] = useState("")
  const [apiEndpoint, setApiEndpoint] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [httpMethod, setHttpMethod] = useState("POST")
  const [requestTemplate, setRequestTemplate] = useState("")
  const [headersTemplate, setHeadersTemplate] = useState("")
  const [successField, setSuccessField] = useState("")
  const [successValue, setSuccessValue] = useState("")
  const [isEnabled, setIsEnabled] = useState(false)
  const [testPhone, setTestPhone] = useState("")

  useEffect(() => {
    loadSettings()
  }, [businessSlug])

  async function loadSettings() {
    try {
      const data = await getSmsSettings(businessSlug)
      if (data) {
        setSettings(data)
        setProvider(data.provider as SmsProvider)
        setSenderId(data.senderId || "")
        setApiEndpoint(data.apiEndpoint || "")
        setHttpMethod(data.httpMethod || "POST")
        setRequestTemplate(data.requestTemplate || getDefaultRequestTemplate())
        setHeadersTemplate(data.headersTemplate || getDefaultHeadersTemplate())
        setSuccessField(data.successField || "")
        setSuccessValue(data.successValue || "")
        setIsEnabled(data.isEnabled)
      } else {
        // Set defaults for new settings
        setRequestTemplate(getDefaultRequestTemplate())
        setHeadersTemplate(getDefaultHeadersTemplate())
      }
    } catch {
      toast.error("Failed to load SMS settings")
    } finally {
      setLoading(false)
    }
  }

  function getDefaultRequestTemplate() {
    return JSON.stringify(
      {
        to: "{{phone}}",
        message: "{{message}}",
        from: "{{senderId}}",
      },
      null,
      2
    )
  }

  function getDefaultHeadersTemplate() {
    return JSON.stringify(
      {
        "Content-Type": "application/json",
        Authorization: "Bearer {{apiKey}}",
      },
      null,
      2
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set("provider", provider)
      formData.set("senderId", senderId)
      formData.set("apiEndpoint", apiEndpoint)
      formData.set("apiKey", apiKey)
      formData.set("apiSecret", apiSecret)
      formData.set("httpMethod", httpMethod)
      formData.set("requestTemplate", requestTemplate)
      formData.set("headersTemplate", headersTemplate)
      formData.set("successField", successField)
      formData.set("successValue", successValue)
      formData.set("isEnabled", isEnabled.toString())

      const result = await updateSmsSettings(businessSlug, formData)

      if (result.success) {
        toast.success("SMS settings saved successfully")
        loadSettings()
      } else {
        toast.error(result.error || "Failed to save settings")
      }
    } catch {
      toast.error("An error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  async function handleTestSms() {
    if (!testPhone) {
      toast.error("Please enter a test phone number")
      return
    }

    setTesting(true)
    try {
      const result = await sendTestSmsAction(businessSlug, testPhone)

      if (result.success) {
        toast.success("Test SMS sent successfully!")
        loadSettings()
      } else {
        toast.error(result.error || "Failed to send test SMS")
      }
    } catch {
      toast.error("An error occurred while sending test SMS")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SMS Settings</h1>
          <p className="text-muted-foreground">
            Configure your SMS gateway for sending notifications and bulk messages
          </p>
        </div>
        {settings?.isVerified ? (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        ) : settings ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Verified
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* SMS Provider Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Provider
            </CardTitle>
            <CardDescription>
              Configure your SMS gateway provider settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as SmsProvider)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOM_API">Custom API (Own Gateway)</SelectItem>
                  <SelectItem value="HUBTEL">Hubtel</SelectItem>
                  <SelectItem value="ARKESEL">Arkesel</SelectItem>
                  <SelectItem value="MNOTIFY">mNotify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderId">Sender ID</Label>
              <Input
                id="senderId"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="YourBrand"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">
                Maximum 11 characters. This appears as the sender name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiEndpoint">API Endpoint</Label>
              <Input
                id="apiEndpoint"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://your-sms-gateway.com/api/send"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings ? "••••••••" : "Enter API key"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret (Optional)</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder={settings ? "••••••••" : "Enter if required"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label>Enable SMS</Label>
                <p className="text-xs text-muted-foreground">
                  Allow sending SMS from this business
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* Custom API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Custom API Configuration</CardTitle>
            <CardDescription>
              Configure how requests are made to your SMS gateway
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="httpMethod">HTTP Method</Label>
              <Select value={httpMethod} onValueChange={setHttpMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headersTemplate">Headers Template (JSON)</Label>
              <Textarea
                id="headersTemplate"
                value={headersTemplate}
                onChange={(e) => setHeadersTemplate(e.target.value)}
                placeholder='{"Content-Type": "application/json", "Authorization": "Bearer {{apiKey}}"}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestTemplate">Request Body Template (JSON)</Label>
              <Textarea
                id="requestTemplate"
                value={requestTemplate}
                onChange={(e) => setRequestTemplate(e.target.value)}
                placeholder='{"to": "{{phone}}", "message": "{{message}}", "from": "{{senderId}}"}'
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            <div className="rounded-lg bg-muted p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4" />
                Available Placeholders
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <code className="bg-background px-1 rounded">{"{{phone}}"}</code>
                <span>Recipient phone</span>
                <code className="bg-background px-1 rounded">{"{{message}}"}</code>
                <span>SMS message</span>
                <code className="bg-background px-1 rounded">{"{{senderId}}"}</code>
                <span>Sender ID</span>
                <code className="bg-background px-1 rounded">{"{{apiKey}}"}</code>
                <span>API Key</span>
                <code className="bg-background px-1 rounded">{"{{apiSecret}}"}</code>
                <span>API Secret</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="successField">Success Field (Optional)</Label>
                <Input
                  id="successField"
                  value={successField}
                  onChange={(e) => setSuccessField(e.target.value)}
                  placeholder="status"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="successValue">Success Value (Optional)</Label>
                <Input
                  id="successValue"
                  value={successValue}
                  onChange={(e) => setSuccessValue(e.target.value)}
                  placeholder="success"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to validate API response. If the response JSON has field &quot;{successField || "status"}&quot; with value &quot;{successValue || "success"}&quot;, the SMS is marked as sent.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Test SMS Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test SMS Configuration</CardTitle>
          <CardDescription>
            Send a test SMS to verify your configuration is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="testPhone">Test Phone Number</Label>
              <Input
                id="testPhone"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+233XXXXXXXXX"
              />
            </div>
            <Button onClick={handleTestSms} disabled={testing || !testPhone}>
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test SMS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
