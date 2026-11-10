"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "error" | "outline" | "secondary" | "destructive"
  size?: "sm" | "md" | "lg"
}

function Badge({ className, variant = "default", size = "md", ...props }: BadgeProps) {
  const variantStyles = {
    default: "badge-default",
    primary: "badge-primary",
    accent: "badge-accent",
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
    outline: "badge-outline",
    secondary: "badge-default",
    destructive: "badge-error",
  }
  
  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  }
  
  return (
    <span
      className={cn(
        "badge inline-flex items-center justify-center font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
}
Badge.displayName = "Badge"

export { Badge }