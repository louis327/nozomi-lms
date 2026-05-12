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

VOICE — DON'T (hard bans, instant rewrite if used):
- "Good question" / "Great question" / "Great answer" / "Wonderful" / "Excellent" / "That's a great point" — these are the sycophancy bigrams, NEVER use them, not even as openers
- Multiple questions in one message — exactly one question per turn, ever
- Reveal the answer before the student has tried at least twice
- Generic encouragement that doesn't name what was good or weak
- Go outside the course material — scope back politely instead

RESPONSE LENGTH: usually 2-4 sentences. Never paragraphs of explanation unless the student has earned the worked example.

GROUNDING: when you cite a concept or quote, only reference material from the course outline or section content that's been provided to you. If you don't see it in the provided material, don't invent it.
`.trim();

// Phrases the critic must hard-fail on if found in the reply (case-insensitive).
const SYCOPHANCY_BIGRAMS = [
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
];

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
const required = ['sessionId', 'userId', 'sectionId', 'blockId', 'studentMessage'];
for (const k of required) {
  if (!b[k]) throw new Error('Missing field: ' + k);
}
return [{ json: {
  sessionId: b.sessionId,
  userId: b.userId,
  sectionId: b.sectionId,
  blockId: b.blockId,
  studentMessage: String(b.studentMessage).slice(0, 8000),
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
      url: `=${SUPABASE_URL}/rest/v1/tutor_rubrics?block_id=eq.{{$('Validate Input').item.json.blockId}}&status=eq.approved&select=id,question,pass_criteria,shallow_patterns,wrong_patterns,off_scope_hint,notes&limit=1`,
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
      url: `=${SUPABASE_URL}/rest/v1/sections?id=eq.{{$('Validate Input').item.json.sectionId}}&select=id,title,module_id,content_blocks(type,content,sort_order),modules!inner(id,title,course_id,courses!inner(id,title))`,
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

// 5b. Load Course Outline + Workbook Prompts ------------------------------
// Pulls every module + section title in the course AND every workbook_prompt
// / structured_prompt block content. Used to map the student's stored
// workbook_data answers to the prompts they answer.
nodes.push(
  node(
    51,
    'Load Course Outline',
    'n8n-nodes-base.httpRequest',
    {
      method: 'GET',
      url: `=${SUPABASE_URL}/rest/v1/modules?course_id=eq.{{$('Load Section Content').item.json.modules.course_id}}&select=id,title,sort_order,sections(id,title,sort_order,status,content_blocks(id,type,content,sort_order))&sections.content_blocks.type=in.(workbook_prompt,structured_prompt)&order=sort_order`,
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
      position: [col(2), row(5)],
      credentials: httpCred(SUPABASE_CRED_ID),
      retryOnFail: true
    }
  )
);

// 5c. Load Student Portfolio ---------------------------------------------
// Every section_progress row for this user, scoped to sections in the
// current course. Carries workbook_data + completed flag — the agent uses
// this to give coherent feedback that knows the student's prior answers.
nodes.push(
  node(
    52,
    'Load Student Portfolio',
    'n8n-nodes-base.httpRequest',
    {
      method: 'GET',
      url: `=${SUPABASE_URL}/rest/v1/section_progress?user_id=eq.{{$('Validate Input').item.json.userId}}&select=section_id,workbook_data,completed,updated_at`,
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
      position: [col(2), row(6)],
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

// Course outline: a compact map of "Module 1: Title\\n  - Section 1: Title\\n  ..."
// for every module/section in the course. Lets the agent reference structure
// without hallucinating section names.
const moduleObj = Array.isArray(sec.modules) ? sec.modules[0] : sec.modules;
const courseObj = moduleObj?.courses
  ? (Array.isArray(moduleObj.courses) ? moduleObj.courses[0] : moduleObj.courses)
  : null;
const courseTitle = courseObj?.title || 'this course';
const moduleTitle = moduleObj?.title || 'this module';

const outlineModules = ($('Load Course Outline').all() || []).map(it => it.json);
const courseOutline = outlineModules
  .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  .map((m, mi) => {
    const sects = (m.sections || [])
      .filter(s => s.status === 'published')
      .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s, si) => '    - Section ' + (si+1) + ': ' + s.title)
      .join('\\n');
    return 'Module ' + (mi+1) + ': ' + m.title + (sects ? '\\n' + sects : '');
  })
  .join('\\n');

// Find current module + section position within course outline
const currentModuleIdx = outlineModules.findIndex(m => m.id === moduleObj?.id);
const currentSectionsList = outlineModules[currentModuleIdx]?.sections
  ?.filter(s => s.status === 'published')
  ?.sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) || [];
const currentSectionIdx = currentSectionsList.findIndex(s => s.id === sec.id);

// --- STUDENT PORTFOLIO --------------------------------------------------
// Build { sectionId -> { title, prompts: [{ block_id, prompt_text }], workbook_data } }
// then render a readable summary of what the student has answered so far.
const courseSectionIds = new Set();
const promptsByBlockId = new Map();
const sectionTitleByBlockId = new Map();
const sectionTitleBySectionId = new Map();
for (const m of outlineModules) {
  for (const s of (m.sections || [])) {
    courseSectionIds.add(s.id);
    sectionTitleBySectionId.set(s.id, s.title);
    for (const cb of (s.content_blocks || [])) {
      if (cb.type !== 'workbook_prompt' && cb.type !== 'structured_prompt') continue;
      const c = cb.content || {};
      const parts = [];
      if (c.label) parts.push(c.label);
      if (c.html) parts.push(String(c.html).replace(/<[^>]+>/g,' ').replace(/\\s+/g,' '));
      if (c.text) parts.push(c.text);
      if (c.prompt) parts.push(c.prompt);
      if (c.question) parts.push(c.question);
      if (Array.isArray(c.fields)) for (const f of c.fields) parts.push('  · ' + (f.label || f.key || ''));
      const promptText = parts.join(' / ').trim();
      promptsByBlockId.set(cb.id, promptText);
      sectionTitleByBlockId.set(cb.id, s.title);
    }
  }
}

const portfolioRaw = ($('Load Student Portfolio').all() || []).map(it => it.json);

// Group workbook_data keys by their leading blockId (UUID prefix before "_")
// Answers in workbook_data are keyed "<block_uuid>_<field_key>".
function answersByBlock(workbookData) {
  const out = {};
  if (!workbookData || typeof workbookData !== 'object') return out;
  for (const [k, v] of Object.entries(workbookData)) {
    if (k === '_checklists') continue;
    const m = k.match(/^([0-9a-f-]{36})_(.+)$/);
    if (!m) continue;
    const blockId = m[1];
    const fieldKey = m[2];
    if (v === '' || v === null || v === undefined) continue;
    if (!out[blockId]) out[blockId] = [];
    out[blockId].push({ field: fieldKey, answer: String(v) });
  }
  return out;
}

const portfolioBlocks = [];
for (const row of portfolioRaw) {
  if (!courseSectionIds.has(row.section_id)) continue; // skip other courses
  const grouped = answersByBlock(row.workbook_data);
  for (const [bid, answers] of Object.entries(grouped)) {
    const promptText = promptsByBlockId.get(bid) || '(prompt content not in current course outline)';
    const sectionTitle = sectionTitleByBlockId.get(bid) || sectionTitleBySectionId.get(row.section_id) || 'Unknown section';
    portfolioBlocks.push({
      sectionTitle,
      blockId: bid,
      promptText,
      answers
    });
  }
}

// Sort portfolio by section order (rough — by section title alphabetisation is
// fine fallback; we already have the section sort order via outlineModules).
const sectionOrder = new Map();
let n = 0;
for (const m of outlineModules) for (const s of (m.sections || [])) sectionOrder.set(s.id, n++);
portfolioBlocks.sort((a,b) => {
  const ao = sectionOrder.get([...sectionTitleBySectionId.entries()].find(([k,v]) => v === a.sectionTitle)?.[0]) ?? 999;
  const bo = sectionOrder.get([...sectionTitleBySectionId.entries()].find(([k,v]) => v === b.sectionTitle)?.[0]) ?? 999;
  return ao - bo;
});

// Render as a compact text block for the prompt — XML-tagged for the model.
const studentPortfolio = portfolioBlocks.length === 0
  ? '(No prior answers in this course yet.)'
  : portfolioBlocks.map(p => {
      const answers = p.answers.map(a => '  ' + a.field + ': ' + a.answer).join('\\n');
      return '<work section="' + p.sectionTitle + '" block_id="' + p.blockId + '">\\n' +
             'PROMPT: ' + (p.promptText || '(unknown)').slice(0, 300) + '\\n' +
             'STUDENT ANSWER:\\n' + answers + '\\n</work>';
    }).join('\\n\\n');

// Identify which portfolio entry corresponds to THIS prompt (the one being graded)
const currentBlockId = input.blockId;
const currentPromptText = promptsByBlockId.get(currentBlockId) || '';
const currentBlockPriorAnswer = portfolioBlocks.find(p => p.blockId === currentBlockId);

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
  courseTitle,
  moduleTitle,
  modulePosition: currentModuleIdx >= 0 ? currentModuleIdx + 1 : null,
  sectionPosition: currentSectionIdx >= 0 ? currentSectionIdx + 1 : null,
  courseOutline,
  sectionTitle: sec.title,
  sectionText,
  currentPromptText,
  studentPortfolio,
  hasPriorAnswerHere: !!currentBlockPriorAnswer,
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
            '=== COURSE: ' + $json.courseTitle + ' ===\\n' + $json.courseOutline +
            '\\n\\n=== CURRENT POSITION ===\\nModule ' + ($json.modulePosition || '?') + ': ' + $json.moduleTitle + '\\nSection ' + ($json.sectionPosition || '?') + ': ' + $json.sectionTitle +
            '\\n\\n=== SECTION MATERIAL (use ONLY this for grounding) ===\\n' + $json.sectionText +
            '\\n\\n=== STUDENT PORTFOLIO (answers they have already written elsewhere in the course — use this to check consistency and reference prior commitments) ===\\n' + $json.studentPortfolio +
            '\\n\\n=== PROMPT BEING GRADED ===\\n' + $json.question +
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
            '=== COURSE: ' + $json.courseTitle + ' ===\\n' + $json.courseOutline +
            '\\n\\n=== CURRENT POSITION ===\\nModule ' + ($json.modulePosition || '?') + ': ' + $json.moduleTitle + '\\nSection ' + ($json.sectionPosition || '?') + ': ' + $json.sectionTitle +
            '\\n\\n=== SECTION MATERIAL (use ONLY this for quotes/citations) ===\\n' + $json.sectionText +
            '\\n\\n=== STUDENT PORTFOLIO (their prior answers across the course — reference these when inconsistencies appear) ===\\n' + $json.studentPortfolio +
            '\\n\\n=== PROMPT BEING GRADED ===\\n' + $json.question +
            '\\n\\n=== AUTHOR NOTES (LOUIS VOICE — read carefully) ===\\n' + ($json.authorNotes || '') +
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

The student asked a question rather than answered the checkpoint. Answer from the section material first; if the question is about an adjacent module/section, you may name the module by its outline title but you cannot quote material from it. If outside the course entirely, use the off_scope_hint to scope back.`)},
        messages: [{
          role: 'user',
          content:
            '=== COURSE: ' + $json.courseTitle + ' ===\\n' + $json.courseOutline +
            '\\n\\n=== CURRENT POSITION ===\\nModule ' + ($json.modulePosition || '?') + ': ' + $json.moduleTitle + '\\nSection ' + ($json.sectionPosition || '?') + ': ' + $json.sectionTitle +
            '\\n\\n=== SECTION MATERIAL (use ONLY this for quotes) ===\\n' + $json.sectionText +
            '\\n\\n=== STUDENT PORTFOLIO ===\\n' + $json.studentPortfolio +
            '\\n\\n=== PROMPT WE WERE WORKING ON ===\\n' + $json.question +
            '\\n\\n=== OFF-SCOPE HINT (if needed) ===\\n' + ($json.offScopeHint || '') +
            '\\n\\n=== STUDENT QUESTION ===\\n' + $json.studentMessage +
            '\\n\\nAnswer their question. If the answer lives in the current section material, quote/cite from there. If it lives in another module visible in the outline, name the module but say it\\'s covered there. 2-4 sentences. End by inviting them back to the checkpoint — but do NOT say "good question" or similar opener.\\n\\n' +
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

Student went off-topic. Use the off_scope_hint to scope back politely. 1-2 sentences. Invite them back to the checkpoint. NEVER open with "Good question" or any sycophancy bigram.`)},
        messages: [{
          role: 'user',
          content:
            'Section: ' + $json.sectionTitle +
            '\\nCheckpoint: ' + $json.question +
            '\\nOff-scope hint: ' + ($json.offScopeHint || '(none)') +
            '\\nCourse outline (so you know what IS covered elsewhere):\\n' + $json.courseOutline +
            '\\n\\nStudent said: ' + $json.studentMessage +
            '\\n\\nScope back. 1-2 sentences. If their question is covered in another module visible in the outline, name that module. If not in the course at all, simply note the focus is on the current checkpoint. Output only the reply.'
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

You are the CRITIC. You review the tutor's proposed reply before it's sent. You catch these specific failure modes:
1. SYCOPHANCY BIGRAMS — instant fail if the reply contains, case-insensitive, any of: ${SYCOPHANCY_BIGRAMS.map(b => '"' + b + '"').join(', ')}. No exceptions, even as an opener.
2. MULTIPLE QUESTIONS — instant fail if the reply contains more than one question mark, OR contains two questions chained ("X? And Y?" or "Y? What about Z?"). A statement + ONE question is fine. Two questions is not.
3. ANSWER-REVEAL — if the evaluation verdict was shallow/wrong/partial, the reply must NOT reveal the correct answer or the gap directly. Probing/leading questions only.
4. MISSING CONCEPT CITATION — if the evaluation verdict was "pass", the reply must name the specific section concept the student got right. Generic praise = fail.
5. OFF-VOICE — if the reply is corporate/cheerleader-toned rather than Louis-direct (Louis voice: declarative, short, anti-vagueness).

You are NOT a style critic for everything else. Only check those five.`)},
        messages: [{
          role: 'user',
          content:
            '=== STUDENT MESSAGE ===\\n' + $json.studentMessage +
            '\\n\\n=== EVALUATION (if answer branch) ===\\n' + JSON.stringify($json.evaluation || null) +
            '\\n\\n=== PROPOSED REPLY ===\\n' + $json.replyText +
            '\\n\\nRun the 5 checks above. Output ONLY JSON:\\n' +
            '{\\n' +
            '  "pass": true | false,\\n' +
            '  "issues": [<list of issue strings, one per failed check>],\\n' +
            '  "sycophancy_bigram_found": "<bigram string or null>",\\n' +
            '  "question_count": <integer>,\\n' +
            '  "rewrite_hint": "<if !pass, ONE-line specific fix instruction for the responder>"\\n' +
            '}'
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
let crit = { pass: true, issues: [], rewrite_hint: '', sycophancy_bigram_found: null, question_count: 0 };
try {
  const m = text.match(/\\{[\\s\\S]*\\}/);
  if (m) crit = JSON.parse(m[0]);
} catch (e) {}

// Deterministic local check for sycophancy bigrams — backup to the LLM critic.
const BIGRAMS = ${JSON.stringify(SYCOPHANCY_BIGRAMS)};
const lower = (ctx.replyText || '').toLowerCase();
const localBigram = BIGRAMS.find(b => lower.includes(b));
if (localBigram && !crit.sycophancy_bigram_found) {
  crit.pass = false;
  crit.sycophancy_bigram_found = localBigram;
  crit.issues = [...(crit.issues || []), 'Sycophancy bigram detected: "' + localBigram + '"'];
  crit.rewrite_hint = (crit.rewrite_hint || '') + ' Remove the phrase "' + localBigram + '". Open with a declarative sentence or "Not quite —" instead.';
}

// Deterministic local check: count question marks.
const qmarks = (ctx.replyText || '').split('?').length - 1;
if (qmarks > 1 && crit.question_count <= 1) crit.question_count = qmarks;
if (qmarks > 1 && crit.pass) {
  crit.pass = false;
  crit.issues = [...(crit.issues || []), 'Multiple question marks detected (' + qmarks + ')'];
  crit.rewrite_hint = (crit.rewrite_hint || '') + ' Reduce to exactly one question.';
}

const flagged = !crit.pass;
const flagReason = flagged ? (crit.issues || []).join('; ') : null;

return [{ json: { ...ctx, critic: crit, flagged_for_review: flagged, flag_reason: flagReason } }];
`.trim()
    },
    { typeVersion: 2, position: [col(12), row(2)] }
  )
);

// 18b. IF critic passed → Persist directly; otherwise → Rewrite Responder
nodes.push(
  node(
    181,
    'Critic Decision',
    'n8n-nodes-base.if',
    {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'cd1',
          leftValue: '={{$json.critic.pass}}',
          rightValue: 'true',
          operator: { type: 'boolean', operation: 'true', singleValue: true }
        }],
        combinator: 'and'
      },
      options: {}
    },
    { typeVersion: 2.2, position: [col(12), row(3)] }
  )
);

// 18c. Rewrite Responder (only fires on critic fail) ----------------------
nodes.push(
  node(
    182,
    'Rewrite Responder',
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

You are the REWRITE stage. The first draft of the tutor's reply failed the critic. Produce a tightened version that fixes the specific issues the critic identified. Keep the voice; just fix the failures.`)},
        messages: [{
          role: 'user',
          content:
            '=== STUDENT MESSAGE ===\\n' + $json.studentMessage +
            '\\n\\n=== EVALUATION (if answer branch) ===\\n' + JSON.stringify($json.evaluation || null) +
            '\\n\\n=== ORIGINAL REPLY (the one the critic rejected) ===\\n' + $json.replyText +
            '\\n\\n=== CRITIC ISSUES ===\\n' + JSON.stringify($json.critic.issues || []) +
            '\\n\\n=== REWRITE HINT FROM CRITIC ===\\n' + ($json.critic.rewrite_hint || '') +
            '\\n\\n=== AUTHOR NOTES ===\\n' + ($json.authorNotes || '') +
            '\\n\\nRewrite the reply. Fix EACH issue the critic listed. Keep the same intent (probe / leading question / praise / scope-back) but tighten. ONE question only. No sycophancy bigrams. Output ONLY the new reply text.'
        }]
      }) }}`
    },
    {
      typeVersion: 4.2,
      position: [col(13), row(3)],
      credentials: httpCred(ANTHROPIC_CRED_ID),
      retryOnFail: true
    }
  )
);

// 18d. Apply Rewrite — replaces replyText with the rewritten version,
// keeps the flag so we can still review which turns required rewriting.
nodes.push(
  node(
    183,
    'Apply Rewrite',
    'n8n-nodes-base.code',
    {
      jsCode: `
const ctx = $('Parse Critic').first().json;
const raw = items[0].json;
const newText = (raw?.content?.[0]?.text || '').trim();
return [{ json: { ...ctx, replyText: newText || ctx.replyText, rewritten: true } }];
`.trim()
    },
    { typeVersion: 2, position: [col(14), row(3)] }
  )
);

// 18e. Finalize Reply — converges critic-pass and rewrite paths into a
// single output shape so downstream nodes can use $json uniformly.
nodes.push(
  node(
    184,
    'Finalize Reply',
    'n8n-nodes-base.code',
    {
      jsCode: `
const item = items[0]?.json || {};
return [{ json: { ...item, rewritten: item.rewritten === true } }];
`.trim()
    },
    { typeVersion: 2, position: [col(15), row(2)] }
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
      url: `=${SUPABASE_URL}/rest/v1/tutor_sessions?id=eq.{{$('Finalize Reply').item.json.sessionId}}`,
      // block_id is stamped on session creation by the start API; nothing to update here.
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
        turn_count: $('Finalize Reply').item.json.turnNumber,
        probe_count: $('Finalize Reply').item.json.probeCount + ($('Finalize Reply').item.json.verdict === 'shallow' || $('Finalize Reply').item.json.verdict === 'wrong' || $('Finalize Reply').item.json.verdict === 'partial' ? 1 : 0),
        mastery_reached: $('Finalize Reply').item.json.verdict === 'pass',
        status: $('Finalize Reply').item.json.verdict === 'pass' ? 'mastered' : 'active',
        last_turn_at: new Date().toISOString(),
        ended_at: $('Finalize Reply').item.json.verdict === 'pass' ? new Date().toISOString() : null,
        rubric_id: $('Finalize Reply').item.json.rubricId
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
        user_id: $('Finalize Reply').item.json.userId,
        section_id: $('Finalize Reply').item.json.sectionId,
        status: $('Finalize Reply').item.json.verdict === 'pass' ? 'mastered' : 'in_progress',
        attempts: 1,
        total_probes: $('Finalize Reply').item.json.probeCount,
        first_mastered_at: $('Finalize Reply').item.json.verdict === 'pass' ? new Date().toISOString() : null,
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
        reply: $('Finalize Reply').item.json.replyText,
        intent: $('Finalize Reply').item.json.intent,
        verdict: $('Finalize Reply').item.json.verdict,
        mastery: $('Finalize Reply').item.json.verdict === 'pass' ? 'mastered' : 'in_progress',
        probeCount: $('Finalize Reply').item.json.probeCount,
        flagged: $('Finalize Reply').item.json.flagged_for_review,
        rewritten: $('Finalize Reply').item.json.rewritten === true,
        sessionId: $('Finalize Reply').item.json.sessionId
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
link('Load Section Content', 'Load Course Outline');
link('Load Course Outline', 'Load Student Portfolio');
link('Load Student Portfolio', 'Build Context');
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
link('Parse Critic', 'Critic Decision');
// IF node: output 0 = true (critic passed), output 1 = false (failed → rewrite)
link('Critic Decision', 'Finalize Reply', 0);
link('Critic Decision', 'Rewrite Responder', 1);
link('Rewrite Responder', 'Apply Rewrite');
link('Apply Rewrite', 'Finalize Reply');
link('Finalize Reply', 'Persist Turn');
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
