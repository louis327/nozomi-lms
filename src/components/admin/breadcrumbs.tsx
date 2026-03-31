'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-nz-text-muted mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-nz-text-tertiary hover:text-nz-sakura transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-nz-text-secondary font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
