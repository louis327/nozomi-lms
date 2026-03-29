import { ReactNode } from 'react'

const badgeVariants = {
  sakura: 'bg-nz-sakura/10 text-nz-sakura border-nz-sakura/20',
  success: 'bg-nz-success/10 text-nz-success border-nz-success/20',
  warning: 'bg-nz-warning/10 text-nz-warning border-nz-warning/20',
  neutral: 'bg-nz-bg-tertiary text-nz-text-secondary border-nz-border',
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
        inline-flex items-center px-2.5 py-0.5
        text-xs font-medium font-heading
        rounded-full border
        ${badgeVariants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
