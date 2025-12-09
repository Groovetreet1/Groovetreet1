const mysql = require("mysql2/promise");
const { buildPoolConfig } = require("./db");

async function run() {
  try {
    const baseConfig = buildPoolConfig();
    const targetDb = baseConfig.database || process.env.DB_NAME || "promo_app";
    const connectionConfig = {
      ...baseConfig,
      database: undefined, // connect without selecting DB so we can create it if needed
      multipleStatements: true,
    };

    console.log(
      "Attempting DB connection to host=%s user=%s db=%s",
      connectionConfig.host,
      connectionConfig.user,
      targetDb
    );

    let connection;
    try {
      connection = await mysql.createConnection(connectionConfig);
    } catch (connErr) {
      console.error("Could not connect to MySQL with the parsed credentials:");
      console.error(connErr && connErr.message ? connErr.message : connErr);
      console.error("\nHints:");
      console.error("- Verify MySQL is running and reachable (host/port).");
      console.error(
        "- Check your credentials in backend/db.js or set env vars DB_HOST/DB_USER/DB_PASSWORD."
      );
      console.error("- If you don't have mysql2 installed, run `npm install` in the backend folder.");
      process.exit(1);
    }

    const run = async (q, description) => {
      try {
        await connection.query(q);
        if (description) console.log(description);
      } catch (e) {
        console.warn("Warning running step:", description || q);
        console.warn(e && e.message ? e.message : e);
      }
    };

    console.log(
      "Running migrations using DB host=%s user=%s database=%s",
      connectionConfig.host,
      connectionConfig.user,
      targetDb || "<none>"
    );

    // Ensure database exists and select it
    await run(
      `CREATE DATABASE IF NOT EXISTS \`${targetDb}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
      `Ensured database ${targetDb} exists`
    );
    await run(`USE \`${targetDb}\`;`, `Using database ${targetDb}`);

    // USERS
    await run(
      `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        vip_level VARCHAR(20) NOT NULL DEFAULT 'FREE',
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        balance_cents INT NOT NULL DEFAULT 0,
        invite_code VARCHAR(32) UNIQUE,
        invited_by_user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_invited_by (invited_by_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table users"
    );
    await run(
      `ALTER TABLE users AUTO_INCREMENT = 100000;`,
      "Ensured users AUTO_INCREMENT starts at 100000"
    );
    const ensureUserColumns = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT ''`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL UNIQUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_level VARCHAR(20) NOT NULL DEFAULT 'FREE'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code VARCHAR(32) UNIQUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by_user_id INT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    ];
    for (const stmt of ensureUserColumns) {
      await run(stmt, `Ensured column on users (${stmt})`);
    }

    // TASKS
    await run(
      `
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        reward_cents INT NOT NULL DEFAULT 0,
        duration_seconds INT NOT NULL DEFAULT 15,
        min_vip_level VARCHAR(20) DEFAULT 'FREE',
        video_url VARCHAR(512),
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table tasks"
    );
    const ensureTaskColumns = [
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reward_cents INT NOT NULL DEFAULT 0`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_seconds INT NOT NULL DEFAULT 15`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_vip_level VARCHAR(20) DEFAULT 'FREE'`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS video_url VARCHAR(512)`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    ];
    for (const stmt of ensureTaskColumns) {
      await run(stmt, `Ensured column on tasks (${stmt})`);
    }

    // DEPOSITS
    await run(
      `
      CREATE TABLE IF NOT EXISTS deposits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount_cents INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        full_name VARCHAR(255),
        payer_rib VARCHAR(255),
        screenshot_path VARCHAR(512),
        method_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table deposits"
    );
    await run(
      `ALTER TABLE deposits ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`,
      "Ensured deposits.full_name column"
    );
    await run(
      `ALTER TABLE deposits MODIFY status VARCHAR(50) NOT NULL`,
      "Ensured deposits.status NOT NULL"
    );
    await run(
      `ALTER TABLE deposits ADD COLUMN IF NOT EXISTS payer_rib VARCHAR(255);`,
      "Ensured deposits.payer_rib column"
    );
    await run(
      `ALTER TABLE deposits ADD COLUMN IF NOT EXISTS screenshot_path VARCHAR(512);`,
      "Ensured deposits.screenshot_path column"
    );
    await run(
      `ALTER TABLE deposits ADD COLUMN IF NOT EXISTS method_id INT NULL;`,
      "Ensured deposits.method_id column"
    );

    // WITHDRAWALS
    await run(
      `
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount_cents INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        type VARCHAR(50) NOT NULL DEFAULT 'WITHDRAW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table withdrawals"
    );
    await run(
      `ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'WITHDRAW'`,
      "Ensured withdrawals.type column"
    );

    // TASK COMPLETIONS
    await run(
      `
      CREATE TABLE IF NOT EXISTS task_completions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task_id INT NOT NULL,
        reward_cents INT NOT NULL,
        balance_before_cents INT NOT NULL DEFAULT 0,
        balance_after_cents INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table task_completions"
    );
    await run(
      `ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS balance_before_cents INT NOT NULL DEFAULT 0`,
      "Ensured task_completions.balance_before_cents"
    );
    await run(
      `ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS balance_after_cents INT NOT NULL DEFAULT 0`,
      "Ensured task_completions.balance_after_cents"
    );
    try {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS cnt
           FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'task_completions'
            AND index_name = 'ux_task_user'`
      );
      if (rows && rows[0] && rows[0].cnt === 0) {
        await connection.query(
          `ALTER TABLE task_completions ADD UNIQUE INDEX ux_task_user (user_id, task_id);`
        );
        console.log("Ensured unique index on task_completions(user_id, task_id)");
      } else {
        console.log("Unique index ux_task_user already present on task_completions");
      }
    } catch (e) {
      console.warn(
        "Warning while ensuring unique index ux_task_user:",
        e && e.message ? e.message : e
      );
    }

    // BANK ACCOUNTS
    await run(
      `
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        bank_name VARCHAR(255),
        iban VARCHAR(255),
        holder_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table bank_accounts"
    );

    // REFERRALS
    await run(
      `
      CREATE TABLE IF NOT EXISTS referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inviter_user_id INT NOT NULL,
        invited_user_id INT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table referrals"
    );

    // REFERRAL BONUSES
    await run(
      `
      CREATE TABLE IF NOT EXISTS referral_bonuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deposit_id INT NOT NULL UNIQUE,
        inviter_user_id INT NOT NULL,
        invited_user_id INT NOT NULL,
        bonus_cents INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE CASCADE,
        FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table referral_bonuses"
    );

    // DEPOSIT METHODS (bank destination info)
    await run(
      `
      CREATE TABLE IF NOT EXISTS deposit_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_name VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(255) NOT NULL,
        rib VARCHAR(255),
        motif VARCHAR(255),
        instructions TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
      "Ensured table deposit_methods"
    );
    await run(
      `ALTER TABLE deposit_methods ADD COLUMN IF NOT EXISTS motif VARCHAR(255);`,
      "Ensured deposit_methods.motif column"
    );

    // Seed one default method if none exists
    try {
      const [countRows] = await connection.query("SELECT COUNT(*) AS cnt FROM deposit_methods");
      if (countRows && countRows[0] && Number(countRows[0].cnt) === 0) {
        await connection.query(
          `INSERT INTO deposit_methods (bank_name, recipient_name, account_number, rib, instructions)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            "CIH",
            "Destinataire Demo",
            "0000-0000-0000-0000",
            "MA1234567890000000000000000",
            "Versement promo",
            "Effectue le virement puis téléverse la capture d'écran du reçu.",
          ]
        );
        console.log("Inserted default deposit method");
      }
    } catch (e) {
      console.warn("Could not seed deposit_methods:", e && e.message ? e.message : e);
    }

    // Seed a couple of tasks if none exist
    const seedTasks = [
      {
        title: "Regarder vidéo promo 1",
        description: "Regarde la vidéo pendant au moins 15 secondes.",
        reward_cents: 200,
        duration_seconds: 15,
        min_vip_level: "FREE",
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        is_active: 1,
      },
      {
        title: "Regarder vidéo promo 2",
        description: "Regarde la vidéo pendant au moins 15 secondes.",
        reward_cents: 500,
        duration_seconds: 15,
        min_vip_level: "FREE",
        video_url: "https://www.youtube.com/watch?v=sOCKUCvEHWM",
        is_active: 1,
      },
    ];

    for (const t of seedTasks) {
      try {
        const [rows] = await connection.query("SELECT id FROM tasks WHERE title = ?", [t.title]);
        if (!rows || rows.length === 0) {
          await connection.query(
            `INSERT INTO tasks (title, description, reward_cents, duration_seconds, min_vip_level, video_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              t.title,
              t.description,
              t.reward_cents,
              t.duration_seconds,
              t.min_vip_level,
              t.video_url,
              t.is_active,
            ]
          );
          console.log("Inserted sample task:", t.title);
        } else {
          console.log("Sample task already exists:", t.title);
        }
      } catch (e) {
        console.warn("Could not seed task", t.title, e && e.message ? e.message : e);
      }
    }

    console.log("Migrations completed (idempotent steps).");

    await connection.end();
    process.exit(0);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error("Migration file not found:", err.path || err.message);
      process.exit(1);
    }
    console.error("Migration failed:", err && err.stack ? err.stack : err.message || err);
    process.exit(1);
  }
}

run();
