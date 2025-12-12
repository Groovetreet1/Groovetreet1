const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'NouveauMotDePasseSolide',
    database: 'promo_app'
  });

  console.log('Checking for duplicates...');
  const [rows] = await pool.execute(
    `SELECT account_type, account_id, COUNT(*) as cnt 
     FROM admin_managed_accounts 
     GROUP BY account_type, account_id 
     HAVING cnt > 1`
  );
  
  console.log('Duplicates found:', rows.length);
  
  if (rows.length > 0) {
    for (const row of rows) {
      console.log(`\nCleaning ${row.account_type}-${row.account_id}...`);
      
      const [all] = await pool.execute(
        `SELECT id, admin_id, created_at 
         FROM admin_managed_accounts 
         WHERE account_type=? AND account_id=? 
         ORDER BY created_at DESC`,
        [row.account_type, row.account_id]
      );
      
      console.log('  Found', all.length, 'mappings');
      const keepId = all[0].id;
      const deleteIds = all.slice(1).map(r => r.id);
      
      console.log('  Keeping ID', keepId, '(most recent)');
      console.log('  Deleting IDs', deleteIds);
      
      for (const id of deleteIds) {
        await pool.execute('DELETE FROM admin_managed_accounts WHERE id=?', [id]);
      }
      
      console.log('  ✅ Cleaned');
    }
  } else {
    console.log('No duplicates found');
  }
  
  // Now add the UNIQUE constraint
  console.log('\n Adding UNIQUE constraint...');
  try {
    await pool.execute(
      `ALTER TABLE admin_managed_accounts 
       ADD UNIQUE KEY unique_account (account_type, account_id)`
    );
    console.log('✅ UNIQUE constraint added');
  } catch (err) {
    console.log('⚠️', err.message);
  }
  
  await pool.end();
  console.log('\n✅ Migration completed');
})();
