"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

interface SalesStaffSidebarProps {
  shopSlug: string
  shopName: string
  staffName: string | null
  businessName: string
  businessLogoUrl: string | null
  unreadMessageCount?: number
}

export function SalesStaffSidebar({ shopSlug, shopName, staffName, businessName, businessLogoUrl, unreadMessageCount = 0 }: SalesStaffSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileOpen])

  const baseUrl = `/sales-staff/${shopSlug}`

  const navItems = [
    {
      name: "Dashboard",
      href: `/sales-staff/${shopSlug}/dashboard`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "New Sale",
      href: `/sales-staff/${shopSlug}/new-sale`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      ),
      highlight: true,
    },
    {
      name: "Products",
      href: `/sales-staff/${shopSlug}/products`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: "Customers",
      href: `/sales-staff/${shopSlug}/customers`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: "Deliveries",
      href: `/sales-staff/${shopSlug}/deliveries`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      name: "Invoices",
      href: `/sales-staff/${shopSlug}/invoices`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      ),
    },
    {
      name: "Chat",
      href: `/sales-staff/${shopSlug}/chat`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: unreadMessageCount,
    },
    {
      name: "Daily Report",
      href: `/sales-staff/${shopSlug}/reports`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  const isActive = (href: string) => {
    if (href.includes("/dashboard")) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-card border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {businessLogoUrl ? (
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10 border border-indigo-500/30">
                <Image
                  src={businessLogoUrl}
                  alt={businessName}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-400">
                  {businessName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-white truncate max-w-[180px]">{shopName}</h1>
              <p className="text-xs text-slate-400">{businessName}</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-64 glass-card border-r border-white/5 z-50 flex flex-col
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Logo/Header */}
      <div className="p-6 border-b border-white/5">
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-400">
                {businessName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{shopName}</h1>
            <p className="text-xs text-slate-400 truncate">{businessName}</p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : item.highlight
                  ? "text-indigo-400 hover:bg-indigo-500/10 hover:border hover:border-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span className="font-medium flex-1">{item.name}</span>
              {item.badge && item.badge > 0 && (
                <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs font-semibold px-1.5">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center text-indigo-400 font-semibold">
            {staffName?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{staffName || 'Staff'}</p>
            <p className="text-xs text-slate-400">Sales Staff</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </form>
      </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-white/10 pb-safe">
        <div className="flex items-center justify-around py-2">
          {[
            { name: "Home", href: `${baseUrl}/dashboard`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
            { name: "Sale", href: `${baseUrl}/new-sale`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>, highlight: true },
            { name: "Products", href: `${baseUrl}/products`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
            { name: "Customers", href: `${baseUrl}/customers`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
            { name: "Deliveries", href: `${baseUrl}/deliveries`, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> },
          ].map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  item.highlight 
                    ? "text-indigo-400" 
                    : active 
                      ? "text-indigo-400" 
                      : "text-slate-400"
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
