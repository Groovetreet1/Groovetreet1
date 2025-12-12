const axios = require('axios');

const API_BASE = 'http://localhost:4000';

async function request(method, endpoint, data = null, token = null) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  
  try {
    const res = await axios({ method, url: `${API_BASE}${endpoint}`, data, headers });
    return { ok: true, status: res.status, body: res.data };
  } catch (err) {
    return { ok: false, status: err.response?.status, body: err.response?.data };
  }
}

async function main() {
  console.log('\n=== Configuration des Mappings Admin -> Comptes ===\n');

  // Login superadmin
  console.log('1. Login superadmin...');
  const login = await request('POST', '/api/auth/login', {
    email: 'admin@promo.ma',
    password: 'Admin123!'
  });
  
  if (!login.ok) {
    console.error('❌ Login failed');
    return;
  }
  const token = login.body.token;
  console.log('✅ Logged in\n');

  // Get all users with admin role
  console.log('2. Liste des admins disponibles:');
  const users = await request('GET', '/api/admin/all-users', null, token);
  const admins = users.body.filter(u => u.role === 'admin' || u.role === 'superadmin');
  
  admins.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.email} (ID: ${a.id}) - ${a.fullName}`);
  });

  // Get deposit methods
  console.log('\n3. Liste des comptes destinataires:');
  const methods = await request('GET', '/api/deposit-methods', null, token);
  
  methods.body.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.bankName} - ${m.recipientName} (ID: ${m.id})`);
  });

  // Example: Assign first method to first admin
  console.log('\n4. Création du mapping...');
  
  if (admins.length === 0) {
    console.error('❌ Aucun admin trouvé!');
    return;
  }
  
  if (methods.body.length === 0) {
    console.error('❌ Aucun compte destinataire trouvé!');
    return;
  }

  // Choisir l'admin abdellah@google.com (ID: 100005)
  const selectedAdmin = admins.find(a => a.email === 'abdellah@google.com');
  const selectedMethod = methods.body[0];

  if (!selectedAdmin) {
    console.error('❌ Admin abdellah@google.com non trouvé');
    console.log('   Admins disponibles:', admins.map(a => a.email));
    return;
  }

  console.log(`\n   Assigner: ${selectedAdmin.email} -> Compte ${selectedMethod.bankName} (${selectedMethod.recipientName})`);
  
  const create = await request('POST', '/api/admin/managed-accounts', {
    adminId: selectedAdmin.id,
    accountType: 'deposit_method',
    accountId: selectedMethod.id
  }, token);

  if (create.ok) {
    console.log('   ✅ Mapping créé avec succès!');
  } else {
    console.error('   ❌ Erreur:', create.body);
  }

  // Verify
  console.log('\n5. Vérification des mappings:');
  const mappings = await request('GET', '/api/admin/managed-accounts', null, token);
  
  if (mappings.ok && mappings.body) {
    console.table(mappings.body.map(m => ({
      ID: m.id,
      Admin: m.adminEmail,
      Compte: `${m.accountType} #${m.accountId}`
    })));
  }

  console.log('\n✅ Configuration terminée!\n');
  console.log('Maintenant, connectez-vous avec abdellah@google.com et vous verrez les dépôts!\n');
}

main().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
