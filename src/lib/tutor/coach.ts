// Shared logic for the AI tutor:
//   - Parallel context loading (rubric, section, history, portfolio, outline)
//   - Prompt construction with cache_control breakpoints
//   - Evaluator tool schema

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

export const VOICE_PRINCIPLES = `
You are a Socratic tutor for Nozomi, a founder fundraising course built by Louis.

VOICE — DO:
- Direct, declarative, short sentences.
- "You're close" / "Not quite — keep pulling" / "Look again at..."
- Anti-vagueness, pro-specificity.
- Cite the section's named concept when grading.
- One pointed probe at a time.

VOICE — DON'T (hard bans):
- "Good question" / "Great question" / "Great answer" / "Wonderful" / "Excellent" / "That's a great point" — never, not even as openers.
- Multiple questions in one message — exactly ONE question per turn.
- Reveal the answer before the student has tried twice.
- Generic encouragement that doesn't name what was good or weak.
- Go outside the course material — scope back politely instead.

RESPONSE LENGTH: 2-4 sentences typically. Never paragraphs unless the student has earned a worked example after multiple probes.

GROUNDING: when you cite a concept or quote, only reference material from the course outline or section content provided. Don't invent.
`.trim()

export const SYCOPHANCY_BIGRAMS = [
  'good question',
  'great question',
  'great answer',
  'wonderful',
  'excellent answer',
  'excellent point',
  "that's a great",
  'i love that',
  'beautiful',
  'fantastic',
  'amazing answer',
  'perfect answer'
] as const

// --- Context loading ------------------------------------------------------

export type LoadedContext = {
  session: {
    id: string
    user_id: string
    section_id: string
    block_id: string | null
    rubric_id: string | null
    turn_count: number
    probe_count: number
    mastery_reached: boolean
    status: string
  }
  history: Array<{
    turn_number: number
    student_message: string | null
    agent_message: string
    intent: string | null
    verdict: string | null
  }>
  rubric: {
    id: string
    question: string
    pass_criteria: any[]
    shallow_patterns: any[]
    wrong_patterns: any[]
    off_scope_hint: string | null
    notes: string | null
  }
  section: {
    id: string
    title: string
    text: string
    module_title: string
    course_title: string
    module_position: number | null
    section_position: number | null
  }
  course_outline: string
  student_portfolio: string
}

type BlockContent = { type: string; content: any; sort_order: number }

function blocksToText(blocks: BlockContent[]): string {
  return (blocks || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(b => {
      const c = b.content || {}
      if (b.type === 'rich_text' || b.type === 'callout' || b.type === 'quote')
        return (c.html || c.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (b.type === 'table' && c.rows)
        return '[Table] ' + c.rows.map((r: string[]) => r.join(' | ')).join(' / ')
      if (b.type === 'image') return ''
      if (b.type === 'workbook_prompt' || b.type === 'structured_prompt') {
        const parts: string[] = []
        if (c.label) parts.push(c.label)
        if (c.prompt) parts.push(c.prompt)
        return '[' + b.type + '] ' + parts.join(' / ')
      }
      return '[' + b.type + ']'
    })
    .filter(Boolean)
    .join('\n\n')
}

function extractPromptText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  const parts: string[] = []
  if (content.label) parts.push(content.label)
  if (content.html) parts.push(String(content.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  if (content.text) parts.push(content.text)
  if (content.prompt) parts.push(content.prompt)
  if (content.question) parts.push(content.question)
  if (Array.isArray(content.fields))
    for (const f of content.fields) parts.push('  · ' + (f.label || f.key || ''))
  return parts.join(' / ').trim()
}

function workbookAnswersByBlock(workbookData: any): Record<string, Array<{ field: string; answer: string }>> {
  const out: Record<string, Array<{ field: string; answer: string }>> = {}
  if (!workbookData || typeof workbookData !== 'object') return out
  for (const [k, v] of Object.entries(workbookData)) {
    if (k === '_checklists') continue
    const m = k.match(/^([0-9a-f-]{36})_(.+)$/)
    if (!m) continue
    if (v === '' || v == null) continue
    const bid = m[1]
    const field = m[2]
    if (!out[bid]) out[bid] = []
    out[bid].push({ field, answer: String(v) })
  }
  return out
}

export async function loadContext(
  supabase: SupabaseClient,
  args: { sessionId: string; userId: string; blockId: string }
): Promise<LoadedContext> {
  // Pull session + last few turns first so we can derive section/course IDs.
  const sessionPromise = supabase
    .from('tutor_sessions')
    .select(`
      id, user_id, section_id, block_id, rubric_id, turn_count, probe_count, mastery_reached, status,
      tutor_turns ( turn_number, student_message, agent_message, intent, verdict )
    `)
    .eq('id', args.sessionId)
    .single()

  const rubricPromise = supabase
    .from('tutor_rubrics')
    .select('id, question, pass_criteria, shallow_patterns, wrong_patterns, off_scope_hint, notes')
    .eq('block_id', args.blockId)
    .eq('status', 'approved')
    .limit(1)
    .single()

  const sectionPromise = supabase
    .from('sections')
    .select(`
      id, title, module_id,
      content_blocks ( type, content, sort_order ),
      modules!inner ( id, title, course_id, courses!inner ( id, title ) )
    `)
    .eq('id', (await sessionPromise).data?.section_id ?? '')
    .single()

  // session must resolve before we can fetch dependents; rubric and portfolio
  // don't depend on session shape so we can fetch in parallel.
  const portfolioPromise = supabase
    .from('section_progress')
    .select('section_id, workbook_data')
    .eq('user_id', args.userId)

  const [sessionRes, rubricRes, portfolioRes, sectionRes] = await Promise.all([
    sessionPromise,
    rubricPromise,
    portfolioPromise,
    sectionPromise
  ])

  if (sessionRes.error || !sessionRes.data) throw new Error('Session not found')
  if (rubricRes.error || !rubricRes.data) throw new Error('No approved rubric for this prompt')
  if (sectionRes.error || !sectionRes.data) throw new Error('Section not found')
  if (sessionRes.data.user_id !== args.userId) throw new Error('Forbidden')

  const section = sectionRes.data as any
  const moduleObj = Array.isArray(section.modules) ? section.modules[0] : section.modules
  const courseObj = moduleObj?.courses ? (Array.isArray(moduleObj.courses) ? moduleObj.courses[0] : moduleObj.courses) : null

  // Load the course outline + workbook prompt contents for the whole course.
  const outlineRes = await supabase
    .from('modules')
    .select(`
      id, title, sort_order,
      sections ( id, title, sort_order, status, content_blocks ( id, type, content, sort_order ) )
    `)
    .eq('course_id', moduleObj?.course_id ?? '')
    .order('sort_order', { ascending: true })

  const outlineModules = (outlineRes.data ?? []) as any[]

  // Render outline + a block_id → prompt text map for portfolio assembly.
  const promptsByBlockId = new Map<string, string>()
  const sectionTitleByBlockId = new Map<string, string>()
  const sectionTitleBySectionId = new Map<string, string>()
  const sectionOrder = new Map<string, number>()
  let nSec = 0

  const courseOutline = outlineModules
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m, mi) => {
      const sects = ((m.sections ?? []) as any[])
        .filter(s => s.status === 'published')
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      for (const s of sects) {
        sectionOrder.set(s.id, nSec++)
        sectionTitleBySectionId.set(s.id, s.title)
        for (const cb of (s.content_blocks ?? [])) {
          if (cb.type !== 'workbook_prompt' && cb.type !== 'structured_prompt') continue
          promptsByBlockId.set(cb.id, extractPromptText(cb.content))
          sectionTitleByBlockId.set(cb.id, s.title)
        }
      }
      const lines = sects.map((s, si) => '    - Section ' + (si + 1) + ': ' + s.title).join('\n')
      return 'Module ' + (mi + 1) + ': ' + m.title + (lines ? '\n' + lines : '')
    })
    .join('\n')

  // Assemble student portfolio
  const portfolioBlocks: Array<{ sectionTitle: string; blockId: string; promptText: string; answers: Array<{ field: string; answer: string }> }> = []
  for (const row of (portfolioRes.data ?? [])) {
    if (!sectionOrder.has(row.section_id)) continue
    const grouped = workbookAnswersByBlock(row.workbook_data)
    for (const [bid, answers] of Object.entries(grouped)) {
      portfolioBlocks.push({
        sectionTitle: sectionTitleByBlockId.get(bid) ?? sectionTitleBySectionId.get(row.section_id) ?? 'Unknown',
        blockId: bid,
        promptText: promptsByBlockId.get(bid) ?? '(prompt not in current outline)',
        answers
      })
    }
  }
  portfolioBlocks.sort((a, b) => {
    const ao = sectionOrder.get([...sectionTitleByBlockId.entries()].find(([, v]) => v === a.sectionTitle)?.[0] ?? '') ?? 999
    const bo = sectionOrder.get([...sectionTitleByBlockId.entries()].find(([, v]) => v === b.sectionTitle)?.[0] ?? '') ?? 999
    return ao - bo
  })

  const studentPortfolio = portfolioBlocks.length === 0
    ? '(No prior answers in this course yet.)'
    : portfolioBlocks.map(p => {
        const ans = p.answers.map(a => `  ${a.field}: ${a.answer}`).join('\n')
        return `<work section="${p.sectionTitle}" block_id="${p.blockId}">\nPROMPT: ${(p.promptText || '').slice(0, 300)}\nSTUDENT ANSWER:\n${ans}\n</work>`
      }).join('\n\n')

  // Compute module/section position
  const currentModuleIdx = outlineModules.findIndex(m => m.id === moduleObj?.id)
  const currentSectionsList = outlineModules[currentModuleIdx]?.sections
    ?.filter((s: any) => s.status === 'published')
    ?.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) || []
  const currentSectionIdx = currentSectionsList.findIndex((s: any) => s.id === section.id)

  const history = ((sessionRes.data as any).tutor_turns || [])
    .slice()
    .sort((a: any, b: any) => a.turn_number - b.turn_number)
    .slice(-6)

  return {
    session: {
      id: sessionRes.data.id,
      user_id: sessionRes.data.user_id,
      section_id: sessionRes.data.section_id,
      block_id: sessionRes.data.block_id,
      rubric_id: sessionRes.data.rubric_id,
      turn_count: sessionRes.data.turn_count,
      probe_count: sessionRes.data.probe_count,
      mastery_reached: sessionRes.data.mastery_reached,
      status: sessionRes.data.status
    },
    history,
    rubric: rubricRes.data,
    section: {
      id: section.id,
      title: section.title,
      text: blocksToText(section.content_blocks || []),
      module_title: moduleObj?.title ?? 'Module',
      course_title: courseObj?.title ?? 'Course',
      module_position: currentModuleIdx >= 0 ? currentModuleIdx + 1 : null,
      section_position: currentSectionIdx >= 0 ? currentSectionIdx + 1 : null
    },
    course_outline: courseOutline,
    student_portfolio: studentPortfolio
  }
}

// --- Prompt construction --------------------------------------------------

// Builds the system blocks with cache_control breakpoints. The static parts
// (voice, course outline, section+rubric) are cached; only history + portfolio
// + student message are fresh.
export function buildSystemBlocks(ctx: LoadedContext) {
  // Block 1: voice + grounding (static)
  const voiceBlock = VOICE_PRINCIPLES

  // Block 2: course outline (static per course)
  const outlineBlock = `=== COURSE: ${ctx.section.course_title} ===
Outline:
${ctx.course_outline}`

  // Block 3: section content + rubric + author notes (static per block)
  const rubricBlock = `=== CURRENT POSITION ===
Module ${ctx.section.module_position ?? '?'}: ${ctx.section.module_title}
Section ${ctx.section.section_position ?? '?'}: ${ctx.section.title}

=== SECTION MATERIAL (use ONLY this for quotes/citations) ===
${ctx.section.text}

=== PROMPT BEING GRADED ===
${ctx.rubric.question}

=== PASS CRITERIA (all must be addressed loosely-paraphrased for pass) ===
${JSON.stringify(ctx.rubric.pass_criteria, null, 2)}

=== KNOWN SHALLOW PATTERNS (use these probes when matched) ===
${JSON.stringify(ctx.rubric.shallow_patterns, null, 2)}

=== KNOWN WRONG PATTERNS (use these leading questions when matched) ===
${JSON.stringify(ctx.rubric.wrong_patterns, null, 2)}

=== OFF-SCOPE HINT ===
${ctx.rubric.off_scope_hint ?? '(none)'}

=== AUTHOR NOTES ===
${ctx.rubric.notes ?? '(none)'}`

  return [
    { type: 'text' as const, text: voiceBlock, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: outlineBlock, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: rubricBlock, cache_control: { type: 'ephemeral' as const } }
  ]
}

// Builds the user message — the freshness layer. Not cached.
export function buildUserMessage(ctx: LoadedContext, studentMessage: string): string {
  return `=== STUDENT PORTFOLIO (prior answers across the course) ===
${ctx.student_portfolio}

=== CONVERSATION SO FAR ===
${JSON.stringify(ctx.history, null, 2)}

=== STUDENT JUST SAID ===
${studentMessage}`
}

// --- Tool schemas ---------------------------------------------------------

// Evaluator tool — used by the Haiku pre-call to grade the answer.
export const EVALUATOR_TOOL: Anthropic.Tool = {
  name: 'tutor_evaluate',
  description: 'Classify the student message and grade it against the rubric. Return structured output only — do not respond to the student.',
  input_schema: {
    type: 'object',
    required: ['intent'],
    properties: {
      intent: {
        type: 'string',
        enum: ['answer', 'question', 'off_topic', 'meta'],
        description: 'answer = attempting the prompt; question = asking the tutor; off_topic = unrelated to this section; meta = about how the tutor works'
      },
      verdict: {
        type: ['string', 'null'],
        enum: ['pass', 'shallow', 'wrong', 'partial', null],
        description: 'Only set when intent=answer. pass=hits all criteria loosely-paraphrased. shallow=right vibe, no substance. wrong=wrong framing. partial=hit some, missed the most important.'
      },
      matched_pattern_id: {
        type: ['string', 'null'],
        description: 'If shallow or wrong, the id from the rubric of the pattern that matched.'
      },
      criteria_met: {
        type: 'array',
        items: { type: 'string' },
        description: 'pass_criteria IDs that the answer addresses.'
      },
      gap: {
        type: ['string', 'null'],
        description: 'One sentence: what is missing or misunderstood.'
      },
      reasoning: { type: 'string', description: '2-3 sentences explaining the verdict.' }
    }
  } as any
}

export const RESPONDER_SYSTEM_SUFFIX = `
You have just received an evaluation of the student's answer. Now write the next message to the student.

RULES:
- If verdict=pass: pointed praise that names the SPECIFIC concept they got right (cite by name from the rubric criterion they hit). Mark it complete: "That's the X." Briefly preview what's next. 2-3 sentences.
- If verdict=shallow: use the matched shallow pattern's probe (or a close variant in Louis voice). ONE question. Don't reveal the answer.
- If verdict=wrong: use the matched wrong pattern's leading_question. Don't correct directly. ONE question.
- If verdict=partial: name what they hit, ask them to keep pulling on the gap. ONE question.
- If intent=question: answer from section material, cite by name; gently invite them back to the checkpoint.
- If intent=off_topic: use the off_scope_hint to scope back. ONE sentence. No "Good question" opener.

OUTPUT: just the reply text. No preamble, no JSON wrapping, no signoff. Stream it.
`.trim()

export type EvaluatorOutput = {
  intent: 'answer' | 'question' | 'off_topic' | 'meta'
  verdict: 'pass' | 'shallow' | 'wrong' | 'partial' | null
  matched_pattern_id: string | null
  criteria_met: string[]
  gap: string | null
  reasoning: string
}

// --- Validation guards (deterministic, after stream) ---------------------

export function detectSycophancy(text: string): string | null {
  const lower = text.toLowerCase()
  for (const b of SYCOPHANCY_BIGRAMS) if (lower.includes(b)) return b
  return null
}

export function countQuestions(text: string): number {
  return (text.match(/\?/g) || []).length
}
