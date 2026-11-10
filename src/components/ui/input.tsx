"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  label?: string
  hint?: string
}

function Input({ className, error, label, hint, id, type = "text", ...rest }: InputProps) {
  const inputId = id || React.useId()
  
  // Extract custom props that shouldn't be passed to input
  const inputProps = rest as Omit<InputProps, "error" | "label" | "hint" | "id" | "type" | "className">
  
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
        aria-invalid={error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...inputProps}
      />
      {error && (
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
Input.displayName = "Input"

export { Input }