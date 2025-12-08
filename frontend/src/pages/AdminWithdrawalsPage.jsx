import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function AdminWithdrawalsPage() {
  const [user, setUser] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "admin") {
      alert("Accès réservé à l'administrateur.");
      navigate("/");
      return;
    }

    setUser(parsedUser);

    const fetchPending = async () => {
      try {
        const res = await fetch(
          "http://localhost:4000/api/admin/withdrawals?status=PENDING",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Erreur lors du chargement.");
        } else {
          setWithdrawals(data);
        }
      } catch (err) {
        console.error(err);
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, [navigate]);

  const handleAction = async (id, action) => {
    setError("");
    setActionLoadingId(id);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `http://localhost:4000/api/admin/withdrawals/${id}/${action}`,
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
        setWithdrawals((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau.");
    } finally {
      setActionLoadingId(null);
    }
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
              to="/"
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="py-2 pr-2">ID</th>
                    <th className="py-2 pr-2">Utilisateur ID</th>
                    <th className="py-2 pr-2">Montant</th>
                    <th className="py-2 pr-2">Créé le</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b border-slate-800">
                      <td className="py-2 pr-2">#{w.id}</td>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
