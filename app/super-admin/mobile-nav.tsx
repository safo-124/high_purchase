"use client"

import { useState } from "react"
import Link from "next/link"

type NavSection = {
  label: string
  links: { href: string; label: string }[]
}

export function MobileNav({
  links,
  activeHref,
  sections,
}: {
  links: { href: string; label: string }[]
  activeHref: string
  sections: NavSection[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Hamburger button - visible on mobile/tablet */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        aria-label="Open navigation menu"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900/95 border-r border-white/10 shadow-2xl overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl logo-glow flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">High Purchase</h2>
                  <p className="text-[10px] text-slate-400">Super Admin</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 space-y-4">
              {sections.map(section => (
                <div key={section.label}>
                  <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium px-3 mb-1">
                    {section.label}
                  </h3>
                  <div className="space-y-0.5">
                    {section.links.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeHref === link.href
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
