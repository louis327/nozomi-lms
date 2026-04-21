import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { extractSectionAnswers, type WorkbookData } from '@/lib/answer-extract'
import {
  CourseExportDocument,
  type ExportData,
  type ExportModule,
  type ExportSection,
} from '@/lib/pdf/course-export-document'
import type { ContentBlock } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await ctx.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: course }, { data: enrollment }, { data: profile }] =
    await Promise.all([
      supabase
        .from('courses')
        .select(
          `
          id, title,
          modules (
            id, title, sort_order,
            sections (
              id, title, sort_order,
              content_blocks ( id, section_id, type, content, sort_order )
            )
          )
        `,
        )
        .eq('id', courseId)
        .single(),
      supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single(),
    ])

  if (!course) {
    return Response.json({ error: 'Course not found' }, { status: 404 })
  }

  const isAdmin = profile?.role === 'admin'
  if (!enrollment && !isAdmin) {
    return Response.json({ error: 'Not enrolled' }, { status: 403 })
  }

  const modules = [...((course as any).modules ?? [])].sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  )

  const allSectionIds: string[] = []
  for (const mod of modules) {
    const sections = [...((mod as any).sections ?? [])].sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    )
    for (const sec of sections) allSectionIds.push(sec.id)
  }

  const progressById: Record<
    string,
    { workbook_data: WorkbookData | null; completed_at: string | null }
  > = {}

  if (allSectionIds.length > 0) {
    const { data: progressRows } = await supabase
      .from('section_progress')
      .select('section_id, workbook_data, completed_at')
      .eq('user_id', user.id)
      .in('section_id', allSectionIds)

    for (const row of progressRows ?? []) {
      progressById[row.section_id] = {
        workbook_data: row.workbook_data as WorkbookData | null,
        completed_at: row.completed_at,
      }
    }
  }

  const exportModules: ExportModule[] = modules.map((mod: any) => {
    const sections = [...((mod as any).sections ?? [])].sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    )
    const exportSections: ExportSection[] = sections.map((sec: any) => {
      const blocks = [...((sec as any).content_blocks ?? [])].sort(
        (a: ContentBlock, b: ContentBlock) => a.sort_order - b.sort_order,
      ) as ContentBlock[]
      const prog = progressById[sec.id]
      const answers = extractSectionAnswers(blocks, prog?.workbook_data ?? null)
      return {
        id: sec.id,
        title: sec.title,
        answers,
        completedAt: prog?.completed_at ?? null,
      }
    })
    return {
      id: mod.id,
      title: mod.title,
      sections: exportSections,
    }
  })

  const completedDates = Object.values(progressById)
    .map((p) => p.completed_at)
    .filter((d): d is string => !!d)
    .sort()
  const latestCompleted = completedDates[completedDates.length - 1]
  const completedOn = latestCompleted
    ? new Date(latestCompleted).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const founderName =
    (profile?.full_name as string | null) ||
    user.email?.split('@')[0] ||
    'Founder'

  const data: ExportData = {
    courseTitle: (course as any).title,
    founderName,
    completedOn,
    modules: exportModules,
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(<CourseExportDocument data={data} />)
  } catch (err) {
    console.error('[course-export] renderToBuffer failed', {
      courseId,
      userId: user.id,
      error:
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : err,
    })
    return Response.json(
      {
        error: 'Failed to render workbook PDF',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }

  const safeTitle = (course as any).title.replace(/[^\w\s-]/g, '').trim()
  const asciiFilename = `${safeTitle} - Nozomi workbook.pdf`
  const utf8Filename = `${safeTitle} — Nozomi workbook.pdf`

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
