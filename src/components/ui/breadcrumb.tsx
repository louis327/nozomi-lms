import { Fragment } from 'react'
import Link from 'next/link'

type BreadcrumbProps = {
  items: { label: string; href?: string }[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <Fragment key={i}>
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-ink transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-ink font-semibold' : ''}>{item.label}</span>
            )}
            {!isLast && <span className="text-ink-faint">/</span>}
          </Fragment>
        )
      })}
    </nav>
  )
}
