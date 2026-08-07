const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login/direction',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({
  username: 'direction_tanger',
  password: 'DP@TangerAssilah2026'
}));
req.end();
