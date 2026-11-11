"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** `true` marks the field invalid; a string also renders as the message. */
  error?: boolean | string
  label?: string
  hint?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, hint, id, ...props }, ref) => {
    const autoId = React.useId()
    const textareaId = id || autoId
    
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
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={typeof error === 'string' ? `${textareaId}-error` : undefined}
          {...props}
        />
        {typeof error === 'string' && (
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
)
Textarea.displayName = "Textarea"

export { Textarea }