import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

function StatusBadge({ status }) {
  const s = (status || "").toUpperCase().trim();
  const isPending = s.startsWith("PEND");
  const isApproved = s === "APPROVED" || s === "CONFIRMED";
  const isRejected =
    s.includes("REJECT") ||
    s.includes("REJET") ||
    s.includes("DECLIN") ||
    s === "REFUSED";
  const cls = isPending
    ? "bg-yellow-600 text-yellow-100"
    : isApproved
    ? "bg-emerald-700 text-emerald-100"
    : isRejected
    ? "bg-red-700 text-red-100"
    : "bg-slate-700 text-slate-100";
  const labelMap = {
    PENDING: "En attente",
    CONFIRMED: "Approuvé",
    APPROVED: "Approuvé",
    REJECTED: "Rejeté",
  };
  const label = labelMap[s] || (isRejected ? "Rejeté" : s);
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
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
  const [copyNotification, setCopyNotification] = useState("");
  const [alertPopup, setAlertPopup] = useState({ show: false, message: "", type: "info" });
  const pageSize = 5;
  const navigate = useNavigate();

  // Fonction pour afficher une notification de copie
  const showCopyNotification = (message) => {
    setCopyNotification(message);
    setTimeout(() => {
      setCopyNotification("");
    }, 2000);
  };

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

    const fetchWithdrawals = async () => {
      setError("");
      setLoading(true);

      try {
        // Choose URL depending on whether superadmin requested all operations
        const stored = localStorage.getItem("user");
        let storedUser = null;
        try { storedUser = stored ? JSON.parse(stored) : null; } catch (_) { storedUser = null; }
        const wantAll = showAllOperations && storedUser && storedUser.role === 'superadmin';
        const url = wantAll
          ? buildApiUrl("/api/admin/withdrawals?all=1")
          : buildApiUrl("/api/admin/withdrawals?own=1");

        const res = await fetch(url, {
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

    // (optionnel) charger user depuis le localStorage (déjà mis par /api/user/me but keep fallback)
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {}
    }

    fetchWithdrawals();
    // re-run when showAllOperations toggles
  }, [navigate, showAllOperations]);

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
        setAlertPopup({ show: true, message: data.message || "Erreur lors de l'action.", type: "error" });
      } else {
        setAlertPopup({ show: true, message: data.message || "Action effectuée", type: "success" });
        // Update the withdrawal in the list (keep history) and show details
        if (data.withdrawal) {
          setWithdrawals((prev) =>
            prev.map((w) =>
              w.id === data.withdrawal.id ? { ...w, ...data.withdrawal } : w
            )
          );
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

  const totalPages = Math.max(
    1,
    Math.ceil((withdrawals?.length || 0) / pageSize)
  );
  const paginatedWithdrawals = withdrawals.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const downloadCsv = () => {
    if (!withdrawals || withdrawals.length === 0) {
      alert("Aucune opération à exporter.");
      return;
    }

    const headers = [
      "id",
      "reference",
      "userId",
      "userEmail",
      "fullName",
      "amountMad",
      "amountCents",
      "status",
      "type",
      "createdAt",
      "bankName",
      "iban",
      "holderName",
    ];

    const rows = withdrawals.map((w) => [
      w.id,
      w.reference || "",
      w.userId,
      w.userEmail || "",
      w.fullName || "",
      (w.amountCents / 100).toFixed(2),
      w.amountCents,
      w.status,
      w.type,
      w.createdAt,
      w.bankName || "",
      w.iban || "",
      w.holderName || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((r) =>
        r.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
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
            <img
              src="/app-icon.png"
              alt="Windelevery"
              className="h-8 w-8 rounded-xl object-cover"
            />
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
                const token = localStorage.getItem("token");
                const useAll = showAllOperations && user && user.role === 'superadmin';
                const query = useAll ? "kind=withdrawals&all=1" : "kind=withdrawals&own=1";
                fetch(buildApiUrl(`/api/admin/export?${query}`), {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `withdrawals-${new Date()
                      .toISOString()
                      .slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  })
                  .catch((e) => {
                    console.error(e);
                    alert("Erreur export CSV");
                  });
              }}
              className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                // export via server both types
                const token = localStorage.getItem("token");
                const useAll = showAllOperations && user && user.role === 'superadmin';
                const query = useAll ? "kind=all&all=1" : "kind=all&own=1";
                fetch(buildApiUrl(`/api/admin/export?${query}`), {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `operations-${new Date()
                      .toISOString()
                      .slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  })
                  .catch((e) => {
                    console.error(e);
                    alert("Erreur export CSV");
                  });
              }}
              className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              Export tout
            </button>
            <button
              onClick={() => setShowAllOperations((s) => !s)}
              className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              {showAllOperations
                ? "Cacher toutes les opérations"
                : "Afficher toutes les opérations"}
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
                      <th className="py-2 pr-2">Référence</th>
                      <th className="py-2 pr-2">Statut</th>
                      <th className="py-2 pr-2">Utilisateur ID</th>
                      <th className="py-2 pr-2">Montant</th>
                      <th className="py-2 pr-2">Montant Final (-10%)</th>
                      <th className="py-2 pr-2">Créé le</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWithdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-slate-800">
                        <td className="py-2 pr-2">#{w.id}</td>
                        <td className="py-2 pr-2 text-cyan-400 font-mono text-[11px]">
                          {w.reference || 'N/A'}
                        </td>
                        <td className="py-2 pr-2">
                          <StatusBadge status={w.status} />
                        </td>
                        <td className="py-2 pr-2">{w.userId}</td>
                        <td className="py-2 pr-2 text-amber-300">
                          {w.amountCents / 100} MAD
                        </td>
                        <td className="py-2 pr-2 text-emerald-300">
                          {(w.amountCents * 0.9) / 100} MAD
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
                              {actionLoadingId === w.id && "..."} Approuver
                            </button>
                            <button
                              onClick={() => handleAction(w.id, "reject")}
                              disabled={actionLoadingId === w.id}
                              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                              {actionLoadingId === w.id && "..."} Rejeter
                            </button>
                            <button
                              onClick={() => setSelectedWithdrawal(w)}
                              className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
                            >
                              Voir détails
                            </button>
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
                          className={`px-3 py-1 rounded-lg border ${p === page
                            ? "bg-indigo-600 border-indigo-500"
                            : "border-slate-700 hover:bg-slate-800"}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
                    disabled={page === totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
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
            <h3 className="text-sm font-semibold mb-3">
              Toutes les opérations
            </h3>
            {withdrawals.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune opération.</p>
            ) : (
              <div className="text-xs text-slate-300 space-y-3">
                {withdrawals.map((op) => (
                  <div
                    key={`op-${op.id}`}
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-800"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div>
                          <strong>#{op.id}</strong> — {op.type} —{" "}
                          <span className="text-slate-400">{op.status}</span>
                        </div>
                        {op.reference && (
                          <div className="text-[11px] text-cyan-400 font-mono">
                            Réf: {op.reference}
                          </div>
                        )}
                        <div className="text-[13px] text-slate-400">
                          Utilisateur: {op.userId}{" "}
                          {op.userEmail ? `(${op.userEmail})` : ""}{" "}
                          {op.fullName ? `- ${op.fullName}` : ""}
                        </div>
                      </div>
                      <div className="text-amber-300">
                        {op.amountCents / 100} MAD (Final:{" "}
                        {(op.amountCents * 0.9) / 100} MAD)
                      </div>
                    </div>
                    <div className="mt-2 text-[12px] text-slate-400">
                      Créé: {new Date(op.createdAt).toLocaleString()}
                    </div>
                    {(op.bankName || op.iban || op.holderName) && (
                      <div className="mt-2 text-[12px] text-slate-300">
                        <div>Banque: {op.bankName || "—"}</div>
                        <div>IBAN/RIB: {op.iban || "—"}</div>
                        <div>Titulaire: {op.holderName || "—"}</div>
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
            <h3 className="text-sm font-semibold mb-2">
              Détails de la transaction
            </h3>
            <div className="text-xs text-slate-300 grid gap-2">
              <div>
                <strong>ID:</strong> #{selectedWithdrawal.id}
              </div>
              {selectedWithdrawal.reference && (
                <div>
                  <strong>Référence:</strong>{" "}
                  <span className="font-mono text-cyan-400">
                    {selectedWithdrawal.reference}
                  </span>
                </div>
              )}
              <div>
                <strong>Utilisateur:</strong> {selectedWithdrawal.userId} —{" "}
                {selectedWithdrawal.userEmail || ""}{" "}
                {selectedWithdrawal.fullName
                  ? `(${selectedWithdrawal.fullName})`
                  : ""}
              </div>
              <div>
                <strong>Montant:</strong>{" "}
                {selectedWithdrawal.amountCents / 100} MAD
              </div>
              <div>
                <strong>Montant Final (-10%):</strong>{" "}
                {(selectedWithdrawal.amountCents * 0.9) / 100} MAD
              </div>
              <div>
                <strong>Statut:</strong> {selectedWithdrawal.status}
              </div>
              <div>
                <strong>Type:</strong> {selectedWithdrawal.type}
              </div>
              <div>
                <strong>Créé le:</strong>{" "}
                {new Date(selectedWithdrawal.createdAt).toLocaleString()}
              </div>
              {(selectedWithdrawal.bankName ||
                selectedWithdrawal.iban ||
                selectedWithdrawal.holderName) && (
                <div className="mt-2">
                  <div className="text-[11px] text-slate-400 mb-1">
                    Informations bancaires du client:
                  </div>
                  {selectedWithdrawal.holderName && (
                    <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/50 rounded px-2 py-1.5 mb-1">
                      <div>
                        <span className="text-slate-400">Titulaire:</span> {selectedWithdrawal.holderName}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedWithdrawal.holderName);
                          showCopyNotification("Nom du titulaire copié !");
                        }}
                        className="ml-2 p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Copier le nom"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 hover:text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {selectedWithdrawal.bankName && (
                    <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/50 rounded px-2 py-1.5 mb-1">
                      <div>
                        <span className="text-slate-400">Banque:</span> {selectedWithdrawal.bankName}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedWithdrawal.bankName);
                          showCopyNotification("Nom de la banque copié !");
                        }}
                        className="ml-2 p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Copier la banque"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 hover:text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {selectedWithdrawal.iban && (
                    <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/50 rounded px-2 py-1.5">
                      <div>
                        <span className="text-slate-400">IBAN/RIB:</span> <span className="font-mono">{selectedWithdrawal.iban}</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedWithdrawal.iban);
                          showCopyNotification("IBAN/RIB copié !");
                        }}
                        className="ml-2 p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Copier l'IBAN/RIB"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 hover:text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Popup de notification de copie */}
      {copyNotification && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg shadow-2xl border border-emerald-400/30 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{copyNotification}</span>
          </div>
        </div>
      )}

      {/* Popup d'alerte personnalisé (comme dans AdminDepositsPage) */}
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