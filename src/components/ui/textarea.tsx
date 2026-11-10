"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  label?: string
  hint?: string
}

function Textarea({ className, error, label, hint, id, ...rest }: TextareaProps) {
  const textareaId = id || React.useId()
  
  // Extract custom props
  const textareaProps = rest as Omit<TextareaProps, "error" | "label" | "hint" | "id" | "className">
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn("input min-h-[100px] resize-y", error && "input-error", className)}
        aria-invalid={error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...textareaProps}
      />
      {error && (
        <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${textareaId}-hint`} className="mt-1.5 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}
Textarea.displayName = "Textarea"

export { Textarea }