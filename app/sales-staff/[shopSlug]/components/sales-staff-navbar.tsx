"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface SalesStaffNavbarProps {
  shopSlug: string
  shopName: string
  staffName: string | null
  rightContent?: React.ReactNode
}

export function SalesStaffNavbar({ shopSlug, shopName, staffName, rightContent }: SalesStaffNavbarProps) {
  const pathname = usePathname()

  const navLinks = [
    { href: `/sales-staff/${shopSlug}/dashboard`, label: "Dashboard" },
    { href: `/sales-staff/${shopSlug}/products`, label: "Products" },
    { href: `/sales-staff/${shopSlug}/customers`, label: "Customers" },
    { href: `/sales-staff/${shopSlug}/deliveries`, label: "Deliveries" },
    { href: `/sales-staff/${shopSlug}/new-sale`, label: "New Sale" },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-white/5">
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{shopName}</h1>
              <p className="text-sm text-slate-400">Sales Staff: {staffName || "Unknown"}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-sm font-medium ${
                  isActive(link.href)
                    ? "active text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {rightContent}
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" })
                  window.location.href = "/login"
                } catch {
                  window.location.href = "/login"
                }
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
