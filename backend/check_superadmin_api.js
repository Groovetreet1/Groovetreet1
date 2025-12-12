const http = require('http');

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const text = buf.toString('utf8');
        try { resolve({ status: res.statusCode, body: JSON.parse(text) }); }
        catch (e) { resolve({ status: res.statusCode, body: text }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const text = buf.toString('utf8');
        try { resolve({ status: res.statusCode, body: JSON.parse(text) }); }
        catch (e) { resolve({ status: res.statusCode, body: text }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function parseArgs() {
  const out = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--email' || a === '-e') { out.email = args[i+1]; i++; }
    else if (a === '--password' || a === '-p') { out.password = args[i+1]; i++; }
  }
  return out;
}

async function main() {
  const argv = parseArgs();
  if (!argv.email || !argv.password) {
    console.error('Usage: node check_superadmin_api.js --email <email> --password <password>');
    process.exit(2);
  }

  const login = await postJson('/api/auth/login', { email: argv.email, password: argv.password });
  console.log('Login status:', login.status);
  if (login.status !== 200 || !login.body || !login.body.token) {
    console.error('Login failed:', login.body);
    process.exit(1);
  }
  const token = login.body.token;

  const endpoints = [
    '/api/admin/deposits?own=1',
    '/api/admin/deposits?all=1',
    '/api/admin/withdrawals?own=1',
    '/api/admin/withdrawals?all=1'
  ];

  for (const ep of endpoints) {
    const res = await getJson(ep, token);
    const len = Array.isArray(res.body) ? res.body.length : (res.body && res.body.length) || 'N/A';
    console.log(`${ep} -> status ${res.status}, items: ${len}`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
