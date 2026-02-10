"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function LandingNavLinks() {
  const pathname = usePathname()

  const links = [
    { href: "/features", label: "Features" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ]

  return (
    <div className="hidden md:flex items-center gap-1">
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isActive
                ? "text-purple-300 bg-purple-500/10"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
