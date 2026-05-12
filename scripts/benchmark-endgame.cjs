// Benchmark the endgame 2-call architecture (Haiku eval + Sonnet respond)
// against realistic student answers. Measures verdict accuracy, time-to-
// first-token, full reply latency, sycophancy escapes.

const https = require('https');

const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const REF = 'lxgethcibldfcnmajutf';
const SUPABASE_URL = 'https://lxgethcibldfcnmajutf.supabase.co';
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Z2V0aGNpYmxkZmNubWFqdXRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4MzM5MiwiZXhwIjoyMDkwMzU5MzkyfQ.tBXcAmFFUh8ghX2XQvrZUbUnvZcrYe8hRS0QR1p3S_I';

if (!MGMT_TOKEN || !ANTHROPIC_KEY) {
  console.error('Set SUPABASE_MGMT_TOKEN, ANTHROPIC_API_KEY');
  process.exit(1);
}

// Use the same 12 cases from the previous benchmark plus a few realistic
// 3-month milestone variants (the new section we just rubric'd).
const cases = [
  { label: 'PASS-strong-complete', blockTitleHint: 'primary milestone', expectVerdict: 'pass', msg: "A 'number' is something you picked. A 'position' is something you built — anchored to a specific milestone you're committing to hit, an operating plan that gets you there, and a clean allocation across the things that actually move the needle. The founder who walks in with 30/40/30 across product, growth, and ops hasn't done that work — they're showing the investor a guess dressed up as a plan." },
  { label: 'SHALLOW-feature-list',  blockTitleHint: '3-month',  expectVerdict: 'shallow', msg: 'Ship V1 with the core trading features and 2-3 partner integrations.' },
  { label: 'SHALLOW-vanity-metrics', blockTitleHint: '6-month',  expectVerdict: 'shallow', msg: 'Hit $1M in TVL with a community of 10,000 across Discord and Twitter, plus 500 active users on the platform weekly.' },
  { label: 'WRONG-roadmap',          blockTitleHint: '3-month',  expectVerdict: 'wrong',   msg: "Complete the product roadmap items planned for Q1 — token contract audit, frontend redesign, mobile app launch." },
  { label: 'PARTIAL-named-no-structure', blockTitleHint: 'primary milestone', expectVerdict: 'partial', msg: "The founder picked a number without building a position. They didn't do the work to back it up." },
  { label: 'OFFTOPIC-safe', blockTitleHint: 'primary milestone', expectIntent: 'off_topic', msg: "Quick aside — should I raise on a SAFE or a priced round at this stage?" },
  { label: 'QUESTION', blockTitleHint: 'primary milestone', expectIntent: 'question', msg: "Won't committing to a specific number publicly backfire if I miss?" }
];

// --- HTTP helpers ----------------------------------------------------------

function pgFetch(path) {
  return new Promise((res, rej) => {
    https.request({
      hostname: 'lxgethcibldfcnmajutf.supabase.co',
      path: '/rest/v1/' + path,
      method: 'GET',
      headers: { apikey: SUPABASE_SERVICE, Authorization: 'Bearer ' + SUPABASE_SERVICE, Accept: 'application/json' }
    }, rs => { let d=''; rs.on('data',c=>d+=c); rs.on('end',()=>{ try{res(JSON.parse(d))}catch(e){rej(new Error('parse: '+d.slice(0,200)))} }); }).end();
  });
}

function anthropic(body, stream=false) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const t0 = Date.now();
    let firstTokenMs = null;
    let buffer = '';
    const r = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b)
      }
    }, rs => {
      let d=''; rs.on('data',c=>{
        const s = c.toString();
        if (stream && firstTokenMs === null && s.includes('content_block_delta')) firstTokenMs = Date.now() - t0;
        d += s;
        buffer += s;
      });
      rs.on('end', () => {
        const elapsedMs = Date.now() - t0;
        if (stream) {
          // Parse SSE stream into text
          let text = '';
          let cacheCreate = 0, cacheRead = 0;
          for (const line of buffer.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const obj = JSON.parse(line.slice(6));
              if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta') text += obj.delta.text;
              if (obj.type === 'message_start') {
                cacheCreate = obj.message?.usage?.cache_creation_input_tokens || 0;
                cacheRead = obj.message?.usage?.cache_read_input_tokens || 0;
              }
            } catch(e){}
          }
          res({ text, firstTokenMs, elapsedMs, cacheCreate, cacheRead });
        } else {
          try {
            const j = JSON.parse(d);
            const cacheCreate = j.usage?.cache_creation_input_tokens || 0;
            const cacheRead = j.usage?.cache_read_input_tokens || 0;
            res({ data: j, elapsedMs, cacheCreate, cacheRead });
          } catch (e) { rej(new Error('parse: '+d.slice(0,300))); }
        }
      });
    });
    r.setTimeout(120000, () => { r.destroy(); rej(new Error('timeout')); });
    r.write(b); r.end();
  });
}

// --- Prompts (mirrored from src/lib/tutor/coach.ts) -----------------------

const VOICE_PRINCIPLES = `You are a Socratic tutor for Nozomi, a founder fundraising course built by Louis.

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

GROUNDING: when you cite a concept or quote, only reference material from the course outline or section content provided. Don't invent.`;

const EVALUATOR_TOOL = {
  name: 'tutor_evaluate',
  description: 'Classify the student message and grade it against the rubric.',
  input_schema: {
    type: 'object',
    required: ['intent'],
    properties: {
      intent: { type: 'string', enum: ['answer', 'question', 'off_topic', 'meta'] },
      verdict: { type: ['string', 'null'], enum: ['pass', 'shallow', 'wrong', 'partial', null] },
      matched_pattern_id: { type: ['string', 'null'] },
      criteria_met: { type: 'array', items: { type: 'string' } },
      gap: { type: ['string', 'null'] },
      reasoning: { type: 'string' }
    }
  }
};

const RESPONDER_SYSTEM_SUFFIX = `You have just received an evaluation. Now write the reply to the student.

RULES:
- verdict=pass: name the SPECIFIC concept they got right. Mark complete. Brief preview. 2-3 sentences.
- verdict=shallow: use the matched shallow pattern's probe (or close variant). ONE question. Don't reveal the answer.
- verdict=wrong: use the matched wrong pattern's leading_question. ONE question.
- verdict=partial: name what they hit, ask them to push on the gap. ONE question.
- intent=question: answer from section material. Invite them back to the prompt.
- intent=off_topic: scope back per the hint. ONE sentence. NO sycophancy openers.

OUTPUT: just the reply text. No JSON, no preamble.`;

const SYCOPHANCY = ['good question','great question','great answer','wonderful','excellent answer','excellent point',"that's a great",'i love that','beautiful','fantastic','amazing answer','perfect answer'];

function extractPromptText(c) {
  if (!c) return '';
  if (typeof c === 'string') return c;
  const parts = [];
  if (c.label) parts.push(c.label);
  if (c.html) parts.push(String(c.html).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
  if (c.text) parts.push(c.text);
  if (c.prompt) parts.push(c.prompt);
  if (c.question) parts.push(c.question);
  if (Array.isArray(c.fields)) for (const f of c.fields) parts.push('  · ' + (f.label || f.key || ''));
  return parts.join(' / ').trim();
}

function blocksToText(blocks) {
  return (blocks || []).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)).map(b => {
    const c = b.content || {};
    if (b.type==='rich_text'||b.type==='callout'||b.type==='quote') return (c.html||c.text||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if (b.type==='table' && c.rows) return '[Table] ' + c.rows.map(r=>r.join(' | ')).join(' / ');
    return '['+b.type+']';
  }).filter(Boolean).join('\n\n');
}

async function loadFixture(blockTitleHint) {
  // Find an approved rubric whose section title matches a hint
  const rubrics = await pgFetch(`tutor_rubrics?status=eq.approved&block_id=not.is.null&select=id,question,pass_criteria,shallow_patterns,wrong_patterns,off_scope_hint,notes,block_id,section_id`);
  let r = null;
  for (const rb of rubrics) {
    if (rb.question.toLowerCase().includes(blockTitleHint.toLowerCase())) { r = rb; break; }
  }
  if (!r) r = rubrics[0]; // fallback to any
  const section = (await pgFetch(`sections?id=eq.${r.section_id}&select=id,title,content_blocks(type,content,sort_order),modules!inner(id,title,course_id,courses!inner(id,title))`))[0];
  const moduleObj = Array.isArray(section.modules)?section.modules[0]:section.modules;
  const courseObj = moduleObj.courses ? (Array.isArray(moduleObj.courses)?moduleObj.courses[0]:moduleObj.courses) : null;
  const outlineModules = await pgFetch(`modules?course_id=eq.${moduleObj.course_id}&select=id,title,sort_order,sections(id,title,sort_order,status,content_blocks(id,type,content,sort_order))&order=sort_order`);
  // Build outline text
  const outline = outlineModules.map((m,mi) => {
    const ss = (m.sections||[]).filter(s=>s.status==='published').sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
    return 'Module '+(mi+1)+': '+m.title + (ss.length?'\n'+ss.map((s,si)=>'    - Section '+(si+1)+': '+s.title).join('\n'):'');
  }).join('\n');

  return {
    rubric: r,
    sectionTitle: section.title,
    sectionText: blocksToText(section.content_blocks||[]),
    courseTitle: courseObj?.title || 'Course',
    moduleTitle: moduleObj.title,
    outline
  };
}

function buildSystemBlocks(ctx) {
  return [
    { type:'text', text: VOICE_PRINCIPLES, cache_control: { type: 'ephemeral' } },
    { type:'text', text: `=== COURSE: ${ctx.courseTitle} ===\nOutline:\n${ctx.outline}`, cache_control: { type: 'ephemeral' } },
    { type:'text', text: `=== CURRENT POSITION ===\nModule: ${ctx.moduleTitle}\nSection: ${ctx.sectionTitle}\n\n=== SECTION MATERIAL ===\n${ctx.sectionText}\n\n=== PROMPT BEING GRADED ===\n${ctx.rubric.question}\n\n=== PASS CRITERIA ===\n${JSON.stringify(ctx.rubric.pass_criteria, null, 2)}\n\n=== SHALLOW PATTERNS ===\n${JSON.stringify(ctx.rubric.shallow_patterns, null, 2)}\n\n=== WRONG PATTERNS ===\n${JSON.stringify(ctx.rubric.wrong_patterns, null, 2)}\n\n=== OFF-SCOPE HINT ===\n${ctx.rubric.off_scope_hint || '(none)'}\n\n=== AUTHOR NOTES ===\n${ctx.rubric.notes || '(none)'}`, cache_control: { type: 'ephemeral' } }
  ];
}

async function runCase(c) {
  const t0 = Date.now();
  const ctx = await loadFixture(c.blockTitleHint);
  const sys = buildSystemBlocks(ctx);
  const userMsg = `=== STUDENT PORTFOLIO ===\n(none for this test)\n\n=== CONVERSATION SO FAR ===\n[]\n\n=== STUDENT JUST SAID ===\n${c.msg}`;

  // Evaluator
  const evalRes = await anthropic({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: sys,
    messages: [{ role: 'user', content: userMsg }],
    tools: [EVALUATOR_TOOL],
    tool_choice: { type: 'tool', name: 'tutor_evaluate' }
  });
  const tu = evalRes.data.content?.find(b => b.type === 'tool_use');
  const evalOut = tu?.input || {};

  // Responder (streamed for TTFB measurement)
  const respSys = [...sys, { type:'text', text: RESPONDER_SYSTEM_SUFFIX }];
  const respUser = `${userMsg}\n\n=== EVALUATION ===\n${JSON.stringify(evalOut, null, 2)}\n\nWrite the reply now per the rules. Output ONLY the reply text.`;
  const respRes = await anthropic({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    stream: true,
    system: respSys,
    messages: [{ role: 'user', content: respUser }]
  }, true);

  const totalMs = Date.now() - t0;
  const reply = respRes.text.trim();
  const sycophancyHit = SYCOPHANCY.find(b => reply.toLowerCase().includes(b));
  const qmarks = (reply.match(/\?/g)||[]).length;

  return {
    label: c.label,
    expectedVerdict: c.expectVerdict,
    expectedIntent: c.expectIntent,
    intent: evalOut.intent,
    verdict: evalOut.verdict,
    matched: evalOut.matched_pattern_id,
    reply,
    sycophancyHit,
    qmarks,
    evalMs: evalRes.elapsedMs,
    firstTokenMs: respRes.firstTokenMs,
    respMs: respRes.elapsedMs,
    totalMs,
    cacheCreate: (evalRes.cacheCreate || 0) + (respRes.cacheCreate || 0),
    cacheRead: (evalRes.cacheRead || 0) + (respRes.cacheRead || 0)
  };
}

(async () => {
  console.log('Running endgame benchmark (Haiku tool_use eval + Sonnet streamed respond, with prompt cache)...\n');
  const results = [];
  for (const c of cases) {
    process.stdout.write(`→ ${c.label} ... `);
    try {
      const r = await runCase(c);
      results.push(r);
      const ok = c.expectVerdict ? r.verdict === c.expectVerdict : r.intent === c.expectIntent;
      console.log(`${ok?'✓':'✗'} verdict=${r.verdict||'-'} intent=${r.intent||'-'} ttft=${r.firstTokenMs}ms total=${(r.totalMs/1000).toFixed(1)}s${r.cacheRead?' [cached '+r.cacheRead+'t]':''}`);
      console.log(`   reply: ${r.reply.slice(0,160)}`);
      if (r.sycophancyHit) console.log(`   SYCOPHANCY: "${r.sycophancyHit}"`);
    } catch (e) {
      console.log('ERR', e.message);
      results.push({ label: c.label, error: e.message });
    }
  }

  console.log('\n===== SUMMARY =====');
  const verdictCases = results.filter(r=>r.expectedVerdict);
  const verdictHits = verdictCases.filter(r=>r.verdict===r.expectedVerdict).length;
  const intentCases = results.filter(r=>r.expectedIntent);
  const intentHits = intentCases.filter(r=>r.intent===r.expectedIntent).length;
  const sycHits = results.filter(r=>r.sycophancyHit).length;
  const ttfts = results.filter(r=>r.firstTokenMs).map(r=>r.firstTokenMs);
  const totals = results.filter(r=>r.totalMs).map(r=>r.totalMs);
  console.log(`Verdict accuracy:    ${verdictHits}/${verdictCases.length} (${(100*verdictHits/Math.max(1,verdictCases.length))|0}%)`);
  console.log(`Intent accuracy:     ${intentHits}/${intentCases.length} (${(100*intentHits/Math.max(1,intentCases.length))|0}%)`);
  console.log(`Sycophancy escaped:  ${sycHits}/${results.length}`);
  if (ttfts.length) console.log(`TTFT avg:            ${Math.round(ttfts.reduce((a,b)=>a+b,0)/ttfts.length)}ms (min ${Math.min(...ttfts)}, max ${Math.max(...ttfts)})`);
  if (totals.length) console.log(`Total avg:           ${(totals.reduce((a,b)=>a+b,0)/totals.length/1000).toFixed(1)}s`);
  const totalCached = results.reduce((a,b)=>a+(b.cacheRead||0),0);
  const totalCreated = results.reduce((a,b)=>a+(b.cacheCreate||0),0);
  console.log(`Cache: created=${totalCreated}t, read=${totalCached}t`);
})();
