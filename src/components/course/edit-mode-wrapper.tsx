'use client'

import { EditModeProvider } from '@/lib/edit-mode-context'
import { EditModeToggle } from '@/components/course/edit-mode-toggle'
import { ToastProvider } from '@/components/ui/toast'

export function EditModeWrapper({
  isAdmin,
  children,
}: {
  isAdmin: boolean
  children: React.ReactNode
}) {
  return (
    <EditModeProvider isAdmin={isAdmin}>
      <ToastProvider>
        {children}
        <EditModeToggle />
      </ToastProvider>
    </EditModeProvider>
  )
}
