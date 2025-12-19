import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [user, setUser] = useState(null);
  const [showAllOperations, setShowAllOperations] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState("");
  const [imageZoom, setImageZoom] = useState(1);
  const [alertPopup, setAlertPopup] = useState({ show: false, message: "", type: "info" });

  const navigate = useNavigate();

  useEffect(() => {
    // Guard: ensure current user is admin
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(buildApiUrl("/api/user/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user || (data.user.role !== "admin" && data.user.role !== "superadmin")) {
          navigate("/dashboard");
          return;
        }
        setUser(data.user);
      })
      .catch(() => navigate("/login"));

    const fetchDeposits = async () => {
      setError("");
      setLoading(true);

      try {
        const stored = localStorage.getItem("user");
        let storedUser = null;
        try { storedUser = stored ? JSON.parse(stored) : null; } catch (_) { storedUser = null; }
        const wantAll = showAllOperations && storedUser && storedUser.role === 'superadmin';
        const url = wantAll
          ? buildApiUrl("/api/admin/deposits?all=1")
          : buildApiUrl("/api/admin/deposits?own=1");

        const res = await fetch(url, {
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
  }, [navigate, showAllOperations]);

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
        setAlertPopup({ show: true, message: data.message || "Erreur lors de l'action.", type: "error" });
      } else {
        setAlertPopup({ show: true, message: data.message || "Action effectuée", type: "success" });
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
        <div className="max-w-5xl mx-auto px-2 sm:px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt="Windelevery"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl object-cover"
            />
            <div>
              <div className="text-sm font-semibold tracking-tight">Admin – Dépôts</div>
              <div className="text-[11px] text-slate-400 hidden sm:block">Validation des dépôts en attente</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xs w-full sm:w-auto">
            <span className="text-slate-300 hidden sm:inline">{user.email}</span>
            <Link to="/dashboard" className="border border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-800 w-full sm:w-auto text-center">Retour dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <section className="bg-slate-800/80 border border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <h2 className="text-sm font-semibold mb-2">Dépôts en attente</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
            <button
              onClick={() => {
                const token = localStorage.getItem('token');
                const useAll = showAllOperations && user && user.role === 'superadmin';
                const query = useAll ? "kind=deposits&all=1" : "kind=deposits&own=1";
                fetch(buildApiUrl(`/api/admin/export?${query}`), { headers: { Authorization: `Bearer ${token}` } })
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
                  .catch(e => { console.error(e); setAlertPopup({ show: true, message: 'Erreur export CSV', type: 'error' }); });
              }}
              className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowAllOperations(s => !s)}
              className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              {showAllOperations ? 'Cacher toutes les opérations' : 'Afficher toutes les opérations'}
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
                <div className="flex items-center gap-3">
                  <strong>Capture:</strong>
                  <button
                    onClick={() => {
                      setCurrentImage(buildApiUrl(selectedDeposit.screenshotPath));
                      setShowImageModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/50 hover:from-indigo-600/30 hover:to-purple-600/30 hover:border-indigo-400 transition-all text-xs font-semibold text-indigo-300 flex items-center gap-2 group shadow-lg shadow-indigo-500/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Voir le reçu
                  </button>
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

      {/* Modal pour afficher l'image */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => {
            setShowImageModal(false);
            setImageZoom(1);
          }}
        >
          <div className="relative w-full max-w-3xl animate-fadeIn">
            {/* Contrôles en haut */}
            <div className="absolute -top-14 left-0 right-0 flex items-center justify-between">
              {/* Boutons de zoom */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageZoom((z) => Math.max(0.5, z - 0.25));
                  }}
                  className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white transition-all shadow-lg"
                  title="Zoom arrière"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                  </svg>
                </button>
                <span className="px-3 py-1 bg-slate-800/90 border border-slate-600 rounded-lg text-white text-sm font-semibold min-w-[80px] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageZoom((z) => Math.min(3, z + 0.25));
                  }}
                  className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white transition-all shadow-lg"
                  title="Zoom avant"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageZoom(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500 text-white text-sm font-semibold transition-all shadow-lg"
                >
                  Réinitialiser
                </button>
              </div>

              {/* Bouton fermer */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImageModal(false);
                  setImageZoom(1);
                }}
                className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 border border-red-500 text-white transition-all shadow-lg"
                title="Fermer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Container de l'image avec scroll */}
            <div 
              className="bg-slate-900/95 rounded-2xl border-2 border-indigo-500/30 shadow-2xl shadow-indigo-500/20 overflow-auto max-h-[70vh]"
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                  setImageZoom((z) => Math.min(3, z + 0.1));
                } else {
                  setImageZoom((z) => Math.max(0.5, z - 0.1));
                }
              }}
            >
              <div className="flex items-center justify-center min-h-[300px] p-3">
                <img
                  src={currentImage}
                  alt="Capture du reçu"
                  style={{ transform: `scale(${imageZoom})`, transition: 'transform 0.2s ease' }}
                  className="max-w-full object-contain cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageZoom((z) => (z < 2 ? z + 0.5 : 1));
                  }}
                />
              </div>
            </div>

            {/* Indication */}
            <div className="absolute -bottom-12 left-0 right-0 text-center text-slate-400 text-xs">
              Utilisez la molette ou les boutons pour zoomer • Cliquez sur l'image pour zoomer
            </div>
          </div>
        </div>
      )}

      {/* Popup d'alerte personnalisé */}
      {alertPopup.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            style={{
              borderColor: alertPopup.type === 'error' ? 'rgb(239 68 68 / 0.5)' : alertPopup.type === 'success' ? 'rgb(16 185 129 / 0.5)' : 'rgb(99 102 241 / 0.5)'
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-3"
              style={{
                background: alertPopup.type === 'error' 
                  ? 'linear-gradient(to right, rgb(239 68 68 / 0.2), rgb(220 38 38 / 0.2))'
                  : alertPopup.type === 'success'
                  ? 'linear-gradient(to right, rgb(16 185 129 / 0.2), rgb(5 150 105 / 0.2))'
                  : 'linear-gradient(to right, rgb(99 102 241 / 0.2), rgb(139 92 246 / 0.2))'
              }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: alertPopup.type === 'error'
                    ? 'rgb(239 68 68 / 0.2)'
                    : alertPopup.type === 'success'
                    ? 'rgb(16 185 129 / 0.2)'
                    : 'rgb(99 102 241 / 0.2)',
                  border: alertPopup.type === 'error'
                    ? '2px solid rgb(239 68 68 / 0.4)'
                    : alertPopup.type === 'success'
                    ? '2px solid rgb(16 185 129 / 0.4)'
                    : '2px solid rgb(99 102 241 / 0.4)'
                }}
              >
                {alertPopup.type === 'error' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-red-400">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                ) : alertPopup.type === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-emerald-400">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-indigo-400">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold"
                  style={{
                    color: alertPopup.type === 'error' ? 'rgb(248 113 113)' : alertPopup.type === 'success' ? 'rgb(52 211 153)' : 'rgb(129 140 248)'
                  }}
                >
                  {alertPopup.type === 'error' ? 'Erreur' : alertPopup.type === 'success' ? 'Succès' : 'Information'}
                </h3>
              </div>
            </div>

            {/* Message */}
            <div className="px-6 py-5">
              <p className="text-slate-200 leading-relaxed">
                {alertPopup.message}
              </p>
            </div>

            {/* Bouton OK */}
            <div className="px-6 py-4 bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setAlertPopup({ show: false, message: "", type: "info" })}
                className="px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg"
                style={{
                  background: alertPopup.type === 'error'
                    ? 'linear-gradient(to right, rgb(239 68 68), rgb(220 38 38))'
                    : alertPopup.type === 'success'
                    ? 'linear-gradient(to right, rgb(16 185 129), rgb(5 150 105))'
                    : 'linear-gradient(to right, rgb(99 102 241), rgb(139 92 246))',
                  color: 'white'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
