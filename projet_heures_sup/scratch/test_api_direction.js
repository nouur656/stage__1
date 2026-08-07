const http = require('http');

function request(method, path, body, cookies = '') {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(cookies ? { Cookie: cookies } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          const setCookie = res.headers['set-cookie'];
          resolve({
            status: res.statusCode,
            cookies: setCookie ? setCookie.map((c) => c.split(';')[0]).join('; ') : cookies,
            body: raw,
            json: (() => {
              try {
                return JSON.parse(raw);
              } catch {
                return raw;
              }
            })(),
          });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const login = await request('POST', '/api/login/direction', {
    username: 'direction_tanger',
    password: 'DP@TangerAssilah2026',
  });
  console.log('Login status:', login.status);
  const cookie = login.cookies;

  const stats = await request('GET', '/api/direction/stats', null, cookie);
  console.log('Stats:', stats.json);

  const tests = [
    { url: '/api/direction/saisies?', expected: 5 },
    { url: '/api/direction/saisies?mois=&cycle=&code_etablissement=', expected: 5 },
    { url: '/api/direction/saisies?mois=Tous+les+mois&cycle=Tous+les+cycles', expected: 5 },
    { url: '/api/direction/saisies?cycle=PRIMAIRE', expected: 4 },
  ];

  let ok = true;
  for (const { url, expected } of tests) {
    const r = await request('GET', url, null, cookie);
    const data = r.json;
    const count = Array.isArray(data) ? data.length : -1;
    const pass = count === expected;
    if (!pass) ok = false;
    console.log(`\n${url}`);
    console.log(`  status: ${r.status}, count: ${count}, expected: ${expected} => ${pass ? 'OK' : 'FAIL'}`);
    if (!Array.isArray(data)) console.log('  body:', data);
  }

  if (!ok) process.exit(1);
  console.log('\nAll filter tests passed.');
})().catch((e) => console.error(e.message));
