// Replace the seeded rubric with a tightened version:
//   - every probe is ONE focused question (no compound asks)
//   - every leading question is ONE focused question
//   - author notes hard-block sycophancy bigrams

const SECTION_ID = 'fe134945-3385-48bf-a1d6-9e8cf6f5860c';
const TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const REF = 'lxgethcibldfcnmajutf';

if (!TOKEN) {
  console.error('Set SUPABASE_MGMT_TOKEN');
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
        "Specifics matter — but specifics of what? What is the investor actually using the numbers to infer about you?"
    },
    {
      id: 'use_of_funds',
      pattern:
        "Says 'you need to explain how you'll use the money' or 'show your use of funds' — generic, doesn't capture milestone-anchoring.",
      probe:
        "The founder in the example did give a use of funds — product, growth, ops. What turned that answer into a guess instead of a position?"
    },
    {
      id: 'confidence',
      pattern:
        "Frames it as a confidence / delivery / pitch problem ('be more confident', 'practice the pitch') rather than a substance problem.",
      probe:
        "If the founder delivered '$3M, 30/40/30' with total confidence, would the investor still walk away unconvinced?"
    },
    {
      id: 'runway',
      pattern:
        "Says 'show your runway' or 'how long the money lasts' — partial; misses that runway is anchored to a milestone, not an arbitrary time horizon.",
      probe:
        "Runway to what? What does runway anchor to, in the example of the founder with the position?"
    },
    {
      id: 'milestone_word_only',
      pattern:
        "Drops the word 'milestone' but treats it as a goal/aspiration rather than a specific committable deliverable.",
      probe:
        "What's the difference between a milestone like 'grow the business' and a milestone like '10,000 active wallets and $500k in annualised protocol fees'?"
    }
  ],
  wrong_patterns: [
    {
      id: 'smaller_number',
      pattern: "Says investors prefer a smaller raise amount or 'don't ask for too much'.",
      leading_question:
        "The position founder in the contrast table is raising $2.4M against the number founder's $3M — pretty similar. If dollar amount isn't the differentiator, what is?"
    },
    {
      id: 'pitch_deck',
      pattern: "Says it's about having a better pitch deck or presentation.",
      leading_question:
        "The meeting ends at the question, before any deck is shown. Where does that locate the actual problem?"
    },
    {
      id: 'vision',
      pattern: "Says 'investors invest in vision, not numbers' or similar.",
      leading_question:
        "The question being asked is operational — 'how much and what for.' What is the investor trying to learn from that question that vision alone doesn't answer?"
    },
    {
      id: 'they_just_dont_get_it',
      pattern: "Externalises — investors are wrong/short-sighted/missing the bigger picture.",
      leading_question:
        "Assume the investor is sharp and acting in good faith. What signal is '30/40/30 across product, growth, ops' giving them about whether the work has been done?"
    }
  ],
  off_scope_hint:
    "Scope back politely WITHOUT saying 'good question', 'great question', or any opener like that. Acknowledge their question is fair, note that this checkpoint is specifically about why raise amounts fail without milestone anchoring, and invite them back to the checkpoint. ONE sentence is fine.",
  notes:
    "VOICE: Louis is direct, declarative, uses 'picture the scene' framing, contrasts via concrete examples, anti-vagueness. " +
    "FORBIDDEN OPENERS: never start with 'Good question', 'Great answer', 'Wonderful', 'Excellent', 'That's a great point', or any sycophantic filler. " +
    "PRAISE FORMAT (only when verdict=pass): praise must name the SPECIFIC concept they got right by name (e.g. 'You've got the number-vs-position distinction.'). Never generic ('great answer'). " +
    "QUESTIONS: exactly one question per turn, no compound asks. Statements + ONE question, never two questions. " +
    "When in doubt, channel: 'You're close — keep pulling.' / 'Not quite — look again at...' / 'That's the surface — what's underneath?'"
};

function quote(s) {
  if (s === null || s === undefined) return 'null';
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function jsonLit(obj) { return quote(JSON.stringify(obj)) + '::jsonb'; }

const inlineSql = `
update public.tutor_rubrics set
  question = ${quote(rubric.question)},
  pass_criteria = ${jsonLit(rubric.pass_criteria)},
  shallow_patterns = ${jsonLit(rubric.shallow_patterns)},
  wrong_patterns = ${jsonLit(rubric.wrong_patterns)},
  off_scope_hint = ${quote(rubric.off_scope_hint)},
  notes = ${quote(rubric.notes)},
  status = 'approved',
  approved_at = now()
where section_id = ${quote(SECTION_ID)}
returning id, length(notes) as notes_len;
`;

const payload = JSON.stringify({ query: inlineSql });
const req = require('https').request(
  {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${REF}/database/query`,
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  },
  res => {
    let d = '';
    res.on('data', c => (d += c));
    res.on('end', () => console.log(res.statusCode, d));
  }
);
req.write(payload);
req.end();
