'use client'

import { Search } from 'lucide-react'
import { InputHTMLAttributes, forwardRef } from 'react'

type PillSearchProps = InputHTMLAttributes<HTMLInputElement>

const PillSearch = forwardRef<HTMLInputElement, PillSearchProps>(
  ({ className = '', placeholder = 'Search...', ...props }, ref) => {
    return (
      <div
        className={`flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-full focus-within:border-ink transition-colors ${className}`}
      >
        <Search className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.5} />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
          {...props}
        />
      </div>
    )
  }
)

PillSearch.displayName = 'PillSearch'
export { PillSearch }
