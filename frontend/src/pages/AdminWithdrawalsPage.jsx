import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase().trim();
  const isPending = s.startsWith('PEND');
  const isApproved = s === 'APPROVED' || s === 'CONFIRMED';
  const isRejected = s.includes('REJECT') || s.includes('REJET') || s.includes('DECLIN') || s === 'REFUSED';
  const cls = isPending
    ? 'bg-yellow-600 text-yellow-100'
    : isApproved
    ? 'bg-emerald-700 text-emerald-100'
    : isRejected
    ? 'bg-red-700 text-red-100'
    : 'bg-slate-700 text-slate-100';
  const labelMap = {
    PENDING: 'En attente',
    CONFIRMED: 'Approuvé',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
  };
  const label = labelMap[s] || (isRejected ? 'Rejeté' : s);
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>
  );
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showAllOperations, setShowAllOperations] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const navigate = useNavigate();
  

  useEffect(() => {
    const fetchWithdrawals = async () => {
      setError("");
      setLoading(true);
  
      try {
        const token = localStorage.getItem("token");
  
        if (!token) {
          setError("Token manquant, veuillez vous reconnecter.");
          navigate("/login");
          return;
        }
  
        const res = await fetch(buildApiUrl("/api/admin/withdrawals"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await res.json();
        console.log("ADMIN withdrawals =>", res.status, data);
  
        if (!res.ok) {
          setError(data.message || "Erreur côté admin.");
          return;
        }
  
        setWithdrawals(data);
        setPage(1);
      } catch (err) {
        console.error(err);
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    };
  
    // (optionnel) charger user depuis le localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {}
    }
  
    fetchWithdrawals();
  }, [navigate]);
  
  

  
  const handleAction = async (id, action) => {
    setError("");
    setActionLoadingId(id);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        buildApiUrl(`/api/admin/withdrawals/${id}/${action}`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors de l'action.");
      } else {
        alert(data.message);
        // Update the withdrawal in the list (keep history) and show details
        if (data.withdrawal) {
          setWithdrawals((prev) => prev.map((w) => (w.id === data.withdrawal.id ? { ...w, ...data.withdrawal } : w)));
          setSelectedWithdrawal(data.withdrawal);
        } else {
          // fallback: remove from list if no detail returned
          setWithdrawals((prev) => prev.filter((w) => w.id !== id));
        }
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil((withdrawals?.length || 0) / pageSize));
  const paginatedWithdrawals = withdrawals.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const downloadCsv = () => {
    if (!withdrawals || withdrawals.length === 0) {
      alert('Aucune opération à exporter.');
      return;
    }

    const headers = [
      'id','userId','userEmail','fullName','amountMad','amountCents','status','type','createdAt','bankName','iban','holderName'
    ];

    const rows = withdrawals.map((w) => ([
      w.id,
      w.userId,
      w.userEmail || '',
      w.fullName || '',
      (w.amountCents / 100).toFixed(2),
      w.amountCents,
      w.status,
      w.type,
      w.createdAt,
      w.bankName || '',
      w.iban || '',
      w.holderName || ''
    ]));

    const csvContent = [headers, ...rows]
      .map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `withdrawals-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold">
              A
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Admin – Retraits
              </div>
              <div className="text-[11px] text-slate-400">
                Validation des demandes en attente
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-300">{user.email}</span>
            <Link
              to="/dashboard"
              className="border border-slate-600 px-3 py-1 rounded-lg hover:bg-slate-800"
            >
              Retour dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2">
              Retraits en attente de validation
          </h2>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  // Export CSV of current withdrawals
                  // prefer server-side export for full data
                  const token = localStorage.getItem('token');
                  fetch(buildApiUrl("/api/admin/export?kind=withdrawals"), { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.blob())
                    .then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `withdrawals-${new Date().toISOString().slice(0,10)}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    })
                    .catch(e => { console.error(e); alert('Erreur export CSV'); });
                }}
                className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  // export via server both types
                  const token = localStorage.getItem('token');
                  fetch(buildApiUrl("/api/admin/export?kind=all"), { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.blob())
                    .then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `operations-${new Date().toISOString().slice(0,10)}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    })
                    .catch(e => { console.error(e); alert('Erreur export CSV'); });
                }}
                className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
              >Export tout</button>
              <button
                onClick={() => setShowAllOperations((s) => !s)}
                className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                {showAllOperations ? 'Cacher toutes les opérations' : 'Afficher toutes les opérations'}
              </button>
            </div>

          {error && (
            <div className="mb-3 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-slate-400">Chargement...</p>
          ) : withdrawals.length === 0 ? (
            <p className="text-xs text-slate-400">
              Aucun retrait en attente pour le moment.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="py-2 pr-2">ID</th>
                      <th className="py-2 pr-2">Statut</th>
                      <th className="py-2 pr-2">Utilisateur ID</th>
                      <th className="py-2 pr-2">Montant</th>
                      <th className="py-2 pr-2">Créé le</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWithdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-slate-800">
                          <td className="py-2 pr-2">#{w.id}</td>
                          <td className="py-2 pr-2">
                            <StatusBadge status={w.status} />
                          </td>
                          <td className="py-2 pr-2">{w.userId}</td>
                          <td className="py-2 pr-2 text-amber-300">
                            {w.amountCents / 100} MAD
                          </td>
                          <td className="py-2 pr-2">
                            {new Date(w.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 pr-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(w.id, "approve")}
                              disabled={actionLoadingId === w.id}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {actionLoadingId === w.id && "..." } Approuver
                            </button>
                            <button
                              onClick={() => handleAction(w.id, "reject")}
                              disabled={actionLoadingId === w.id}
                              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                              {actionLoadingId === w.id && "..." } Rejeter
                            </button>
                            <button
                              onClick={() => setSelectedWithdrawal(w)}
                              className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
                            >Voir détails</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {withdrawals.length > pageSize && (
                <div className="flex items-center justify-between mt-3 text-xs text-slate-300">
                  <button
                    className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Précédent
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded-lg border ${p === page ? 'bg-indigo-600 border-indigo-500' : 'border-slate-700 hover:bg-slate-800'}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        {/* Toutes les opérations (liste complète) */}
        {showAllOperations && (
          <section className="mt-6 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-3">Toutes les opérations</h3>
            {withdrawals.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune opération.</p>
            ) : (
              <div className="text-xs text-slate-300 space-y-3">
                {withdrawals.map((op) => (
                  <div key={`op-${op.id}`} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <div><strong>#{op.id}</strong> — {op.type} — <span className="text-slate-400">{op.status}</span></div>
                        <div className="text-[13px] text-slate-400">Utilisateur: {op.userId} {op.userEmail ? `(${op.userEmail})` : ''} {op.fullName ? `- ${op.fullName}` : ''}</div>
                      </div>
                      <div className="text-amber-300">{op.amountCents / 100} MAD</div>
                    </div>
                    <div className="mt-2 text-[12px] text-slate-400">Créé: {new Date(op.createdAt).toLocaleString()}</div>
                    {(op.bankName || op.iban || op.holderName) && (
                      <div className="mt-2 text-[12px] text-slate-300">
                        <div>Banque: {op.bankName || '—'}</div>
                        <div>IBAN/RIB: {op.iban || '—'}</div>
                        <div>Titulaire: {op.holderName || '—'}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {selectedWithdrawal && (
          <section className="max-w-5xl mx-auto px-4 py-4 mt-4 bg-slate-800/80 border border-slate-700 rounded-2xl">
            <h3 className="text-sm font-semibold mb-2">Détails de la transaction</h3>
            <div className="text-xs text-slate-300 grid gap-2">
              <div><strong>ID:</strong> #{selectedWithdrawal.id}</div>
              <div><strong>Utilisateur:</strong> {selectedWithdrawal.userId} — {selectedWithdrawal.userEmail || ''} {selectedWithdrawal.fullName ? `(${selectedWithdrawal.fullName})` : ''}</div>
              <div><strong>Montant:</strong> {selectedWithdrawal.amountCents / 100} MAD</div>
              <div><strong>Statut:</strong> {selectedWithdrawal.status}</div>
              <div><strong>Type:</strong> {selectedWithdrawal.type}</div>
              <div><strong>Créé le:</strong> {new Date(selectedWithdrawal.createdAt).toLocaleString()}</div>
              { (selectedWithdrawal.bankName || selectedWithdrawal.iban || selectedWithdrawal.holderName) && (
                <div className="mt-2">
                  <div className="text-[11px] text-slate-400 mb-1">Informations bancaires du client:</div>
                  <div className="text-xs text-slate-300">Banque: {selectedWithdrawal.bankName || '—'}</div>
                  <div className="text-xs text-slate-300">IBAN/RIB: {selectedWithdrawal.iban || '—'}</div>
                  <div className="text-xs text-slate-300">Titulaire: {selectedWithdrawal.holderName || '—'}</div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
