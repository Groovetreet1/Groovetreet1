import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function DepositPage() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [amount, setAmount] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [depositorRib, setDepositorRib] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        setDepositorName(parsed.fullName || "");
      } catch (_) {}
    }

    const fetchMethods = async () => {
      try {
        const res = await fetch(buildApiUrl("/api/deposit-methods"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Impossible de charger les méthodes de dépôt.");
        } else {
          setMethods(data || []);
          if (data && data.length > 0) {
            setSelectedMethodId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Erreur réseau lors du chargement des méthodes de dépôt.");
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, [navigate]);

  const selectedMethod = methods.find((m) => Number(m.id) === Number(selectedMethodId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const amountNumber = Number(amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (amountNumber < 80) {
      setError("Le montant minimum de dépôt est 80 MAD.");
      return;
    }
    if (!depositorName.trim()) {
      setError("Merci d’indiquer le nom du déposant.");
      return;
    }
    if (!depositorRib.trim()) {
      setError("Merci d’indiquer le RIB du déposant.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const formData = new FormData();
    formData.append("amount", amountNumber);
    formData.append("depositorName", depositorName);
    formData.append("depositorRib", depositorRib);
    if (selectedMethodId) formData.append("methodId", selectedMethodId);
    if (screenshot) formData.append("screenshot", screenshot);

    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl("/api/wallet/deposit-v2"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors de l'enregistrement du dépôt.");
      } else {
        setSuccessMessage(data.message || "Dépôt enregistré.");
        setAmount("");
        setDepositorRib("");
        setScreenshot(null);
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/app-icon.png" alt="Windelevery" className="h-8 w-8 rounded-xl object-cover" />
            <h1 className="text-xl font-semibold">Déposer des fonds</h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800"
          >
            ← Retour au dashboard
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">Chargement des méthodes de dépôt...</p>
        ) : (
          <>
            {error && (
              <div className="mb-4 text-sm rounded-lg bg-red-100 text-red-700 px-3 py-2">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 text-sm rounded-lg bg-emerald-100 text-emerald-700 px-3 py-2">
                {successMessage}
              </div>
            )}

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-4">
              <h2 className="text-sm font-semibold mb-3">Compte destinataire</h2>
              {methods.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Aucune méthode de dépôt définie pour le moment.
                </p>
              ) : (
                <>
                  <label className="text-xs text-slate-400">Méthode</label>
                  <select
                    value={selectedMethodId || ""}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="w-full mt-1 mb-3 px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
                  >
                    {methods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.bankName} — {m.recipientName}
                      </option>
                    ))}
                  </select>

                  {selectedMethod && (
                    <div className="text-sm space-y-1 text-slate-200">
                      <p>
                        <span className="text-slate-400">Banque :</span>{" "}
                        {selectedMethod.bankName}
                      </p>
                      <p>
                        <span className="text-slate-400">Destinataire :</span>{" "}
                        {selectedMethod.recipientName}
                      </p>
                      <p>
                        <span className="text-slate-400">Compte :</span>{" "}
                        {selectedMethod.accountNumber}
                      </p>
                      <p>
                        <span className="text-slate-400">RIB :</span>{" "}
                        {selectedMethod.rib}
                      </p>
                      <p>
                        <span className="text-slate-400">Motif :</span>{" "}
                        {selectedMethod.motif || "—"}
                      </p>
                      {selectedMethod.instructions && (
                        <p className="text-xs text-slate-400 mt-2">
                          {selectedMethod.instructions}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-4"
            >
              <div>
                <label className="block text-xs mb-1">Montant (MAD)</label>
                <input
                  type="number"
                  min="80"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: 100"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Minimum 80 MAD.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs mb-1">Nom du déposant</label>
                  <input
                    type="text"
                    value={depositorName}
                    onChange={(e) => setDepositorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ton nom complet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">RIB du déposant</label>
                  <input
                    type="text"
                    value={depositorRib}
                    onChange={(e) => setDepositorRib(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ton RIB / IBAN"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1">Capture d'écran du dépôt</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="text-[11px]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Formats image uniquement, taille max 5 Mo.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || methods.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Envoi..." : "Envoyer la demande de dépôt"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 rounded-lg text-sm border border-slate-600 hover:bg-slate-800"
                >
                  Annuler
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
