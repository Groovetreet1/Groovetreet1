import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";
import { useTranslation } from "../contexts/LanguageContext.jsx";

export default function LoginPage() {
  const { t, language } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Timeout de 60 secondes pour le backend Render
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t.loginError);
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("loginTime", Date.now().toString());
        sessionStorage.setItem("spinWheelOnLogin", "true");
        sessionStorage.removeItem(`spinWheelShown_${data.user?.id || "unknown"}`);
        sessionStorage.removeItem(`spinWheelChecked_${data.user?.id || "unknown"}`);
        
        // Rediriger les superadmins vers leur dashboard dédié
        if (data.user.role === 'superadmin') {
          navigate("/superadmin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.name === 'AbortError') {
        setError(t.loginTimeoutError);
      } else {
        setError(t.loginNetworkError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* ANIMATED BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradients animés TRÈS visibles */}
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-0 -right-20 w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-[600px] h-[600px] bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-3000"></div>
        
        {/* Gradient de fond animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-pink-900/30 animate-gradient"></div>
        
        {/* Lignes animées plus épaisses et visibles */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent animate-line-horizontal shadow-lg shadow-indigo-500/50"></div>
          <div className="absolute top-2/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400/60 to-transparent animate-line-horizontal animation-delay-2000 shadow-lg shadow-purple-500/50"></div>
          <div className="absolute top-3/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400/60 to-transparent animate-line-horizontal animation-delay-4000 shadow-lg shadow-pink-500/50"></div>
        </div>
        
        {/* Particules flottantes BEAUCOUP plus visibles */}
        <div className="absolute top-10 left-10 w-4 h-4 bg-indigo-400 rounded-full animate-float opacity-80 shadow-lg shadow-indigo-500/50"></div>
        <div className="absolute top-20 right-20 w-5 h-5 bg-purple-400 rounded-full animate-float animation-delay-1000 opacity-70 shadow-lg shadow-purple-500/50"></div>
        <div className="absolute bottom-32 left-1/4 w-4 h-4 bg-pink-400 rounded-full animate-float animation-delay-2000 opacity-80 shadow-lg shadow-pink-500/50"></div>
        <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-cyan-400 rounded-full animate-float animation-delay-3000 opacity-60 shadow-lg shadow-cyan-500/50"></div>
        <div className="absolute bottom-20 right-1/4 w-4 h-4 bg-indigo-300 rounded-full animate-float animation-delay-4000 opacity-80 shadow-lg shadow-indigo-400/50"></div>
        <div className="absolute top-40 left-1/3 w-3 h-3 bg-purple-300 rounded-full animate-float animation-delay-1000 opacity-70 shadow-lg shadow-purple-400/50"></div>
        <div className="absolute bottom-40 right-1/2 w-5 h-5 bg-pink-300 rounded-full animate-float animation-delay-3000 opacity-75 shadow-lg shadow-pink-400/50"></div>
        <div className="absolute top-1/2 left-20 w-4 h-4 bg-cyan-300 rounded-full animate-float animation-delay-4000 opacity-70 shadow-lg shadow-cyan-400/50"></div>
        
        {/* Étoiles scintillantes */}
        <div className="absolute top-16 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-80"></div>
        <div className="absolute top-32 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse animation-delay-1000 opacity-70"></div>
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse animation-delay-2000 opacity-90"></div>
        <div className="absolute top-2/3 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse animation-delay-3000 opacity-75"></div>
      </div>

      <div className="w-4/5 h-3/4 bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl shadow-indigo-500/20 border border-white/20 p-8 sm:p-6 relative z-10 overflow-y-auto">
        {/* Bouton retour */}
        <Link
          to="/"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all hover:scale-110 shadow-md"
          title={t.backToHome}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>

        <div 
          className="flex justify-center mb-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            const token = localStorage.getItem("token");
            if (token) navigate("/dashboard");
            else navigate("/");
          }}
        >
          <img
            src="/app-icon.png"
            alt="Windelevery"
            className="h-12 w-12 rounded-2xl object-cover shadow"
          />
        </div>
        <h1 className="text-3xl font-bold text-center mb-1 text-slate-900">
          {t.loginTitle}
        </h1>
        <p className="text-center text-slate-500 mb-6 text-base">
          {t.loginSubtitle}
        </p>

        {error && (
          <div className="mb-4 text-sm rounded-lg bg-red-100 text-red-700 px-3 py-2">
            {error}
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

          <div>
            <label className="block text-base font-medium text-slate-700 mb-2">
              {t.password}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.passwordPlaceholder}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-10 text-base text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title={showPassword ? t.hidePassword : t.showPassword}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-1 text-right">
              <Link
                to="/forgot-password"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors"
              >
                {t.forgotPassword}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-lg text-base font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? t.loggingIn : t.login}
          </button>
        </form>

        <p className="text-center text-base text-slate-500 mt-6">
          {t.noAccount}{" "}
          <Link
            to="/register"
            className="text-indigo-600 font-medium hover:underline"
          >
            {t.register}
          </Link>
        </p>
      </div>
    </div>
  );
}
