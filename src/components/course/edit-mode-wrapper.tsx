'use client'

import { EditModeProvider, useEditMode } from '@/lib/edit-mode-context'
import { EditModeToggle } from '@/components/course/edit-mode-toggle'
import { ToastProvider } from '@/components/ui/toast'
import { AiChat } from '@/components/admin/ai-chat'

function EditModeAiChat() {
  const { isAdmin, editMode } = useEditMode()
  if (!isAdmin || !editMode) return null
  return <AiChat rightOffset={160} />
}

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
        <EditModeAiChat />
      </ToastProvider>
    </EditModeProvider>
  )
}
