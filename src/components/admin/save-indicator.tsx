'use client'

import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const statusConfig = {
  idle: { icon: Cloud, text: '', className: 'text-nz-text-muted' },
  saving: { icon: Loader2, text: 'Saving...', className: 'text-nz-sakura' },
  saved: { icon: Check, text: 'Saved', className: 'text-nz-success' },
  error: { icon: AlertCircle, text: 'Save failed', className: 'text-nz-error' },
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${config.className} transition-opacity`}>
      <Icon className={`w-3.5 h-3.5 ${status === 'saving' ? 'animate-spin' : ''}`} />
      {config.text}
    </div>
  )
}
