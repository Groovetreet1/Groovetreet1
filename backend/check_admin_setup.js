const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'NouveauMotDePasseSolide',
    database: 'promo_app'
  });

  console.log('\n=== Vérification des Admins et Dépôts ===\n');

  // 1. Lister tous les utilisateurs avec leur rôle
  console.log('1. Liste des utilisateurs:');
  const [users] = await pool.execute(
    `SELECT id, email, role, full_name FROM users ORDER BY id`
  );
  
  console.table(users);

  // 2. Lister les mappings admin -> compte destinataire
  console.log('\n2. Mappings admin -> compte destinataire:');
  const [mappings] = await pool.execute(
    `SELECT 
      ama.id,
      ama.admin_id,
      u.email AS admin_email,
      u.role AS admin_role,
      ama.account_type,
      ama.account_id,
      dm.bank_name,
      dm.recipient_name
     FROM admin_managed_accounts ama
     JOIN users u ON u.id = ama.admin_id
     LEFT JOIN deposit_methods dm ON dm.id = ama.account_id AND ama.account_type = 'deposit_method'`
  );
  
  if (mappings.length > 0) {
    console.table(mappings);
  } else {
    console.log('❌ Aucun mapping trouvé!');
  }

  // 3. Lister les dépôts PENDING
  console.log('\n3. Dépôts en attente (PENDING):');
  const [deposits] = await pool.execute(
    `SELECT 
      d.id,
      d.user_id,
      u.email AS user_email,
      d.amount_cents / 100 AS amount_mad,
      d.method_id,
      dm.bank_name AS destination_bank,
      dm.recipient_name AS destination_recipient,
      d.processed_by_admin_id,
      d.status,
      d.created_at
     FROM deposits d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN deposit_methods dm ON dm.id = d.method_id
     WHERE d.status = 'PENDING'
     ORDER BY d.created_at DESC
     LIMIT 10`
  );
  
  if (deposits.length > 0) {
    console.table(deposits);
  } else {
    console.log('❌ Aucun dépôt PENDING trouvé!');
  }

  // 4. Vérifier quels admins devraient voir quels dépôts
  console.log('\n4. Analyse: Qui devrait voir quoi?\n');
  for (const dep of deposits) {
    const mapping = mappings.find(m => m.account_id === dep.method_id);
    if (mapping) {
      console.log(`✅ Dépôt #${dep.id} (${dep.amount_mad} MAD) -> Admin: ${mapping.admin_email} (role: ${mapping.admin_role})`);
      if (mapping.admin_role !== 'admin') {
        console.log(`   ⚠️  PROBLÈME: ${mapping.admin_email} n'a PAS le rôle 'admin' (role actuel: ${mapping.admin_role})`);
      }
    } else {
      console.log(`❌ Dépôt #${dep.id} -> AUCUN admin assigné (method_id: ${dep.method_id})`);
    }
  }

  // 5. Proposer des corrections
  console.log('\n5. Actions recommandées:\n');
  const usersNeedPromotion = mappings.filter(m => m.admin_role !== 'admin');
  if (usersNeedPromotion.length > 0) {
    console.log('Utilisateurs à promouvoir au rôle "admin":');
    for (const u of usersNeedPromotion) {
      console.log(`  - ${u.admin_email} (ID: ${u.admin_id}) - role actuel: ${u.admin_role}`);
    }
    console.log('\nCommande SQL pour promouvoir:');
    const ids = usersNeedPromotion.map(u => u.admin_id).join(',');
    console.log(`UPDATE users SET role = 'admin' WHERE id IN (${ids});`);
  } else {
    console.log('✅ Tous les admins ont le bon rôle');
  }

  await pool.end();
}

main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
