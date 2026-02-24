import Link from "next/link"
import { requireSuperAdmin } from "../../lib/auth"
import { LogoutButton } from "./logout-button"
import { MobileNav } from "./mobile-nav"
import { ThemeToggle } from "./theme-toggle"

const NAV_SECTIONS = [
  {
    label: "Core",
    links: [
      { href: "/super-admin", label: "Dashboard" },
      { href: "/super-admin/businesses", label: "Businesses" },
      { href: "/super-admin/users", label: "Users" },
      { href: "/super-admin/audit-logs", label: "Audit Logs" },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/super-admin/analytics", label: "Analytics" },
      { href: "/super-admin/health", label: "Health" },
      { href: "/super-admin/revenue", label: "Revenue" },
    ],
  },
  {
    label: "Communication",
    links: [
      { href: "/super-admin/messages", label: "Messages" },
      { href: "/super-admin/announcements", label: "Announcements" },
      { href: "/super-admin/tickets", label: "Tickets" },
      { href: "/super-admin/email-templates", label: "Templates" },
    ],
  },
  {
    label: "Billing",
    links: [
      { href: "/super-admin/subscriptions", label: "Subscriptions" },
      { href: "/super-admin/coupons", label: "Coupons" },
      { href: "/super-admin/invoices", label: "Invoices" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/super-admin/registrations", label: "Registrations" },
      { href: "/super-admin/settings", label: "Settings" },
      { href: "/super-admin/login-activity", label: "Login Log" },
      { href: "/super-admin/permissions", label: "Permissions" },
      { href: "/super-admin/site-content", label: "Site Content" },
      { href: "/super-admin/export", label: "Export" },
    ],
  },
]

// Flat list for mobile nav
const ALL_NAV_LINKS = NAV_SECTIONS.flatMap(s => s.links)

export async function SuperAdminShell({
  children,
  activeHref,
}: {
  children: React.ReactNode
  activeHref: string
}) {
  const user = await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-mesh">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <header className="relative z-10 glass-header">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Nav Toggle */}
              <MobileNav links={ALL_NAV_LINKS} activeHref={activeHref} sections={NAV_SECTIONS} />
              <div className="w-11 h-11 rounded-xl logo-glow flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">High Purchase</h1>
                <p className="text-xs text-slate-400">Super Admin Portal</p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1 flex-wrap">
              {NAV_SECTIONS.map(section => (
                <div key={section.label} className="flex items-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider px-1 hidden xl:inline">{section.label}</span>
                  {section.links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`nav-link text-xs font-medium px-2 py-1 ${
                        activeHref === link.href
                          ? "active text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="w-px h-4 bg-white/10 mx-1 hidden xl:block" />
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-300">
                  {user.name?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full px-6 py-8">{children}</main>
    </div>
  )
}
