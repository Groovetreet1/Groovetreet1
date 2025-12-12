import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [depositMethods, setDepositMethods] = useState([]);
  const [managedAccounts, setManagedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedAdminForPromo, setSelectedAdminForPromo] = useState(null);
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoCount, setPromoCount] = useState(1);
  const [activeTab, setActiveTab] = useState('roles');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    navigate('/login');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const resUsers = await fetch(`${API_BASE_URL}/api/admin/all-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const users = await resUsers.json();
      setAllUsers(users || []);
      setAdmins(users.filter(u => u.role === 'admin' || u.role === 'superadmin') || []);

      const resMethods = await fetch(`${API_BASE_URL}/api/deposit-methods?all=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const methods = await resMethods.json();
      setDepositMethods(methods || []);

      const resManaged = await fetch(`${API_BASE_URL}/api/admin/managed-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const managed = await resManaged.json();
      setManagedAccounts(managed || []);

      await fetchPromoCodes();

    } catch (err) {
      setError('Erreur lors du chargement des données. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // We need a proper endpoint to get all users, especially admins.
    // Let's assume for now we will create one at `/api/admin/all-users`
    // For now, this component will be partially complete.
    fetchData();
  }, []);

  const handleAddMapping = async (e) => {
    e.preventDefault();
    if (!selectedAdmin || !selectedMethod) {
      setError('Veuillez sélectionner un admin et une méthode de dépôt.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/managed-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adminId: parseInt(selectedAdmin),
          accountId: parseInt(selectedMethod),
          accountType: 'deposit_method',
        })
      });
      if (!res.ok) throw new Error('Échec de l\'ajout');
      fetchData();
      setSelectedAdmin('');
      setSelectedMethod('');
    } catch (err) {
      setError('Échec de l\'ajout de la liaison. ' + (err.message || ''));
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette liaison ?')) return;
    try {
      const token = localStorage.getItem('token');
      
      // Trouver le compte associé à cette liaison
      const mapping = managedAccounts.find(acc => acc.id === id);
      const method = depositMethods.find(m => m.id === mapping?.accountId);
      
      // Supprimer la liaison
      const res = await fetch(`${API_BASE_URL}/api/admin/managed-accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Échec de la suppression');
      
      // Si le compte était désactivé, le réactiver automatiquement
      if (method && method.isActive === 0) {
        await fetch(`${API_BASE_URL}/api/admin/deposit-methods/${method.id}/toggle`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      fetchData();
    } catch (err) {
      setError('Échec de la suppression de la liaison. ' + (err.message || ''));
    }
  };

  const handleToggleMethodStatus = async (methodId, currentStatus) => {
    const action = currentStatus === 1 ? 'désactiver' : 'activer';
    if (!window.confirm(`Êtes-vous sûr de vouloir ${action} ce compte destinataire ?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/deposit-methods/${methodId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Échec de la modification');
      
      fetchData(); // Recharge tout pour mettre à jour l'affichage
    } catch (err) {
      setError('Échec de la modification du statut. ' + (err.message || ''));
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir changer le rôle de cet utilisateur en "${newRole}" ?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Échec de la modification');
      }
      
      fetchData();
      setError('');
    } catch (err) {
      setError('Échec de la modification du rôle: ' + (err.message || ''));
    }
  };

  const handleTogglePromoRole = async (adminId, enabled) => {
    const password = prompt(enabled ? 'Entrez le mot de passe du superadmin pour activer le rôle promo:' : 'Entrez le mot de passe du superadmin pour désactiver le rôle promo:');
    if (!password) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${adminId}/promo-role`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled, password })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Échec');
      }
      
      alert(enabled ? 'Rôle promo activé avec succès' : 'Rôle promo désactivé avec succès');
      fetchData();
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  const fetchPromoCodes = async () => {
    // Ne pas charger automatiquement tous les codes au démarrage
    // Les codes seront affichés uniquement après génération
  };

  const handleGeneratePromo = async () => {
    setPromoError('');
    setPromoLoading(true);
    try {
      const count = Math.min(Math.max(parseInt(promoCount, 10) || 1, 1), 20);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/promo-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ count })
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.message || 'Erreur génération code.');
      } else {
        const newCodes = Array.isArray(data.codes) ? data.codes.map((c, idx) => ({
          id: Date.now() + idx,
          code: c.code,
          amountCents: c.amountCents,
          createdAt: new Date().toISOString()
        })) : [];
        // Afficher seulement les codes générés maintenant, pas les anciens
        setPromoCodes(newCodes);
      }
    } catch (err) {
      console.error(err);
      setPromoError('Erreur réseau (génération code).');
    } finally {
      setPromoLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Chargement...</div>;

  const tabs = [
    { id: 'roles', label: 'Gestion des Rôles' },
    { id: 'promo', label: 'Codes Promo' },
    { id: 'mappings', label: 'Liaisons Admin-Comptes' },
    { id: 'accounts', label: 'Comptes Destinataires' }
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Déconnexion
        </button>
      </div>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      {/* Menu de navigation */}
      <div className="mb-6 bg-gray-800 rounded-lg">
        <nav className="flex space-x-1 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-6 font-semibold rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Section: Gestion des rôles utilisateurs */}
      {activeTab === 'roles' && (
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl mb-4">Gestion des Rôles Utilisateurs</h2>
        
        {/* Barre de recherche */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">Rechercher un utilisateur par email</label>
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => {
              const value = e.target.value;
              setSearchEmail(value);
              if (value.trim()) {
                const filtered = allUsers.filter(user => 
                  user.email.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredUsers(filtered);
              } else {
                setFilteredUsers([]);
              }
            }}
            placeholder="Tapez l'email de l'utilisateur..."
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Affichage des résultats */}
        {searchEmail && (
          <div className="overflow-x-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun utilisateur trouvé avec cet email</p>
            ) : (
              <table className="min-w-full bg-white">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Nom</th>
                    <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Rôle Actuel</th>
                    <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Changer le rôle</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {filteredUsers.map(user => (
                <tr key={user.id} className="border-b">
                  <td className="text-left py-3 px-4">{user.email}</td>
                  <td className="text-left py-3 px-4">{user.fullName}</td>
                  <td className="text-left py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="text-left py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleChangeUserRole(user.id, 'user')}
                        className={`font-bold py-2 px-4 rounded ${
                          user.role === 'user' 
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                            : 'bg-gray-500 hover:bg-gray-700 text-white'
                        }`}
                        disabled={user.role === 'user'}
                      >
                        User
                      </button>
                      <button
                        onClick={() => handleChangeUserRole(user.id, 'admin')}
                        className={`font-bold py-2 px-4 rounded ${
                          user.role === 'admin' 
                            ? 'bg-blue-300 text-blue-800 cursor-not-allowed' 
                            : 'bg-blue-500 hover:bg-blue-700 text-white'
                        }`}
                        disabled={user.role === 'admin'}
                      >
                        Admin
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            )}
          </div>
        )}
      </div>
      )}

      {/* Section: Génération des codes promo */}
      {activeTab === 'promo' && (
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl mb-4">Génération des Codes Promo</h2>
        <p className="text-sm text-gray-600 mb-4">Générer des codes promo (1.00 - 1.99 MAD) pour les partager aux utilisateurs.</p>
        
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-semibold">Nombre de codes:</label>
          <input
            type="number"
            min={1}
            max={20}
            value={promoCount}
            onChange={(e) => setPromoCount(e.target.value)}
            className="w-20 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleGeneratePromo}
            disabled={promoLoading}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded disabled:opacity-60"
          >
            {promoLoading ? 'Génération...' : 'Générer'}
          </button>
          <button
            onClick={fetchPromoCodes}
            disabled={promoLoading}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
          >
            Rafraîchir
          </button>
        </div>

        {promoError && <p className="text-red-500 text-sm mb-4">{promoError}</p>}

        <div className="overflow-x-auto">
          {promoCodes.length > 0 && (
            <table className="min-w-full bg-white">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Code</th>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Montant</th>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Date de création</th>
                  <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {promoCodes.slice(0, 20).map((c) => (
                  <tr key={c.id || c.code} className="border-b">
                    <td className="text-left py-3 px-4">
                      <span className="font-mono font-semibold">{c.code}</span>
                    </td>
                    <td className="text-left py-3 px-4">
                      {(c.amountCents / 100).toFixed(2)} MAD
                    </td>
                    <td className="text-left py-3 px-4">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="text-left py-3 px-4">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(c.code)
                            .then(() => alert('Code copié!'))
                            .catch(() => alert('Erreur de copie'));
                        }}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                      >
                        Copier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {/* Section: Liaisons Admin-Comptes */}
      {activeTab === 'mappings' && (
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl mb-4">Lier un Admin à un Compte Destinataire</h2>
        <form onSubmit={handleAddMapping}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="admin-select">
              Admin
            </label>
            <select
              id="admin-select"
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">-- Sélectionner Admin --</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>{admin.email} (ID: {admin.id})</option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="method-select">
              Méthode de Dépôt (Compte Destinataire)
            </label>
            <select
              id="method-select"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">-- Sélectionner Méthode --</option>
              {depositMethods.filter(m => m.isActive === 1).map(method => (
                <option key={method.id} value={method.id}>{method.recipientName} - {method.bankName} (ID: {method.id})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Ajouter Liaison
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Section: Gestion des Comptes Destinataires */}
      {activeTab === 'accounts' && (
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-xl mb-4">Gestion des Liaisons et Comptes Destinataires</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Admin</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Compte Destinataire</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Statut Compte</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {managedAccounts.map(acc => {
                const method = depositMethods.find(m => m.id === acc.accountId);
                return (
                  <tr key={acc.id} className="border-b">
                    <td className="text-left py-3 px-4">{acc.adminEmail}</td>
                    <td className="text-left py-3 px-4">
                      {method ? `${method.bankName} - ${method.recipientName}` : `ID: ${acc.accountId}`}
                    </td>
                    <td className="text-left py-3 px-4">
                      {method && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${method.isActive === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {method.isActive === 1 ? 'Actif' : 'Inactif'}
                        </span>
                      )}
                    </td>
                    <td className="text-left py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteMapping(acc.id)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs"
                        >
                          Supprimer
                        </button>
                        {method && (
                          <button
                            onClick={() => handleToggleMethodStatus(method.id, method.isActive)}
                            className={`${method.isActive === 1 ? 'bg-orange-500 hover:bg-orange-700' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-1 px-3 rounded text-xs`}
                          >
                            {method.isActive === 1 ? 'Désactiver' : 'Activer'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
