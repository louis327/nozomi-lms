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
      <h1
        className="display text-[28px] sm:text-[34px] mb-6 leading-[1.15] break-words text-left"
        style={{ overflowWrap: 'anywhere', marginLeft: 0, paddingLeft: 0, textAlign: 'left' }}
      >
        {title}
      </h1>
    )
  }

  return (
    <div className="relative mb-6 group">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        rows={1}
        className="w-full display text-[28px] sm:text-[34px] leading-[1.15] bg-transparent border-b-2 border-transparent focus:border-accent/40 hover:border-line transition-colors focus:outline-none resize-none break-words text-left"
        style={{ overflowWrap: 'anywhere', marginLeft: 0, paddingLeft: 0, textAlign: 'left' }}
      />
      {saving && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
