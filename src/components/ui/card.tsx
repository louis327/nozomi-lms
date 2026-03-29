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
          bg-nz-bg-card/80 backdrop-blur-xl
          border border-nz-border
          ${hoverable ? 'transition-all duration-300 hover:border-nz-border-hover hover:bg-nz-bg-elevated/60 hover:shadow-lg hover:shadow-nz-sakura/5' : ''}
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
