'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

const variants = {
  primary:
    'bg-nz-sakura text-white hover:bg-nz-sakura-deep active:bg-nz-sakura-muted sakura-glow',
  secondary:
    'bg-transparent border border-nz-border text-nz-text-primary hover:border-nz-border-hover hover:bg-nz-bg-elevated',
  danger:
    'bg-nz-error/20 text-nz-error border border-nz-error/30 hover:bg-nz-error/30',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
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
          inline-flex items-center justify-center font-heading font-semibold
          transition-all duration-200 cursor-pointer
          focus:ring-2 focus:ring-nz-sakura/30 focus:ring-offset-2 focus:ring-offset-nz-bg-primary
          ${variants[variant]}
          ${sizes[size]}
          ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
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
