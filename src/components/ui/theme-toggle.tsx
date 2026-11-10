"use client"

import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('theme', theme)
    
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme, mounted])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)} disabled>
        <Monitor className="h-4 w-4 animate-pulse" />
      </Button>
    )
  }

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
          setTheme(themes[(currentIndex + 1) % themes.length].value)
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Apply saved theme immediately
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    const theme = saved || 'system'
    
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}