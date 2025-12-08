import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function WithdrawPage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loadingAmount, setLoadingAmount] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
  }, [navigate]);

  const handleWithdraw = async (amount) => {
    setError("");
    setLoadingAmount(amount);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:4000/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors du retrait.");
      } else {
        alert(data.message);
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            balanceCents: data.new_balance_cents,
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau.");
    } finally {
      setLoadingAmount(null);
    }
  };

  if (!user) return null;

  const options = [100, 150, 500, 1000];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold">
              P
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Retrait
              </div>
              <div className="text-[11px] text-slate-400">
                Choisis un montant fixe
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Solde : {(user.balanceCents || 0) / 100} MAD
            </span>
            <Link
              to="/"
              className="border border-slate-600 px-3 py-1 rounded-lg hover:bg-slate-800"
            >
              Retour au dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-semibold mb-2">
            Montants de retrait disponibles
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Choisis un montant fixe. Le solde doit être suffisant pour valider
            la demande.
          </p>

          {error && (
            <div className="mb-3 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {options.map((amount) => (
              <button
                key={amount}
                onClick={() => handleWithdraw(amount)}
                disabled={loadingAmount === amount}
                className="py-3 rounded-xl bg-slate-900 border border-slate-600 hover:bg-slate-700 text-sm font-semibold disabled:opacity-50"
              >
                {loadingAmount === amount ? "..." : `${amount} MAD`}
              </button>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-slate-500">
          (Ici tu pourras plus tard demander le moyen de paiement : virement,
          carte, etc.)
        </p>
      </main>
    </div>
  );
}
