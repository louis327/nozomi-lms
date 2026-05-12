// Smoke-test the Coach on "Define Your Milestones" (auto-generated rubric)
const https = require('https');

const cases = [
  {
    label: 'PASS-attempt',
    msg: "A fundable milestone has to be defined before you size the raise — the raise funds the path to a destination you've already picked. The strongest milestones are market-response ones — they prove the market wants what you built, not just that you can ship — and that's what actually moves valuation at the next round. The milestone also has to match the stage you're at; pre-seed is about shipping a v1 and getting first signal, Series A is scaling what's already proven. And you commit to ONE primary milestone that changes the next conversation, not a long roadmap of things."
  },
  {
    label: 'SHALLOW-list-of-features',
    msg: "A good milestone is shipping the v2 product, integrating with three partners, and getting the audit done."
  },
  {
    label: 'WRONG-raise-first',
    msg: "First figure out how much you can realistically raise based on market conditions, then work out what you can actually build with that money."
  }
];

function tutor(sessionId, message) {
  return new Promise(res => {
    const body = JSON.stringify({
      sessionId,
      userId: 'c95aa8ea-8d99-443b-bebd-7603eed98f63',
      sectionId: '00c8b33a-6aef-40bc-b834-fc59c1b24bd0',
      studentMessage: message
    });
    const t0 = Date.now();
    const r = https.request(
      { hostname: 'n8n.textflow.com.au', path: '/webhook/nozomi-tutor-turn', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      rs => { let d=''; rs.on('data',c=>d+=c); rs.on('end',()=>{
        const elapsed=((Date.now()-t0)/1000).toFixed(1);
        try { res({elapsed, status: rs.statusCode, data: JSON.parse(d)}); }
        catch (e) { res({elapsed, status: rs.statusCode, data: { raw: d.slice(0, 400) } }); }
      });}
    );
    r.setTimeout(180000, () => { res({elapsed:'timeout', status:0, data:{}}); r.destroy(); });
    r.write(body); r.end();
  });
}

(async () => {
  // Use a new session per case so each is independent.
  const sessions = ['ddee0001-0000-4000-8000-000000000000', 'ddee0002-0000-4000-8000-000000000000', 'ddee0003-0000-4000-8000-000000000000'];
  const sql = `
    delete from public.tutor_sessions where id in (${sessions.map(s=>"'"+s+"'").join(',')});
    insert into public.tutor_sessions (id, user_id, section_id, rubric_id, status)
    values ${sessions.map(s => `('${s}', 'c95aa8ea-8d99-443b-bebd-7603eed98f63', '00c8b33a-6aef-40bc-b834-fc59c1b24bd0', 'd61c6c1a-ce93-47f5-a023-4f913170d5e6', 'active')`).join(',\n')}
    returning id;
  `;
  const body = JSON.stringify({ query: sql });
  await new Promise(res => {
    const r = https.request({hostname:'api.supabase.com',path:'/v1/projects/lxgethcibldfcnmajutf/database/query',method:'POST',headers:{'Authorization':'Bearer '+process.env.SUPABASE_MGMT_TOKEN,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},rs=>{let d='';rs.on('data',c=>d+=c);rs.on('end',()=>res());});
    r.write(body); r.end();
  });

  console.log('Firing 3 cases in parallel on Define Your Milestones...\n');
  const results = await Promise.all(cases.map((c, i) => tutor(sessions[i], c.msg).then(r => ({c, r}))));
  for (const { c, r } of results) {
    const d = r.data;
    console.log(`[${r.elapsed}s] ${c.label}`);
    console.log(`  intent=${d.intent} verdict=${d.verdict} mastery=${d.mastery} flagged=${d.flagged} rewritten=${d.rewritten}`);
    console.log(`  reply: ${(d.reply || d.raw || '').slice(0, 280)}`);
    console.log('');
  }
})();
