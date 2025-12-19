import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language] = useState(() => localStorage.getItem("language") || "fr");
  const maskEmail = (email) => {
    if (!email || typeof email !== "string") return "";
    const [userPart, domainPart] = email.split("@");
    if (!domainPart) return "****";
    const visible = userPart.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(2, userPart.length - 2))}@${domainPart}`;
  };
  const translations = {
    fr: {
      title: "Parrainage",
      subtitle: "Ton code d'invitation et tes gains",
      back: "Retour au dashboard",
      loading: "Chargement...",
      errorPrefix: "Erreur",
      codeTitle: "Ton code d'invitation",
      codeHint: "Partage ce code, tu gagnes 10% des dépôts confirmés de tes filleuls.",
      copy: "Copier",
      invitedCount: "Inscriptions via ton code",
      bonus: "Gains de parrainage",
      listTitle: "Liste des filleuls",
      listCount: "inscrit(s)",
      emptyList: "Personne n'a encore utilisé ton code.",
      colUser: "Utilisateur",
      colEmail: "Email",
      colDate: "Inscription",
      dash: "—",
      amountUnit: "MAD",
    },
    ar: {
      title: "البارطاج / الدعوة",
      subtitle: "الكود ديالك و الفلوس لي ربحتي",
      back: "رجع للوحة",
      loading: "كنحمّلو...",
      errorPrefix: "مشكل",
      codeTitle: "كود الدعوة ديالك",
      codeHint: "شارك هاد الكود، كتاخد 10% من الشحن لي كيأكدو ديال الناس لي دعيتيهم.",
      copy: "نسخ",
      invitedCount: "التسجيلات بالكود ديالك",
      bonus: "الفلوس ديال البارطاج",
      listTitle: "لائحة الناس لي دعيتيهم",
      listCount: "مسجل",
      emptyList: "ماكاين حتى واحد خدام بالكود ديالك.",
      colUser: "المستخدم",
      colEmail: "الإيميل",
      colDate: "تاريخ التسجيل",
      dash: "—",
      amountUnit: "درهم مغربي",
    },
    en: {
      title: "Referrals",
      subtitle: "Your invite code and earnings",
      back: "Back to dashboard",
      loading: "Loading...",
      errorPrefix: "Error",
      codeTitle: "Your invite code",
      codeHint: "Share this code, you earn 10% of confirmed deposits from your invitees.",
      copy: "Copy",
      invitedCount: "Signups via your code",
      bonus: "Referral earnings",
      listTitle: "Invitee list",
      listCount: "signup(s)",
      emptyList: "Nobody has used your code yet.",
      colUser: "User",
      colEmail: "Email",
      colDate: "Signup date",
      dash: "—",
      amountUnit: "MAD",
    },
  };
  const L = translations[language] || translations.fr;
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
          <div className="flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt="Windelevery"
              className="h-8 w-8 rounded-xl object-cover"
            />
            <div>
              <div className="text-sm font-semibold tracking-tight">{L.title}</div>
              <div className="text-[11px] text-slate-400">{L.subtitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-xs px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              {L.back}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">{`${L.errorPrefix}: ${error}`}</div>
        )}

        {loading ? (
          <p className="text-xs text-slate-400">{L.loading}</p>
        ) : (
          <>
            <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold">{L.codeTitle}</h2>
                  <p className="text-[12px] text-slate-400">{L.codeHint}</p>
                </div>
                <button
                  onClick={copyCode}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
                >
                  {L.copy}
                </button>
              </div>
              <div className="text-2xl font-bold text-indigo-300 tracking-[0.15em]">
                {data?.inviteCode || L.dash}
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                <div className="text-sm text-slate-400">{L.invitedCount}</div>
                <div className="text-3xl font-bold text-white mt-1">{data?.invitedCount ?? 0}</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                <div className="text-sm text-slate-400">{L.bonus}</div>
                <div className="text-3xl font-bold text-emerald-300 mt-1">
                  {(data?.totalBonusCents ?? 0) / 100} {L.amountUnit}
                </div>
              </div>
            </section>

            <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{L.listTitle}</h3>
                <span className="text-[11px] text-slate-400">
                  {data?.invited?.length || 0} {L.listCount}
                </span>
              </div>
              {data?.invited?.length === 0 ? (
                <p className="text-xs text-slate-400">{L.emptyList}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700">
                        <th className="py-2 pr-2">{L.colUser}</th>
                        <th className="py-2 pr-2">{L.colEmail}</th>
                        <th className="py-2 pr-2">{L.colDate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invited.map((u) => (
                        <tr key={u.userId} className="border-b border-slate-800">
                          <td className="py-2 pr-2">{u.fullName || `ID ${u.userId}`}</td>
                          <td className="py-2 pr-2">{maskEmail(u.email) || L.dash}</td>
                          <td className="py-2 pr-2">
                            {u.createdAt ? new Date(u.createdAt).toLocaleString() : L.dash}
                          </td>
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
