import { ReactNode } from 'react'

const badgeVariants = {
  accent: 'bg-accent-soft text-accent-deep',
  success: 'bg-[#dcfce7] text-success',
  warning: 'bg-[#fef3c7] text-warning',
  neutral: 'bg-surface-muted text-ink-soft',
  dark: 'bg-ink text-ink-inverted',
  outline: 'bg-transparent text-ink border border-line-strong',
} as const

type BadgeProps = {
  variant?: keyof typeof badgeVariants
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5
        text-[10px] font-semibold uppercase tracking-[0.08em]
        rounded-full
        ${badgeVariants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
