'use client'

import { useState, useRef, useCallback } from 'react'
import { useEditMode } from '@/lib/edit-mode-context'
import { updateSectionTitle } from '@/lib/block-actions'
import { useToast } from '@/components/ui/toast'

type InlineSectionTitleProps = {
  sectionId: string
  title: string
}

export function InlineSectionTitle({ sectionId, title }: InlineSectionTitleProps) {
  const { editMode } = useEditMode()
  const { addToast } = useToast()
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState(false)
  const originalRef = useRef(title)

  const handleBlur = useCallback(async () => {
    const trimmed = value.trim()
    if (trimmed === originalRef.current) return
    if (!trimmed) {
      setValue(originalRef.current)
      return
    }

    setSaving(true)
    try {
      await updateSectionTitle(sectionId, trimmed)
      originalRef.current = trimmed
      addToast('Title updated', 'success')
    } catch (err) {
      setValue(originalRef.current)
      addToast(err instanceof Error ? err.message : 'Failed to update title', 'error')
    } finally {
      setSaving(false)
    }
  }, [sectionId, value, addToast])

  if (!editMode) {
    return (
      <h1 className="display text-[40px] sm:text-[48px] mb-10 leading-[1.1]">
        {title}
      </h1>
    )
  }

  return (
    <div className="relative mb-10 group">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className="w-full display text-[40px] sm:text-[48px] leading-[1.1] bg-transparent border-b-2 border-transparent focus:border-accent/40 hover:border-line transition-colors focus:outline-none"
      />
      {saving && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
