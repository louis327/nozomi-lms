'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

const variants = {
  primary: 'bg-ink text-ink-inverted hover:bg-black',
  accent: 'bg-accent text-white hover:bg-accent-deep',
  secondary: 'bg-surface border border-line text-ink hover:border-line-strong hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink hover:bg-surface-muted',
  outline: 'bg-transparent border border-line-strong text-ink hover:bg-surface',
  danger: 'bg-surface border border-line text-error hover:bg-surface-muted',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-[12px] rounded-full gap-1.5',
  md: 'px-4 py-2 text-[13px] rounded-full gap-2',
  lg: 'px-6 py-2.5 text-[14px] rounded-full gap-2',
} as const

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => {
    const isDisabled = disabled || loading
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium
          transition-colors duration-150 cursor-pointer whitespace-nowrap
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas
          ${variants[variant]}
          ${sizes[size]}
          ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
export type { ButtonProps }
