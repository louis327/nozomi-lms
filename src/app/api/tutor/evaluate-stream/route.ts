import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  loadContext,
  buildSystemBlocks,
  buildUserMessage,
  EVALUATOR_TOOL,
  EVALUATOR_GRADING_STANCE,
  RESPONDER_SYSTEM_SUFFIX,
  detectSycophancy,
  countQuestions,
  CRITIC_SYSTEM,
  CRITIC_TOOL,
  type EvaluatorOutput,
  type LoadedContext,
  type CriticOutput
} from '@/lib/tutor/coach'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// POST /api/tutor/evaluate-stream
// Body: { sessionId, blockId, sectionId, studentMessage }
// Returns: SSE-style stream of events:
//   data: {"type":"stage","stage":"loading"|"evaluating"|"responding"|"done", ...}
//   data: {"type":"token","text":"..."}
//   data: {"type":"final","verdict":"...","mastery":"...","flagged":bool}
export async function POST(request: NextRequest) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return new Response('Unauthenticated', { status: 401 })

  const body = await request.json()
  const { sessionId, blockId, sectionId, studentMessage } = body
  if (!sessionId || !blockId || !sectionId || typeof studentMessage !== 'string') {
    return new Response('sessionId, blockId, sectionId, studentMessage required', { status: 400 })
  }

  const admin = createAdminClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      function send(obj: any) {
        if (closed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)) } catch { closed = true }
      }
      function close() { if (!closed) { closed = true; try { controller.close() } catch {} } }

      request.signal.addEventListener('abort', () => close())

      try {
        // ---- 1. Load context (parallel) -----------------------------------
        send({ type: 'stage', stage: 'loading' })
        const t0 = Date.now()
        const ctx = await loadContext(admin, { sessionId, userId: user.id, blockId })
        if (ctx.session.section_id !== sectionId) {
          send({ type: 'error', error: 'section mismatch' })
          close(); return
        }
        const loadMs = Date.now() - t0

        // ---- 2. Evaluator (Haiku tool_use, fast) -------------------------
        send({ type: 'stage', stage: 'evaluating' })
        const systemBlocks = buildSystemBlocks(ctx)
        const userMessage = buildUserMessage(ctx, studentMessage)
        const evalT0 = Date.now()
        const evalRes = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: [
            ...systemBlocks,
            { type: 'text' as const, text: EVALUATOR_GRADING_STANCE }
          ],
          messages: [{ role: 'user', content: userMessage }],
          tools: [EVALUATOR_TOOL],
          tool_choice: { type: 'tool', name: 'tutor_evaluate' }
        })
        const toolUseBlock = evalRes.content.find(b => b.type === 'tool_use') as
          | { type: 'tool_use'; name: string; input: any }
          | undefined
        let evalOut: EvaluatorOutput
        if (!toolUseBlock) {
          evalOut = {
            intent: 'answer', verdict: null, matched_pattern_id: null,
            criteria_met: [], gap: null, reasoning: 'evaluator parse-fail'
          }
        } else {
          // Defensive enum coercion — Haiku occasionally puts a verdict value
          // ("wrong", "shallow") in the intent field. Force it back to a valid intent.
          const VALID_INTENTS = new Set(['answer', 'question', 'off_topic', 'meta'])
          const VALID_VERDICTS = new Set(['pass', 'shallow', 'wrong', 'partial', null])
          const rawIntent = toolUseBlock.input.intent
          const rawVerdict = toolUseBlock.input.verdict
          const safeIntent: EvaluatorOutput['intent'] = VALID_INTENTS.has(rawIntent)
            ? rawIntent
            : VALID_VERDICTS.has(rawIntent) ? 'answer' : 'answer'
          const safeVerdict: EvaluatorOutput['verdict'] = VALID_VERDICTS.has(rawVerdict)
            ? rawVerdict
            // If Haiku stuck a verdict-shaped string into intent and verdict is missing,
            // promote it back to verdict.
            : (VALID_VERDICTS.has(rawIntent) && rawVerdict == null ? rawIntent : null)
          evalOut = {
            intent: safeIntent,
            verdict: safeVerdict,
            matched_pattern_id: toolUseBlock.input.matched_pattern_id ?? null,
            criteria_met: Array.isArray(toolUseBlock.input.criteria_met) ? toolUseBlock.input.criteria_met : [],
            gap: toolUseBlock.input.gap ?? null,
            reasoning: toolUseBlock.input.reasoning ?? ''
          }
        }
        const evalMs = Date.now() - evalT0
        send({ type: 'eval', intent: evalOut.intent, verdict: evalOut.verdict })

        // ---- 3. Responder (Sonnet, streamed) -----------------------------
        send({ type: 'stage', stage: 'responding' })
        const respT0 = Date.now()
        const responderSystem = [
          ...systemBlocks,
          { type: 'text' as const, text: RESPONDER_SYSTEM_SUFFIX }
        ]
        const responderUserMessage = `${userMessage}

=== EVALUATION ===
${JSON.stringify(evalOut, null, 2)}

Write the reply now per the rules. Output ONLY the reply text.`

        let fullReply = ''
        let firstTokenMs: number | null = null

        const responderStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: responderSystem,
          messages: [{ role: 'user', content: responderUserMessage }]
        })

        for await (const event of responderStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text
            if (firstTokenMs === null) firstTokenMs = Date.now() - respT0
            fullReply += text
            send({ type: 'token', text })
          }
        }
        const respMs = Date.now() - respT0

        // ---- 4. Deterministic post-validation ----------------------------
        const sycophancyHit = detectSycophancy(fullReply)
        const qCount = countQuestions(fullReply)
        let flagReason: string | null = null
        if (sycophancyHit) flagReason = `Sycophancy bigram: "${sycophancyHit}"`
        else if (qCount > 1 && evalOut.intent !== 'meta') flagReason = `Multiple questions (${qCount})`

        // ---- 5. Final event ---------------------------------------------
        const mastery = evalOut.verdict === 'pass' ? 'mastered' : 'in_progress'
        send({
          type: 'final',
          verdict: evalOut.verdict,
          intent: evalOut.intent,
          mastery,
          flagged: !!flagReason,
          flag_reason: flagReason,
          timings: { loadMs, evalMs, respMs, firstTokenMs }
        })

        // ---- 6. Async: persist turn, update session, mastery -------------
        // We close the SSE stream here so the client perceives it as done.
        // Persist happens after; if it fails the student already saw the reply.
        close()
        await persistAsync({
          admin,
          ctx,
          studentMessage,
          fullReply,
          evalOut,
          flagReason,
          mastery
        }).catch(e => console.error('persist failed', e))
      } catch (e) {
        send({ type: 'error', error: e instanceof Error ? e.message : 'failed' })
        close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}

async function runCritic(
  ctx: LoadedContext,
  studentMessage: string,
  fullReply: string,
  evalOut: EvaluatorOutput
): Promise<CriticOutput> {
  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: [
        ...buildSystemBlocks(ctx),
        { type: 'text' as const, text: CRITIC_SYSTEM }
      ],
      messages: [{
        role: 'user',
        content: `=== STUDENT MESSAGE ===\n${studentMessage}\n\n=== EVALUATION ===\n${JSON.stringify(evalOut, null, 2)}\n\n=== PROPOSED REPLY (already sent to student) ===\n${fullReply}\n\nGrade this reply against the failure modes. Output the tool call.`
      }],
      tools: [CRITIC_TOOL],
      tool_choice: { type: 'tool', name: 'tutor_critic' }
    })
    const tu = r.content.find(b => b.type === 'tool_use') as { type: 'tool_use'; input: any } | undefined
    if (!tu) return { pass: true, issues: [], rewrite_hint: null }
    return {
      pass: tu.input.pass !== false,
      issues: Array.isArray(tu.input.issues) ? tu.input.issues : [],
      rewrite_hint: tu.input.rewrite_hint ?? null
    }
  } catch (e) {
    // Critic failure is non-fatal — better to ship the turn unflagged than block persist.
    return { pass: true, issues: [], rewrite_hint: null }
  }
}

async function persistAsync(args: {
  admin: ReturnType<typeof createAdminClient>
  ctx: LoadedContext
  studentMessage: string
  fullReply: string
  evalOut: EvaluatorOutput
  flagReason: string | null
  mastery: 'mastered' | 'in_progress'
}) {
  const { admin, ctx, studentMessage, fullReply, evalOut, flagReason, mastery } = args
  const turnNumber = (ctx.session.turn_count ?? 0) + 1

  // Run the LLM critic in parallel with persisting the turn.
  // The student already saw the reply — this is calibration data, not a gate.
  const [criticResult] = await Promise.all([
    runCritic(ctx, studentMessage, fullReply, evalOut),
    // No-op promise to keep the array shape stable
    Promise.resolve(null)
  ])

  // Combine deterministic + LLM critic results
  const allIssues: string[] = []
  if (flagReason) allIssues.push(flagReason)
  if (!criticResult.pass) allIssues.push(...criticResult.issues)
  const finalFlag = allIssues.length > 0
  const finalReason = finalFlag ? allIssues.join('; ') : null

  // Persist turn
  await admin.from('tutor_turns').insert({
    session_id: ctx.session.id,
    turn_number: turnNumber,
    student_message: studentMessage,
    agent_message: fullReply,
    intent: evalOut.intent,
    verdict: evalOut.verdict,
    shallow_pattern: evalOut.matched_pattern_id,
    gap: evalOut.gap,
    raw_classification: { intent: evalOut.intent },
    raw_evaluation: evalOut,
    raw_critic: { pass: criticResult.pass, issues: criticResult.issues, rewrite_hint: criticResult.rewrite_hint, deterministic_flag: flagReason },
    flagged_for_review: finalFlag,
    flag_reason: finalReason
  })

  // Update session
  await admin
    .from('tutor_sessions')
    .update({
      turn_count: turnNumber,
      probe_count: ctx.session.probe_count + (['shallow', 'wrong', 'partial'].includes(evalOut.verdict ?? '') ? 1 : 0),
      mastery_reached: evalOut.verdict === 'pass',
      status: evalOut.verdict === 'pass' ? 'mastered' : 'active',
      last_turn_at: new Date().toISOString(),
      ended_at: evalOut.verdict === 'pass' ? new Date().toISOString() : null,
      rubric_id: ctx.rubric.id
    })
    .eq('id', ctx.session.id)

  // Upsert mastery — fetch existing first so we increment attempts properly
  // and don't clobber an earlier first_mastered_at.
  const { data: existing } = await admin
    .from('tutor_mastery')
    .select('attempts, first_mastered_at, total_probes')
    .eq('user_id', ctx.session.user_id)
    .eq('section_id', ctx.session.section_id)
    .maybeSingle()

  await admin
    .from('tutor_mastery')
    .upsert(
      {
        user_id: ctx.session.user_id,
        section_id: ctx.session.section_id,
        status: mastery,
        attempts: (existing?.attempts ?? 0) + (ctx.session.turn_count === 0 ? 1 : 0),
        total_probes: (existing?.total_probes ?? 0) + (['shallow', 'wrong', 'partial'].includes(evalOut.verdict ?? '') ? 1 : 0),
        first_mastered_at: existing?.first_mastered_at ?? (evalOut.verdict === 'pass' ? new Date().toISOString() : null),
        last_attempt_at: new Date().toISOString()
      },
      { onConflict: 'user_id,section_id' }
    )
}
