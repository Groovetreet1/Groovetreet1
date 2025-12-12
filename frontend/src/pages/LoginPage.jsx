import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Email ou mot de passe invalide.");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("loginTime", Date.now().toString());
        
        // Rediriger les superadmins vers leur dashboard dédié
        if (data.user.role === 'superadmin') {
          navigate("/superadmin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau, réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex justify-center mb-3">
          <img
            src="/app-icon.png"
            alt="Windelevery"
            className="h-12 w-12 rounded-2xl object-cover shadow"
          />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1 text-slate-900">
          Windelevery!
        </h1>
        <p className="text-center text-slate-500 mb-6 text-sm">
          Connecte-toi pour accéder aux tâches
        </p>

        {error && (
          <div className="mb-4 text-sm rounded-lg bg-red-100 text-red-700 px-3 py-2">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          Pas encore de compte ?{" "}
          <Link
            to="/register"
            className="text-indigo-600 font-medium hover:underline"
          >
            S’inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
