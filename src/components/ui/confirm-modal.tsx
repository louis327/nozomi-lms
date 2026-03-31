'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-nz-bg-secondary border border-nz-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${variant === 'danger' ? 'bg-nz-error/10' : 'bg-nz-sakura/10'}`}>
              <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-nz-error' : 'text-nz-sakura'}`} />
            </div>
            <div>
              <h3 className="text-sm font-heading font-semibold text-nz-text-primary">{title}</h3>
              <p className="text-xs text-nz-text-tertiary mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-nz-border bg-nz-bg-primary/30">
          <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
