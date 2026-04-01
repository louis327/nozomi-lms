import { HTMLAttributes, forwardRef } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable, children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-2xl
          bg-nz-bg-card
          border border-nz-border
          shadow-sm
          ${hoverable ? 'transition-all duration-300 hover:border-nz-border-hover hover:shadow-md' : ''}
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
