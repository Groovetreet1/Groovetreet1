const mysql = require("mysql2/promise");
require("dotenv").config();

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    const config = {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username || ""),
      password: decodeURIComponent(u.password || ""),
      database: u.pathname ? u.pathname.replace(/^\//, "") : undefined,
    };
    if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  } catch (err) {
    console.warn("Invalid DATABASE_URL, falling back to individual env vars.");
    return null;
  }
}

function buildPoolConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    const parsed = parseDatabaseUrl(url);
    if (parsed) return parsed;
  }

  const config = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "NouveauMotDePasseSolide",
    database: process.env.DB_NAME || "promo_app",
  };

  if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

const poolConfig = buildPoolConfig();
const pool = mysql.createPool(poolConfig);

module.exports = pool;
module.exports.poolConfig = poolConfig;
module.exports.buildPoolConfig = buildPoolConfig;
