import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const VOICE_NOTES = `
VOICE: Louis is direct, declarative, anti-vagueness. Short sentences. Contrasts via concrete examples. The rubric you produce must encode this voice so the tutor (using your rubric) sounds like Louis.

FORBIDDEN: rubric must not enable the tutor to say "Good question", "Great answer", "Wonderful", "Excellent", "That's a great point" or similar sycophantic openers. Probes and leading questions must be single-question form (no compound asks). Each probe targets one specific shallow pattern.

PRAISE STYLE (for pass criteria): praise must name the specific concept by name, not generic encouragement.
`.trim()

// Hand-authored exemplar — this is what we're calibrating new rubrics toward.
const EXEMPLAR_SECTION_TITLE = 'The Problem With Guessing How Much to Raise'
const EXEMPLAR_SECTION_TEXT = `
Most founders guess their raise amount. Investors notice immediately.
Picture the scene. You are in a first meeting with a VC. They ask: how much are you raising and what is it for? You say $3 million because it sounds credible. They ask what you will use it for. You say 30% product, 40% growth, 30% ops. They ask what milestones you are looking to hit with the capital. You go quiet for a second. You just lost the meeting.
Not because your project is bad. Because you walked in with a number instead of a clear position and reason for the number.
[Contrast table: founder with a number vs founder with a position. Number founder: $3M, 30/40/30, 12-month milestones (generic). Position founder: $2.4M to mainnet, 10,000 active wallets and $500k annualised fees, specific allocation per item, 14-month runway.]
A number is something you picked. A position is something you built, from a milestone you are committing to, an operating plan that funds the path to it, and a clear allocation across the things that actually matter.
[Quote] Your raise amount is a statement about your milestones. If you cannot connect the two with specifics, you do not have a fundraising strategy. You have a hope.
`.trim()

const EXEMPLAR_RUBRIC = {
  question:
    "In your own words: why do investors react badly to a founder who walks in saying 'we're raising $3M for product, growth, and ops'? What is the founder actually missing, and what should they bring instead?",
  pass_criteria: [
    { id: 'distinction', criterion: 'Number vs position', description: 'Names the core distinction: a number is something you picked; a position is something you built.' },
    { id: 'signal', criterion: 'Vague allocations signal lack of work', description: "Recognises that '30/40/30' style allocations are a signal the work hasn't been done, not a presentation issue." },
    { id: 'structure', criterion: 'A position has three parts', description: 'Identifies milestone + operating plan + specific allocation as the three components.' }
  ],
  shallow_patterns: [
    { id: 'specificity_only', pattern: "Says 'investors want more specifics' without naming WHY specificity matters.", probe: "Specifics matter — but specifics of what? What is the investor actually using the numbers to infer about you?" },
    { id: 'use_of_funds', pattern: "Says 'show your use of funds' — generic, doesn't capture milestone-anchoring.", probe: "The founder in the example did give a use of funds — product, growth, ops. What turned that answer into a guess instead of a position?" }
  ],
  wrong_patterns: [
    { id: 'smaller_number', pattern: "Says investors prefer a smaller raise amount.", leading_question: "The position founder is raising $2.4M against the number founder's $3M — pretty similar. If dollar amount isn't the differentiator, what is?" },
    { id: 'pitch_deck', pattern: "Says it's about having a better pitch deck.", leading_question: "The meeting ends at the question, before any deck is shown. Where does that locate the actual problem?" }
  ],
  off_scope_hint:
    "Scope back politely WITHOUT saying 'good question' or any sycophantic opener. Acknowledge the question is fair, note this checkpoint is specifically about raise amounts and milestone-anchoring, invite them back. One sentence."
}

function blocksToText(blocks: any[]): string {
  return (blocks || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(b => {
      if (b.type === 'rich_text' || b.type === 'callout' || b.type === 'quote')
        return (b.content?.html || b.content?.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (b.type === 'table' && b.content?.rows)
        return '[Table] ' + b.content.rows.map((r: string[]) => r.join(' | ')).join(' / ')
      if (b.type === 'image') return ''
      return '[' + b.type + ']'
    })
    .filter(Boolean)
    .join('\n\n')
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { adminClient, userId: user.id }
}

export async function POST(request: NextRequest) {
  const ctx = await verifyAdmin()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { sectionId, force = false } = await request.json()
  if (!sectionId) return NextResponse.json({ error: 'sectionId required' }, { status: 400 })

  const { data: section } = await ctx.adminClient
    .from('sections')
    .select('id, title, content_blocks(type, content, sort_order)')
    .eq('id', sectionId)
    .single()
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  if (!force) {
    const { data: existing } = await ctx.adminClient
      .from('tutor_rubrics')
      .select('id, status')
      .eq('section_id', sectionId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Rubric already exists', rubric: existing }, { status: 409 })
    }
  }

  const sectionText = blocksToText((section as any).content_blocks || [])
  if (!sectionText.trim()) {
    return NextResponse.json({ error: 'Section has no text content to generate from' }, { status: 400 })
  }

  const system = `You generate Socratic-tutor rubrics for the Nozomi fundraising course (by Louis). You are calibrating against an exemplar that already works in production.

${VOICE_NOTES}

A rubric has FIVE parts:
1. question — the checkpoint question the student answers. Open-ended, asks them to reason in their own words. Tests the section's core concept.
2. pass_criteria — 3 items (rarely 4). Each is { id, criterion, description }. ALL must be addressed (loosely paraphrased counts) for a "pass" verdict. Together they define mastery.
3. shallow_patterns — 3 to 5 items. Each is { id, pattern, probe }. "pattern" describes a common shallow-correct answer; "probe" is a ONE-question Socratic push that exposes the gap. Probe must NOT reveal the answer.
4. wrong_patterns — 2 to 4 items. Each is { id, pattern, leading_question }. "pattern" describes a common wrong framing; "leading_question" gently brings them toward the right framing without correcting them directly.
5. off_scope_hint — one or two sentences for when the student goes off-topic. Must NOT use sycophancy bigrams.

Quality bar:
- Every probe and leading_question is ONE question. No "X? And Y?" stacks.
- Patterns are SPECIFIC failure modes you'd expect from real founders, not generic miss types.
- Probes reference the section's own concepts/examples (use the section text).
- IDs are short snake_case strings unique within the rubric.

Output ONLY valid JSON matching the exemplar's structure exactly.`

  const userContent = `=== EXEMPLAR (already approved, calibrate to this quality) ===

Section title: ${EXEMPLAR_SECTION_TITLE}

Section content:
${EXEMPLAR_SECTION_TEXT}

Rubric for that section:
${JSON.stringify(EXEMPLAR_RUBRIC, null, 2)}

=== YOUR TASK ===

Generate a rubric for THIS section, matching the exemplar's structure and quality.

Section title: ${section.title}

Section content:
${sectionText}

Output ONLY the JSON rubric.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system,
    messages: [{ role: 'user', content: userContent }]
  })

  const textBlock = response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined
  if (!textBlock) return NextResponse.json({ error: 'No text response from Claude' }, { status: 502 })

  // Extract JSON
  const match = textBlock.text.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Could not parse rubric JSON', raw: textBlock.text.slice(0, 1000) }, { status: 502 })

  let rubric: any
  try {
    rubric = JSON.parse(match[0])
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON', raw: textBlock.text.slice(0, 1000) }, { status: 502 })
  }

  // Validate shape
  const requiredKeys = ['question', 'pass_criteria', 'shallow_patterns', 'wrong_patterns', 'off_scope_hint']
  for (const k of requiredKeys) {
    if (!(k in rubric)) return NextResponse.json({ error: `Missing key: ${k}`, rubric }, { status: 502 })
  }

  // Server-side voice guards: reject if any probe/leading_question has >1 '?'
  const allQuestions: string[] = [
    ...(rubric.shallow_patterns || []).map((p: any) => p.probe).filter(Boolean),
    ...(rubric.wrong_patterns || []).map((p: any) => p.leading_question).filter(Boolean)
  ]
  const multiQuestion = allQuestions.find(q => (q.match(/\?/g) || []).length > 1)
  if (multiQuestion) {
    return NextResponse.json({
      error: 'Generated rubric has multi-question probe',
      detail: multiQuestion,
      rubric
    }, { status: 422 })
  }

  // Insert as draft
  const insert = await ctx.adminClient
    .from('tutor_rubrics')
    .insert({
      section_id: sectionId,
      question: rubric.question,
      pass_criteria: rubric.pass_criteria,
      shallow_patterns: rubric.shallow_patterns,
      wrong_patterns: rubric.wrong_patterns,
      off_scope_hint: rubric.off_scope_hint,
      notes: rubric.notes || null,
      status: 'draft'
    })
    .select()
    .single()

  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 })

  return NextResponse.json({ rubric: insert.data })
}
