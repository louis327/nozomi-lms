'use client'

import { useState, useRef, useCallback } from 'react'
import { useEditMode } from '@/lib/edit-mode-context'
import { useToast } from '@/components/ui/toast'

type ModuleHeroProps = {
  moduleId: string
  moduleNumber: number
  moduleTitle: string
  description: string | null
  courseTitle: string
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
        className={`bg-transparent w-full resize-none border-b border-transparent hover:border-white/20 focus:border-white/40 focus:outline-none transition-colors ${className ?? ''} ${saving ? 'opacity-60' : ''}`}
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
      className={`bg-transparent w-full border-b border-transparent hover:border-white/20 focus:border-white/40 focus:outline-none transition-colors ${className ?? ''} ${saving ? 'opacity-60' : ''}`}
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

  const taglineValue = description ?? ''

  return (
    <div
      className="mb-10 rounded-2xl px-8 sm:px-10 py-10 sm:py-12 relative"
      style={{
        background: '#0d0d0e',
        color: '#fafafa',
      }}
    >
      <p
        className="mb-6 text-[10.5px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: '#c69a3f' }}
      >
        {courseTitle}
      </p>

      <h1
        className="text-[44px] sm:text-[52px] leading-[1.05] font-bold tracking-tight"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: '#fafafa',
        }}
      >
        Module {moduleNumber}
      </h1>

      <div className="mt-1">
        <InlineField
          value={moduleTitle}
          onSave={handleTitle}
          placeholder="Module title"
          editable={editable}
          className="text-[24px] sm:text-[28px] leading-[1.2]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
            color: '#cfcab8',
            fontWeight: 400,
          }}
        />
      </div>

      <div className="mt-4">
        <InlineField
          value={taglineValue}
          onSave={handleTagline}
          placeholder={editable ? 'Add a one-line tagline (optional)' : ''}
          editable={editable}
          multiline
          className="text-[16px] sm:text-[17px] leading-[1.45]"
          style={{
            color: '#c69a3f',
            fontWeight: 400,
          }}
        />
      </div>
    </div>
  )
}
