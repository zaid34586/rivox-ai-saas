"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** `true` marks the field invalid; a string also renders as the message. */
  error?: boolean | string
  label?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, hint, id, ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id || autoId
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn("input", error && "input-error", className)}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={typeof error === 'string' ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {typeof error === 'string' && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }