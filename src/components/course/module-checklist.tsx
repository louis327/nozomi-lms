'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { ModuleDeliverable, ModuleProgress } from '@/lib/types'

type ModuleChecklistProps = {
  moduleId: string
  deliverables: ModuleDeliverable[]
  moduleProgress: ModuleProgress | null
}

export function ModuleChecklist({ moduleId, deliverables, moduleProgress }: ModuleChecklistProps) {
  const router = useRouter()
  const supabase = createClient()

  const existingChecklist = (moduleProgress?.checklist_data ?? {}) as Record<string, boolean>
  const [checked, setChecked] = useState<Record<string, boolean>>(existingChecklist)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(moduleProgress?.completed ?? false)

  const allChecked = deliverables.every((d) => checked[d.id])

  const handleComplete = useCallback(async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('module_progress').upsert(
        {
          user_id: user.id,
          module_id: moduleId,
          checklist_data: checked,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,module_id' }
      )

      setCompleted(true)
      router.refresh()
    } catch (err) {
      console.error('Failed to save module progress:', err)
    } finally {
      setSaving(false)
    }
  }, [checked, moduleId, router, supabase])

  return (
    <div className="rounded-2xl bg-nz-bg-card/80 border border-nz-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-nz-sakura/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-nz-sakura" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h3 className="font-heading font-semibold text-lg text-nz-text-primary">
            Module Deliverables
          </h3>
          <p className="text-sm text-nz-text-muted">
            Complete all items to finish this module.
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {deliverables.map((d) => (
          <label
            key={d.id}
            className={`
              flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
              ${checked[d.id]
                ? 'bg-nz-success/5 border-nz-success/20'
                : 'bg-nz-bg-tertiary/30 border-nz-border hover:border-nz-border-hover'
              }
              ${completed ? 'pointer-events-none' : ''}
            `}
          >
            <input
              type="checkbox"
              checked={checked[d.id] ?? false}
              onChange={(e) =>
                setChecked((prev) => ({ ...prev, [d.id]: e.target.checked }))
              }
              disabled={completed}
              className="w-4 h-4 rounded border-nz-border accent-nz-success cursor-pointer"
            />
            <span
              className={`text-sm transition-colors ${
                checked[d.id] ? 'text-nz-text-primary line-through opacity-70' : 'text-nz-text-secondary'
              }`}
            >
              {d.label}
            </span>
          </label>
        ))}
      </div>

      {completed ? (
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-nz-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-heading font-semibold text-nz-success">Module Complete</p>
        </div>
      ) : (
        <Button
          onClick={handleComplete}
          loading={saving}
          disabled={!allChecked}
          size="md"
          className="w-full"
        >
          Complete Module
        </Button>
      )}
    </div>
  )
}
