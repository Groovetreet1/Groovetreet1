const pool = require('./db');
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
        try {
          const json = JSON.parse(text);
          resolve({ status: res.statusCode, body: json });
        } catch (err) {
          resolve({ status: res.statusCode, body: text });
        }
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
        try {
          const json = JSON.parse(text);
          resolve({ status: res.statusCode, body: json });
        } catch (err) {
          resolve({ status: res.statusCode, body: text });
        }
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
    if (a === '--email' || a === '-e') {
      out.email = args[i + 1]; i++;
    } else if (a === '--id' || a === '-i') {
      out.id = args[i + 1]; i++;
    } else if (a === '--password' || a === '-p') {
      out.password = args[i + 1]; i++;
    }
  }
  return out;
}

async function main() {
  const argv = parseArgs();
  const email = argv.email;
  const id = argv.id;
  const password = argv.password;

  if (!email && !id) {
    console.error('Provide --email or --id to promote');
    process.exit(2);
  }

  try {
    if (email) {
      await pool.query("UPDATE users SET role = 'superadmin' WHERE email = ?", [email]);
    } else {
      await pool.query("UPDATE users SET role = 'superadmin' WHERE id = ?", [id]);
    }

    const where = email ? 'email = ?' : 'id = ?';
    const val = email || id;
    const [rows] = await pool.query(`SELECT id, email, role FROM users WHERE ${where} LIMIT 1`, [val]);
    console.log('DB user row after update:');
    console.log(rows[0] || null);

    if (password && email) {
      console.log('\nAttempting login to verify /api/user/me...');
      const login = await postJson('/api/auth/login', { email, password });
      console.log('Login response status:', login.status);
      console.log('Login response body:', login.body);
      if (login.status === 200 && login.body && login.body.token) {
        const token = login.body.token;
        const me = await getJson('/api/user/me', token);
        console.log('/api/user/me status:', me.status);
        console.log('/api/user/me body:', me.body);
      } else {
        console.log('Login did not return a token; skipping /api/user/me check.');
      }
    } else if (password && !email) {
      console.log('Password verification requires --email to perform login. Skipping login.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
