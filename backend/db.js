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

// Test de connexion au démarrage
pool.getConnection()
  .then(connection => {
    console.log('✓ Connexion MySQL réussie');
    console.log(`  Host: ${poolConfig.host}`);
    console.log(`  Port: ${poolConfig.port}`);
    console.log(`  Database: ${poolConfig.database}`);
    connection.release();
  })
  .catch(err => {
    console.error('✗ Erreur de connexion MySQL:');
    console.error(`  Host: ${poolConfig.host}`);
    console.error(`  Port: ${poolConfig.port}`);
    console.error(`  User: ${poolConfig.user}`);
    console.error(`  Database: ${poolConfig.database}`);
    console.error(`  Message: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.error('\n⚠ MySQL n\'est pas accessible. Vérifiez que:');
      console.error('  - MySQL est démarré');
      console.error('  - Le port est correct (défaut: 3306)');
      console.error('  - Le firewall autorise la connexion');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠ Accès refusé. Vérifiez les identifiants MySQL.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n⚠ La base de données n\'existe pas. Créez-la d\'abord.');
    }
  });

module.exports = pool;
module.exports.buildPoolConfig = buildPoolConfig;
