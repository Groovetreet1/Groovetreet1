const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  
  if (!email || !newPassword) {
    console.log('Usage: node reset_password.js EMAIL NEW_PASSWORD');
    console.log('Exemple: node reset_password.js abdellah@google.com MonNouveauPass123!');
    return;
  }

  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'NouveauMotDePasseSolide',
    database: 'promo_app'
  });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const [result] = await pool.execute(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [hashedPassword, email]
  );

  if (result.affectedRows > 0) {
    console.log(`✅ Mot de passe mis à jour pour ${email}`);
    console.log(`   Nouveau mot de passe: ${newPassword}`);
  } else {
    console.log(`❌ Utilisateur ${email} non trouvé`);
  }

  await pool.end();
}

main();
