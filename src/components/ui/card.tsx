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
          rounded-xl
          bg-white
          border border-[#e8e8e8]
          ${hoverable ? 'transition-all duration-200 hover:border-[#d4d4d4] hover:shadow-sm' : ''}
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
