'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useEditMode } from '@/lib/edit-mode-context'
import { updateSectionStatus } from '@/lib/block-actions'
import { useToast } from '@/components/ui/toast'

type Props = {
  sectionId: string
  status: 'draft' | 'published'
}

export function SectionStatusToggle({ sectionId, status }: Props) {
  const { editMode } = useEditMode()
  const { addToast } = useToast()
  const router = useRouter()
  const [local, setLocal] = useState<'draft' | 'published'>(status)
  const [, startTransition] = useTransition()

  const toggle = useCallback(async () => {
    const next = local === 'published' ? 'draft' : 'published'
    setLocal(next)
    try {
      await updateSectionStatus(sectionId, next)
      addToast(next === 'draft' ? 'Section moved to draft' : 'Section published', 'success')
      startTransition(() => router.refresh())
    } catch (err) {
      setLocal(local)
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error')
    }
  }, [sectionId, local, addToast, router])

  if (!editMode) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
        local === 'draft'
          ? 'bg-surface-muted text-ink-muted hover:bg-surface-muted/70'
          : 'bg-success/10 text-success hover:bg-success/15'
      }`}
      title={local === 'draft' ? 'Click to publish' : 'Click to move to draft'}
    >
      {local === 'draft' ? (
        <EyeOff className="w-3 h-3" strokeWidth={2.25} />
      ) : (
        <Eye className="w-3 h-3" strokeWidth={2.25} />
      )}
      {local === 'draft' ? 'Draft' : 'Published'}
    </button>
  )
}
