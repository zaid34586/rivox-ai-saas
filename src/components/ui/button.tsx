"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "accent" | "destructive" | "default" | "link"
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm"
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const baseStyles = "btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
    
    const variantStyles = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      outline: "btn-outline",
      accent: "btn-accent",
      destructive: "btn-destructive",
      default: "btn-secondary",
      link: "btn-ghost",
    }
    
    const sizeStyles = {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
      icon: "btn-icon",
      "icon-sm": "btn-icon-sm",
    }
    
    return (
      <Comp
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              strokeLinecap="round"
              strokeWidth="3"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button }