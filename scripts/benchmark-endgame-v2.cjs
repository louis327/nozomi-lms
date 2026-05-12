// V2 endgame benchmark — per-block hand-crafted realistic cases.
// Each case is tied to a specific block + expected verdict + (for shallow/
// wrong) expected matched_pattern_id. Tests verdict accuracy, intent
// accuracy, matched-pattern accuracy, sycophancy, multi-question, latency.

const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Z2V0aGNpYmxkZmNubWFqdXRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4MzM5MiwiZXhwIjoyMDkwMzU5MzkyfQ.tBXcAmFFUh8ghX2XQvrZUbUnvZcrYe8hRS0QR1p3S_I';
const SUPABASE_HOST = 'lxgethcibldfcnmajutf.supabase.co';

if (!ANTHROPIC_KEY) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1); }

// 8 rubric'd blocks. For each: a strong (pass), 1-2 shallow with expected
// pattern, 1 wrong with expected pattern.
const CASES = [
  // Block 0: Primary milestone
  { block: 'f00639ea-1512-4f5f-9072-ba325919080e', label: 'primary/PASS', expectVerdict: 'pass',
    msg: "5,000 unique wallets that repeat-transacted (>1 swap each) outside our incentive program by month 18, anchored to two named DEX integrations going live in month 6 — gives the Series A lead a verifiable demand signal on which to commit." },
  { block: 'f00639ea-1512-4f5f-9072-ba325919080e', label: 'primary/SHALLOW-size', expectVerdict: 'shallow', expectPattern: 'size_without_leverage',
    msg: "Reach 10,000 users on the platform by Q4 2027." },
  { block: 'f00639ea-1512-4f5f-9072-ba325919080e', label: 'primary/SHALLOW-execution', expectVerdict: 'shallow', expectPattern: 'execution_metric_only',
    msg: "Ship mainnet v1 by Q3 2027 with all the core features deployed." },
  { block: 'f00639ea-1512-4f5f-9072-ba325919080e', label: 'primary/WRONG-community', expectVerdict: 'wrong', expectPattern: 'community_size_as_fundable_signal',
    msg: "Build a Discord community of 50,000 highly engaged members and a Twitter following of 100k by month 18." },

  // Block 1: 12-month milestone
  { block: '45804b8c-ca3d-45e7-be35-e9fabf109e01', label: '12mo/PASS', expectVerdict: 'pass',
    msg: "By month 12, $50M in non-incentivized TVL alongside 3,000 weekly active wallets transacting outside our farming rewards — at that point we're at the Series A benchmark for stablecoin yield protocols and the lead investor has a clean comp." },
  { block: '45804b8c-ca3d-45e7-be35-e9fabf109e01', label: '12mo/SHALLOW-raw', expectVerdict: 'shallow', expectPattern: 'raw_user_count_no_quality',
    msg: "10,000 wallets actively using the protocol by month 12." },
  { block: '45804b8c-ca3d-45e7-be35-e9fabf109e01', label: '12mo/WRONG-next-raise', expectVerdict: 'wrong', expectPattern: 'next_raise_as_milestone',
    msg: "Successfully close our Series A in month 12 at a $50M valuation." },

  // Block 2: 6-month milestone
  { block: '5c18a8ad-a353-45b3-ab5a-cbd5005fbb4a', label: '6mo/PASS', expectVerdict: 'pass',
    msg: "1,500 wallets that have transacted more than once on the protocol (non-incentivized) with $2M in non-mercenary TVL sticky 30+ days, by month 6 — that's the demand signal the seed lead has said is their next-fund threshold." },
  { block: '5c18a8ad-a353-45b3-ab5a-cbd5005fbb4a', label: '6mo/SHALLOW-traffic', expectVerdict: 'shallow', expectPattern: 'vanity_traffic',
    msg: "Hit 50,000 unique website visitors per month and 20,000 newsletter subscribers." },
  { block: '5c18a8ad-a353-45b3-ab5a-cbd5005fbb4a', label: '6mo/SHALLOW-connects', expectVerdict: 'shallow', expectPattern: 'wallet_connects_only',
    msg: "5,000 wallets connecting to the dApp by month 6." },
  { block: '5c18a8ad-a353-45b3-ab5a-cbd5005fbb4a', label: '6mo/WRONG-loi', expectVerdict: 'wrong', expectPattern: 'partner_loi_as_proof',
    msg: "Sign LOIs with 5 major institutional partners including 2 CEXes." },

  // Block 3: 3-month milestone
  { block: 'b5b07676-16f9-4dcb-8504-2e055831588d', label: '3mo/PASS', expectVerdict: 'pass',
    msg: "By day 90 the audit is closed and contracts are live on mainnet with at least 100 unique non-team wallets executing transactions, plus public metrics infrastructure on Dune so any investor can independently verify activity." },
  { block: 'b5b07676-16f9-4dcb-8504-2e055831588d', label: '3mo/SHALLOW-features', expectVerdict: 'shallow', expectPattern: 'feature_list_disguised',
    msg: "Ship V1 with the core trading features and 2-3 partner integrations." },
  { block: 'b5b07676-16f9-4dcb-8504-2e055831588d', label: '3mo/WRONG-overscoped', expectVerdict: 'wrong', expectPattern: '24_month_goal_in_90_days',
    msg: "Achieve $10M TVL and become the leading protocol in our category." },

  // Block 4: 24-month milestone
  { block: '390611a0-1abe-42db-a980-45c32823cacf', label: '24mo/PASS', expectVerdict: 'pass',
    msg: "By month 24 we're in the top 3 by 30-day-sticky TVL within stablecoin yield aggregators, with ≥$200M in non-incentivized assets — positions us for a defensible mid-stage raise without needing token-incentive subsidies to maintain the metric." },
  { block: '390611a0-1abe-42db-a980-45c32823cacf', label: '24mo/SHALLOW-undefined', expectVerdict: 'shallow', expectPattern: 'undefined_scale',
    msg: "Become a major player in the DeFi space by month 24." },
  { block: '390611a0-1abe-42db-a980-45c32823cacf', label: '24mo/WRONG-vanity-ranking', expectVerdict: 'wrong', expectPattern: 'vanity_ranking',
    msg: "Top 5 on DeFi Llama by TVL." },

  // Block 5: Raise narrative
  { block: '1d4c5f71-1cf9-4734-91ff-49f0f5f6b27e', label: 'narrative/PASS', expectVerdict: 'pass',
    msg: "We're raising $2.4M to get from current testnet to mainnet with 10,000 wallets transacting more than once and $500K in annualised protocol fees by month 14 — which puts our seed lead at the Series A diligence threshold for our category." },
  { block: '1d4c5f71-1cf9-4734-91ff-49f0f5f6b27e', label: 'narrative/SHALLOW-vague', expectVerdict: 'shallow', expectPattern: 'vague_milestone',
    msg: "We're raising $3M to build the protocol and grow the community." },
  { block: '1d4c5f71-1cf9-4734-91ff-49f0f5f6b27e', label: 'narrative/WRONG-vision', expectVerdict: 'wrong', expectPattern: 'vision_pitch',
    msg: "We're going to be the defining DeFi protocol of the next cycle by reimagining how capital flows in Web3." },

  // Block 6: Section 5 raise narrative
  { block: '157786fb-171f-410a-8a90-ca005621ec8e', label: 's5-narrative/PASS', expectVerdict: 'pass',
    msg: "Today most under-collateralised lending protocols have no on-chain way to price counterparty risk, so we're raising $2.4M to ship the risk-pricing primitive plus the first lending pool, hitting 10k repeat-transacting wallets and $500k annualised fees by month 14 — which unlocks our seed lead's Series A diligence trigger. (Reads aloud in 13 seconds.)" },
  { block: '157786fb-171f-410a-8a90-ca005621ec8e', label: 's5-narrative/SHALLOW-cramming', expectVerdict: 'shallow', expectPattern: 'cramming',
    msg: "We're raising $2.4M to ship mainnet, hit 10k wallets, 500k fees, get the audit done, and onboard three partner DEXes by month 14 to unlock our Series A milestones." },

  // Block 7: Section 5 primary milestone (single outcome — the rubric is strict on one primary)
  { block: '4129a58e-7d14-4adc-b0a7-6d8166ccad9c', label: 's5-primary/PASS', expectVerdict: 'pass',
    msg: "$5M in non-incentivized TVL sticky for 30+ days by month 14 — that's the single number our seed lead has named as the trigger for their Series A commit." },
  { block: '4129a58e-7d14-4adc-b0a7-6d8166ccad9c', label: 's5-primary/SHALLOW-launch', expectVerdict: 'shallow', expectPattern: 'launch_as_milestone',
    msg: "Launch on mainnet by month 14." },
  { block: '4129a58e-7d14-4adc-b0a7-6d8166ccad9c', label: 's5-primary/WRONG-raise', expectVerdict: 'wrong', expectPattern: 'raise_as_milestone',
    msg: "Close our Series A at a $40M valuation." }
];

// Intent-only cases (no verdict)
const INTENT_CASES = [
  { block: 'b5b07676-16f9-4dcb-8504-2e055831588d', label: 'QUESTION', expectIntent: 'question',
    msg: "Wait, what counts as 'something that exists or works that did not before' — does shipping a UI redesign count?" },
  { block: 'b5b07676-16f9-4dcb-8504-2e055831588d', label: 'OFFTOPIC', expectIntent: 'off_topic',
    msg: "Quick aside — should I raise on a SAFE or a priced round?" }
];

const ALL_CASES = [...CASES, ...INTENT_CASES];

// --- helpers ----------------------------------------------------------------

function pgFetch(path) {
  return new Promise((res, rej) => {
    https.request({
      hostname: SUPABASE_HOST,
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
      let d=''; rs.on('data',c=>{ const s=c.toString(); if (stream && firstTokenMs===null && s.includes('content_block_delta')) firstTokenMs=Date.now()-t0; d+=s; buffer+=s; });
      rs.on('end', () => {
        const elapsedMs = Date.now() - t0;
        if (stream) {
          let text=''; let cc=0, cr=0;
          for (const line of buffer.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try { const o=JSON.parse(line.slice(6));
              if (o.type==='content_block_delta' && o.delta?.type==='text_delta') text+=o.delta.text;
              if (o.type==='message_start') { cc=o.message?.usage?.cache_creation_input_tokens||0; cr=o.message?.usage?.cache_read_input_tokens||0; }
            } catch(e){}
          }
          res({ text, firstTokenMs, elapsedMs, cacheCreate: cc, cacheRead: cr });
        } else {
          try { const j=JSON.parse(d); res({ data:j, elapsedMs, cacheCreate: j.usage?.cache_creation_input_tokens||0, cacheRead: j.usage?.cache_read_input_tokens||0 }); }
          catch (e) { rej(new Error('parse: '+d.slice(0,300))); }
        }
      });
    });
    r.setTimeout(120000, () => { r.destroy(); rej(new Error('timeout')); });
    r.write(b); r.end();
  });
}

// --- prompts (mirror coach.ts) --------------------------------------------

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

const EVALUATOR_GRADING_STANCE = `You are the EVALUATOR. Grade the student's message hard but fair. Return tool output ONLY.

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
BE PRECISE on shallow vs wrong — default to shallow unless the framing is actively wrong.`;

const RESPONDER_SYSTEM_SUFFIX = `You have just received an evaluation of the student's answer. Now write the next message to the student.

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

PORTFOLIO CROSS-CHECK: the student's prior answers in this course are in the STUDENT PORTFOLIO. If the current answer is INCONSISTENT with a prior commitment, call it out by name in your probe.

OUTPUT: just the reply text. No JSON, no preamble, no signoff. The student is about to read it.`;

const EVALUATOR_TOOL = {
  name: 'tutor_evaluate',
  description: 'Classify the student message and grade it against the rubric. Be a hard grader.',
  input_schema: {
    type: 'object',
    required: ['intent','reasoning'],
    properties: {
      intent: { type: 'string', enum: ['answer','question','off_topic','meta'] },
      verdict: { type: ['string','null'], enum: ['pass','shallow','wrong','partial', null] },
      matched_pattern_id: { type: ['string','null'] },
      criteria_met: { type: 'array', items: { type: 'string' } },
      gap: { type: ['string','null'] },
      reasoning: { type: 'string' }
    }
  }
};

const SYCOPHANCY = ['good question','great question','great answer','wonderful','excellent answer','excellent point',"that's a great",'i love that','beautiful','fantastic','amazing answer','perfect answer'];

function extractPromptText(c) {
  if (!c) return ''; if (typeof c==='string') return c;
  const p=[]; if(c.label)p.push(c.label); if(c.html)p.push(String(c.html).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')); if(c.text)p.push(c.text); if(c.prompt)p.push(c.prompt); if(c.question)p.push(c.question);
  if(Array.isArray(c.fields)) for(const f of c.fields) p.push('  · '+(f.label||f.key||''));
  return p.join(' / ').trim();
}
function blocksToText(blocks) {
  return (blocks||[]).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)).map(b=>{
    const c=b.content||{};
    if(b.type==='rich_text'||b.type==='callout'||b.type==='quote') return (c.html||c.text||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if(b.type==='table'&&c.rows) return '[Table] '+c.rows.map(r=>r.join(' | ')).join(' / ');
    return '['+b.type+']';
  }).filter(Boolean).join('\n\n');
}

// In-memory cache of loaded contexts per block, since we test multiple cases per block
const blockCache = new Map();
async function loadBlockContext(blockId) {
  if (blockCache.has(blockId)) return blockCache.get(blockId);
  const rubrics = await pgFetch(`tutor_rubrics?block_id=eq.${blockId}&status=eq.approved&select=id,question,pass_criteria,shallow_patterns,wrong_patterns,off_scope_hint,notes,section_id&limit=1`);
  const r = rubrics[0];
  const section = (await pgFetch(`sections?id=eq.${r.section_id}&select=id,title,content_blocks(type,content,sort_order),modules!inner(id,title,course_id,courses!inner(id,title))`))[0];
  const mod = Array.isArray(section.modules)?section.modules[0]:section.modules;
  const course = mod.courses?(Array.isArray(mod.courses)?mod.courses[0]:mod.courses):null;
  const outlineModules = await pgFetch(`modules?course_id=eq.${mod.course_id}&select=id,title,sort_order,sections(id,title,sort_order,status)&order=sort_order`);
  const outline = outlineModules.map((m,mi)=>{
    const ss=(m.sections||[]).filter(s=>s.status==='published').sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
    return 'Module '+(mi+1)+': '+m.title+(ss.length?'\n'+ss.map((s,si)=>'    - Section '+(si+1)+': '+s.title).join('\n'):'');
  }).join('\n');
  const ctx = {
    rubric: r,
    sectionTitle: section.title,
    sectionText: blocksToText(section.content_blocks||[]),
    courseTitle: course?.title||'Course',
    moduleTitle: mod.title,
    outline
  };
  blockCache.set(blockId, ctx);
  return ctx;
}

function buildSystemBlocks(ctx) {
  return [
    { type:'text', text: VOICE_PRINCIPLES, cache_control: { type:'ephemeral' } },
    { type:'text', text: `=== COURSE: ${ctx.courseTitle} ===\nOutline:\n${ctx.outline}`, cache_control: { type:'ephemeral' } },
    { type:'text', text: `=== CURRENT POSITION ===\nModule: ${ctx.moduleTitle}\nSection: ${ctx.sectionTitle}\n\n=== SECTION MATERIAL ===\n${ctx.sectionText}\n\n=== PROMPT BEING GRADED ===\n${ctx.rubric.question}\n\n=== PASS CRITERIA ===\n${JSON.stringify(ctx.rubric.pass_criteria, null, 2)}\n\n=== SHALLOW PATTERNS ===\n${JSON.stringify(ctx.rubric.shallow_patterns, null, 2)}\n\n=== WRONG PATTERNS ===\n${JSON.stringify(ctx.rubric.wrong_patterns, null, 2)}\n\n=== OFF-SCOPE HINT ===\n${ctx.rubric.off_scope_hint||'(none)'}\n\n=== AUTHOR NOTES ===\n${ctx.rubric.notes||'(none)'}`, cache_control: { type:'ephemeral' } }
  ];
}

async function runCase(c) {
  const ctx = await loadBlockContext(c.block);
  const sys = buildSystemBlocks(ctx);
  const userMsg = `=== STUDENT PORTFOLIO ===\n(empty for this test)\n\n=== CONVERSATION SO FAR ===\n[]\n\n=== STUDENT JUST SAID ===\n${c.msg}`;

  const evalRes = await anthropic({
    model: 'claude-haiku-4-5-20251001', max_tokens: 800,
    system: [...sys, { type:'text', text: EVALUATOR_GRADING_STANCE }],
    messages: [{ role:'user', content: userMsg }],
    tools: [EVALUATOR_TOOL],
    tool_choice: { type:'tool', name:'tutor_evaluate' }
  });
  const tu = evalRes.data.content?.find(b=>b.type==='tool_use');
  const evalOut = tu?.input || {};

  const respSys = [...sys, { type:'text', text: RESPONDER_SYSTEM_SUFFIX }];
  const respUser = `${userMsg}\n\n=== EVALUATION ===\n${JSON.stringify(evalOut, null, 2)}\n\nWrite the reply now per the rules. Output ONLY the reply text.`;
  const respRes = await anthropic({
    model: 'claude-sonnet-4-6', max_tokens: 600, stream: true,
    system: respSys, messages: [{ role:'user', content: respUser }]
  }, true);

  const reply = respRes.text.trim();
  return {
    label: c.label,
    expectVerdict: c.expectVerdict,
    expectIntent: c.expectIntent,
    expectPattern: c.expectPattern,
    intent: evalOut.intent,
    verdict: evalOut.verdict,
    matched_pattern_id: evalOut.matched_pattern_id,
    gap: evalOut.gap,
    reply,
    sycophancyHit: SYCOPHANCY.find(b => reply.toLowerCase().includes(b)) || null,
    qmarks: (reply.match(/\?/g)||[]).length,
    evalMs: evalRes.elapsedMs,
    firstTokenMs: respRes.firstTokenMs,
    respMs: respRes.elapsedMs,
    cacheCreate: (evalRes.cacheCreate||0)+(respRes.cacheCreate||0),
    cacheRead: (evalRes.cacheRead||0)+(respRes.cacheRead||0)
  };
}

// Run with limited concurrency to avoid rate limits
async function runAll() {
  const CONCURRENCY = 3;
  const results = new Array(ALL_CASES.length);
  let i = 0;
  async function worker() {
    while (i < ALL_CASES.length) {
      const idx = i++;
      try {
        results[idx] = await runCase(ALL_CASES[idx]);
        const r = results[idx];
        const ok = r.expectVerdict ? r.verdict===r.expectVerdict : r.expectIntent ? r.intent===r.expectIntent : false;
        const patOk = !r.expectPattern || r.matched_pattern_id === r.expectPattern;
        process.stdout.write(`${ok?'✓':'✗'}${patOk?'p':' '} ${r.label} → ${r.verdict||r.intent} (${r.matched_pattern_id||'-'}) ttft=${r.firstTokenMs}ms\n`);
      } catch (e) {
        results[idx] = { label: ALL_CASES[idx].label, error: e.message };
        console.log('ERR', ALL_CASES[idx].label, e.message);
      }
    }
  }
  await Promise.all(Array.from({length:CONCURRENCY}, ()=>worker()));
  return results;
}

(async () => {
  console.log('Running endgame benchmark v2 — '+ALL_CASES.length+' cases\n');
  const results = await runAll();

  console.log('\n===== SUMMARY =====');
  const v = results.filter(r=>r.expectVerdict);
  const vHit = v.filter(r=>r.verdict===r.expectVerdict).length;
  const it = results.filter(r=>r.expectIntent);
  const iHit = it.filter(r=>r.intent===r.expectIntent).length;
  const patCases = results.filter(r=>r.expectPattern);
  const patHit = patCases.filter(r=>r.matched_pattern_id===r.expectPattern).length;
  const syc = results.filter(r=>r.sycophancyHit).length;
  const multiQ = results.filter(r=>(r.qmarks||0)>1).length;
  const ttfts = results.filter(r=>r.firstTokenMs).map(r=>r.firstTokenMs);
  const totals = results.filter(r=>r.evalMs && r.respMs).map(r=>r.evalMs+r.respMs);

  console.log(`Verdict accuracy:    ${vHit}/${v.length} (${Math.round(100*vHit/Math.max(1,v.length))}%)`);
  console.log(`Intent accuracy:     ${iHit}/${it.length} (${Math.round(100*iHit/Math.max(1,it.length))}%)`);
  console.log(`Pattern accuracy:    ${patHit}/${patCases.length} (${Math.round(100*patHit/Math.max(1,patCases.length))}%)`);
  console.log(`Sycophancy escapes:  ${syc}/${results.length}`);
  console.log(`Multi-question:      ${multiQ}/${results.length}`);
  if (ttfts.length) console.log(`TTFT avg:            ${Math.round(ttfts.reduce((a,b)=>a+b,0)/ttfts.length)}ms (range ${Math.min(...ttfts)}-${Math.max(...ttfts)})`);
  if (totals.length) console.log(`Total avg:           ${(totals.reduce((a,b)=>a+b,0)/totals.length/1000).toFixed(1)}s`);

  // Print misses for analysis
  const misses = results.filter(r => {
    if (r.expectVerdict && r.verdict !== r.expectVerdict) return true;
    if (r.expectIntent && r.intent !== r.expectIntent) return true;
    if (r.expectPattern && r.matched_pattern_id !== r.expectPattern) return true;
    return false;
  });
  if (misses.length) {
    console.log('\n----- MISSES -----');
    for (const m of misses) {
      console.log(`✗ ${m.label}`);
      console.log(`   expected: verdict=${m.expectVerdict||'-'} intent=${m.expectIntent||'-'} pattern=${m.expectPattern||'-'}`);
      console.log(`   got:      verdict=${m.verdict||'-'} intent=${m.intent||'-'} pattern=${m.matched_pattern_id||'-'}`);
      console.log(`   gap: ${m.gap||'-'}`);
      console.log(`   reply: ${m.reply?.slice(0,180)}`);
    }
  }
})();
