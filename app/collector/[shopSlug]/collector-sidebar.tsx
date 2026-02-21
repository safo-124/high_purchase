"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

interface CollectorSidebarProps {
  shopSlug: string
  shopName: string
  collectorName: string
  businessName: string
  businessLogoUrl: string | null
  unreadMessageCount?: number
  canSellProducts?: boolean
  canCreateCustomers?: boolean
}

export function CollectorSidebar({
  shopSlug,
  shopName,
  collectorName,
  businessName,
  businessLogoUrl,
  unreadMessageCount = 0,
  canSellProducts = false,
}: CollectorSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isMobileOpen])

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

  const baseUrl = `/collector/${shopSlug}`

  const isActive = (href: string) => {
    if (href.includes("/dashboard")) return pathname === href
    return pathname.startsWith(href)
  }

  const initials = collectorName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // ============ NAV SECTIONS ============
  interface NavItem {
    name: string
    href: string
    icon: React.ReactNode
    badge?: number
    highlight?: boolean
  }

  interface NavSection {
    label: string
    items: NavItem[]
  }

  const navSections: NavSection[] = [
    {
      label: "Overview",
      items: [
        {
          name: "Dashboard",
          href: `${baseUrl}/dashboard`,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
            </svg>
          ),
        },
        ...(canSellProducts
          ? [
              {
                name: "New Sale",
                href: `${baseUrl}/new-sale`,
                highlight: true,
                icon: (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                ),
              },
            ]
          : []),
      ],
    },
    {
      label: "Collections",
      items: [
        {
          name: "Customers",
          href: `${baseUrl}/customers`,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          name: "Payments",
          href: `${baseUrl}/payments`,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: "Wallets",
          href: `${baseUrl}/wallet`,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Tools",
      items: [
        ...(canSellProducts
          ? [
              {
                name: "Products",
                href: `${baseUrl}/products`,
                icon: (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
              },
            ]
          : []),
        {
          name: "Invoices",
          href: `${baseUrl}/invoices`,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: "Receipts",
          href: `${baseUrl}/receipts`,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
        {
          name: "Chat",
          href: `${baseUrl}/chat`,
          badge: unreadMessageCount,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          name: "Daily Report",
          href: `${baseUrl}/reports`,
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ],
    },
  ]

  // ============ MOBILE BOTTOM NAV ============
  const mobileBottomItems: { name: string; href: string; icon: React.ReactNode; highlight?: boolean }[] = [
    {
      name: "Home",
      href: `${baseUrl}/dashboard`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ]

  if (canSellProducts) {
    mobileBottomItems.push({
      name: "Sale",
      href: `${baseUrl}/new-sale`,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    })
  }

  mobileBottomItems.push(
    {
      name: "Customers",
      href: `${baseUrl}/customers`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
      name: "More",
      href: "#more",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  )

  // ============ RENDER ============
  return (
    <>
      {/* ===== MOBILE TOP BAR ===== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-header">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3 min-w-0">
            {businessLogoUrl ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                <Image src={businessLogoUrl} alt={businessName} width={32} height={32} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                <span className="text-xs font-bold text-white">{businessName.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{shopName}</p>
              <p className="text-[10px] text-slate-500 truncate leading-tight">{businessName}</p>
            </div>
          </div>

          {/* Unread badge + hamburger */}
          <div className="flex items-center gap-1">
            {unreadMessageCount > 0 && (
              <Link
                href={`${baseUrl}/chat`}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1 ring-2 ring-slate-900">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              </Link>
            )}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MOBILE OVERLAY ===== */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* ===== SIDEBAR (shared mobile slide-over + desktop fixed) ===== */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col
          w-[280px] lg:w-[260px]
          bg-[#0c1222]/95 backdrop-blur-2xl
          border-r border-white/[0.06]
          transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
          lg:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ── Brand Header ── */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] flex-shrink-0">
          {businessLogoUrl ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 flex-shrink-0">
              <Image src={businessLogoUrl} alt={businessName} width={36} height={36} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <span className="text-sm font-bold text-white">{businessName.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[13px] font-bold text-white truncate leading-tight">{shopName}</h1>
            <p className="text-[11px] text-slate-500 truncate leading-tight">{businessName}</p>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 -mr-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500/80">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                        ${
                          active
                            ? "bg-emerald-500/[0.12] text-emerald-400"
                            : item.highlight
                            ? "text-emerald-400/80 hover:bg-emerald-500/[0.08] hover:text-emerald-400"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                        }
                      `}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      )}

                      <span
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                          ${
                            active
                              ? "bg-emerald-500/20 text-emerald-400"
                              : item.highlight
                              ? "bg-emerald-500/10 text-emerald-400/80 group-hover:bg-emerald-500/15"
                              : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.06] group-hover:text-slate-200"
                          }
                        `}
                      >
                        {item.icon}
                      </span>

                      <span className="flex-1 truncate">{item.name}</span>

                      {item.badge != null && item.badge > 0 && (
                        <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 shadow-lg shadow-red-500/30">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User Profile Footer ── */}
        <div className="flex-shrink-0 border-t border-white/[0.06]">
          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/20">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{collectorName}</p>
              <p className="text-[11px] text-slate-500 truncate">Debt Collector</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            <Link
              href="/change-password"
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all text-xs font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Password
            </Link>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-all text-xs font-medium disabled:opacity-50"
            >
              {isSigningOut ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              {isSigningOut ? "Wait..." : "Sign Out"}
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-header border-t border-white/[0.06] pb-safe">
        <div className="flex items-stretch h-14">
          {mobileBottomItems.map((item) => {
            if (item.href === "#more") {
              return (
                <button
                  key={item.name}
                  onClick={() => setIsMobileOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-500 active:bg-white/5 transition-colors"
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              )
            }

            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-0.5 relative active:bg-white/5 transition-colors
                  ${item.highlight ? "text-emerald-400" : active ? "text-emerald-400" : "text-slate-500"}
                `}
              >
                {/* Active dot indicator */}
                {active && !item.highlight && (
                  <span className="absolute top-1 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                )}

                {item.highlight ? (
                  <div className="w-10 h-10 -mt-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-[#0c1222]">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                ) : (
                  item.icon
                )}
                <span className={`text-[10px] font-medium ${item.highlight ? "mt-0" : ""}`}>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
