import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchReferrals = async () => {
      try {
        const res = await fetch(buildApiUrl("/api/user/referrals"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.message || "Erreur lors du chargement du parrainage.");
        } else {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, [navigate]);

  const copyCode = () => {
    if (!data?.inviteCode) return;
    navigator.clipboard.writeText(data.inviteCode).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold tracking-tight">Parrainage</div>
            <div className="text-[11px] text-slate-400">Ton code d'invitation et tes gains</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-xs px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              Retour au dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">{error}</div>
        )}

        {loading ? (
          <p className="text-xs text-slate-400">Chargement...</p>
        ) : (
          <>
            <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold">Ton code d'invitation</h2>
                  <p className="text-[12px] text-slate-400">
                    Partage ce code, tu gagnes 10% des dépôts confirmés de tes filleuls.
                  </p>
                </div>
                <button
                  onClick={copyCode}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
                >
                  Copier
                </button>
              </div>
              <div className="text-2xl font-bold text-indigo-300 tracking-[0.15em]">
                {data?.inviteCode || "—"}
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                <div className="text-sm text-slate-400">Inscriptions via ton code</div>
                <div className="text-3xl font-bold text-white mt-1">{data?.invitedCount ?? 0}</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                <div className="text-sm text-slate-400">Gains de parrainage</div>
                <div className="text-3xl font-bold text-emerald-300 mt-1">
                  {(data?.totalBonusCents ?? 0) / 100} MAD
                </div>
              </div>
            </section>

            <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Liste des filleuls</h3>
                <span className="text-[11px] text-slate-400">{data?.invited?.length || 0} inscrit(s)</span>
              </div>
              {data?.invited?.length === 0 ? (
                <p className="text-xs text-slate-400">Personne n'a encore utilisé ton code.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700">
                        <th className="py-2 pr-2">Utilisateur</th>
                        <th className="py-2 pr-2">Email</th>
                        <th className="py-2 pr-2">Inscription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invited.map((u) => (
                        <tr key={u.userId} className="border-b border-slate-800">
                          <td className="py-2 pr-2">{u.fullName || `ID ${u.userId}`}</td>
                          <td className="py-2 pr-2">{u.email || "—"}</td>
                          <td className="py-2 pr-2">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
