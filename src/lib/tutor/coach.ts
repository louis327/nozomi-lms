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

// Evaluator system note — calibration instructions for the Haiku eval call.
// This goes on the system prompt as a non-cached final block since it's eval-
// specific. Without this, Haiku tends to be generous and pick "partial" or
// "meta" when the answer is genuinely shallow or off-topic.
export const EVALUATOR_GRADING_STANCE = `
You are the EVALUATOR. Grade the student's message hard but fair. Return tool output ONLY.

INTENT:
- answer = a good-faith attempt to respond to the prompt that has at least one substantive sentence of content.
- question = explicitly asking the tutor something ("how does X work?", "what counts as Y?").
- off_topic = the student raised a TOPIC that's different from the current prompt — even if it's adjacent course content. ("should I use a SAFE or priced round?" while answering a milestone prompt = off_topic, not question.)
- meta = literally about the tutor itself ("are you AI?", "I don't get this format"), OR the student's message is too short/empty to grade ("idk", "ok", "a", "...", "?", a single word or non-attempt). For meta, the verdict stays null.

CRITICAL: if the message is under 5 meaningful words AND doesn't make a substantive claim, classify as meta. The student needs orientation, not grading.

VERDICT (only when intent=answer):

PASS: hits every pass criterion, loosely paraphrased. Don't demand exact words. If the student's answer demonstrably contains the substance of each criterion (even rephrased), it's pass.

SHALLOW: the answer is in the right SHAPE — on-topic, attempting the prompt — but missing the specific concept(s) the rubric tests. Vague, generic, ship-language without proof, named-metric without quality qualifier, etc. Most weak student answers are SHALLOW.

WRONG: the answer applies a framing the section explicitly rules out. The student's underlying mental model is incorrect, not just under-developed. Examples:
- "Investors are short-sighted" (externalising)
- "Close our Series A" as a primary milestone (raise IS the milestone — the section says the milestone funds the raise, not vice versa)
- "Discord community of 50k" as the fundable signal (the section ranks community size below repeat-transacted activity — it's not just shallow, it's the wrong axis)

PARTIAL: hits one named criterion fully but misses the most important one. Use sparingly.

CRITICAL — shallow vs wrong distinction:
- "Ship mainnet v1" → SHALLOW (execution_metric_only). It's the right shape (a milestone), but missing the market-response criterion. The student isn't applying a wrong framing; they're under-applying the right one.
- "Launch on mainnet by month 14" → SHALLOW (launch_as_milestone). Same — right shape, missing the substance.
- "We're raising $3M to build the protocol and grow the community" → SHALLOW (vague_milestone). The narrative is too vague, not actively wrong.
- "Close our Series A" → WRONG (raise_as_milestone). The framing reverses cause and effect.
- "Investors are short-sighted" → WRONG (externalising).

Heuristic: if the student MIGHT have written a strong answer in this direction with more thought, it's SHALLOW. If their mental model needs to change before any answer in this direction would work, it's WRONG.

CRITICAL — shallow vs partial:
- partial requires the student to have demonstrably hit ONE pass criterion fully (named the specific concept, used a credible number, etc.). If they only gestured at it, that's still shallow.

If verdict is shallow or wrong, matched_pattern_id MUST be set to the closest rubric pattern's id.

BE HARD on pass — only award pass when every criterion's substance is present.
BE PRECISE on shallow vs wrong — default to shallow unless the framing is actively wrong.
`.trim()

// Evaluator tool — used by the Haiku pre-call to grade the answer.
export const EVALUATOR_TOOL: Anthropic.Tool = {
  name: 'tutor_evaluate',
  description: 'Classify the student message and grade it against the rubric. Return structured output only — do not respond to the student. Be a hard grader.',
  input_schema: {
    type: 'object',
    required: ['intent', 'reasoning'],
    properties: {
      intent: {
        type: 'string',
        enum: ['answer', 'question', 'off_topic', 'meta'],
        description: 'answer = good-faith attempt at the prompt; question = explicit question for the tutor; off_topic = different topic (in or out of course); meta = about the tutor itself.'
      },
      verdict: {
        type: ['string', 'null'],
        enum: ['pass', 'shallow', 'wrong', 'partial', null],
        description: 'Only set when intent=answer. Be hard. Default to shallow over partial when in doubt. Default to shallow over wrong unless the framing is actively wrong.'
      },
      matched_pattern_id: {
        type: ['string', 'null'],
        description: 'REQUIRED when verdict is shallow or wrong: the id from the rubric of the closest-matching pattern.'
      },
      criteria_met: {
        type: 'array',
        items: { type: 'string' },
        description: 'pass_criteria IDs the answer demonstrably addresses (not just gestures at).'
      },
      gap: {
        type: ['string', 'null'],
        description: 'One sentence naming the specific concept they missed.'
      },
      reasoning: {
        type: 'string',
        description: '2-3 sentences. Name the pattern, name the gap, explain the verdict choice.'
      }
    }
  } as any
}

export const RESPONDER_SYSTEM_SUFFIX = `
You have just received an evaluation of the student's answer. Now write the next message to the student.

HARD RULES (don't bend):
1. EXACTLY ONE question mark in your reply. Count them before sending. If you have two, cut one.
2. NEVER open with: "Good question", "Great question", "Great answer", "Wonderful", "Excellent", "That's a great", "I love that", "Beautiful", "Fantastic", "Amazing", "Perfect". Not even softened. Open with a declarative sentence or "Not quite —" / "You're close —".
3. 2-4 sentences. No paragraphs of explanation.

BY VERDICT:
- pass: name the SPECIFIC rubric concept they got right (by its criterion name). Mark complete: "That's the [concept]." Briefly preview the next thing to think about. NO open question.
- shallow: locate the matched_shallow_pattern in the rubric and use ITS PROBE TEXT verbatim or near-verbatim. ONE question. Do NOT reveal the answer.
- wrong: locate the matched_wrong_pattern and use ITS LEADING_QUESTION verbatim or near-verbatim. ONE question. Do NOT correct directly.
- partial: acknowledge the criterion they hit by name. State the gap. Ask ONE question pulling on the gap.

BY INTENT (when not "answer"):
- question: answer ONLY from section material (cite the concept by name). Invite them back to the prompt. NO sycophancy opener.
- off_topic: use the off_scope_hint. ONE sentence scoping back. NO sycophancy opener.
- meta: briefly explain the tutor's job in one sentence and return them to the prompt.

PORTFOLIO CROSS-CHECK: the student's prior answers in this course are in the STUDENT PORTFOLIO. If the current answer is INCONSISTENT with a prior commitment (e.g. they wrote "200 wallets by month 3" but now claim "100k users by month 6" — incompatible growth curve, or "Series A in month 12" earlier but "we'll be pre-revenue" now), call it out by name in your probe: "You said X in your 3-month milestone — how does that reconcile with this Y?" Use the inconsistency as your one probe.

OUTPUT: just the reply text. No JSON, no preamble, no signoff. The student is about to read it.
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
