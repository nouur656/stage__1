const http = require('http');

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
    
    // FETCH NO CYCLE
    const opts = {
      hostname: 'localhost', port: 3000, path: '/api/export/excel?liste_no=1', method: 'GET',
      headers: { 'Cookie': cookie }
    };
    const req2 = http.request(opts, (res2) => {
      let b = [];
      res2.on('data', d => b.push(d));
      res2.on('end', () => {
        const buffer = Buffer.concat(b);
        console.log('Status:', res2.statusCode);
        console.log('Content-Type:', res2.headers['content-type']);
        console.log('Bytes generated:', buffer.length);
        if (res2.statusCode !== 200) {
           console.log('Error payload:', buffer.toString());
        }
      });
    });
    req2.end();
  });
});
loginReq.write(loginData);
loginReq.end();
