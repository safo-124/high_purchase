"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { logoutCustomer } from "@/app/customer/actions"
import { 
  Home, 
  ShoppingBag, 
  Bell, 
  LogOut, 
  User,
  Menu,
  X,
  FileText,
  MessageCircle,
  Settings
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface CustomerNavbarProps {
  shopSlug: string
  shopName: string
  customerName: string
  unreadCount?: number
  businessName: string
  businessLogoUrl: string | null
}

export function CustomerNavbar({ 
  shopSlug, 
  shopName, 
  customerName,
  unreadCount = 0,
  businessName,
  businessLogoUrl
}: CustomerNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    {
      href: `/customer/${shopSlug}/dashboard`,
      label: "Dashboard",
      icon: Home,
    },
    {
      href: `/customer/${shopSlug}/purchases`,
      label: "My Purchases",
      icon: ShoppingBag,
    },
    {
      href: `/customer/${shopSlug}/receipts`,
      label: "Receipts",
      icon: FileText,
    },
    {
      href: `/customer/${shopSlug}/messages`,
      label: "Messages",
      icon: MessageCircle,
    },
    {
      href: `/customer/${shopSlug}/notifications`,
      label: "Notifications",
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      href: `/customer/${shopSlug}/settings`,
      label: "Settings",
      icon: Settings,
    },
  ]

  const handleLogout = async () => {
    await logoutCustomer()
    toast.success("Logged out successfully")
    window.location.href = `/customer/${shopSlug}/login`
  }

  const isActive = (href: string) => pathname === href

  return (
    <nav className="glass-card border-b border-slate-700/50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Shop Name */}
          <div className="flex items-center gap-3">
            {businessLogoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <Image
                  src={businessLogoUrl}
                  alt={businessName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {businessName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">{shopName}</h1>
              <p className="text-xs text-slate-400">{businessName}</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive(item.href)
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* User Menu (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <User className="w-5 h-5" />
              <span className="text-sm">{customerName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700/50">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive(item.href)
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto w-6 h-6 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
              <div className="pt-4 border-t border-slate-700/50 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 text-slate-400">
                  <User className="w-5 h-5" />
                  <span>{customerName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
