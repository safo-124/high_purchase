"use client"

import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const stored = localStorage.getItem("sa-theme") as "dark" | "light" | null
    if (stored === "light") {
      setTheme("light")
      document.documentElement.classList.add("light-mode")
    }
  }, [])

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("sa-theme", next)
    if (next === "light") {
      document.documentElement.classList.add("light-mode")
    } else {
      document.documentElement.classList.remove("light-mode")
    }
  }

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all light-mode:bg-slate-200 light-mode:hover:bg-slate-300 light-mode:border-slate-300"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}
