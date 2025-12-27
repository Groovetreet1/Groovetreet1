import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";
import { useTranslation } from "../contexts/LanguageContext.jsx";

export default function ForgotPasswordPage() {
  const { t, language } = useTranslation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const sendResetRequest = async (phoneValue) => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(buildApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(phoneValue ? { email, phone: phoneValue } : { email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t.forgotPasswordError);
      } else {
        const successText = data.whatsappSent
          ? t.forgotPasswordWhatsappSuccess
          : data.whatsappAttempted
            ? t.forgotPasswordWhatsappFailed
            : data.message || t.forgotPasswordSuccess;
        setMessage(successText);
        setEmail("");
      }
    } catch (err) {
      console.error(err);
      setError(t.loginNetworkError);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPhoneError("");
    setShowPhoneModal(true);
  };

  const handleSendWithPhone = async () => {
    const cleaned = phone.replace(/\s+/g, "");
    if (!/^[67]\d{8}$/.test(cleaned)) {
      setPhoneError(t.phoneInvalid);
      return;
    }
    setShowPhoneModal(false);
    setPhone("");
    await sendResetRequest(`+212${cleaned}`);
  };

  const handleSendWithoutPhone = async () => {
    setShowPhoneModal(false);
    setPhone("");
    await sendResetRequest(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* ANIMATED BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-0 -right-20 w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-[600px] h-[600px] bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-3000"></div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-pink-900/30 animate-gradient"></div>
        
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent animate-line-horizontal shadow-lg shadow-indigo-500/50"></div>
          <div className="absolute top-2/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400/60 to-transparent animate-line-horizontal animation-delay-2000 shadow-lg shadow-purple-500/50"></div>
          <div className="absolute top-3/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400/60 to-transparent animate-line-horizontal animation-delay-4000 shadow-lg shadow-pink-500/50"></div>
        </div>
        
        <div className="absolute top-10 left-10 w-4 h-4 bg-indigo-400 rounded-full animate-float opacity-80 shadow-lg shadow-indigo-500/50"></div>
        <div className="absolute top-20 right-20 w-5 h-5 bg-purple-400 rounded-full animate-float animation-delay-1000 opacity-70 shadow-lg shadow-purple-500/50"></div>
        <div className="absolute bottom-32 left-1/4 w-4 h-4 bg-pink-400 rounded-full animate-float animation-delay-2000 opacity-80 shadow-lg shadow-pink-500/50"></div>
        <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-cyan-400 rounded-full animate-float animation-delay-3000 opacity-60 shadow-lg shadow-cyan-500/50"></div>
        
        <div className="absolute top-16 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-80"></div>
        <div className="absolute top-32 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse animation-delay-1000 opacity-70"></div>
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse animation-delay-2000 opacity-90"></div>
        <div className="absolute top-2/3 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse animation-delay-3000 opacity-75"></div>
      </div>

      <div className="w-4/5 h-3/4 bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl shadow-indigo-500/20 border border-white/20 p-8 sm:p-6 relative z-10 overflow-y-auto">
        {/* Bouton retour */}
        <Link
          to="/login"
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all hover:scale-110 shadow-md"
          title={t.backToLogin}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>

        <div className="flex justify-center mb-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-1 text-slate-900">
          {t.forgotPasswordTitle}
        </h1>
        <p className="text-center text-slate-500 mb-6 text-base">
          {t.forgotPasswordSubtitle}
        </p>

        {error && (
          <div className="mb-4 text-sm rounded-lg bg-red-100 text-red-700 px-3 py-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 text-sm rounded-lg bg-emerald-100 text-emerald-700 px-3 py-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-2">
              {t.email}
            </label>
            <input
              type="email"
              placeholder={t.emailPlaceholder}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] transition disabled:opacity-50 shadow-lg shadow-indigo-500/30"
          >
            {loading ? t.sendingLink : t.sendLink}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-base text-slate-600 hover:text-indigo-600 font-medium transition-colors"
          >
            {t.backToLogin}
          </Link>
        </div>
      </div>

      {showPhoneModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {t.forgotPasswordPhoneTitle}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              {t.forgotPasswordPhoneSubtitle}
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.phoneLabel}
            </label>
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold">
                +212
              </span>
              <input
                type="tel"
                placeholder={t.phonePlaceholder}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-base text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={phone}
                onChange={(e) => {
                  let next = e.target.value.replace(/[^\d]/g, "");
                  if (next.startsWith("0")) {
                    next = next.slice(1);
                  }
                  if (next.length > 9) {
                    next = next.slice(0, 9);
                  }
                  setPhone(next);
                  setPhoneError("");
                }}
              />
            </div>
            {phoneError && (
              <div className="mt-2 text-xs text-red-600">{phoneError}</div>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="w-full py-3 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                onClick={handleSendWithPhone}
                disabled={loading}
              >
                {t.phoneSend}
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                onClick={handleSendWithoutPhone}
                disabled={loading}
              >
                {t.phoneSkip}
              </button>
              <button
                type="button"
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
                onClick={() => setShowPhoneModal(false)}
                disabled={loading}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
