"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "GET",
        credentials: "include",
      })
      
      if (response.redirected) {
        window.location.href = response.url
      } else {
        router.push("/login")
        router.refresh()
      }
    } catch {
      toast.error("Failed to logout")
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
      title="Logout"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="hidden md:inline text-sm">Logout</span>
    </button>
  )
}
