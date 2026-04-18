import { HTMLAttributes, forwardRef } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  tone?: 'default' | 'muted' | 'dark'
}

const padMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
} as const

const toneMap = {
  default: 'bg-surface border border-line',
  muted: 'bg-surface-muted border border-line-soft',
  dark: 'bg-surface-dark border border-line-dark text-ink-inverted',
} as const

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable, padding = 'md', tone = 'default', children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-2xl
          ${toneMap[tone]}
          ${padMap[padding]}
          ${hoverable ? 'transition-colors duration-200 hover:border-line-strong' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
export { Card }
export type { CardProps }
