import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeposits = async () => {
      setError("");
      setLoading(true);

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Token manquant, veuillez vous reconnecter.");
          navigate("/login");
          return;
        }

        const res = await fetch(buildApiUrl("/api/admin/deposits"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Erreur côté admin.");
          return;
        }

        setDeposits(data);
        setPage(1);
      } catch (err) {
        console.error(err);
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    };

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {}
    }

    fetchDeposits();
  }, [navigate]);

  const handleAction = async (id, action) => {
    setError("");
    setActionLoadingId(id);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(buildApiUrl(`/api/admin/deposits/${id}/${action}`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors de l'action.");
      } else {
        try {
          window.dispatchEvent(new CustomEvent("toast", { detail: { message: data.message || "Action effectuée", type: "success" } }));
        } catch (_) {
          // fallback
          alert(data.message || "Action effectuée");
        }
        if (data.deposit) {
          setDeposits((prev) => prev.map((d) => (d.id === data.deposit.id ? { ...d, ...data.deposit } : d)));
          setSelectedDeposit(data.deposit);
        } else {
          setDeposits((prev) => prev.filter((d) => d.id !== id));
        }
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil((deposits?.length || 0) / pageSize));
  const paginatedDeposits = deposits.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
              <div className="text-sm font-semibold tracking-tight">Admin – Dépôts</div>
              <div className="text-[11px] text-slate-400">Validation des dépôts en attente</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-300">{user.email}</span>
            <Link to="/dashboard" className="border border-slate-600 px-3 py-1 rounded-lg hover:bg-slate-800">Retour dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2">Dépôts en attente</h2>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => {
                const token = localStorage.getItem('token');
                fetch(buildApiUrl("/api/admin/export?kind=deposits"), { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `deposits-${new Date().toISOString().slice(0,10)}.csv`;
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
          </div>

          {error && (
            <div className="mb-3 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">{error}</div>
          )}

          {loading ? (
            <p className="text-xs text-slate-400">Chargement...</p>
          ) : deposits.length === 0 ? (
            <p className="text-xs text-slate-400">Aucun dépôt en attente pour le moment.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="py-2 pr-2">ID</th>
                      <th className="py-2 pr-2">Utilisateur</th>
                      <th className="py-2 pr-2">Montant</th>
                      <th className="py-2 pr-2">Créé le</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDeposits.map((d) => (
                      <tr key={d.id} className="border-b border-slate-800">
                        <td className="py-2 pr-2">#{d.id}</td>
                        <td className="py-2 pr-2"><StatusBadge status={d.status} /></td>
                        <td className="py-2 pr-2">{d.userId} {d.userEmail ? `(${d.userEmail})` : ''}</td>
                        <td className="py-2 pr-2">
                          <div className="text-emerald-300">+{d.amountCents / 100} MAD</div>
                          {d.depositorFullName && (
                            <div className="text-[11px] text-slate-400">{d.depositorFullName}</div>
                          )}
                        </td>
                        <td className="py-2 pr-2">{new Date(d.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-2">
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(d.id, 'approve')} disabled={actionLoadingId === d.id} className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">{actionLoadingId === d.id && '...' } Approuver</button>
                            <button onClick={() => handleAction(d.id, 'reject')} disabled={actionLoadingId === d.id} className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50">{actionLoadingId === d.id && '...' } Rejeter</button>
                            <button onClick={() => setSelectedDeposit(d)} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600">Voir détails</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {deposits.length > pageSize && (
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

        {selectedDeposit && (
          <section className="max-w-5xl mx-auto px-4 py-4 mt-4 bg-slate-800/80 border border-slate-700 rounded-2xl">
            <h3 className="text-sm font-semibold mb-2">Détails du dépôt</h3>
            <div className="text-xs text-slate-300 grid gap-2">
              <div><strong>ID:</strong> #{selectedDeposit.id}</div>
              <div><strong>Utilisateur:</strong> {selectedDeposit.userId} — {selectedDeposit.userEmail || ''}</div>
              <div><strong>Nom du déposant:</strong> {selectedDeposit.depositorFullName || selectedDeposit.depositorName || '—'}</div>
              <div><strong>RIB du déposant:</strong> {selectedDeposit.payerRib || selectedDeposit.depositorRib || '—'}</div>
              <div><strong>Montant:</strong> {selectedDeposit.amountCents / 100} MAD</div>
              <div><strong>Motif (compte destinataire):</strong> {selectedDeposit.methodMotif || '—'}</div>
              <div><strong>Statut:</strong> <StatusBadge status={selectedDeposit.status} /></div>
              <div><strong>Créé le:</strong> {new Date(selectedDeposit.createdAt).toLocaleString()}</div>
              {selectedDeposit.screenshotPath && (
                <div>
                  <strong>Capture:</strong>{" "}
                  <a
                    href={buildApiUrl(selectedDeposit.screenshotPath)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-300 underline"
                  >
                    Voir le reçu
                  </a>
                </div>
              )}
              { (selectedDeposit.bankName || selectedDeposit.iban || selectedDeposit.holderName) && (
                <div className="mt-2">
                  <div className="text-[11px] text-slate-400 mb-1">Informations bancaires du client:</div>
                  <div className="text-xs text-slate-300">Banque: {selectedDeposit.bankName || '—'}</div>
                  <div className="text-xs text-slate-300">IBAN/RIB: {selectedDeposit.iban || '—'}</div>
                  <div className="text-xs text-slate-300">Titulaire: {selectedDeposit.holderName || '—'}</div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
