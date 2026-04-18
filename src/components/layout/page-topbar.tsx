'use client'

import { Bell } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PillSearch } from '@/components/ui/pill-search'

type PageTopbarProps = {
  breadcrumb: { label: string; href?: string }[]
  searchPlaceholder?: string
}

export function PageTopbar({ breadcrumb, searchPlaceholder = 'Search courses, lessons, teachers...' }: PageTopbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 pt-7 pb-2">
      <Breadcrumb items={breadcrumb} />
      <div className="flex items-center gap-3">
        <PillSearch placeholder={searchPlaceholder} className="hidden md:flex w-[320px]" />
        <button
          className="w-9 h-9 rounded-full bg-surface border border-line hover:border-line-strong text-ink-soft hover:text-ink transition-colors flex items-center justify-center relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" strokeWidth={1.5} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>
      </div>
    </div>
  )
}
