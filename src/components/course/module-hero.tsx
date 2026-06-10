'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useEditMode } from '@/lib/edit-mode-context'
import { useToast } from '@/components/ui/toast'

type ModuleHeroProps = {
  moduleId: string
  moduleNumber: number
  moduleTitle: string
  description: string | null
  courseTitle: string
  label?: string | null
  eyebrow?: string | null
}

async function patchModule(moduleId: string, patch: Record<string, unknown>) {
  const res = await fetch(`/api/admin/modules/${moduleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update module')
  }
  return res.json()
}

function InlineField({
  value,
  onSave,
  placeholder,
  className,
  style,
  multiline = false,
  editable,
}: {
  value: string
  onSave: (v: string) => Promise<void>
  placeholder: string
  className?: string
  style?: React.CSSProperties
  multiline?: boolean
  editable: boolean
}) {
  const [text, setText] = useState(value)
  const [saving, setSaving] = useState(false)
  const original = useRef(value)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-size the multiline textarea to its content so descriptions
  // that wrap to multiple lines don't get clipped to a single row.
  useEffect(() => {
    if (!multiline) return
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [text, multiline, value])

  const commit = useCallback(async () => {
    const trimmed = text.trim()
    if (trimmed === original.current) return
    if (!trimmed) {
      setText(original.current)
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed)
      original.current = trimmed
    } catch {
      setText(original.current)
    } finally {
      setSaving(false)
    }
  }, [text, onSave])

  if (!editable) {
    return (
      <span className={className} style={style}>
        {value || ''}
      </span>
    )
  }

  if (multiline) {
    return (
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            ;(e.target as HTMLTextAreaElement).blur()
          }
        }}
        rows={1}
        placeholder={placeholder}
        className={`bg-transparent w-full resize-none overflow-hidden border-b border-transparent hover:border-line-strong focus:border-accent focus:outline-none transition-colors ${className ?? ''} ${saving ? 'opacity-60' : ''}`}
        style={style}
      />
    )
  }

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      placeholder={placeholder}
      className={`bg-transparent w-full border-b border-transparent hover:border-line-strong focus:border-accent focus:outline-none transition-colors ${className ?? ''} ${saving ? 'opacity-60' : ''}`}
      style={style}
    />
  )
}

export function ModuleHero({
  moduleId,
  moduleNumber,
  moduleTitle,
  description,
  courseTitle,
  label,
  eyebrow,
}: ModuleHeroProps) {
  const { editMode, isAdmin } = useEditMode()
  const { addToast } = useToast()
  const editable = editMode && isAdmin

  const handleTitle = useCallback(async (v: string) => {
    try {
      await patchModule(moduleId, { title: v })
      addToast('Module title updated', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to update', 'error')
      throw e
    }
  }, [moduleId, addToast])

  const handleTagline = useCallback(async (v: string) => {
    try {
      await patchModule(moduleId, { description: v })
      addToast('Tagline updated', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to update', 'error')
      throw e
    }
  }, [moduleId, addToast])

  const handleLabel = useCallback(async (v: string) => {
    try {
      await patchModule(moduleId, { label: v })
      addToast('Module label updated', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to update', 'error')
      throw e
    }
  }, [moduleId, addToast])

  const handleEyebrow = useCallback(async (v: string) => {
    try {
      await patchModule(moduleId, { eyebrow: v })
      addToast('Eyebrow updated', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to update', 'error')
      throw e
    }
  }, [moduleId, addToast])

  const taglineValue = description ?? ''
  const defaultLabel = `Module ${moduleNumber}`
  const labelValue = label && label.trim() ? label : defaultLabel
  const eyebrowValue = eyebrow && eyebrow.trim() ? eyebrow : courseTitle

  return (
    <div className="mb-9 border-b border-line pb-7">
      <div className="mb-3.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
        <InlineField
          value={eyebrowValue}
          onSave={handleEyebrow}
          placeholder={courseTitle}
          editable={editable}
          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent"
        />
        <span className="text-ink-faint">·</span>
        <InlineField
          value={labelValue}
          onSave={handleLabel}
          placeholder={defaultLabel}
          editable={editable}
          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent"
        />
      </div>

      <h1 className="text-[34px] font-bold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[38px]">
        <InlineField
          value={moduleTitle}
          onSave={handleTitle}
          placeholder="Module title"
          editable={editable}
          className="text-[34px] font-bold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[38px]"
        />
      </h1>

      {(taglineValue || editable) && (
        <div className="mt-3 max-w-[560px]">
          <InlineField
            value={taglineValue}
            onSave={handleTagline}
            placeholder={editable ? 'Add a one-line tagline (optional)' : ''}
            editable={editable}
            multiline
            className="text-[16px] font-normal leading-[1.55] text-ink-soft sm:text-[16.5px]"
          />
        </div>
      )}
    </div>
  )
}
