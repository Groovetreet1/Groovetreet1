import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function AdminFinancePage() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manualBalanceInput, setManualBalanceInput] = useState("");
  const [manualBalanceCents, setManualBalanceCents] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [showAllOperations, setShowAllOperations] = useState(false);
  const navigate = useNavigate();

  const formatMad = (cents) => `${(Number(cents || 0) / 100).toFixed(2)} MAD`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserAndData = async () => {
      try {
        const meRes = await fetch(buildApiUrl("/api/user/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        if (!meRes.ok || !meData?.user || (meData.user.role !== "admin" && meData.user.role !== "superadmin")) {
          navigate("/dashboard");
          return;
        }
        setUser(meData.user);

            const res = await fetch(buildApiUrl("/api/admin/finance-summary"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Erreur lors du chargement des données.");
        } else {
          setSummary(data);
        }
      } catch (err) {
        console.error(err);
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndData();
  }, [navigate]);

  if (!user) return null;

  const depositsToday = summary ? Number(summary.totalDepositsTodayCents || 0) : 0;
  const parsedWithdrawalsApproved = summary
    ? Number(summary.totalWithdrawalsApprovedTodayCents || 0)
    : 0;
  const parsedWithdrawalsAfterFee = summary
    ? Number(summary.withdrawalAfterFeeCents || 0)
    : 0;
  const netPositionCents =
    manualBalanceCents + depositsToday - parsedWithdrawalsAfterFee;

  const cards = summary
    ? [
        {
          title: "Solde manuel (saisi)",
          value: formatMad(manualBalanceCents),
          desc: "Montant que tu saisis et valides ci-dessous.",
        },
        {
          title: "Dépôts confirmés aujourd'hui",
          value: formatMad(depositsToday),
          desc: "Dépôts avec statut CONFIRMED/APPROVED pour aujourd'hui.",
        },
        {
          title: "Retraits approuvés du jour (brut)",
          value: formatMad(parsedWithdrawalsApproved),
          desc: "Somme des retraits APPROVED créés aujourd'hui.",
        },
        {
          title: "Retraits approuvés du jour (-10%)",
          value: formatMad(parsedWithdrawalsAfterFee),
          desc: "Commission 10% appliquée sur les retraits du jour.",
        },
        {
          title: "Position nette",
          value: formatMad(netPositionCents),
          desc: "Solde manuel + dépôts confirmés du jour - retraits approuvés du jour (après -10%).",
        },
      ]
    : [];

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("token");
      const useAll = showAllOperations && user && user.role === 'superadmin';
      const query = useAll ? 'all=1' : 'own=1';
      const res = await fetch(buildApiUrl(`/api/admin/finance-export?${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Erreur export finance.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Erreur réseau (export).");
    } finally {
      setExporting(false);
    }
  };

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
                Super Admin – Synthèse financière
              </div>
              <div className="text-[11px] text-slate-400">
                Solde ajusté, dépôts, retraits du jour (-10%)
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-xs text-slate-400">Chargement...</p>
        ) : !summary ? (
          <p className="text-xs text-slate-400">Aucune donnée disponible.</p>
        ) : (
          <>
            <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-xs text-slate-300 space-y-3">
              <h3 className="text-sm font-semibold">Saisir un solde manuel</h3>
              <p className="text-[11px] text-slate-400">
                Ce solde remplace le calcul automatique des balances
                utilisateurs pour la synthèse ci-dessous.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualBalanceInput}
                  onChange={(e) => setManualBalanceInput(e.target.value)}
                  placeholder="Montant en MAD"
                  className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm w-40"
                />
                <button
                  onClick={() => {
                    const val = parseFloat(manualBalanceInput);
                    if (Number.isNaN(val) || val < 0) {
                      setError("Montant manuel invalide.");
                      return;
                    }
                    setError("");
                    setManualBalanceCents(Math.round(val * 100));
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-semibold"
                >
                  Valider le solde
                </button>
                <span className="text-[11px] text-slate-400">
                  Solde appliqué : {formatMad(manualBalanceCents)}
                </span>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold disabled:opacity-60"
              >
                {exporting
                  ? "Export..."
                  : "Exporter les opérations du jour (.csv)"}
              </button>
            </div>

            {user && user.role === 'superadmin' && (
              <div className="ml-3">
                <label className="text-xs flex items-center gap-2">
                  <input type="checkbox" checked={showAllOperations} onChange={(e) => setShowAllOperations(e.target.checked)} />
                  <span className="text-slate-300">Voir toutes les opérations</span>
                </label>
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => {
                const isNet = c.title
                  .toLowerCase()
                  .includes("position nette");
                const cardClass = isNet
                  ? "bg-emerald-900/70 border border-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.25)]"
                  : "bg-slate-800/80 border border-slate-700";
                const valueClass = isNet
                  ? "text-2xl font-semibold mb-1 text-emerald-100"
                  : "text-xl font-semibold mb-1";
                const descClass = isNet
                  ? "text-[11px] text-emerald-100/80"
                  : "text-[11px] text-slate-400";
                const titleClass = isNet
                  ? "text-[11px] text-emerald-200 mb-1 uppercase tracking-wide"
                  : "text-[11px] text-slate-400 mb-1";
                return (
                  <div key={c.title} className={`${cardClass} rounded-2xl p-4`}>
                    <p className={titleClass}>{c.title}</p>
                    <p className={valueClass}>{c.value}</p>
                    <p className={descClass}>{c.desc}</p>
                  </div>
                );
              })}
            </section>

            <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-xs text-slate-300">
              <h3 className="text-sm font-semibold mb-2">Formule</h3>
              <p className="mb-1">Solde manuel = valeur saisie ci-dessus.</p>
              <p className="mb-1">
                Retraits approuvés du jour (brut) = somme des retraits APPROVED
                du jour.
              </p>
              <p className="mb-1">
                Retraits approuvés du jour après -10% = retraits du jour × 0.9
              </p>
              <p>
                Position nette = solde manuel + dépôts confirmés du jour - (retraits
                approuvés du jour × 0.9)
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
