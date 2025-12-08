const mysql = require('mysql2/promise');
const { buildPoolConfig } = require('./db');

async function run() {
  try {
    // We'll perform idempotent, step-by-step migrations here instead
    // of executing the raw SQL file. This lets us ALTER existing tables
    // to add missing columns (fixes 'Unknown column' errors).

    const baseConfig = buildPoolConfig();
    const targetDb = baseConfig.database || process.env.DB_NAME || 'promo_app';
    const connectionConfig = {
      ...baseConfig,
      database: undefined, // connect without selecting DB so we can create it if needed
      multipleStatements: true,
    };

    // Create a connection (not a pool) so we can run multiple statements
    console.log('Attempting DB connection to host=%s user=%s db=%s', connectionConfig.host, connectionConfig.user, targetDb);
    let connection;
    try {
      connection = await mysql.createConnection(connectionConfig);
    } catch (connErr) {
      console.error('Could not connect to MySQL with the parsed credentials:');
      console.error(connErr && connErr.message ? connErr.message : connErr);
      console.error('\nHints:');
      console.error('- Verify MySQL is running and reachable (host/port).');
      console.error('- Check your credentials in backend/db.js or set env vars DB_HOST/DB_USER/DB_PASSWORD.');
      console.error('- If you don\'t have mysql2 installed, run `npm install` in the backend folder.');
      process.exit(1);
    }

    console.log('Running migrations using DB host=%s user=%s database=%s', connectionConfig.host, connectionConfig.user, targetDb || '<none>');

    // Run idempotent DDL statements
    const run = async (q, description) => {
      try {
        await connection.query(q);
        if (description) console.log(description);
      } catch (e) {
        // Don't fail hard on ALTERs or index creations on older MySQL versions.
        console.warn('Warning running step:', description || q);
        console.warn(e && e.message ? e.message : e);
      }
    };

    // Ensure database exists and select it
    await run(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`, `Ensured database ${targetDb} exists`);
    await run(`USE \`${targetDb}\`;`, `Using database ${targetDb}`);

    // Create tables if they don't exist
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255),
        balance_cents INT DEFAULT 0,
        vip_level INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, 'Ensured table users');
    await run(`ALTER TABLE users AUTO_INCREMENT = 100000;`, 'Ensured users AUTO_INCREMENT starts at 100000');

    await run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        reward_cents INT DEFAULT 0,
        duration_seconds INT DEFAULT 0,
        min_vip_level INT DEFAULT 0,
        video_url VARCHAR(512),
        is_active TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, 'Ensured table tasks');

    await run(`
      CREATE TABLE IF NOT EXISTS deposits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        amount_cents INT,
        status VARCHAR(50) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, 'Ensured table deposits');

    await run(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        amount_cents INT,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, 'Ensured table withdrawals');

    await run(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        task_id INT,
        reward_cents INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, 'Ensured table task_completions');

    // Ensure uniqueness per user/task to prevent double-completion (skip if already exists)
    const ensureUniqueIndex = async () => {
      try {
        const [rows] = await connection.query(
          `SELECT COUNT(*) AS cnt
             FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'task_completions'
              AND index_name = 'ux_task_user'`
        );
        if (rows && rows[0] && rows[0].cnt > 0) {
          console.log('Unique index ux_task_user already present on task_completions');
          return;
        }
        await connection.query(
          `ALTER TABLE task_completions ADD UNIQUE INDEX ux_task_user (user_id, task_id);`
        );
        console.log('Ensured unique index on task_completions(user_id, task_id)');
      } catch (e) {
        console.warn('Warning while ensuring unique index ux_task_user:', e && e.message ? e.message : e);
      }
    };
    await ensureUniqueIndex();

    // Bank accounts table for storing user bank details (one-per-user)
    // Create bank_accounts WITHOUT a foreign key to avoid FK mismatch errors (errno 150).
    // We keep user_id and rely on application logic; FK can be added manually later if desired.
    await run(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        bank_name VARCHAR(255),
        iban VARCHAR(255),
        holder_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, 'Ensured table bank_accounts (no FK)');

    // Ensure expected columns exist on tasks table (in case an older schema exists)
    const alterStatements = [
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reward_cents INT DEFAULT 0;`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0;`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_vip_level INT DEFAULT 0;`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS video_url VARCHAR(512);`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;`,
    ];

    for (const stmt of alterStatements) {
      await run(stmt, `Ensured column via: ${stmt.split('ADD COLUMN')[1].trim().slice(0,40)}`);
    }

    // Ensure deposits table has a full_name column to store depositor name (bank transfer payer name)
    try {
      await run(`ALTER TABLE deposits ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`, 'Ensured deposits.full_name column');
    } catch (e) {
      // best-effort: if ALTER fails silently continue
      console.warn('Could not ensure deposits.full_name column:', e && e.message ? e.message : e);
    }

    // Seed six fixed tasks (2.00 MAD, 15s) if not present
    const seedTasks = Array.from({ length: 6 }).map((_, i) => ({
      title: `Video promo ${i + 1}`,
      description: 'Regarde la vidéo pendant au moins 15 secondes.',
      reward_cents: 200,
      duration_seconds: 15,
      min_vip_level: 0,
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      is_active: 1,
    }));

    for (const t of seedTasks) {
      try {
        const [rows] = await connection.query('SELECT id FROM tasks WHERE title = ?', [t.title]);
        if (!rows || rows.length === 0) {
          await connection.query(
            `INSERT INTO tasks (title, description, reward_cents, duration_seconds, min_vip_level, video_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [t.title, t.description, t.reward_cents, t.duration_seconds, t.min_vip_level, t.video_url, t.is_active]
          );
          console.log('Inserted sample task:', t.title);
        } else {
          console.log('Sample task already exists:', t.title);
        }
      } catch (e) {
        console.warn('Could not seed task', t.title, e && e.message ? e.message : e);
      }
    }

    console.log('Migrations completed (idempotent steps).');

    await connection.end();
    process.exit(0);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Migration file not found:', err.path || err.message);
      process.exit(1);
    }
    console.error('Migration failed:', err && err.stack ? err.stack : err.message || err);
    process.exit(1);
  }
}

run();
