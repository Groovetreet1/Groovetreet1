const mysql = require("mysql2/promise");
require("dotenv").config();

async function updateUserToVip() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "NouveauMotDePasseSolide",
    database: process.env.DB_NAME || "promo_app",
  });

  try {
    // Afficher tous les utilisateurs non-admin
    console.log("📋 Liste des utilisateurs:");
    const [users] = await pool.execute(
      "SELECT id, email, full_name, vip_level, daily_rate_cents FROM users WHERE role != 'admin' OR role IS NULL"
    );
    
    users.forEach(u => {
      console.log(`  ID: ${u.id} | Email: ${u.email} | Nom: ${u.full_name} | VIP: ${u.vip_level} | Rate: ${u.daily_rate_cents}`);
    });

    if (users.length === 0) {
      console.log("❌ Aucun utilisateur trouvé");
      return;
    }

    // Mettre à jour le premier utilisateur avec VIP GOLD
    const userId = users[0].id;
    console.log(`\n🔄 Mise à jour de l'utilisateur ID ${userId} vers VIP GOLD...`);
    
    await pool.execute(
      `UPDATE users 
       SET vip_level = 'VIP', 
           daily_rate_cents = 1200,
           balance_cents = balance_cents + 50000,
           vip_expires_at = DATE_ADD(NOW(), INTERVAL 3 MONTH) 
       WHERE id = ?`,
      [userId]
    );

    console.log("✅ Mise à jour réussie!");
    console.log("   - VIP Level: VIP");
    console.log("   - Daily Rate: 1200 cents (GOLD - 300 MAD)");
    console.log("   - Balance: +500 MAD ajoutés");
    console.log("   - Expiration: +3 mois");
    console.log("\n🔑 Déconnectez-vous et reconnectez-vous pour voir le changement!");

  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await pool.end();
  }
}

updateUserToVip();
