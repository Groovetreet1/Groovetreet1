import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function WithdrawPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
    } catch (e) {
      console.error(e);
      navigate("/login");
      return;
    } finally {
      setLoadingUser(false);
    }
  }, [navigate]);

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleSelectAmount = (amount) => {
    setSelectedAmount(amount);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleConfirmWithdraw = async () => {
    if (!selectedAmount) {
      setErrorMsg("Choisis un montant de retrait.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("Session expirée, merci de te reconnecter.");
      setSubmitting(false);
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/wallet/withdraw"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: selectedAmount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Erreur lors de la demande de retrait.");
      } else {
        setSuccessMsg(
          data.message ||
            "Demande de retrait créée, en attente de validation admin."
        );
        // mettre à jour le solde local
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
      setErrorMsg("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">Chargement...</p>
      </div>
    );
  }

  const allowedAmounts = [20, 50, 100, 1000];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* HEADER simple */}
      <header className="w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold">
              P
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Promo App
              </div>
              <div className="text-[11px] text-slate-400">
                Demande de retrait
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Solde : {(user.balanceCents || 0) / 100} MAD
            </span>
            <button
              onClick={handleBack}
              className="text-[11px] px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              Retour au dashboard
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU */}
      <main className="flex-1 flex items-center">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-xl font-semibold mb-2">
            Choisis un montant de retrait
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Tu peux demander un retrait sur des montants fixes. La demande sera
            mise en attente et devra être validée par l&apos;admin.
          </p>

          {/* Messages */}
          {errorMsg && (
            <div className="mb-4 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 text-xs rounded-lg bg-emerald-100 text-emerald-700 px-3 py-2">
              {successMsg}
            </div>
          )}

          {/* Choix montants */}
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            {allowedAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleSelectAmount(amount)}
                className={`rounded-xl border px-3 py-4 text-sm flex flex-col items-center justify-center
                  ${
                    selectedAmount === amount
                      ? "border-indigo-500 bg-indigo-600/20"
                      : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                  }`}
              >
                <span className="text-lg font-semibold">{amount} MAD</span>
                <span className="mt-1 text-[11px] text-slate-400">
                  Retrait fixe
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Ton solde actuel :{" "}
            <span className="font-semibold text-emerald-300">
              {(user.balanceCents || 0) / 100} MAD
            </span>
            . Assure-toi d&apos;avoir au moins le montant demandé.
          </p>

          <button
            type="button"
            disabled={!selectedAmount || submitting}
            onClick={handleConfirmWithdraw}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold
              ${
                !selectedAmount || submitting
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 text-slate-900"
              }`}
          >
            {submitting
              ? "Envoi de la demande..."
              : selectedAmount
              ? `Confirmer le retrait de ${selectedAmount} MAD`
              : "Choisis un montant pour continuer"}
          </button>
        </div>
      </main>
    </div>
  );
}
