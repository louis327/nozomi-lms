import { createAdminClient } from '@/lib/supabase/admin'
import { RubricsBrowser } from '@/components/admin/rubrics-browser'

export const dynamic = 'force-dynamic'

type SectionRow = {
  id: string
  title: string
  sort_order: number
  module_id: string
}

type ModuleRow = {
  id: string
  title: string
  sort_order: number
  course_id: string
  sections: SectionRow[]
}

type CourseRow = {
  id: string
  title: string
  modules: ModuleRow[]
}

type RubricRow = {
  id: string
  section_id: string
  status: 'draft' | 'approved' | 'archived'
  question: string
  pass_criteria: any
  shallow_patterns: any
  wrong_patterns: any
  off_scope_hint: string | null
  notes: string | null
  updated_at: string
}

export default async function AdminRubricsPage() {
  const supabase = createAdminClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, sort_order, modules(id, title, sort_order, course_id, sections(id, title, sort_order, module_id))')
    .order('sort_order', { ascending: true })

  const { data: rubrics } = await supabase
    .from('tutor_rubrics')
    .select('id, section_id, status, question, pass_criteria, shallow_patterns, wrong_patterns, off_scope_hint, notes, updated_at')
    .order('updated_at', { ascending: false })

  const rubricBySection: Record<string, RubricRow> = {}
  for (const r of (rubrics || []) as any[]) {
    rubricBySection[r.section_id] = r
  }

  // Sort modules + sections by sort_order
  const normalized: CourseRow[] = ((courses || []) as any[]).map(c => ({
    id: c.id,
    title: c.title,
    modules: ((c.modules || []) as any[])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(m => ({
        id: m.id,
        title: m.title,
        sort_order: m.sort_order,
        course_id: m.course_id,
        sections: ((m.sections || []) as any[])
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      }))
  }))

  // Stats
  let totalSections = 0
  let approved = 0
  let draft = 0
  for (const c of normalized) {
    for (const m of c.modules) {
      for (const s of m.sections) {
        totalSections++
        const r = rubricBySection[s.id]
        if (r?.status === 'approved') approved++
        else if (r?.status === 'draft') draft++
      }
    }
  }
  const missing = totalSections - approved - draft

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-heading font-bold text-[#111] tracking-[-0.02em]">Tutor Rubrics</h1>
        <p className="text-[13.5px] text-[#666] mt-1 max-w-[640px]">
          One rubric per section unlocks the Coach button for students. Generate a draft, review it, edit if needed, approve.
        </p>
        <div className="mt-4 flex gap-2 text-[12px]">
          <Stat label="Approved" value={approved} tone="good" />
          <Stat label="Draft" value={draft} tone="warn" />
          <Stat label="No rubric" value={missing} tone="muted" />
          <Stat label="Total" value={totalSections} tone="muted" />
        </div>
      </header>

      <RubricsBrowser courses={normalized as any} rubrics={rubricBySection as any} />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'good' | 'warn' | 'muted' }) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : tone === 'warn'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-[#fafafa] text-[#666] border-[#eee]'
  return (
    <span className={`inline-block px-2.5 py-1 rounded border ${cls}`}>
      <span className="font-semibold mr-1">{value}</span>
      <span className="uppercase tracking-wider text-[10.5px]">{label}</span>
    </span>
  )
}
