const http = require('http');

// First login
const loginData = JSON.stringify({ username: 'direction_tanger', password: 'DP@TangerAssilah2026' });
const loginOpts = {
  hostname: 'localhost', port: 3000, path: '/api/login/direction', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
};

const loginReq = http.request(loginOpts, (loginRes) => {
  let body = '';
  const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || '';
  loginRes.on('data', d => body += d);
  loginRes.on('end', () => {
    console.log('Login:', body, 'Cookie:', cookie);
    
    // Now fetch saisies
    const opts = {
      hostname: 'localhost', port: 3000, path: '/api/direction/saisies', method: 'GET',
      headers: { 'Cookie': cookie }
    };
    const req2 = http.request(opts, (res2) => {
      let b = '';
      res2.on('data', d => b += d);
      res2.on('end', () => {
        console.log('Status:', res2.statusCode);
        console.log('Saisies response:', b.substring(0, 500));
      });
    });
    req2.end();
  });
});
loginReq.write(loginData);
loginReq.end();
