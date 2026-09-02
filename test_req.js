import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 10000,
  path: '/api/kinesio/patients',
  method: 'GET',
  headers: {
    // I don't have a token, but I want to see if it's returning 500 or 401
    // Actually, I can't hit it without a token, it will return 401.
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log("STATUS:", res.statusCode, "BODY:", data); });
});
req.on('error', (e) => { console.error("ERR:", e); });
req.end();
