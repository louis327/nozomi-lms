const https = require('https');
const body = JSON.stringify({
  sessionId: process.argv[2] || '44444444-4444-4444-4444-444444444444',
  userId: 'c95aa8ea-8d99-443b-bebd-7603eed98f63',
  sectionId: 'fe134945-3385-48bf-a1d6-9e8cf6f5860c',
  studentMessage:
    process.argv[3] ||
    'I think you need to show specifics so the investor can see how the money will be used.'
});
const t0 = Date.now();
const req = https.request(
  {
    hostname: 'n8n.textflow.com.au',
    path: '/webhook/nozomi-tutor-turn',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  },
  r => {
    let d = '';
    r.on('data', c => (d += c));
    r.on('end', () => {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log('elapsed=' + elapsed + 's status=' + r.statusCode);
      try {
        const j = JSON.parse(d);
        console.log(JSON.stringify(j, null, 2));
      } catch (e) {
        console.log('raw:', d.slice(0, 2000));
      }
    });
  }
);
req.setTimeout(180000, () => { console.log('TIMEOUT'); req.destroy(); });
req.on('error', e => console.log('ERR', e.message));
req.write(body);
req.end();
