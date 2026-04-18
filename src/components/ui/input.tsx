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
          <label htmlFor={inputId} className="eyebrow">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl
            bg-surface border border-line
            text-ink placeholder:text-ink-faint
            focus:outline-none focus:border-ink focus:ring-0
            transition-colors duration-150
            text-[14px]
            ${mono ? 'font-mono text-[13px]' : 'font-sans'}
            ${error ? 'border-error' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-[12px] text-error mt-0.5">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
export type { InputProps }
