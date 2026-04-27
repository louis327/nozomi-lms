import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Result = {
  kind: 'course' | 'module' | 'section'
  id: string
  title: string
  href: string
  context?: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ results: [] })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`

  let courseQ = supabase
    .from('courses')
    .select('id, title, status')
    .ilike('title', pattern)
    .limit(8)
  if (!isAdmin) courseQ = courseQ.eq('status', 'published')

  const sectionQ = supabase
    .from('sections')
    .select(
      `id, title, modules!inner ( id, title, course_id, courses!inner ( id, title, status ) )`,
    )
    .ilike('title', pattern)
    .limit(12)

  const moduleQ = supabase
    .from('modules')
    .select(`id, title, courses!inner ( id, title, status )`)
    .ilike('title', pattern)
    .limit(8)

  const [{ data: courses }, { data: sections }, { data: modules }] =
    await Promise.all([courseQ, sectionQ, moduleQ])

  const results: Result[] = []

  for (const c of courses ?? []) {
    results.push({ kind: 'course', id: c.id, title: c.title, href: `/courses/${c.id}` })
  }

  for (const s of (sections ?? []) as any[]) {
    const mod = s.modules
    const course = mod?.courses
    if (!course) continue
    if (!isAdmin && course.status !== 'published') continue
    results.push({
      kind: 'section',
      id: s.id,
      title: s.title,
      href: `/courses/${course.id}/learn/${s.id}`,
      context: `${course.title} · ${mod.title}`,
    })
  }

  for (const m of (modules ?? []) as any[]) {
    const course = m.courses
    if (!course) continue
    if (!isAdmin && course.status !== 'published') continue
    results.push({
      kind: 'module',
      id: m.id,
      title: m.title,
      href: `/courses/${course.id}`,
      context: course.title,
    })
  }

  return NextResponse.json({ results })
}
