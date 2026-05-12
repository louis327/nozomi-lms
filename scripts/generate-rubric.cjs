// CLI rubric generator. Same Claude meta-prompt as the admin endpoint.
// Usage: ANTHROPIC_API_KEY=... SUPABASE_MGMT_TOKEN=... node scripts/generate-rubric.cjs <section_id> [<section_id> ...]

const https = require('https');

const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const REF = 'lxgethcibldfcnmajutf';

if (!MGMT_TOKEN || !ANTHROPIC_KEY) {
  console.error('Set SUPABASE_MGMT_TOKEN and ANTHROPIC_API_KEY');
  process.exit(1);
}

const VOICE_NOTES = `
VOICE: Louis is direct, declarative, anti-vagueness. Short sentences. Contrasts via concrete examples. The rubric you produce must encode this voice so the tutor (using your rubric) sounds like Louis.

FORBIDDEN: rubric must not enable the tutor to say "Good question", "Great answer", "Wonderful", "Excellent", "That's a great point" or similar sycophantic openers. Probes and leading questions must be single-question form (no compound asks). Each probe targets one specific shallow pattern.

PRAISE STYLE (for pass criteria): praise must name the specific concept by name, not generic encouragement.
`.trim();

const EXEMPLAR_SECTION_TITLE = 'The Problem With Guessing How Much to Raise';
const EXEMPLAR_SECTION_TEXT = `
Most founders guess their raise amount. Investors notice immediately.
Picture the scene. You are in a first meeting with a VC. They ask: how much are you raising and what is it for? You say $3 million because it sounds credible. They ask what you will use it for. You say 30% product, 40% growth, 30% ops. They ask what milestones you are looking to hit with the capital. You go quiet for a second. You just lost the meeting.
Not because your project is bad. Because you walked in with a number instead of a clear position and reason for the number.
[Contrast table: founder with a number vs founder with a position. Number founder: $3M, 30/40/30, 12-month milestones (generic). Position founder: $2.4M to mainnet, 10,000 active wallets and $500k annualised fees, specific allocation per item, 14-month runway.]
A number is something you picked. A position is something you built, from a milestone you are committing to, an operating plan that funds the path to it, and a clear allocation across the things that actually matter.
[Quote] Your raise amount is a statement about your milestones. If you cannot connect the two with specifics, you do not have a fundraising strategy. You have a hope.
`.trim();

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
};

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
      rs => {
        let d = '';
        rs.on('data', c => (d += c));
        rs.on('end', () => res({ s: rs.statusCode, d }));
      }
    );
    r.on('error', rej);
    r.write(body);
    r.end();
  });
}

function anthropic(body) {
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
      rs => {
        let d = '';
        rs.on('data', c => (d += c));
        rs.on('end', () => res({ s: rs.statusCode, d }));
      }
    );
    r.setTimeout(120000, () => { r.destroy(); res({ s: 0, d: '{"error":"timeout"}' }); });
    r.on('error', e => rej(e));
    r.write(b);
    r.end();
  });
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
      return '[' + b.type + ']';
    })
    .filter(Boolean)
    .join('\n\n');
}

function quote(s) {
  if (s === null || s === undefined) return 'null';
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function jsonLit(obj) { return quote(JSON.stringify(obj)) + '::jsonb'; }

async function generateOne(sectionId) {
  const fetchSql = `select s.id, s.title, json_agg(json_build_object('type', cb.type, 'content', cb.content, 'sort_order', cb.sort_order) order by cb.sort_order) as blocks from sections s left join content_blocks cb on cb.section_id = s.id where s.id = '${sectionId}' group by s.id, s.title;`;
  const fetched = await mgmtSql(fetchSql);
  if (fetched.s >= 400) {
    console.error('Fetch failed:', fetched.d);
    return;
  }
  const sec = JSON.parse(fetched.d)[0];
  if (!sec) { console.error('Section not found:', sectionId); return; }
  const sectionText = blocksToText(sec.blocks);

  console.log(`\n→ Generating rubric for: ${sec.title}`);
  console.log(`  section text length: ${sectionText.length} chars`);

  const system = `You generate Socratic-tutor rubrics for the Nozomi fundraising course (by Louis). You are calibrating against an exemplar that already works in production.

${VOICE_NOTES}

A rubric has FIVE parts:
1. question — the checkpoint question the student answers. Open-ended, asks them to reason in their own words. Tests the section's core concept.
2. pass_criteria — 3 items (rarely 4). Each is { id, criterion, description }. ALL must be addressed (loosely paraphrased counts) for a "pass" verdict.
3. shallow_patterns — 3 to 5 items. Each is { id, pattern, probe }. "pattern" describes a common shallow-correct answer; "probe" is a ONE-question Socratic push that exposes the gap. Probe must NOT reveal the answer.
4. wrong_patterns — 2 to 4 items. Each is { id, pattern, leading_question }. "pattern" describes a common wrong framing; "leading_question" gently brings them toward the right framing.
5. off_scope_hint — one or two sentences for when the student goes off-topic. Must NOT use sycophancy bigrams.

Quality bar:
- Every probe and leading_question is ONE question. No "X? And Y?" stacks.
- Patterns are SPECIFIC failure modes you'd expect from real founders.
- Probes reference the section's own concepts/examples.
- IDs are short snake_case strings unique within the rubric.

Output ONLY valid JSON.`;

  const userContent = `=== EXEMPLAR (already approved, calibrate to this quality) ===

Section title: ${EXEMPLAR_SECTION_TITLE}

Section content:
${EXEMPLAR_SECTION_TEXT}

Rubric for that section:
${JSON.stringify(EXEMPLAR_RUBRIC, null, 2)}

=== YOUR TASK ===

Generate a rubric for THIS section, matching the exemplar's structure and quality.

Section title: ${sec.title}

Section content:
${sectionText}

Output ONLY the JSON rubric.`;

  const r = await anthropic({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system,
    messages: [{ role: 'user', content: userContent }]
  });
  if (r.s >= 400) { console.error('Anthropic call failed:', r.d); return; }
  const respJson = JSON.parse(r.d);
  const text = respJson.content?.[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) { console.error('No JSON in response:', text.slice(0, 400)); return; }
  let rubric;
  try { rubric = JSON.parse(match[0]); } catch (e) { console.error('Parse fail:', e); return; }

  // Multi-question check
  const allQuestions = [
    ...(rubric.shallow_patterns || []).map(p => p.probe).filter(Boolean),
    ...(rubric.wrong_patterns || []).map(p => p.leading_question).filter(Boolean)
  ];
  const bad = allQuestions.find(q => (q.match(/\?/g) || []).length > 1);
  if (bad) {
    console.warn(`  ⚠ Found multi-question probe — inserting anyway as DRAFT for review: "${bad}"`);
  }

  // Insert
  const insSql = `insert into public.tutor_rubrics (section_id, question, pass_criteria, shallow_patterns, wrong_patterns, off_scope_hint, notes, status) values (
    ${quote(sectionId)},
    ${quote(rubric.question)},
    ${jsonLit(rubric.pass_criteria || [])},
    ${jsonLit(rubric.shallow_patterns || [])},
    ${jsonLit(rubric.wrong_patterns || [])},
    ${quote(rubric.off_scope_hint || null)},
    ${quote(rubric.notes || null)},
    'draft'
  ) returning id, status;`;
  const ins = await mgmtSql(insSql);
  if (ins.s >= 400) {
    console.error('  Insert failed:', ins.d);
    return;
  }
  const inserted = JSON.parse(ins.d)[0];
  console.log(`  ✓ Inserted draft rubric ${inserted.id}`);
  console.log(`     question: ${rubric.question.slice(0, 120)}...`);
  console.log(`     pass_criteria: ${(rubric.pass_criteria || []).length}, shallow: ${(rubric.shallow_patterns || []).length}, wrong: ${(rubric.wrong_patterns || []).length}`);
}

(async () => {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.error('Pass at least one section id');
    process.exit(1);
  }
  for (const id of ids) await generateOne(id);
})();
