import { requireSuperAdmin } from "../../lib/auth"
import { LogoutButton } from "./logout-button"
import { MobileNav } from "./mobile-nav"
import { ThemeToggle } from "./theme-toggle"
import { SuperAdminNavbar } from "./super-admin-navbar"

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

      <header className="sticky top-0 z-30 glass-header border-b border-white/[0.06]">
        <div className="w-full px-4 lg:px-6">
          <div className="flex items-center h-16 gap-4">
            {/* Left: Logo + Mobile nav */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <MobileNav links={ALL_NAV_LINKS} activeHref={activeHref} sections={NAV_SECTIONS} />
              <div className="w-10 h-10 rounded-xl logo-glow flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-white tracking-tight leading-tight">High Purchase</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Super Admin</p>
              </div>
            </div>

            {/* Separator */}
            <div className="hidden lg:block w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            {/* Center: Dropdown Nav */}
            <SuperAdminNavbar sections={NAV_SECTIONS} activeHref={activeHref} />

            {/* Right: Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />
              <div className="hidden lg:block w-px h-6 bg-white/10" />
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.email}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-purple-300">
                    {user.name?.charAt(0).toUpperCase() || "A"}
                  </span>
                </div>
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
