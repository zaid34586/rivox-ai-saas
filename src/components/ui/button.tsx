"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button variants map1:1 onto tokens registered in the `@theme inline`
 * block in globals.css, so every class below actually compiles.
 * `cn()` runs tailwind-merge, so a caller's className reliably wins over
 * the variant/size defaults (e.g. `<Button size="icon" className="h-8 w-8">`).
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "text-sm font-medium leading-snug no-underline cursor-pointer",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Solid emerald + depth at rest, glow + lift on hover
        default:
          "bg-primary text-primary-foreground shadow-lift hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0 active:bg-primary-pressed",
        primary:
          "bg-primary text-primary-foreground shadow-lift hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0 active:bg-primary-pressed",
        secondary:
          "border border-border bg-surface text-foreground hover:bg-surface-hover hover:border-border-hover",
        // 1px border, hover fills with surface
        outline:
          "border border-border bg-transparent text-foreground hover:bg-surface hover:border-border-hover",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        accent:
          "bg-gold text-gold-foreground shadow-lift hover:bg-gold-hover hover:-translate-y-0.5 hover:shadow-gold active:translate-y-0 active:bg-gold-pressed",
        destructive:
          "bg-destructive text-destructive-foreground hover:-translate-y-0.5 active:translate-y-0 active:opacity-90",
        link:
          "bg-transparent text-primary underline underline-offset-4 hover:text-primary-hover",
      },
      size: {
        sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-11 gap-2 rounded-lg px-6 text-base",
        icon: "h-10 w-10 rounded-md p-0",
        "icon-sm": "h-8 w-8 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className, loading && "relative")}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        {...props}
      >
        {asChild ? (
          // Slot requires exactly one element child — no spinner node here.
          children
        ) : (
          <>
            {loading && (
          <svg
            className="animate-spin"
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
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" strokeWidth="3">
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
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
