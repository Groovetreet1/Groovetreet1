const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",      // à adapter
  password: "motdepasse",// à adapter
  database: "promo_app", // à adapter
});

module.exports = pool;
