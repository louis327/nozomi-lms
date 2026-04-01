'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

const variants = {
  primary:
    'bg-nz-sakura text-white hover:bg-nz-sakura-deep active:bg-nz-sakura-muted',
  secondary:
    'bg-white border border-[#e8e8e8] text-[#111] hover:border-[#ccc] hover:bg-[#fafafa]',
  dark:
    'bg-[#111] text-white hover:bg-[#333]',
  danger:
    'bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] hover:bg-[#fee2e2]',
} as const

const sizes = {
  sm: 'px-3.5 py-1.5 text-[13px] rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-[13px] rounded-lg gap-2',
  lg: 'px-7 py-3 text-[14px] rounded-lg gap-2.5',
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
          focus-visible:ring-2 focus-visible:ring-[#111] focus-visible:ring-offset-2
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
