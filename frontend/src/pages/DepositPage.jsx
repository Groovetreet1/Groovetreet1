import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";
import { useTranslation } from "../contexts/LanguageContext.jsx";

export default function DepositPage() {
  const { t, language } = useTranslation();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [amount, setAmount] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [depositorRib, setDepositorRib] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [timeLimitMessage, setTimeLimitMessage] = useState("");

  const navigate = useNavigate();

  const handleScreenshotChange = (file) => {
    setScreenshot(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setScreenshotPreview(null);
    }
  };

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
          setError(data.message || t.error);
        } else {
          setMethods(data || []);
          if (data && data.length > 0) {
            setSelectedMethodId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        setError(t.loginNetworkError);
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
      setError(t.invalidAmount);
      return;
    }
    if (amountNumber < 80) {
      setError(t.minAmountError);
      return;
    }
    if (!depositorName.trim()) {
      setError(t.depositorNameRequired);
      return;
    }
    if (!depositorRib.trim()) {
      setError(t.depositorRibRequired);
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
        // Vérifier si c'est une erreur de limite horaire
        if (data.timeLimitReached) {
          setTimeLimitMessage(data.message || t.depositNotAllowed);
          setShowTimeLimitModal(true);
        } else {
          setError(data.message || t.error);
        }
      } else {
        setAmount("");
        setDepositorRib("");
        setScreenshot(null);
        setScreenshotPreview(null);
        setShowSuccessPopup(true);
      }
    } catch (err) {
      console.error(err);
      setError(t.loginNetworkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white px-2 sm:px-4 py-3 sm:py-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-2">
            <img src="/app-icon.png" alt="Windelevery" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl object-cover" />
            <h1 className="text-lg sm:text-xl font-semibold">{t.depositTitle}</h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 w-full sm:w-auto"
          >
            {t.backToDashboard}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">{t.loading}</p>
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

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-sm font-semibold mb-3">{t.recipientAccount}</h2>
              {methods.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {t.noDepositMethods}
                </p>
              ) : (
                <>
                  <label className="text-xs text-slate-400">{t.method}</label>
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
                        <span className="text-slate-400">{t.bank} :</span>{" "}
                        {selectedMethod.bankName}
                      </p>
                      <p>
                        <span className="text-slate-400">{t.recipient} :</span>{" "}
                        {selectedMethod.recipientName}
                      </p>
                      <p>
                        <span className="text-slate-400">{t.account} :</span>{" "}
                        {selectedMethod.accountNumber}
                      </p>
                      <p>
                        <span className="text-slate-400">{t.rib} :</span>{" "}
                        {selectedMethod.rib}
                      </p>
                      <p>
                        <span className="text-slate-400">{t.reason} :</span>{" "}
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
              className="bg-slate-800/80 border border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4"
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

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
                <label className="block text-xs mb-2">Capture d'écran du dépôt</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleScreenshotChange(e.target.files?.[0] || null)}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-600 hover:border-emerald-500 bg-slate-800/50 cursor-pointer transition-all hover:bg-slate-800 group"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <span className="text-xs text-slate-300 group-hover:text-emerald-300 transition-colors">
                      {screenshot ? screenshot.name : "Cliquez pour choisir une image"}
                    </span>
                  </label>
                </div>
                {screenshotPreview && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-300 mb-2">Aperçu de l'image :</p>
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setShowImageModal(true)}
                        className="relative rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-800/50 cursor-pointer hover:border-emerald-500 transition-all group w-32 h-32"
                        title="Cliquer pour agrandir"
                      >
                        <img
                          src={screenshotPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-8 h-8 text-white"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 mb-1">{screenshot?.name}</p>
                        <p className="text-[11px] text-slate-400 mb-2">
                          Cliquez sur l'image pour l'agrandir
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshot(null);
                            setScreenshotPreview(null);
                            // Réinitialiser l'input file pour permettre de re-uploader le même fichier
                            const fileInput = document.getElementById('screenshot-upload');
                            if (fileInput) fileInput.value = '';
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-3 h-3"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

      {/* MODAL AGRANDISSEMENT IMAGE */}
      {showImageModal && screenshotPreview && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-30 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              title="Fermer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={screenshotPreview}
              alt="Aperçu complet"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* MODAL DE LIMITE HORAIRE */}
      {showTimeLimitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-orange-900 via-slate-900 to-slate-900 border-2 border-orange-500/50 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-orange-500/20 relative overflow-hidden">
            {/* Animation en arrière-plan */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
              <div className="absolute top-10 right-1/4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
              <div className="absolute top-5 left-3/4 w-1 h-1 bg-amber-400 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
            </div>

            {/* Icône d'horloge */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/50 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-orange-400/50 animate-ping"></div>
              </div>
            </div>

            {/* Titre et message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">⏰ Hors horaire</h3>
              <p className="text-lg text-orange-300 font-semibold mb-1">Dépôt non autorisé</p>
              <p className="text-sm text-slate-400">Merci de revenir pendant les heures permises</p>
            </div>

            {/* Horaires autorisés */}
            <div className="bg-slate-800/60 rounded-xl p-5 mb-6 border border-orange-500/30">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-slate-400 font-semibold">Horaires autorisés:</span>
                </div>
                <p className="text-emerald-300 font-bold text-lg text-center">10h00 - 19h30</p>
                <p className="text-slate-400 text-xs text-center mt-1">(Heure du serveur)</p>
              </div>
            </div>

            {/* Bouton de fermeture */}
            <button
              onClick={() => setShowTimeLimitModal(false)}
              className="w-full py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl text-white"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}

      {/* POPUP DE CONFIRMATION */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full text-center border border-emerald-700/50 shadow-2xl shadow-emerald-500/20">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8 text-emerald-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-emerald-400">
              Demande envoyée avec succès !
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Votre demande de dépôt a été enregistrée. Elle sera traitée par un administrateur dans les plus brefs délais.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Vous recevrez une notification dès que votre dépôt sera validé et que les fonds seront crédités sur votre compte.
            </p>
            <button
              onClick={() => {
                setShowSuccessPopup(false);
                navigate("/dashboard");
              }}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold"
            >
              Retour au dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
