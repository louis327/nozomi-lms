// Benchmark the tutor agent across realistic student answers.
// Each case has an expected verdict (or expected intent for non-answer cases).
// Tabulates verdict accuracy + critic-flag rate + sycophancy detection.

const https = require('https');

const SECTION_ID = 'fe134945-3385-48bf-a1d6-9e8cf6f5860c'; // "Problem with guessing"
const USER_ID = 'c95aa8ea-8d99-443b-bebd-7603eed98f63';    // louis
const RUBRIC_ID = '925a62f1-bbd6-4c5c-bc99-eed5f709edf1';
const SUPABASE_MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const REF = 'lxgethcibldfcnmajutf';

if (!SUPABASE_MGMT_TOKEN) {
  console.error('Set SUPABASE_MGMT_TOKEN');
  process.exit(1);
}

// Each case: a realistic student-style message + the expected verdict/intent.
// Mix of strong/weak/wrong/edge-case to stress the agent.
const cases = [
  // ---- PASS (3) ----
  {
    label: 'PASS-strong-complete',
    expectVerdict: 'pass',
    msg: "A number is something you picked off the top of your head — it could be defensible later but at the moment of the question, the investor can't tell. A position is built. You have a specific milestone you're committing to hit, an operating plan that gets you there, and you've allocated the raise across the actual leverage points with specifics. The $3M / 30-40-30 founder hasn't done that work; the work shows up as specificity. The investor isn't checking the math — they're checking whether you've done the thinking."
  },
  {
    label: 'PASS-loose-but-correct',
    expectVerdict: 'pass',
    msg: "The investor walks away because the founder showed they're guessing. Picking a number and splitting it 30/40/30 is what someone does when they haven't worked out what milestone the raise actually buys. A real position is anchored — here's the milestone, here's the operating plan to hit it, here's where each dollar goes against that. That's what 'we are raising $2.4M to get to mainnet with 10k wallets' is doing — it's not the number, it's that the number is downstream of a commitment."
  },
  {
    label: 'PASS-conversational',
    expectVerdict: 'pass',
    msg: "Honestly the investor sees that the founder hasn't done the homework. '$3M for product, growth, ops' is a number with a costume on it. The position version locks in a specific milestone — like 10k wallets and $500k in fees — then works backwards: this much hires the engineers, this much funds partnerships, this much keeps the lights on for 14 months. The number is the OUTPUT of the work, not the input."
  },

  // ---- SHALLOW (3) ----
  {
    label: 'SHALLOW-specificity',
    expectVerdict: 'shallow',
    msg: 'They want to see more specific numbers. Be more granular about where each dollar goes.'
  },
  {
    label: 'SHALLOW-runway',
    expectVerdict: 'shallow',
    msg: 'You should show how long the runway lasts and what stage the company will be at.'
  },
  {
    label: 'SHALLOW-confidence',
    expectVerdict: 'shallow',
    msg: 'I think the founder needs to deliver the number with more confidence. They went quiet, which kills credibility.'
  },

  // ---- WRONG (2) ----
  {
    label: 'WRONG-smaller-number',
    expectVerdict: 'wrong',
    msg: "Investors probably want a smaller raise — $3M is too much for an early stage. If they asked for $1.5M they'd be in better shape."
  },
  {
    label: 'WRONG-vision-not-numbers',
    expectVerdict: 'wrong',
    msg: "VCs invest in vision, not numbers. The founder should be talking about why this company matters, not breaking out percentages."
  },

  // ---- PARTIAL (2) ----
  {
    label: 'PARTIAL-named-distinction-no-structure',
    expectVerdict: 'partial',
    msg: "The founder picked a number without building a position. They didn't do the work to back it up."
  },
  {
    label: 'PARTIAL-structure-no-signal',
    expectVerdict: 'partial',
    msg: "The fix is to anchor the raise to a specific milestone, write an operating plan, and split the allocation against the milestone."
  },

  // ---- QUESTION (1) ----
  {
    label: 'QUESTION-clarify',
    expectIntent: 'question',
    msg: "What if the milestone is something that's hard to commit to publicly — like a specific revenue number? Won't that backfire if you miss?"
  },

  // ---- OFF-TOPIC (1) ----
  {
    label: 'OFFTOPIC-safe-vs-priced',
    expectIntent: 'off_topic',
    msg: "Quick aside — should I raise on a SAFE or a priced round at this stage?"
  }
];

// Valid UUID v4-shape ids derived from "benchNN" prefix
function caseUuid(i) {
  const n = String(i).padStart(2, '0');
  return `bbbbbb${n}-0000-4000-8000-000000000000`;
}

function freshSessionsSQL() {
  const ids = cases.map((_, i) => caseUuid(i));
  const rows = ids.map(id => `('${id}', '${USER_ID}', '${SECTION_ID}', '${RUBRIC_ID}', 'active')`);
  return `
    delete from public.tutor_sessions where id in (${ids.map(i => `'${i}'`).join(',')});
    insert into public.tutor_sessions (id, user_id, section_id, rubric_id, status) values
      ${rows.join(',\n')}
    returning id;
  `;
}

function mgmtPost(sql) {
  return new Promise((res, rej) => {
    const body = JSON.stringify({ query: sql });
    const r = https.request(
      {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${REF}/database/query`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_MGMT_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
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

function tutorTurn(sessionId, message) {
  return new Promise((res, rej) => {
    const body = JSON.stringify({
      sessionId,
      userId: USER_ID,
      sectionId: SECTION_ID,
      studentMessage: message
    });
    const t0 = Date.now();
    const r = https.request(
      {
        hostname: 'n8n.textflow.com.au',
        path: '/webhook/nozomi-tutor-turn',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      },
      rs => {
        let d = '';
        rs.on('data', c => (d += c));
        rs.on('end', () => {
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
          try {
            res({ elapsed, status: rs.statusCode, data: JSON.parse(d) });
          } catch (e) {
            res({ elapsed, status: rs.statusCode, data: { raw: d } });
          }
        });
      }
    );
    r.setTimeout(180000, () => {
      r.destroy();
      res({ elapsed: 'timeout', status: 0, data: {} });
    });
    r.on('error', e => rej(e));
    r.write(body);
    r.end();
  });
}

function sycophancyHits(text) {
  const BIGRAMS = [
    'good question', 'great question', 'great answer', 'wonderful',
    'excellent answer', 'excellent point', "that's a great",
    'i love that', 'beautiful', 'fantastic', 'amazing answer', 'perfect answer'
  ];
  const lower = String(text || '').toLowerCase();
  return BIGRAMS.filter(b => lower.includes(b));
}

(async () => {
  console.log('Preparing fresh sessions...');
  const setup = await mgmtPost(freshSessionsSQL());
  if (setup.s >= 400) {
    console.error('Setup failed:', setup.d);
    process.exit(1);
  }
  const sessionIds = JSON.parse(setup.d).map(r => r.id);

  console.log(`Firing ${cases.length} cases in parallel...\n`);
  const promises = cases.map((c, i) => tutorTurn(sessionIds[i], c.msg).then(r => ({ c, r })));
  const results = await Promise.all(promises);

  let verdictCorrect = 0;
  let verdictTotal = 0;
  let intentCorrect = 0;
  let intentTotal = 0;
  let flagged = 0;
  let rewritten = 0;
  let sycophancy = 0;

  for (const { c, r } of results) {
    const d = r.data;
    const verdictMatch = c.expectVerdict
      ? d.verdict === c.expectVerdict
      : null;
    const intentMatch = c.expectIntent ? d.intent === c.expectIntent : null;

    if (c.expectVerdict) {
      verdictTotal++;
      if (verdictMatch) verdictCorrect++;
    }
    if (c.expectIntent) {
      intentTotal++;
      if (intentMatch) intentCorrect++;
    }
    if (d.flagged) flagged++;
    if (d.rewritten) rewritten++;
    const hits = sycophancyHits(d.reply);
    if (hits.length) sycophancy++;

    const mark = verdictMatch === true || intentMatch === true ? '✓' : verdictMatch === false || intentMatch === false ? '✗' : '·';
    console.log(`${mark} [${r.elapsed}s] ${c.label}`);
    console.log(`   expect=${c.expectVerdict || c.expectIntent}  got=verdict:${d.verdict || '-'} intent:${d.intent || '-'} flagged:${d.flagged} rewritten:${d.rewritten}`);
    console.log(`   reply: ${(d.reply || d.raw || '').slice(0, 220)}`);
    if (hits.length) console.log(`   SYCOPHANCY HIT: ${hits.join(', ')}`);
    console.log('');
  }

  console.log('===== SUMMARY =====');
  console.log(`Verdict accuracy:    ${verdictCorrect}/${verdictTotal} (${((verdictCorrect / verdictTotal) * 100).toFixed(0)}%)`);
  console.log(`Intent accuracy:     ${intentCorrect}/${intentTotal} (${((intentCorrect / intentTotal) * 100).toFixed(0)}%)`);
  console.log(`Critic-flagged:      ${flagged}/${cases.length}`);
  console.log(`Rewritten:           ${rewritten}/${cases.length}`);
  console.log(`Sycophancy escaped:  ${sycophancy}/${cases.length}`);
})();
