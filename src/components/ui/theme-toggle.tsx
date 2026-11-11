"use client"

import { useEffect, useSyncExternalStore } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'theme'
const THEME_CHANGE_EVENT = 'affipilot:theme-change'

/** Persist a theme choice and notify every subscriber (same tab + others). */
function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

function readTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme | null) || 'dark'
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
  }
}

/** Dark is the product default on the server and before a choice is saved. */
const serverTheme = 'dark' as const

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  // Dark is the product default; users can cycle to light/system.
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => serverTheme)

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
  ]

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-9 w-9 relative", className)}
        onClick={() => {
          const currentIndex = themes.findIndex(t => t.value === theme)
          saveTheme(themes[(currentIndex + 1) % themes.length].value)
        }}
        aria-label={`Current theme: ${theme}. Click to cycle.`}
      >
        {themes.map((t, i) => (
          <span
            key={t.value}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-200",
              theme === t.value
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-50 rotate-12"
            )}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            {t.icon}
          </span>
        ))}
      </Button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
           role="tooltip">
        <div className="bg-muted px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg">
          Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </div>
      </div>
    </div>
  )
}

// Theme provider wrapper for app directory
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | 'system' | null
    applyThemeClass(saved || 'dark')
  }, [])

  return <>{children}</>
}
