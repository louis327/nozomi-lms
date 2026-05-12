// Builds and uploads the Nozomi Tutor agent n8n workflow.
//
// Architecture:
//   webhook → validate → load(session,rubric,section) → build context →
//   classify (Haiku) → switch on intent →
//     [answer] evaluate (Sonnet) → respond (Sonnet)
//     [question] answer-from-course (Sonnet)
//     [off_topic] scope-back (Haiku)
//     [meta] static reply (Code)
//   → merge → critic (Haiku) → persist turn → update session/mastery → respond to webhook

const https = require('https');

const N8N_HOST = process.env.N8N_HOST || 'n8n.textflow.com.au';
const N8N_API_KEY = process.env.N8N_API_KEY;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lxgethcibldfcnmajutf.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;

const SUPABASE_CRED_ID  = process.env.N8N_SUPABASE_CRED_ID  || 'Fq0gFGPTiP3Wgc2A';
const ANTHROPIC_CRED_ID = process.env.N8N_ANTHROPIC_CRED_ID || 'JoMJUil5cCEwBPbm';

for (const [k, v] of Object.entries({ N8N_API_KEY, SUPABASE_ANON_KEY: SUPABASE_ANON })) {
  if (!v) { console.error('Set env var: ' + k); process.exit(1); }
}

const VOICE_PRINCIPLES = `
You are a Socratic tutor for Nozomi, a founder fundraising course built by Louis.

VOICE — DO:
- Direct, declarative, short sentences
- "You're close" / "Not quite — keep pulling" / "Look again at..."
- Anti-vagueness, pro-specificity
- Cite the section's named concept when grading
- One pointed probe at a time

VOICE — DON'T:
- "Great question!" / "Wonderful insight!" / "Excellent answer!" — never
- Multiple questions in one message
- Reveal the answer before they've tried twice
- Generic encouragement without naming what was good or weak
- Go outside the course material — scope back politely instead

RESPONSE LENGTH: usually 2-4 sentences. Never paragraphs of explanation unless they've earned the worked example.
`.trim();

const node = (i, name, type, parameters, opts = {}) => ({
  id: `n${i}`,
  name,
  type,
  typeVersion: opts.typeVersion ?? 1,
  position: opts.position ?? [0, 0],
  parameters,
  ...(opts.credentials ? { credentials: opts.credentials } : {}),
  ...(opts.onError ? { onError: opts.onError } : {}),
  ...(opts.retryOnFail ? { retryOnFail: opts.retryOnFail, maxTries: 2, waitBetweenTries: 1000 } : {})
});

const httpCred = id => ({ httpHeaderAuth: { id, name: '' } });

// ---------------------------------------------------------------------------
// Node definitions
// ---------------------------------------------------------------------------

const X = 250;
const Y = 200;
const row = r => Y + r * 180;
const col = c => 250 + c * X;

const nodes = [];

// 1. Webhook --------------------------------------------------------------
const webhookNode = node(
  1,
  'Tutor Turn Webhook',
  'n8n-nodes-base.webhook',
  {
    httpMethod: 'POST',
    path: 'nozomi-tutor-turn',
    responseMode: 'responseNode',
    options: {}
  },
  { typeVersion: 2, position: [col(0), row(2)] }
);
webhookNode.webhookId = 'nozomi-tutor-turn';
nodes.push(webhookNode);

// 2. Validate input -------------------------------------------------------
nodes.push(
  node(
    2,
    'Validate Input',
    'n8n-nodes-base.code',
    {
      jsCode: `
const b = items[0]?.json?.body ?? items[0]?.json ?? {};
const required = ['sessionId', 'userId', 'sectionId', 'studentMessage'];
for (const k of required) {
  if (!b[k]) throw new Error('Missing field: ' + k);
}
return [{ json: {
  sessionId: b.sessionId,
  userId: b.userId,
  sectionId: b.sectionId,
  studentMessage: String(b.studentMessage).slice(0, 4000),
  isOpener: !!b.isOpener
}}];
`.trim()
    },
    { typeVersion: 2, position: [col(1), row(2)] }
  )
);

// 3-5. Parallel context loads --------------------------------------------
const supaUrl = path =>
  `${SUPABASE_URL}/rest/v1/${path}`;

const sbHeaders = [
  { name: 'apikey', value: SUPABASE_ANON },
  { name: 'Content-Type', value: 'application/json' }
];

nodes.push(
  node(
    3,
    'Load Session + Turns',
    'n8n-nodes-base.httpRequest',
    {
      method: 'GET',
      url: `=${SUPABASE_URL}/rest/v1/tutor_sessions?id=eq.{{$json.sessionId}}&select=id,user_id,section_id,rubric_id,turn_count,probe_count,mastery_reached,status,tutor_turns(turn_number,student_message,agent_message,intent,verdict,gap,created_at)`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPABASE_ANON },
        { name: 'Accept', value: 'application/json' }
      ]},
      options: { response: { response: { responseFormat: 'json' } } }
    },
    {
      typeVersion: 4.2,
      position: [col(2), row(0)],
      credentials: httpCred(SUPABASE_CRED_ID),
      retryOnFail: true
    }
  )
);

nodes.push(
  node(
    4,
    'Load Rubric',
    'n8n-nodes-base.httpRequest',
    {
      method: 'GET',
      url: `=${SUPABASE_URL}/rest/v1/tutor_rubrics?section_id=eq.{{$('Validate Input').item.json.sectionId}}&status=eq.approved&select=id,question,pass_criteria,shallow_patterns,wrong_patterns,off_scope_hint,notes&limit=1`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPABASE_ANON },
        { name: 'Accept', value: 'application/json' }
      ]}
    },
    {
      typeVersion: 4.2,
      position: [col(2), row(2)],
      credentials: httpCred(SUPABASE_CRED_ID),
      retryOnFail: true
    }
  )
);

nodes.push(
  node(
    5,
    'Load Section Content',
    'n8n-nodes-base.httpRequest',
    {
      method: 'GET',
      url: `=${SUPABASE_URL}/rest/v1/sections?id=eq.{{$('Validate Input').item.json.sectionId}}&select=id,title,content_blocks(type,content,sort_order)`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPABASE_ANON },
        { name: 'Accept', value: 'application/json' }
      ]}
    },
    {
      typeVersion: 4.2,
      position: [col(2), row(4)],
      credentials: httpCred(SUPABASE_CRED_ID),
      retryOnFail: true
    }
  )
);

// 6. Build Context --------------------------------------------------------
nodes.push(
  node(
    6,
    'Build Context',
    'n8n-nodes-base.code',
    {
      jsCode: `
const input = $('Validate Input').first().json;
// n8n auto-unwraps PostgREST arrays — first() is the first element already.
const sess = $('Load Session + Turns').first().json || null;
const rub  = $('Load Rubric').first().json          || null;
const sec  = $('Load Section Content').first().json || null;

if (!rub)  throw new Error('No approved rubric for this section');
if (!sec)  throw new Error('Section not found');

const blocks = (sec.content_blocks || []).sort((a,b) => a.sort_order - b.sort_order);
const sectionText = blocks.map(b => {
  if (b.type === 'rich_text' || b.type === 'callout' || b.type === 'quote')
    return (b.content?.html || b.content?.text || '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g,' ').trim();
  if (b.type === 'table' && b.content?.rows)
    return '[Table] ' + b.content.rows.map(r => r.join(' | ')).join(' / ');
  if (b.type === 'image') return '';
  return '[' + b.type + ']';
}).filter(Boolean).join('\\n\\n');

const history = ((sess?.tutor_turns) || [])
  .sort((a,b) => a.turn_number - b.turn_number)
  .slice(-8)
  .map(t => ({
    role_student: t.student_message,
    role_tutor: t.agent_message,
    intent: t.intent,
    verdict: t.verdict
  }));

const turnNumber = (sess?.turn_count ?? 0) + 1;
const probeCount = sess?.probe_count ?? 0;

return [{ json: {
  ...input,
  rubricId: rub.id,
  question: rub.question,
  passCriteria: rub.pass_criteria,
  shallowPatterns: rub.shallow_patterns,
  wrongPatterns: rub.wrong_patterns,
  offScopeHint: rub.off_scope_hint,
  authorNotes: rub.notes,
  sectionTitle: sec.title,
  sectionText,
  history,
  turnNumber,
  probeCount,
  isFirstTurn: !sess || (sess.turn_count ?? 0) === 0
}}];
`.trim()
    },
    { typeVersion: 2, position: [col(3), row(2)] }
  )
);

// 7. Classify (Haiku) -----------------------------------------------------
const claudeBody = (model, system, userText, maxTokens = 1024) =>
  ({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userText }]
  });

nodes.push(
  node(
    7,
    'Classify Intent',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'Content-Type', value: 'application/json' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: ${JSON.stringify(`${VOICE_PRINCIPLES}

You are the CLASSIFIER stage. You do NOT respond to the student. You only label what they said.`)},
        messages: [{
          role: 'user',
          content: 'Checkpoint question:\\n' + $json.question +
                   '\\n\\nRecent history (last few turns):\\n' + JSON.stringify($json.history, null, 2) +
                   '\\n\\nStudent message:\\n' + $json.studentMessage +
                   '\\n\\nClassify the student message. Output ONLY JSON of shape:\\n' +
                   '{ "intent": "answer" | "question" | "off_topic" | "meta", "confidence": 0..1, "reasoning": "short" }\\n' +
                   '- "answer": attempting the checkpoint question\\n' +
                   '- "question": asking the tutor something\\n' +
                   '- "off_topic": not about this section\\n' +
                   '- "meta": about the tutor itself, how it works, frustration with format'
        }]
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(4), row(2)],
      credentials: httpCred(ANTHROPIC_CRED_ID),
      retryOnFail: true
    }
  )
);

// 8. Parse Classification --------------------------------------------------
nodes.push(
  node(
    8,
    'Parse Classification',
    'n8n-nodes-base.code',
    {
      jsCode: `
const ctx = $('Build Context').first().json;
const raw = items[0].json;
const text = raw?.content?.[0]?.text || '';
let parsed = { intent: 'answer', confidence: 0.3, reasoning: 'parse-fail' };
try {
  const m = text.match(/\\{[\\s\\S]*\\}/);
  if (m) parsed = JSON.parse(m[0]);
} catch (e) {}
if (ctx.isFirstTurn && !ctx.studentMessage.trim()) parsed.intent = 'opener';
return [{ json: { ...ctx, classification: parsed, intent: parsed.intent } }];
`.trim()
    },
    { typeVersion: 2, position: [col(5), row(2)] }
  )
);

// 9. Switch on intent ------------------------------------------------------
nodes.push(
  node(
    9,
    'Route by Intent',
    'n8n-nodes-base.switch',
    {
      mode: 'rules',
      rules: {
        values: [
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ id: 'r1', leftValue: '={{$json.intent}}', rightValue: 'answer', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'answer' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ id: 'r2', leftValue: '={{$json.intent}}', rightValue: 'question', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'question' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ id: 'r3', leftValue: '={{$json.intent}}', rightValue: 'off_topic', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'off_topic' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ id: 'r4', leftValue: '={{$json.intent}}', rightValue: 'meta', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'meta' }
        ]
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'other' }
    },
    { typeVersion: 3.2, position: [col(6), row(2)] }
  )
);

// 10. Evaluate (only on answer branch) ------------------------------------
nodes.push(
  node(
    10,
    'Evaluate Answer',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'Content-Type', value: 'application/json' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: ${JSON.stringify(`${VOICE_PRINCIPLES}

You are the EVALUATOR stage. Grade the student's answer hard but fair. Do NOT respond to the student — only output JSON.`)},
        messages: [{
          role: 'user',
          content:
            '=== SECTION MATERIAL ===\\n' + $json.sectionText +
            '\\n\\n=== CHECKPOINT QUESTION ===\\n' + $json.question +
            '\\n\\n=== PASS CRITERIA ===\\n' + JSON.stringify($json.passCriteria, null, 2) +
            '\\n\\n=== KNOWN SHALLOW PATTERNS ===\\n' + JSON.stringify($json.shallowPatterns, null, 2) +
            '\\n\\n=== KNOWN WRONG PATTERNS ===\\n' + JSON.stringify($json.wrongPatterns, null, 2) +
            '\\n\\n=== CONVERSATION SO FAR ===\\n' + JSON.stringify($json.history, null, 2) +
            '\\n\\n=== STUDENT ANSWER ===\\n' + $json.studentMessage +
            '\\n\\nEvaluate. Output ONLY JSON:\\n' +
            '{\\n' +
            '  "verdict": "pass" | "shallow" | "wrong" | "partial",\\n' +
            '  "criteria_met": [<pass criterion IDs that were addressed>],\\n' +
            '  "matched_shallow": <shallow pattern ID or null>,\\n' +
            '  "matched_wrong": <wrong pattern ID or null>,\\n' +
            '  "gap": "<one-sentence what is missing or misunderstood>",\\n' +
            '  "reasoning": "<2-3 sentences>"\\n' +
            '}\\n\\n' +
            'GRADING STANCE: a "pass" requires hitting the spirit of all pass criteria, even loosely paraphrased. Missing the most important criterion = "partial". Shallow-correct (right vibe, no substance) = "shallow". Externalising / wrong framing = "wrong".'
        }]
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(7), row(0)],
      credentials: httpCred(ANTHROPIC_CRED_ID),
      retryOnFail: true
    }
  )
);

// 11. Parse Evaluation -----------------------------------------------------
nodes.push(
  node(
    11,
    'Parse Evaluation',
    'n8n-nodes-base.code',
    {
      jsCode: `
const ctx = $('Parse Classification').first().json;
const raw = items[0].json;
const text = raw?.content?.[0]?.text || '';
let evalJson = { verdict: 'partial', criteria_met: [], matched_shallow: null, matched_wrong: null, gap: '(parse-fail)', reasoning: '' };
try {
  const m = text.match(/\\{[\\s\\S]*\\}/);
  if (m) evalJson = JSON.parse(m[0]);
} catch (e) {}
return [{ json: { ...ctx, evaluation: evalJson, verdict: evalJson.verdict } }];
`.trim()
    },
    { typeVersion: 2, position: [col(8), row(0)] }
  )
);

// 12. Respond to answer ---------------------------------------------------
nodes.push(
  node(
    12,
    'Respond to Answer',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'Content-Type', value: 'application/json' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: ${JSON.stringify(`${VOICE_PRINCIPLES}

You are the RESPONDER stage. Write the next message to the student. Follow the verdict-specific rules below.`)},
        messages: [{
          role: 'user',
          content:
            '=== SECTION: ' + $json.sectionTitle + ' ===\\n' + $json.sectionText +
            '\\n\\n=== CHECKPOINT QUESTION ===\\n' + $json.question +
            '\\n\\n=== AUTHOR NOTES (LOUIS VOICE) ===\\n' + ($json.authorNotes || '') +
            '\\n\\n=== CONVERSATION SO FAR ===\\n' + JSON.stringify($json.history, null, 2) +
            '\\n\\n=== STUDENT JUST SAID ===\\n' + $json.studentMessage +
            '\\n\\n=== EVALUATION ===\\n' + JSON.stringify($json.evaluation, null, 2) +
            '\\n\\n=== KNOWN SHALLOW PATTERNS (for probes) ===\\n' + JSON.stringify($json.shallowPatterns, null, 2) +
            '\\n\\n=== KNOWN WRONG PATTERNS (for leading questions) ===\\n' + JSON.stringify($json.wrongPatterns, null, 2) +
            '\\n\\n=== PROBE COUNT SO FAR ===\\n' + $json.probeCount +
            '\\n\\nRespond per these rules:\\n' +
            '- If verdict=pass: pointed praise naming the specific concept they nailed (cite by name). Mark this checkpoint as complete in your reply (e.g. "That\\'s it. You\\'ve got the number-vs-position distinction."). Briefly preview what to think about next. 2-3 sentences.\\n' +
            '- If verdict=shallow: use the matched shallow pattern\\'s probe (or a close variant in Louis voice). ONE pointed question. Do NOT reveal what they\\'re missing. 2-3 sentences max.\\n' +
            '- If verdict=wrong: use the matched wrong pattern\\'s leading_question. Don\\'t correct directly. 2-3 sentences.\\n' +
            '- If verdict=partial: acknowledge what they hit by name, ask them to keep pulling on the specific gap. 2-3 sentences.\\n' +
            '- If probe_count >= 3 and verdict != "pass": offer a brief worked example (cite a specific quote/contrast from the section material), then re-ask in a way that lets them apply it.\\n\\n' +
            'Output ONLY the reply text. No JSON, no preamble, no signoff.'
        }]
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(9), row(0)],
      credentials: httpCred(ANTHROPIC_CRED_ID),
      retryOnFail: true
    }
  )
);

// 13. Question branch responder ------------------------------------------
nodes.push(
  node(
    13,
    'Answer Student Question',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'Content-Type', value: 'application/json' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: ${JSON.stringify(`${VOICE_PRINCIPLES}

The student asked a question rather than answered the checkpoint. Answer from the section material only. If outside scope, use the author's off_scope_hint to scope back.`)},
        messages: [{
          role: 'user',
          content:
            '=== SECTION: ' + $json.sectionTitle + ' ===\\n' + $json.sectionText +
            '\\n\\n=== CHECKPOINT WE WERE WORKING ON ===\\n' + $json.question +
            '\\n\\n=== OFF-SCOPE HINT (if needed) ===\\n' + ($json.offScopeHint || '') +
            '\\n\\n=== STUDENT QUESTION ===\\n' + $json.studentMessage +
            '\\n\\nAnswer their question grounded ONLY in the section above. Cite the section concept by name. 2-4 sentences. End by gently inviting them back to the checkpoint.\\n\\n' +
            'Output ONLY the reply text.'
        }]
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(7), row(2)],
      credentials: httpCred(ANTHROPIC_CRED_ID),
      retryOnFail: true
    }
  )
);

// 14. Off-topic responder -------------------------------------------------
nodes.push(
  node(
    14,
    'Scope Back',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'Content-Type', value: 'application/json' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        system: ${JSON.stringify(`${VOICE_PRINCIPLES}

Student went off-topic. Use the off_scope_hint to scope back politely. ONE-TWO sentences. Invite them back to the checkpoint.`)},
        messages: [{
          role: 'user',
          content:
            'Section: ' + $json.sectionTitle +
            '\\nCheckpoint: ' + $json.question +
            '\\nOff-scope hint: ' + ($json.offScopeHint || '(none)') +
            '\\n\\nStudent said: ' + $json.studentMessage +
            '\\n\\nScope back. 1-2 sentences. Output only the reply.'
        }]
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(7), row(4)],
      credentials: httpCred(ANTHROPIC_CRED_ID),
      retryOnFail: true
    }
  )
);

// 15. Meta responder (static) --------------------------------------------
nodes.push(
  node(
    15,
    'Meta Reply',
    'n8n-nodes-base.code',
    {
      jsCode: `
const ctx = items[0].json;
return [{ json: { ...ctx, replyText: "I'm your tutor for this section. I ask one focused question at a time, and I'll push back if your answer is shallow. The goal isn't to be right fast — it's to make the concept yours. Take a shot at the checkpoint and I'll respond.", reply_source: 'meta' } }];
`.trim()
    },
    { typeVersion: 2, position: [col(7), row(6)] }
  )
);

// 16. Normalize Replies ---------------------------------------------------
// Merges all branches into a uniform shape: { ...ctx, replyText, verdict?, evaluation? }
nodes.push(
  node(
    16,
    'Normalize Reply',
    'n8n-nodes-base.code',
    {
      jsCode: `
// Merge whichever branch executed into a uniform shape.
// Only one of (Respond to Answer | Answer Student Question | Scope Back | Meta Reply)
// will have produced this item — but we don't know which without inspection.

const raw = items[0].json;
const safe = (fn) => { try { return fn(); } catch (e) { return null; } };

// Base context: always available from Parse Classification (runs for every turn).
const baseCtx = safe(() => $('Parse Classification').first().json) || {};

// Try to find evaluation context if the Answer branch ran.
const evalCtx = safe(() => $('Parse Evaluation').first().json);

let replyText = '';
let source = 'unknown';
let verdict = null;
let evaluation = null;

if (raw && typeof raw === 'object' && raw.reply_source === 'meta' && raw.replyText) {
  replyText = raw.replyText;
  source = 'meta';
} else if (raw?.content?.[0]?.text) {
  replyText = String(raw.content[0].text).trim();
  // Pick source by checking which upstream node has data flowing this turn.
  if (evalCtx?.evaluation) {
    source = 'answer';
    evaluation = evalCtx.evaluation;
    verdict = evaluation?.verdict ?? null;
  } else {
    // Question or off_topic — disambiguate by the classification intent
    source = baseCtx.intent === 'question' ? 'question' : 'off_topic';
  }
} else {
  replyText = "I had trouble crafting a reply. Try rephrasing?";
  source = 'fallback';
}

const ctx = evalCtx || baseCtx;
return [{ json: { ...ctx, replyText, verdict, evaluation, reply_source: source } }];
`.trim()
    },
    { typeVersion: 2, position: [col(10), row(2)] }
  )
);

// 17. Critic --------------------------------------------------------------
nodes.push(
  node(
    17,
    'Critic Review',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'anthropic-version', value: '2023-06-01' },
        { name: 'Content-Type', value: 'application/json' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: ${JSON.stringify(`${VOICE_PRINCIPLES}

You are the CRITIC. You review the tutor's proposed reply before it's sent. You are looking for: sycophancy, multiple questions, generic responses, revealing the answer too early, missing concept citation. You are NOT looking for stylistic preferences — only the failure modes above. Be strict but specific.`)},
        messages: [{
          role: 'user',
          content:
            '=== STUDENT MESSAGE ===\\n' + $json.studentMessage +
            '\\n\\n=== EVALUATION (if answer branch) ===\\n' + JSON.stringify($json.evaluation || null) +
            '\\n\\n=== PROPOSED REPLY ===\\n' + $json.replyText +
            '\\n\\nCheck:\\n' +
            '1. Sycophancy? ("great answer!", "wonderful insight!", unjustified praise) — fail\\n' +
            '2. Multiple questions in one turn? — fail\\n' +
            '3. Generic — doesn\\'t engage with what the student actually said? — fail\\n' +
            '4. If verdict was pass: does it cite the specific concept they got right? Required.\\n' +
            '5. If verdict was shallow/wrong/partial: does it avoid revealing the answer? Required.\\n\\n' +
            'Output ONLY JSON:\\n' +
            '{ "pass": true | false, "issues": [<list of issue strings>], "rewrite_hint": "<if !pass, one-line hint>" }'
        }]
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(11), row(2)],
      credentials: httpCred(ANTHROPIC_CRED_ID),
      retryOnFail: true
    }
  )
);

// 18. Parse Critic + Decide Persist Path ---------------------------------
nodes.push(
  node(
    18,
    'Parse Critic',
    'n8n-nodes-base.code',
    {
      jsCode: `
const ctx = $('Normalize Reply').first().json;
const raw = items[0].json;
const text = raw?.content?.[0]?.text || '';
let crit = { pass: true, issues: [], rewrite_hint: '' };
try {
  const m = text.match(/\\{[\\s\\S]*\\}/);
  if (m) crit = JSON.parse(m[0]);
} catch (e) {}

const flagged = !crit.pass;
const flagReason = flagged ? (crit.issues || []).join('; ') : null;

return [{ json: { ...ctx, critic: crit, flagged_for_review: flagged, flag_reason: flagReason } }];
`.trim()
    },
    { typeVersion: 2, position: [col(12), row(2)] }
  )
);

// 19. Persist Turn --------------------------------------------------------
nodes.push(
  node(
    19,
    'Persist Turn',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/tutor_turns`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPABASE_ANON },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=representation' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        session_id: $json.sessionId,
        turn_number: $json.turnNumber,
        student_message: $json.studentMessage,
        agent_message: $json.replyText,
        intent: $json.intent,
        verdict: $json.verdict || null,
        shallow_pattern: $json.evaluation?.matched_shallow || null,
        gap: $json.evaluation?.gap || null,
        raw_classification: $json.classification,
        raw_evaluation: $json.evaluation,
        raw_critic: $json.critic,
        flagged_for_review: $json.flagged_for_review,
        flag_reason: $json.flag_reason
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(13), row(2)],
      credentials: httpCred(SUPABASE_CRED_ID),
      retryOnFail: true
    }
  )
);

// 20. Update Session ------------------------------------------------------
nodes.push(
  node(
    20,
    'Update Session',
    'n8n-nodes-base.httpRequest',
    {
      method: 'PATCH',
      url: `=${SUPABASE_URL}/rest/v1/tutor_sessions?id=eq.{{$('Parse Critic').item.json.sessionId}}`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPABASE_ANON },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=minimal' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        turn_count: $('Parse Critic').item.json.turnNumber,
        probe_count: $('Parse Critic').item.json.probeCount + ($('Parse Critic').item.json.verdict === 'shallow' || $('Parse Critic').item.json.verdict === 'wrong' || $('Parse Critic').item.json.verdict === 'partial' ? 1 : 0),
        mastery_reached: $('Parse Critic').item.json.verdict === 'pass',
        status: $('Parse Critic').item.json.verdict === 'pass' ? 'mastered' : 'active',
        last_turn_at: new Date().toISOString(),
        ended_at: $('Parse Critic').item.json.verdict === 'pass' ? new Date().toISOString() : null,
        rubric_id: $('Parse Critic').item.json.rubricId
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(14), row(2)],
      credentials: httpCred(SUPABASE_CRED_ID),
      retryOnFail: true
    }
  )
);

// 21. Update Mastery (upsert) --------------------------------------------
nodes.push(
  node(
    21,
    'Upsert Mastery',
    'n8n-nodes-base.httpRequest',
    {
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/tutor_mastery?on_conflict=user_id,section_id`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'apikey', value: SUPABASE_ANON },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'resolution=merge-duplicates,return=minimal' }
      ]},
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        user_id: $('Parse Critic').item.json.userId,
        section_id: $('Parse Critic').item.json.sectionId,
        status: $('Parse Critic').item.json.verdict === 'pass' ? 'mastered' : 'in_progress',
        attempts: 1,
        total_probes: $('Parse Critic').item.json.probeCount,
        first_mastered_at: $('Parse Critic').item.json.verdict === 'pass' ? new Date().toISOString() : null,
        last_attempt_at: new Date().toISOString()
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(15), row(2)],
      credentials: httpCred(SUPABASE_CRED_ID),
      retryOnFail: true
    }
  )
);

// 22. Respond to Webhook --------------------------------------------------
nodes.push(
  node(
    22,
    'Respond to Webhook',
    'n8n-nodes-base.respondToWebhook',
    {
      respondWith: 'json',
      responseBody: `={{ JSON.stringify({
        reply: $('Parse Critic').item.json.replyText,
        intent: $('Parse Critic').item.json.intent,
        verdict: $('Parse Critic').item.json.verdict,
        mastery: $('Parse Critic').item.json.verdict === 'pass' ? 'mastered' : 'in_progress',
        probeCount: $('Parse Critic').item.json.probeCount,
        flagged: $('Parse Critic').item.json.flagged_for_review,
        sessionId: $('Parse Critic').item.json.sessionId
      }) }}`,
      options: {}
    },
    { typeVersion: 1.1, position: [col(16), row(2)] }
  )
);

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

const conn = (from, to, fromIdx = 0, toIdx = 0) => ({ from, to, fromIdx, toIdx });

const connections = {};
function link(from, to, fromIdx = 0) {
  if (!connections[from]) connections[from] = { main: [] };
  while (connections[from].main.length <= fromIdx) connections[from].main.push([]);
  connections[from].main[fromIdx].push({ node: to, type: 'main', index: 0 });
}

link('Tutor Turn Webhook', 'Validate Input');
link('Validate Input', 'Load Session + Turns');
link('Load Session + Turns', 'Load Rubric');
link('Load Rubric', 'Load Section Content');
link('Load Section Content', 'Build Context');
link('Build Context', 'Classify Intent');
link('Classify Intent', 'Parse Classification');
link('Parse Classification', 'Route by Intent');
// Switch outputs: 0=answer, 1=question, 2=off_topic, 3=meta
link('Route by Intent', 'Evaluate Answer', 0);
link('Route by Intent', 'Answer Student Question', 1);
link('Route by Intent', 'Scope Back', 2);
link('Route by Intent', 'Meta Reply', 3);
link('Evaluate Answer', 'Parse Evaluation');
link('Parse Evaluation', 'Respond to Answer');
link('Respond to Answer', 'Normalize Reply');
link('Answer Student Question', 'Normalize Reply');
link('Scope Back', 'Normalize Reply');
link('Meta Reply', 'Normalize Reply');
link('Normalize Reply', 'Critic Review');
link('Critic Review', 'Parse Critic');
link('Parse Critic', 'Persist Turn');
link('Persist Turn', 'Update Session');
link('Update Session', 'Upsert Mastery');
link('Upsert Mastery', 'Respond to Webhook');

// ---------------------------------------------------------------------------
// Workflow payload
// ---------------------------------------------------------------------------

const workflow = {
  name: 'Nozomi LMS — AI Tutor (Socratic)',
  nodes,
  connections,
  settings: {
    saveExecutionProgress: true,
    saveManualExecutions: true,
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'all',
    executionTimeout: 120,
    executionOrder: 'v1'
  }
};

// ---------------------------------------------------------------------------
// Create or update
// ---------------------------------------------------------------------------

const headers = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json'
};

function req(method, path, body) {
  return new Promise((res, rej) => {
    const payload = body ? JSON.stringify(body) : '';
    const r = https.request(
      {
        hostname: N8N_HOST,
        path,
        method,
        headers: { ...headers, ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) }
      },
      rs => {
        let d = '';
        rs.on('data', c => (d += c));
        rs.on('end', () => res({ s: rs.statusCode, d }));
      }
    );
    r.on('error', rej);
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  // Check if a workflow with this name already exists
  const list = await req('GET', '/api/v1/workflows?limit=200');
  let existingId = null;
  try {
    const data = JSON.parse(list.d);
    const hit = (data.data || []).find(w => w.name === workflow.name);
    if (hit) existingId = hit.id;
  } catch (e) {}

  if (existingId) {
    const r = await req('PUT', `/api/v1/workflows/${existingId}`, workflow);
    console.log('UPDATE', existingId, r.s, r.d.slice(0, 400));
  } else {
    const r = await req('POST', '/api/v1/workflows', workflow);
    console.log('CREATE', r.s, r.d.slice(0, 400));
  }
})();
