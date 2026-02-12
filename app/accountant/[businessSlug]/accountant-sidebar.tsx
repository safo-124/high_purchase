"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface AccountantSidebarProps {
  businessSlug: string
  businessName: string
  businessLogoUrl: string | null
  userName: string
  userEmail: string
  permissions: {
    canConfirmPayments: boolean
    canExportData: boolean
    canViewProfitMargins: boolean
    canRecordExpenses: boolean
  }
}

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  badge?: string
}

export function AccountantSidebar({
  businessSlug,
  businessName,
  businessLogoUrl,
  userName,
  userEmail,
  permissions,
}: AccountantSidebarProps) {
  const pathname = usePathname()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const baseUrl = `/accountant/${businessSlug}`

  // Main navigation items
  const mainNavItems: NavItem[] = [
    {
      name: "Dashboard",
      href: `${baseUrl}/dashboard`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Payments",
      href: `${baseUrl}/payments`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: "Customers",
      href: `${baseUrl}/customers`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  // Financial management items
  const financialNavItems: NavItem[] = [
    {
      name: "Expenses",
      href: `${baseUrl}/expenses`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
    },
    {
      name: "Cash Summary",
      href: `${baseUrl}/cash-summary`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      name: "Cash Flow",
      href: `${baseUrl}/cash-flow`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      name: "Budgets",
      href: `${baseUrl}/budgets`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Commissions",
      href: `${baseUrl}/commissions`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  // Analytics/Reports items
  const analyticsNavItems: NavItem[] = [
    {
      name: "Reports",
      href: `${baseUrl}/reports`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: "Aging Report",
      href: `${baseUrl}/aging`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Bad Debts",
      href: `${baseUrl}/bad-debts`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      name: "Collections",
      href: `${baseUrl}/collection-efficiency`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      name: "By Category",
      href: `${baseUrl}/revenue-category`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
    {
      name: "Staff Performance",
      href: `${baseUrl}/staff-performance`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  // Compliance items
  const complianceNavItems: NavItem[] = [
    {
      name: "Audit Trail",
      href: `${baseUrl}/audit-trail`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: "Tax Reports",
      href: `${baseUrl}/tax-reports`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
    },
    {
      name: "Statements",
      href: `${baseUrl}/financial-statements`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  // Operations items
  const operationsNavItems: NavItem[] = [
    {
      name: "Disputes",
      href: `${baseUrl}/disputes`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Refunds",
      href: `${baseUrl}/refunds`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
    },
  ]

  // Add profit analysis if permitted
  if (permissions.canViewProfitMargins) {
    analyticsNavItems.push({
      name: "Profit Analysis",
      href: `${baseUrl}/profits`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    })
  }

  // Combine all nav items for mobile
  const navItems = [...mainNavItems, ...financialNavItems.slice(0, 2)]

  const isActive = (href: string) => {
    if (href === baseUrl + "/dashboard") {
      return pathname === baseUrl || pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (response.ok) {
        window.location.href = "/login"
      }
    } catch {
      setIsSigningOut(false)
    }
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-card border-b border-white/10 z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg glass-card border border-white/10 hover:border-emerald-500/30 transition-all"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {businessLogoUrl ? (
            <Image
              src={businessLogoUrl}
              alt={businessName}
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {businessName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-semibold text-white truncate max-w-[150px]">
            {businessName}
          </span>
        </div>

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 glass-card border-r border-white/10 z-50
          transform transition-transform duration-300 ease-out
          lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          flex flex-col
        `}
      >
        {/* Logo/Brand Area */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            {businessLogoUrl ? (
              <Image
                src={businessLogoUrl}
                alt={businessName}
                width={48}
                height={48}
                className="rounded-xl object-cover ring-2 ring-emerald-500/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <span className="text-white font-bold text-xl">
                  {businessName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white text-lg truncate">{businessName}</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-medium">Accountant Portal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Main Section */}
          {mainNavItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                  ${active
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white shadow-lg shadow-emerald-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }
                `}
              >
                <span className={active ? "text-emerald-400" : ""}>{item.icon}</span>
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            )
          })}

          {/* Financial Section */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Financial
            </p>
            {financialNavItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                    ${active
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white shadow-lg shadow-emerald-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <span className={active ? "text-emerald-400" : ""}>{item.icon}</span>
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Analytics Section */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Analytics
            </p>
            {analyticsNavItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                    ${active
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white shadow-lg shadow-emerald-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <span className={active ? "text-emerald-400" : ""}>{item.icon}</span>
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Compliance Section */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Compliance
            </p>
            {complianceNavItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                    ${active
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white shadow-lg shadow-emerald-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <span className={active ? "text-emerald-400" : ""}>{item.icon}</span>
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Operations Section */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Operations
            </p>
            {operationsNavItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                    ${active
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white shadow-lg shadow-emerald-500/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <span className={active ? "text-emerald-400" : ""}>{item.icon}</span>
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Export Section */}
          {permissions.canExportData && (
            <div className="pt-3 mt-3 border-t border-white/10">
              <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Exports
              </p>
              <Link
                href={`${baseUrl}/exports`}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                  ${pathname.startsWith(`${baseUrl}/exports`)
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white shadow-lg shadow-emerald-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-sm">Export Data</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/10">
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-xl glass-card border border-white/10 hover:border-emerald-500/30 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <span className="text-white font-bold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 glass-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <Link
                  href="/accountant/select-business"
                  className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setIsMobileOpen(false)
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                  <span>Switch Business</span>
                </Link>

                <Link
                  href="/change-password"
                  className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setIsMobileOpen(false)
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Change Password</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-white/5 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Permission Badges */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {permissions.canConfirmPayments && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Confirm Payments
              </span>
            )}
            {permissions.canExportData && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                Export Data
              </span>
            )}
            {permissions.canViewProfitMargins && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                View Profits
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 z-40">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.slice(0, 4).map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                  ${active ? "text-emerald-400" : "text-gray-400"}
                `}
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
