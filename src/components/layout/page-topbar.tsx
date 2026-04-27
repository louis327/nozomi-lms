'use client'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PillSearch } from '@/components/ui/pill-search'
import { NotificationBell } from '@/components/layout/notification-bell'

type PageTopbarProps = {
  breadcrumb: { label: string; href?: string }[]
  searchPlaceholder?: string
}

export function PageTopbar({ breadcrumb, searchPlaceholder = 'Search courses, lessons...' }: PageTopbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 pt-7 pb-2">
      <Breadcrumb items={breadcrumb} />
      <div className="flex items-center gap-3">
        <PillSearch placeholder={searchPlaceholder} className="hidden md:block w-[320px]" />
        <NotificationBell />
      </div>
    </div>
  )
}
