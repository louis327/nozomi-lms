'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  mono?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, mono, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-nz-text-secondary font-heading"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl
            bg-nz-bg-tertiary border border-nz-border
            text-nz-text-primary placeholder:text-nz-text-muted
            focus:outline-none focus:border-nz-sakura/40 focus:ring-1 focus:ring-nz-sakura/20
            transition-all duration-200
            ${mono ? 'font-mono text-sm' : 'font-sans'}
            ${error ? 'border-nz-error/50 focus:border-nz-error/70 focus:ring-nz-error/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-nz-error mt-0.5">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
export type { InputProps }
