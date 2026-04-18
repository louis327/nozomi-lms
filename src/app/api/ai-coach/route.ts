import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildRaiseSnapshot, buildCoachSystemPrompt, type OnboardingData } from '@/lib/raise-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

type IncomingMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages } = (await request.json()) as { messages: IncomingMessage[] }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, onboarding_data')
    .eq('id', user.id)
    .single()

  const displayName =
    (profile?.full_name as string | null)?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'founder'

  const snap = buildRaiseSnapshot(profile?.onboarding_data as OnboardingData | null)

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('course_id, courses(id, title)')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let courseProgress: {
    courseTitle: string
    pct: number
    completed: number
    total: number
  } | null = null

  const courseRel = enrollment?.courses as { id: string; title: string } | { id: string; title: string }[] | null
  const course = Array.isArray(courseRel) ? courseRel[0] : courseRel

  if (course) {
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', course.id)

    const moduleIds = (modules ?? []).map((m) => m.id)

    if (moduleIds.length > 0) {
      const { data: sections } = await supabase
        .from('sections')
        .select('id')
        .in('module_id', moduleIds)

      const sectionIds = (sections ?? []).map((s) => s.id)
      const total = sectionIds.length

      if (total > 0) {
        const { data: progress } = await supabase
          .from('section_progress')
          .select('section_id, completed_at')
          .eq('user_id', user.id)
          .in('section_id', sectionIds)
          .not('completed_at', 'is', null)

        const completed = progress?.length ?? 0
        courseProgress = {
          courseTitle: course.title,
          pct: Math.round((completed / total) * 100),
          completed,
          total,
        }
      }
    }
  }

  const systemPrompt = buildCoachSystemPrompt(snap, displayName, courseProgress)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const anthropicStream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send({ type: 'text', content: event.delta.text })
          }
        }

        send({ type: 'done' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Coach request failed'
        send({ type: 'error', content: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
