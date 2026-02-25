"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"

/* ── icon helper (inline SVG paths) ── */
const ICONS: Record<string, string> = {
  dashboard:
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  businesses:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  users:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  auditLogs:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  analytics:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  health:
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  revenue:
    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  messages:
    "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  announcements:
    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  tickets:
    "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
  templates:
    "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  subscriptions:
    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  coupons:
    "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  invoices:
    "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
  registrations:
    "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  loginLog:
    "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  permissions:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  siteContent:
    "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  export:
    "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
}

function NavIcon({ icon, className = "w-4 h-4" }: { icon: string; className?: string }) {
  const d = ICONS[icon]
  if (!d) return null
  // settings icon has two paths separated by " M"
  const paths = d.split(/(?= M)/)
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => (
        <path key={i} d={p.trim()} />
      ))}
    </svg>
  )
}

/* ── section colours ── */
const SECTION_COLORS: Record<string, { text: string; bg: string; border: string; icon: string; gradient: string }> = {
  Core: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", icon: "text-purple-400", gradient: "from-purple-500/20 to-purple-500/5" },
  Operations: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: "text-cyan-400", gradient: "from-cyan-500/20 to-cyan-500/5" },
  Communication: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "text-blue-400", gradient: "from-blue-500/20 to-blue-500/5" },
  Billing: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-500/5" },
  System: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "text-amber-400", gradient: "from-amber-500/20 to-amber-500/5" },
}

const SECTION_ICONS: Record<string, string> = {
  Core: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  Operations: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  Communication: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  Billing: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  System: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
}

/* ── link → icon mapping ── */
const LINK_ICONS: Record<string, string> = {
  Dashboard: "dashboard",
  Businesses: "businesses",
  Users: "users",
  "Audit Logs": "auditLogs",
  Analytics: "analytics",
  Health: "health",
  Revenue: "revenue",
  Messages: "messages",
  Announcements: "announcements",
  Tickets: "tickets",
  Templates: "templates",
  Subscriptions: "subscriptions",
  Coupons: "coupons",
  Invoices: "invoices",
  Registrations: "registrations",
  Settings: "settings",
  "Login Log": "loginLog",
  Permissions: "permissions",
  "Site Content": "siteContent",
  Export: "export",
}

/* ── link descriptions ── */
const LINK_DESCRIPTIONS: Record<string, string> = {
  Dashboard: "Overview & analytics",
  Businesses: "Manage all businesses",
  Users: "User management",
  "Audit Logs": "Track all changes",
  Analytics: "Deep platform insights",
  Health: "System health monitor",
  Revenue: "Revenue tracking",
  Messages: "Platform messaging",
  Announcements: "Broadcast updates",
  Tickets: "Support tickets",
  Templates: "Email templates",
  Subscriptions: "Plan management",
  Coupons: "Discount codes",
  Invoices: "Billing invoices",
  Registrations: "New registrations",
  Settings: "Platform config",
  "Login Log": "Login activity",
  Permissions: "Role management",
  "Site Content": "CMS pages",
  Export: "Export data",
}

export type NavSection = {
  label: string
  links: { href: string; label: string }[]
}

export function SuperAdminNavbar({
  sections,
  activeHref,
}: {
  sections: NavSection[]
  activeHref: string
}) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const allLinks = sections.flatMap((s) =>
    s.links.map((l) => ({ ...l, section: s.label }))
  )

  const filteredLinks = searchQuery.trim()
    ? allLinks.filter(
        (l) =>
          l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (LINK_DESCRIPTIONS[l.label] || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenSection(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
      if (e.key === "Escape") {
        setSearchOpen(false)
        setOpenSection(null)
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  // focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      setSearchQuery("")
    }
  }, [searchOpen])

  const handleSectionEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpenSection(label)
  }

  const handleSectionLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenSection(null), 200)
  }

  // Determine which section the active page belongs to
  const activeSection = sections.find((s) =>
    s.links.some((l) => l.href === activeHref)
  )?.label

  return (
    <div ref={navRef} className="hidden lg:flex items-center gap-1 relative">
      {/* Section Dropdown Triggers */}
      {sections.map((section) => {
        const colors = SECTION_COLORS[section.label] || SECTION_COLORS.Core
        const isOpen = openSection === section.label
        const isActive = activeSection === section.label

        return (
          <div
            key={section.label}
            className="relative"
            onMouseEnter={() => handleSectionEnter(section.label)}
            onMouseLeave={handleSectionLeave}
          >
            {/* Trigger Button */}
            <button
              onClick={() => setOpenSection(isOpen ? null : section.label)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                transition-all duration-200 relative group
                ${
                  isOpen
                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                    : isActive
                    ? `bg-white/[0.06] text-white border border-white/10`
                    : `text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent`
                }
              `}
            >
              <svg
                className={`w-3.5 h-3.5 ${isOpen ? colors.icon : isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"} transition-colors`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={SECTION_ICONS[section.label] || SECTION_ICONS.Core} />
              </svg>
              {section.label}
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
                  isOpen ? colors.icon : "text-slate-600"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>

              {/* Active indicator dot */}
              {isActive && !isOpen && (
                <span className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${colors.text.replace("text-", "bg-")}`} />
              )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
              <div
                className="absolute top-full left-0 mt-2 min-w-[240px] py-2 rounded-2xl
                  bg-slate-900/95 backdrop-blur-xl border border-white/10
                  shadow-2xl shadow-black/40 z-50
                  animate-in fade-in-0 slide-in-from-top-2 duration-200"
              >
                {/* Section header */}
                <div className={`px-4 py-2 mb-1 flex items-center gap-2`}>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colors.gradient} border ${colors.border} flex items-center justify-center`}>
                    <svg
                      className={`w-3.5 h-3.5 ${colors.icon}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={SECTION_ICONS[section.label] || SECTION_ICONS.Core} />
                    </svg>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                    {section.label}
                  </span>
                </div>

                <div className="px-2">
                  {section.links.map((link) => {
                    const isLinkActive = activeHref === link.href
                    const iconKey = LINK_ICONS[link.label]
                    const desc = LINK_DESCRIPTIONS[link.label]

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpenSection(null)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group/link
                          ${
                            isLinkActive
                              ? `bg-gradient-to-r ${colors.gradient} border ${colors.border} ${colors.text}`
                              : "text-slate-300 hover:bg-white/[0.05] hover:text-white border border-transparent"
                          }
                        `}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                            ${
                              isLinkActive
                                ? `bg-gradient-to-br ${colors.gradient} border ${colors.border}`
                                : "bg-white/[0.04] border border-white/5 group-hover/link:border-white/10"
                            }
                          `}
                        >
                          {iconKey && (
                            <NavIcon
                              icon={iconKey}
                              className={`w-4 h-4 ${isLinkActive ? colors.icon : "text-slate-500 group-hover/link:text-slate-300"} transition-colors`}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isLinkActive ? colors.text : ""}`}>
                            {link.label}
                          </p>
                          {desc && (
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{desc}</p>
                          )}
                        </div>
                        {isLinkActive && (
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.text.replace("text-", "bg-")} flex-shrink-0`} />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Separator */}
      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Search Button */}
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition-all"
        title="Search (Ctrl+K)"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden xl:inline">Search</span>
        <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-600 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/50 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
              />
              <kbd className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              {searchQuery.trim() === "" ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">Type to search pages...</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {sections.map((s) => {
                      const colors = SECTION_COLORS[s.label] || SECTION_COLORS.Core
                      return (
                        <span
                          key={s.label}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
                        >
                          {s.label} ({s.links.length})
                        </span>
                      )
                    })}
                  </div>
                </div>
              ) : filteredLinks.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">No pages found for &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredLinks.map((link) => {
                  const colors = SECTION_COLORS[link.section] || SECTION_COLORS.Core
                  const iconKey = LINK_ICONS[link.label]
                  const isLinkActive = activeHref === link.href

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => {
                        setSearchOpen(false)
                        setSearchQuery("")
                      }}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                        ${isLinkActive ? `bg-gradient-to-r ${colors.gradient} border ${colors.border}` : "hover:bg-white/[0.05] border border-transparent"}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isLinkActive ? `bg-gradient-to-br ${colors.gradient} border ${colors.border}` : "bg-white/[0.04] border border-white/5"}`}
                      >
                        {iconKey && (
                          <NavIcon icon={iconKey} className={`w-4 h-4 ${isLinkActive ? colors.icon : "text-slate-500"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isLinkActive ? colors.text : "text-white"}`}>
                          {link.label}
                        </p>
                        <p className="text-[10px] text-slate-500">{link.section}</p>
                      </div>
                      <svg
                        className="w-4 h-4 text-slate-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
