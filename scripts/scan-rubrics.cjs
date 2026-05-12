// Scan a course / module / section for coachable workbook prompts.
//   For each workbook_prompt or structured_prompt block:
//     1. Classify (Haiku) — is this prompt worth Socratic coaching?
//     2. If yes AND no rubric exists for this block → generate rubric (Sonnet)
//     3. Insert as 'draft' with classifier_reason + coachable_score
//
// Usage:
//   SUPABASE_MGMT_TOKEN=... ANTHROPIC_API_KEY=... \
//     node scripts/scan-rubrics.cjs --course "Fundraising Course"
//     node scripts/scan-rubrics.cjs --module <module_id>
//     node scripts/scan-rubrics.cjs --section <section_id>

const https = require('https');

const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const REF = 'lxgethcibldfcnmajutf';
const COACHABLE_THRESHOLD = parseFloat(process.env.COACHABLE_THRESHOLD || '0.65');

if (!MGMT_TOKEN || !ANTHROPIC_KEY) {
  console.error('Set SUPABASE_MGMT_TOKEN and ANTHROPIC_API_KEY');
  process.exit(1);
}

// --- args ---
const args = process.argv.slice(2);
let scope = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--course') scope = { kind: 'course', value: args[++i] };
  else if (args[i] === '--module') scope = { kind: 'module', value: args[++i] };
  else if (args[i] === '--section') scope = { kind: 'section', value: args[++i] };
}
if (!scope) {
  console.error('Pass --course "<title>" OR --module <id> OR --section <id>');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP helpers

function mgmtSql(sql) {
  return new Promise((res, rej) => {
    const body = JSON.stringify({ query: sql });
    const r = https.request(
      {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${REF}/database/query`,
        method: 'POST',
        headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      },
      rs => { let d=''; rs.on('data',c=>d+=c); rs.on('end',()=>res({s:rs.statusCode,d})); }
    );
    r.on('error', rej);
    r.write(body); r.end();
  });
}

function anthropic(body, timeoutMs = 90000) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const r = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(b)
        }
      },
      rs => { let d=''; rs.on('data',c=>d+=c); rs.on('end',()=>res({s:rs.statusCode,d})); }
    );
    r.setTimeout(timeoutMs, () => { r.destroy(); res({s:0, d: JSON.stringify({error: 'timeout'})}); });
    r.on('error', rej);
    r.write(b); r.end();
  });
}

function quote(s) { if (s == null) return 'null'; return "'" + String(s).replace(/'/g, "''") + "'"; }
function jsonLit(o) { return quote(JSON.stringify(o)) + '::jsonb'; }

// ---------------------------------------------------------------------------
// Normalise prompt content to a readable string

function extractPromptText(block) {
  const c = block.content || {};
  if (typeof c === 'string') return c;
  const parts = [];
  if (c.label) parts.push(c.label);
  if (c.html) parts.push(c.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  if (c.text) parts.push(c.text);
  if (c.prompt) parts.push(c.prompt);
  if (c.question) parts.push(c.question);
  if (c.placeholder) parts.push('Answer placeholder: ' + c.placeholder);
  if (Array.isArray(c.fields)) {
    parts.push('Student fills these fields:');
    for (const f of c.fields) {
      parts.push('  - ' + (f.label || f.key || 'field') + (f.placeholder ? ' [' + f.placeholder + ']' : ''));
    }
  }
  return parts.join('\n').trim();
}

function blocksToText(blocks) {
  return (blocks || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(b => {
      if (b.type === 'rich_text' || b.type === 'callout' || b.type === 'quote')
        return (b.content?.html || b.content?.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (b.type === 'table' && b.content?.rows)
        return '[Table] ' + b.content.rows.map(r => r.join(' | ')).join(' / ');
      if (b.type === 'image') return '';
      return '[' + b.type + '] ' + extractPromptText(b);
    })
    .filter(Boolean)
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Classifier — is this prompt worth coaching?

const CLASSIFIER_SYSTEM = `
You decide whether a workbook prompt in a fundraising course warrants Socratic coaching.

COACHABLE = open-ended reasoning, multiple valid framings, common shallow patterns to push back on, asks "why/how/explain", connects concepts.
Examples: "What makes a fundable milestone?", "Walk through your valuation logic", "Why does $3M / 30-40-30 fail with investors?"

NOT COACHABLE = single data point, factual recall, personal/preferential, yes/no, list of names, simple time/number entry.
Examples: "When do you want to close?", "Who reviewed this?", "Your total raise amount", "How many months of runway?"

Edge cases:
- Creative output ("write your one-sentence narrative") — coachable IF there's a clear quality bar (the formula); not if it's pure personal expression.
- Multi-field structured form — coachable if the synthesis matters; not if each field is a standalone data point.

Be conservative. Only mark coachable if you can clearly articulate what a SHALLOW vs WRONG answer would look like — if you can't name those failure modes, the agent has nothing to push back on.

Output ONLY JSON:
{ "coachable": true | false, "confidence": <0..1>, "reason": "<one sentence>", "shallow_example": "<one example, only if coachable>", "wrong_example": "<one example, only if coachable>" }
`.trim();

async function classify(block, sectionTitle) {
  const promptText = extractPromptText(block);
  if (!promptText) return { coachable: false, confidence: 1, reason: 'Empty prompt content' };

  const user = `Section: ${sectionTitle}

Block type: ${block.type}
Prompt content:
${promptText}

Classify.`;

  const r = await anthropic({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: CLASSIFIER_SYSTEM,
    messages: [{ role: 'user', content: user }]
  });
  if (r.s >= 400) {
    console.error('  ! classifier error:', r.d.slice(0, 200));
    return { coachable: false, confidence: 0, reason: 'classifier_error' };
  }
  const text = JSON.parse(r.d).content?.[0]?.text || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { coachable: false, confidence: 0, reason: 'parse_fail', raw: text.slice(0, 200) };
  try { return JSON.parse(m[0]); }
  catch (e) { return { coachable: false, confidence: 0, reason: 'json_fail' }; }
}

// ---------------------------------------------------------------------------
// Rubric generator — block-level

const VOICE_NOTES = `
VOICE: Louis is direct, declarative, anti-vagueness. Short sentences. Contrasts via concrete examples.

FORBIDDEN: rubric must not enable the tutor to say "Good question", "Great answer", "Wonderful", "Excellent", "That's a great point" or similar sycophantic openers. Probes and leading questions must be single-question form (no compound asks). Each probe targets one specific shallow pattern.

PRAISE STYLE: praise must name the specific concept by name, not generic encouragement.
`.trim();

const RUBRIC_SYSTEM = `You generate Socratic-tutor rubrics for individual workbook prompts in the Nozomi fundraising course (by Louis).

${VOICE_NOTES}

You are NOT generating a separate checkpoint question. The student is already answering THIS prompt. Your rubric tells the tutor how to grade THEIR answer to THIS prompt and what to probe when the answer is shallow.

A rubric has FIVE parts:
1. question — the prompt text itself (use it as-is or lightly cleaned). Do NOT invent a new question.
2. pass_criteria — 3 items (rarely 4). { id, criterion, description }. What a strong answer to THIS prompt covers.
3. shallow_patterns — 3 to 5 items. { id, pattern, probe }. Pattern describes a common shallow answer to this specific prompt; probe is ONE pointed question to expose it.
4. wrong_patterns — 2 to 4 items. { id, pattern, leading_question }. Pattern describes a wrong framing; leading_question gently corrects without revealing.
5. off_scope_hint — one sentence for when the student asks something unrelated.

Quality bar:
- Every probe + leading_question is ONE question. No compound asks.
- Patterns are SPECIFIC failure modes for THIS prompt, not generic.
- Probes reference the section's named concepts where relevant.
- IDs are short snake_case strings unique within the rubric.

Output ONLY valid JSON.`;

const EXEMPLAR = {
  question:
    "Your primary milestone: the single specific outcome that, when achieved, makes your next raise materially easier. One sentence. A metric and a date.",
  pass_criteria: [
    { id: 'specific_metric', criterion: 'Specific committable metric', description: 'States a concrete number (wallets, revenue, fees) and a date — not vague language like "scale" or "grow".' },
    { id: 'market_response', criterion: 'Market-response, not execution', description: "The milestone is something the market does, not something the team ships. 'Launch v2' is execution; '10k active users' is market response." },
    { id: 'next_raise_lever', criterion: 'Materially changes next raise', description: 'Names how hitting this milestone changes the next conversation with investors — not just "looks good".' }
  ],
  shallow_patterns: [
    { id: 'feature_list', pattern: "Lists features or ship-dates instead of an outcome the market responded to.", probe: "If you ship every feature on that list and nobody uses it, would investors call this milestone hit?" },
    { id: 'vague_traction', pattern: "Says 'get traction' or 'grow users' without a number or date.", probe: "What number do you commit to here that an investor could check independently?" },
    { id: 'aspirational_date', pattern: "Gives a date but no plan that funds the path — date is hopeful.", probe: "What's the operating plan that connects today to that date?" }
  ],
  wrong_patterns: [
    { id: 'roadmap_as_milestone', pattern: "Treats the product roadmap as the milestone.", leading_question: "A roadmap tells investors what you plan to build. What does a fundable milestone tell them that a roadmap can't?" },
    { id: 'multiple_milestones', pattern: "Lists 4-5 'primary' milestones instead of one.", leading_question: "The section says one primary milestone changes the next conversation. What's the cost of spreading the commitment?" }
  ],
  off_scope_hint:
    "This prompt is about your one specific milestone — scope back to that. One sentence."
};

const EXEMPLAR_SECTION_TEXT = `
Define your primary milestone: the single outcome the raise gets you to. It must be a market-response metric (what the world does), not an execution metric (what the team ships). It must be specific enough that an investor can verify independently. And it must be the one milestone that makes the next conversation easier — not a list of things to build.
`.trim();

async function generateRubric(block, sectionTitle, sectionText, classifierMeta) {
  const promptText = extractPromptText(block);
  const user = `=== EXEMPLAR (calibrate to this) ===

Section: "Define Your Milestones"
Section content excerpt:
${EXEMPLAR_SECTION_TEXT}

Prompt being graded:
${EXEMPLAR.question}

Rubric for that prompt:
${JSON.stringify(EXEMPLAR, null, 2)}

=== YOUR TASK ===

Generate a rubric to grade student answers to THIS prompt.

Section: ${sectionTitle}
Section content (for grounding):
${sectionText}

Prompt being graded:
${promptText}

Classifier reasoning (why this prompt is worth coaching):
${classifierMeta.reason || ''}
${classifierMeta.shallow_example ? 'Hint at a shallow answer: ' + classifierMeta.shallow_example : ''}
${classifierMeta.wrong_example ? 'Hint at a wrong answer: ' + classifierMeta.wrong_example : ''}

Output ONLY the JSON rubric. The "question" field should be the prompt text itself, lightly cleaned.`;

  const r = await anthropic({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: RUBRIC_SYSTEM,
    messages: [{ role: 'user', content: user }]
  });
  if (r.s >= 400) {
    console.error('  ! generator error:', r.d.slice(0, 200));
    return null;
  }
  const text = JSON.parse(r.d).content?.[0]?.text || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const rubric = JSON.parse(m[0]);
    // Multi-question guard
    const all = [
      ...(rubric.shallow_patterns || []).map(p => p.probe).filter(Boolean),
      ...(rubric.wrong_patterns || []).map(p => p.leading_question).filter(Boolean)
    ];
    const bad = all.find(q => (q.match(/\?/g) || []).length > 1);
    if (bad) console.warn(`    ⚠ multi-question probe (kept as draft): "${bad}"`);
    return rubric;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main

async function loadBlocks(scope) {
  let where = '';
  if (scope.kind === 'course') {
    where = `c.title = ${quote(scope.value)}`;
  } else if (scope.kind === 'module') {
    where = `m.id = ${quote(scope.value)}`;
  } else if (scope.kind === 'section') {
    where = `s.id = ${quote(scope.value)}`;
  }
  const sql = `
    select cb.id, cb.type, cb.content, cb.sort_order, cb.section_id,
           s.title as section_title, s.sort_order as s_order,
           m.title as module_title, m.sort_order as m_order,
           c.title as course_title
    from content_blocks cb
    join sections s on s.id = cb.section_id
    join modules m on m.id = s.module_id
    join courses c on c.id = m.course_id
    where ${where}
      and cb.type in ('workbook_prompt', 'structured_prompt')
    order by m.sort_order, s.sort_order, cb.sort_order;
  `;
  const r = await mgmtSql(sql);
  if (r.s >= 400) throw new Error('Block fetch failed: ' + r.d);
  return JSON.parse(r.d);
}

async function loadSectionText(sectionId) {
  const r = await mgmtSql(`
    select cb.type, cb.content, cb.sort_order
    from content_blocks cb
    where cb.section_id = ${quote(sectionId)}
    order by cb.sort_order;
  `);
  if (r.s >= 400) return '';
  return blocksToText(JSON.parse(r.d));
}

async function existingRubricForBlock(blockId) {
  const r = await mgmtSql(`select id, status from public.tutor_rubrics where block_id = ${quote(blockId)} limit 1;`);
  if (r.s >= 400) return null;
  const rows = JSON.parse(r.d);
  return rows[0] || null;
}

async function insertRubric(block, rubric, classifierMeta) {
  const sql = `insert into public.tutor_rubrics
    (section_id, block_id, question, pass_criteria, shallow_patterns, wrong_patterns, off_scope_hint, notes, status, coachable_score, classifier_reason)
    values (
      ${quote(block.section_id)},
      ${quote(block.id)},
      ${quote(rubric.question)},
      ${jsonLit(rubric.pass_criteria || [])},
      ${jsonLit(rubric.shallow_patterns || [])},
      ${jsonLit(rubric.wrong_patterns || [])},
      ${quote(rubric.off_scope_hint || null)},
      ${quote(rubric.notes || null)},
      'draft',
      ${classifierMeta.confidence ?? 0.5},
      ${quote(classifierMeta.reason || null)}
    ) returning id;`;
  const r = await mgmtSql(sql);
  if (r.s >= 400) {
    console.error('    ! insert failed:', r.d.slice(0, 300));
    return null;
  }
  return JSON.parse(r.d)[0]?.id;
}

(async () => {
  console.log(`Scanning ${scope.kind}=${scope.value} ...`);
  const blocks = await loadBlocks(scope);
  console.log(`Found ${blocks.length} prompt blocks.\n`);

  let stats = { scanned: 0, coachable: 0, skippedHasRubric: 0, generated: 0, notCoachable: 0, failed: 0 };

  // Cache section text per section
  const sectionTextCache = new Map();

  for (const block of blocks) {
    stats.scanned++;
    const label = `${block.module_title} / ${block.section_title} [${block.type}#${block.sort_order}]`;

    const existing = await existingRubricForBlock(block.id);
    if (existing) {
      console.log(`· skip (rubric exists ${existing.status}): ${label}`);
      stats.skippedHasRubric++;
      continue;
    }

    process.stdout.write(`→ classify: ${label} ... `);
    const cls = await classify(block, block.section_title);
    if (!cls.coachable || (cls.confidence ?? 0) < COACHABLE_THRESHOLD) {
      console.log(`✗ not coachable (${cls.confidence ?? 0}, ${cls.reason})`);
      stats.notCoachable++;
      continue;
    }
    console.log(`✓ coachable (${cls.confidence}, ${cls.reason})`);
    stats.coachable++;

    if (!sectionTextCache.has(block.section_id)) {
      sectionTextCache.set(block.section_id, await loadSectionText(block.section_id));
    }
    const sectionText = sectionTextCache.get(block.section_id);

    process.stdout.write(`  → generate ... `);
    const rubric = await generateRubric(block, block.section_title, sectionText, cls);
    if (!rubric) { console.log('failed'); stats.failed++; continue; }

    const id = await insertRubric(block, rubric, cls);
    if (id) {
      console.log(`inserted draft ${id}`);
      stats.generated++;
    } else {
      stats.failed++;
    }
  }

  console.log('\n===== SUMMARY =====');
  console.log(JSON.stringify(stats, null, 2));
})();
