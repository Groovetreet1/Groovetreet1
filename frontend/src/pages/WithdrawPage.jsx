import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";
import { useTranslation } from "../contexts/LanguageContext.jsx";

export default function WithdrawPage() {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [alertPopup, setAlertPopup] = useState({ show: false, message: "", type: "error" });

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
        setErrorMsg(t.selectAmountError);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg(t.sessionExpired);
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
        if (data.timeLimitReached) {
          setAlertPopup({
            show: true,
            message: data.message || "Opération non autorisée en dehors des heures permises.",
            type: "timeLimit",
            operation: data.operation || "withdrawal"
          });
        } else {
          setAlertPopup({
            show: true,
            message: data.message || "Erreur lors de la demande de retrait.",
            type: "error"
          });
        }
      } else {
        setAlertPopup({
          show: true,
          message: data.message || "Demande de retrait créée, en attente de validation admin.",
          type: "success"
        });
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
      setAlertPopup({ show: true, message: t.loginNetworkError, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">{t.loading}</p>
      </div>
    );
  }

  const allowedAmounts = [20, 50, 100, 1000];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* HEADER simple */}
      <header className="w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt="Windelevery"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl object-cover"
            />
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Windelevery
              </div>
              <div className="text-[11px] text-slate-400">
                {t.withdrawSubtitle}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {t.yourBalance} {(user.balanceCents || 0) / 100} MAD
            </span>
            <button
              onClick={handleBack}
              className="text-[11px] px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 w-full sm:w-auto"
            >
              {t.backToDashboard}
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU */}
      <main className="flex-1 flex items-center">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-10">
          <h1 className="text-lg sm:text-xl font-semibold mb-2">
            {t.selectAmount}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mb-4 sm:mb-6">
            {t.selectAmountHint}
          </p>

          {/* Messages - maintenant gérés par le popup */}

          {/* Choix montants */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6">
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
                <span className="mt-[11px] text-[11px] text-slate-400">
                  {t.withdraw}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-400 mb-4">
            {t.yourBalance}{" "}
            <span className="font-semibold text-emerald-300">
              {(user.balanceCents || 0) / 100} MAD
            </span>
            . {t.confirmBalance}
          </p>

          <button
            type="button"
            disabled={!selectedAmount || submitting}
            onClick={() => setShowConfirmPopup(true)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold
              ${
                !selectedAmount || submitting
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 text-slate-900"
              }`}
          >
            {submitting
              ? t.sendingRequest
              : selectedAmount
              ? `${t.confirmWithdraw} ${selectedAmount} MAD`
              : t.selectAmountFirst}
          </button>
        </div>
      </main>

      {/* Popup d'alerte personnalisé */}
      {alertPopup.show && alertPopup.type === "timeLimit" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-orange-900 via-slate-900 to-slate-900 border-2 border-orange-500/50 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-orange-500/20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
              <div className="absolute top-10 right-1/4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
            </div>

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

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">⏰ خارج الوقت</h3>
              <p className="text-lg text-orange-300 font-semibold mb-1">السحب ممنوع دابا</p>
              <p className="text-sm text-slate-400">رجع في الوقت المسموح</p>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-5 mb-6 border border-orange-500/30">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-slate-400 font-semibold">{t.allowedHours}</span>
                </div>
                <p className="text-emerald-300 font-bold text-lg text-center">10h00 - 19h30</p>
                <p className="text-slate-400 text-xs text-center mt-1">{t.serverTime}</p>
              </div>
            </div>

            <button
              onClick={() => setAlertPopup({ show: false, message: "", type: "error" })}
              className="w-full py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl text-white"
            >
              {t.understood}
            </button>
          </div>
        </div>
      )}

      {alertPopup.show && alertPopup.type !== "timeLimit" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className={`bg-gradient-to-br ${
            alertPopup.type === "error"
              ? "from-red-900/90 via-red-800/90 to-red-900/90 border-red-500/50"
              : "from-emerald-900/90 via-emerald-800/90 to-emerald-900/90 border-emerald-500/50"
          } backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full border shadow-2xl`}>
            <div className="flex flex-col items-center text-center">
              {alertPopup.type === "error" ? (
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border-2 border-red-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-red-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border-2 border-emerald-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-emerald-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <p className="text-sm sm:text-base text-white font-medium mb-6 leading-relaxed">
                {alertPopup.message}
              </p>
              <button
                onClick={() => setAlertPopup({ show: false, message: "", type: "error" })}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  alertPopup.type === "error"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                } shadow-lg`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full text-center border border-slate-700/50 shadow-2xl shadow-amber-500/20">
            <h3 className="text-lg font-semibold mb-2">
              {t.confirmWithdrawTitle}
            </h3>
            <p className="text-sm text-slate-300 mb-1">
              {t.commissionNote}
            </p>
            <p className="text-sm text-slate-300 mb-4">
              {t.finalAmount}{" "}
              <span className="font-semibold text-emerald-300">
                {(selectedAmount * 0.9).toFixed(2)} MAD
              </span>
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowConfirmPopup(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  setShowConfirmPopup(false);
                  handleConfirmWithdraw();
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-semibold"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
