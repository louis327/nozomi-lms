// Seeds the first tutor rubric for testing.
// Section: "The Problem With Guessing How Much to Raise"
//   id: fe134945-3385-48bf-a1d6-9e8cf6f5860c
//   Fundraising Course / Module 1 / sort_order 2

const https = require('https');

const SECTION_ID = 'fe134945-3385-48bf-a1d6-9e8cf6f5860c';
const TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const REF = 'lxgethcibldfcnmajutf';

if (!TOKEN) {
  console.error('Set SUPABASE_MGMT_TOKEN env var (Supabase Management API personal access token).');
  process.exit(1);
}

const rubric = {
  section_id: SECTION_ID,
  question:
    "In your own words: why do investors react badly to a founder who walks in saying 'we're raising $3M for product, growth, and ops'? What is the founder actually missing, and what should they bring instead?",
  pass_criteria: [
    {
      id: 'distinction',
      criterion: 'Number vs position',
      description:
        "Names the core distinction: a number is something you picked; a position is something you built. Explicitly contrasts the two."
    },
    {
      id: 'signal',
      criterion: 'Vague allocations signal lack of work',
      description:
        "Recognises that '30% product, 40% growth' style allocations are a signal the founder hasn't done the underlying work — not a presentation problem."
    },
    {
      id: 'structure',
      criterion: 'A position has three parts',
      description:
        "Identifies that a real raise position is built from (a) a specific milestone the capital takes you to, (b) an operating plan that funds the path, (c) a clear allocation across the things that actually matter — with specifics."
    }
  ],
  shallow_patterns: [
    {
      id: 'specificity_only',
      pattern:
        "Says 'investors want more specifics' or 'be more specific' without naming WHY specificity matters (it proves the work was done).",
      probe:
        "You're right that specifics matter — but a founder could rattle off specific-sounding numbers and still lose the meeting. What is it about the specifics that actually changes the investor's mind? What signal are they reading?"
    },
    {
      id: 'use_of_funds',
      pattern:
        "Says 'you need to explain how you'll use the money' or 'show your use of funds' — generic, doesn't capture milestone-anchoring.",
      probe:
        "'Use of funds' is part of it. But the founder in the example DID say what the money was for — product, growth, ops. Why didn't that work? What's missing from that answer that 'use of funds' on its own doesn't capture?"
    },
    {
      id: 'confidence',
      pattern:
        "Frames it as a confidence / delivery / pitch problem ('be more confident', 'practice the pitch') rather than a substance problem.",
      probe:
        "Imagine the founder delivered '$3M, 30/40/30' with total confidence. Would the investor still walk away unconvinced? Why or why not? What is the investor actually evaluating?"
    },
    {
      id: 'runway',
      pattern:
        "Says 'show your runway' or 'how long the money lasts' — partial; misses that runway is anchored to a milestone, not an arbitrary time horizon.",
      probe:
        "Runway matters — but runway to WHAT? In the example, the founder with a position says '14 months' but that number is anchored to something specific. What is it anchored to, and why does that anchor change everything?"
    },
    {
      id: 'milestone_word_only',
      pattern:
        "Drops the word 'milestone' but treats it as a goal/aspiration rather than a specific committable deliverable (e.g. '10k wallets and $500k fees').",
      probe:
        "You mentioned milestones — good. What's the difference between a milestone like 'grow the business' and a milestone like '10,000 active wallets and $500k in annualised protocol fees'? Why does the second one work for an investor in a way the first one doesn't?"
    }
  ],
  wrong_patterns: [
    {
      id: 'smaller_number',
      pattern: "Says investors prefer a smaller raise amount or 'don't ask for too much'.",
      leading_question:
        "Look at the contrast table again. The 'position' founder is raising $2.4M vs the 'number' founder's $3M — pretty similar. If the dollar amount isn't the differentiator, what is?"
    },
    {
      id: 'pitch_deck',
      pattern: "Says it's about having a better pitch deck or presentation.",
      leading_question:
        "If a great deck could fix this, the founder in the example might still recover with strong slides. But the meeting ends at the moment of the question, before any deck. What does that tell you about where the actual problem lives?"
    },
    {
      id: 'vision',
      pattern: "Says 'investors invest in vision, not numbers' or similar.",
      leading_question:
        "Vision matters in a seed pitch — but the question being asked is 'how much are you raising and what is it for.' This is the operational, near-term question. What is the investor trying to learn from THIS specific question that vision alone doesn't answer?"
    },
    {
      id: 'they_just_dont_get_it',
      pattern: "Externalises — investors are wrong/short-sighted/missing the bigger picture.",
      leading_question:
        "Let's assume the investor is sharp and acting in good faith. What information are they trying to extract from the 'how much / for what' question, and what does the '$3M, 30/40/30' answer fail to give them?"
    }
  ],
  off_scope_hint:
    "Politely scope back to this section. Acknowledge the question is interesting; note that the course covers it in [adjacent module if known], or that this section's focus is specifically on why raise amounts fail when they're not anchored to milestones. Offer to return after they work through the checkpoint.",
  notes:
    "VOICE: Louis is direct, declarative, uses 'picture the scene' framing, contrasts via concrete examples, anti-vagueness. Avoid corporate softening like 'great question!' or 'that's a wonderful insight.' He would say 'You're close' or 'Not quite — keep pulling.' Use short sentences. Don't pile multiple questions in one turn. ONE probe at a time. NEVER reveal the answer until the student has tried twice. If they're truly stuck after 3 probes, offer a worked example from the section's contrast table, then re-ask. Always cite the section concept being tested (e.g. 'the number vs position distinction from this section') when giving the verdict.",
  status: 'approved'
};

const body = JSON.stringify({
  query: `
    insert into public.tutor_rubrics
      (section_id, question, pass_criteria, shallow_patterns, wrong_patterns, off_scope_hint, notes, status, approved_at)
    values
      ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, now())
    returning id, question;
  `,
  params: [
    rubric.section_id,
    rubric.question,
    JSON.stringify(rubric.pass_criteria),
    JSON.stringify(rubric.shallow_patterns),
    JSON.stringify(rubric.wrong_patterns),
    rubric.off_scope_hint,
    rubric.notes,
    rubric.status
  ]
});

// The Supabase Mgmt API query endpoint runs raw SQL but doesn't accept params,
// so inline the values via JSON literals.
const inlineSql = `
insert into public.tutor_rubrics
  (section_id, question, pass_criteria, shallow_patterns, wrong_patterns, off_scope_hint, notes, status, approved_at)
values
  (
    ${quote(rubric.section_id)},
    ${quote(rubric.question)},
    ${jsonLit(rubric.pass_criteria)},
    ${jsonLit(rubric.shallow_patterns)},
    ${jsonLit(rubric.wrong_patterns)},
    ${quote(rubric.off_scope_hint)},
    ${quote(rubric.notes)},
    ${quote(rubric.status)},
    now()
  )
on conflict do nothing
returning id, question;
`;

function quote(s) {
  if (s === null || s === undefined) return 'null';
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function jsonLit(obj) {
  return quote(JSON.stringify(obj)) + '::jsonb';
}

const req = https.request(
  {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${REF}/database/query`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  },
  res => {
    let d = '';
    res.on('data', c => (d += c));
    res.on('end', () => {
      console.log(res.statusCode, d);
    });
  }
);
const payload = JSON.stringify({ query: inlineSql });
req.setHeader('Content-Length', Buffer.byteLength(payload));
req.write(payload);
req.end();
