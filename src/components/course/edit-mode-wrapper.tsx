'use client'

import { EditModeProvider } from '@/lib/edit-mode-context'
import { EditModeToggle } from '@/components/course/edit-mode-toggle'
import { ToastProvider } from '@/components/ui/toast'

export function EditModeWrapper({
  isAdmin,
  defaultEditMode = false,
  children,
}: {
  isAdmin: boolean
  defaultEditMode?: boolean
  children: React.ReactNode
}) {
  return (
    <EditModeProvider isAdmin={isAdmin} defaultEditMode={defaultEditMode}>
      <ToastProvider>
        {children}
        <EditModeToggle />
      </ToastProvider>
    </EditModeProvider>
  )
}
