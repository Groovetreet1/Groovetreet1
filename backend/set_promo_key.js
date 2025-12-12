const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const { buildPoolConfig } = require("./db");

async function main() {
  const password = process.env.PROMO_ROLE_PASSWORD || "GoMobile$$";
  const hash = await bcrypt.hash(password, 10);
  const config = buildPoolConfig();
  config.multipleStatements = true;
  const conn = await mysql.createConnection(config);
  await conn.query(
    "CREATE TABLE IF NOT EXISTS promo_role_keys (id INT PRIMARY KEY, secret_hash VARCHAR(255) NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)"
  );
  await conn.query(
    "INSERT INTO promo_role_keys (id, secret_hash) VALUES (1, ?) ON DUPLICATE KEY UPDATE secret_hash = VALUES(secret_hash)",
    [hash]
  );
  console.log("Promo role password hash updated.");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
