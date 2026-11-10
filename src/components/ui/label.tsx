"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("label", className)}
      {...props}
    >
      {children}
    </label>
  )
)
Label.displayName = "Label"

export { Label }