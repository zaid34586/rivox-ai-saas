"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info" | "accent"
  size?: "default" | "sm" | "lg"
}

function Badge({ className, variant = "default", size = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "primary" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info" | "accent"; size?: "default" | "sm" | "lg" }) {
  const variantStyles = {
    default: "badge-default",
    primary: "badge-primary",
    secondary: "badge-secondary",
    outline: "badge-outline",
    destructive: "badge-error",
    success: "badge-success",
    warning: "badge-warning",
    info: "bg-info-soft text-info-fg",
    accent: "badge-accent",
  }

  const sizeStyles = {
    default: "px-2.5 py-0.5 text-xs",
    sm: "px-2 py-0.5 text-[10px]",
    lg: "px-3 py-1 text-sm",
  }

  return (
    <span className={cn("inline-flex items-center justify-center rounded-full font-medium transition-colors", variantStyles[variant], sizeStyles[size], className)} {...props} />
  )
}

export { Badge }