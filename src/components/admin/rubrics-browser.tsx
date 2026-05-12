'use client'

import { useCallback, useMemo, useState } from 'react'

type Section = { id: string; title: string; sort_order: number; module_id: string }
type Module = { id: string; title: string; sort_order: number; course_id: string; sections: Section[] }
type Course = { id: string; title: string; modules: Module[] }
type Rubric = {
  id: string
  section_id: string
  status: 'draft' | 'approved' | 'archived'
  question: string
  pass_criteria: any[]
  shallow_patterns: any[]
  wrong_patterns: any[]
  off_scope_hint: string | null
  notes: string | null
  updated_at: string
}

export function RubricsBrowser({
  courses,
  rubrics: initialRubrics
}: {
  courses: Course[]
  rubrics: Record<string, Rubric>
}) {
  const [rubrics, setRubrics] = useState(initialRubrics)
  const [busy, setBusy] = useState<Record<string, string | null>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [expandedRubric, setExpandedRubric] = useState<string | null>(null)
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})

  const setBusyFor = useCallback((key: string, label: string | null) => {
    setBusy(b => ({ ...b, [key]: label }))
  }, [])
  const setErrorFor = useCallback((key: string, msg: string | null) => {
    setErrors(e => ({ ...e, [key]: msg }))
  }, [])

  const generate = useCallback(async (sectionId: string) => {
    setBusyFor(sectionId, 'Generating…')
    setErrorFor(sectionId, null)
    try {
      const res = await fetch('/api/admin/rubrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generate failed')
      setRubrics(r => ({ ...r, [sectionId]: data.rubric }))
      setExpandedRubric(data.rubric.id)
    } catch (e) {
      setErrorFor(sectionId, e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusyFor(sectionId, null)
    }
  }, [setBusyFor, setErrorFor])

  const approve = useCallback(async (rubricId: string, sectionId: string, unapprove = false) => {
    setBusyFor(sectionId, unapprove ? 'Unapproving…' : 'Approving…')
    setErrorFor(sectionId, null)
    try {
      const res = await fetch(`/api/admin/rubrics/${rubricId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unapprove })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approve failed')
      setRubrics(r => ({ ...r, [sectionId]: data.rubric }))
    } catch (e) {
      setErrorFor(sectionId, e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusyFor(sectionId, null)
    }
  }, [setBusyFor, setErrorFor])

  const remove = useCallback(async (rubricId: string, sectionId: string) => {
    if (!confirm('Delete this rubric? Cannot undo.')) return
    setBusyFor(sectionId, 'Deleting…')
    setErrorFor(sectionId, null)
    try {
      const res = await fetch(`/api/admin/rubrics/${rubricId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setRubrics(r => {
        const c = { ...r }
        delete c[sectionId]
        return c
      })
    } catch (e) {
      setErrorFor(sectionId, e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusyFor(sectionId, null)
    }
  }, [setBusyFor, setErrorFor])

  return (
    <div className="space-y-8">
      {courses.map(course => (
        <section key={course.id} className="space-y-4">
          <h2 className="text-[15px] font-heading font-bold text-[#111] tracking-[-0.01em]">{course.title}</h2>
          {course.modules.map(mod => (
            <ModuleBlock
              key={mod.id}
              mod={mod}
              rubrics={rubrics}
              busy={busy}
              errors={errors}
              expandedRubric={expandedRubric}
              setExpandedRubric={setExpandedRubric}
              showAll={!!showAll[mod.id]}
              toggleShowAll={() => setShowAll(s => ({ ...s, [mod.id]: !s[mod.id] }))}
              onGenerate={generate}
              onApprove={approve}
              onDelete={remove}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function isLikelySubstantive(title: string): boolean {
  const t = title.toLowerCase()
  const skip = ['overview', 'module summary', 'checklist', 'up next', 'up-next', 'your turn']
  if (skip.some(s => t.includes(s))) return false
  return true
}

function ModuleBlock({
  mod,
  rubrics,
  busy,
  errors,
  expandedRubric,
  setExpandedRubric,
  showAll,
  toggleShowAll,
  onGenerate,
  onApprove,
  onDelete
}: any) {
  const substantive = mod.sections.filter((s: Section) => isLikelySubstantive(s.title))
  const non = mod.sections.filter((s: Section) => !isLikelySubstantive(s.title))
  const visible = showAll ? mod.sections : substantive

  return (
    <div className="border border-[#eee] rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#f0f0f0] flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[#222]">{mod.title}</p>
        {non.length > 0 && (
          <button
            onClick={toggleShowAll}
            className="text-[11px] text-[#888] hover:text-[#111] cursor-pointer"
          >
            {showAll ? 'Hide overviews/summaries' : `+ ${non.length} non-substantive`}
          </button>
        )}
      </div>
      <ul className="divide-y divide-[#f4f4f4]">
        {visible.map((s: Section) => {
          const r = rubrics[s.id]
          return (
            <li key={s.id} className="px-4 py-2.5">
              <SectionRow
                section={s}
                rubric={r}
                busy={busy[s.id] || null}
                error={errors[s.id] || null}
                expanded={r?.id === expandedRubric}
                onToggle={() => setExpandedRubric(r?.id === expandedRubric ? null : r?.id)}
                onGenerate={() => onGenerate(s.id)}
                onApprove={() => r && onApprove(r.id, s.id, false)}
                onUnapprove={() => r && onApprove(r.id, s.id, true)}
                onDelete={() => r && onDelete(r.id, s.id)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SectionRow({
  section, rubric, busy, error, expanded, onToggle,
  onGenerate, onApprove, onUnapprove, onDelete
}: any) {
  const status = rubric?.status as Rubric['status'] | undefined
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[#666] flex-1 truncate">{section.title}</span>
        <StatusPill status={status} />
        <div className="flex items-center gap-1.5">
          {!rubric && (
            <button
              onClick={onGenerate}
              disabled={!!busy}
              className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#111] text-white disabled:opacity-30 cursor-pointer"
            >
              {busy || 'Generate'}
            </button>
          )}
          {rubric && (
            <>
              <button
                onClick={onToggle}
                className="text-[11px] px-2 py-1 rounded border border-[#ddd] text-[#444] hover:border-[#999] cursor-pointer"
              >
                {expanded ? 'Hide' : 'View'}
              </button>
              {status === 'draft' && (
                <button
                  onClick={onApprove}
                  disabled={!!busy}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded bg-emerald-600 text-white disabled:opacity-30 cursor-pointer"
                >
                  {busy || 'Approve'}
                </button>
              )}
              {status === 'approved' && (
                <button
                  onClick={onUnapprove}
                  disabled={!!busy}
                  className="text-[11px] px-2 py-1 rounded border border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
                >
                  {busy || 'Unapprove'}
                </button>
              )}
              <button
                onClick={onDelete}
                disabled={!!busy}
                className="text-[11px] px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-600 mt-1.5">{error}</p>}

      {expanded && rubric && <RubricPreview rubric={rubric} />}
    </div>
  )
}

function StatusPill({ status }: { status?: 'draft' | 'approved' | 'archived' }) {
  if (!status)
    return (
      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-[#fafafa] text-[#999] border-[#eee]">
        none
      </span>
    )
  const cls =
    status === 'approved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'draft'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-[#fafafa] text-[#666] border-[#eee]'
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  )
}

function RubricPreview({ rubric }: { rubric: Rubric }) {
  return (
    <div className="mt-3 bg-[#fafafa] border border-[#eee] rounded-md p-3.5 text-[12.5px] text-[#222] space-y-3">
      <Section title="Checkpoint question">
        <p className="italic">{rubric.question}</p>
      </Section>
      <Section title={`Pass criteria · ${(rubric.pass_criteria || []).length}`}>
        <ul className="list-disc list-inside space-y-1">
          {(rubric.pass_criteria || []).map((c: any) => (
            <li key={c.id}>
              <span className="font-semibold">{c.criterion}:</span> {c.description}
            </li>
          ))}
        </ul>
      </Section>
      <Section title={`Shallow patterns · ${(rubric.shallow_patterns || []).length}`}>
        <ul className="space-y-2">
          {(rubric.shallow_patterns || []).map((p: any) => (
            <li key={p.id}>
              <p className="text-[#555]">{p.pattern}</p>
              <p className="text-[#111] italic mt-0.5">→ {p.probe}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={`Wrong patterns · ${(rubric.wrong_patterns || []).length}`}>
        <ul className="space-y-2">
          {(rubric.wrong_patterns || []).map((p: any) => (
            <li key={p.id}>
              <p className="text-[#555]">{p.pattern}</p>
              <p className="text-[#111] italic mt-0.5">→ {p.leading_question}</p>
            </li>
          ))}
        </ul>
      </Section>
      {rubric.off_scope_hint && (
        <Section title="Off-scope hint">
          <p>{rubric.off_scope_hint}</p>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.08em] text-[#888] font-semibold mb-1">{title}</p>
      {children}
    </div>
  )
}
