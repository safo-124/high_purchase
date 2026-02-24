import Link from "next/link"
import { requireSuperAdmin } from "../../lib/auth"
import { LogoutButton } from "./logout-button"

const NAV_LINKS = [
  { href: "/super-admin", label: "Dashboard" },
  { href: "/super-admin/businesses", label: "Businesses" },
  { href: "/super-admin/users", label: "Users" },
  { href: "/super-admin/audit-logs", label: "Audit Logs" },
  { href: "/super-admin/messages", label: "Messages" },
  { href: "/super-admin/registrations", label: "Registrations" },
  { href: "/super-admin/subscriptions", label: "Subscriptions" },
  { href: "/super-admin/site-content", label: "Site Content" },
]

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

            <nav className="hidden md:flex items-center gap-2">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link text-sm font-medium ${
                    activeHref === link.href
                      ? "active text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
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
