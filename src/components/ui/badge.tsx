import { ReactNode } from 'react'

const badgeVariants = {
  sakura: 'bg-[#fdf2f8] text-nz-sakura border-[#fce7f3]',
  success: 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]',
  warning: 'bg-[#fffbeb] text-[#d97706] border-[#fef3c7]',
  neutral: 'bg-[#f5f5f5] text-[#666] border-[#e8e8e8]',
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
        inline-flex items-center px-2 py-0.5
        text-[11px] font-semibold font-heading
        rounded-md border
        ${badgeVariants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
