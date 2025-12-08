import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function LandingPage() {
  // fr = français, ar = darija marocaine (en alphabet arabe)
  const [language, setLanguage] = useState("fr");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const texts = {
    fr: {
      appTitle: "Windelevery!",
      appSubtitle: "Plateforme de missions rémunérées (vidéos & MAD)",
      login: "Login",
      signup: "Sign up",
      heroTitleLine1: "Regarde des vidéos, valide des tâches,",
      heroTitleLine2: "et encaisse tes gains en MAD.",
      heroText:
        "Windelevery! te permet de gagner de l’argent en faisant de petites missions : tu regardes des vidéos YouTube pendant quelques secondes, tu valides la tâche et ton solde augmente sur ton compte.",
      heroText2:
        "Quand tu atteins un certain montant, tu peux demander un retrait (100 / 150 / 500 / 1000 MAD) vers ton compte bancaire. Un panneau admin s’occupe de valider les demandes.",
      ctaPrimary: "Commencer maintenant",
      ctaSecondary: "J’ai déjà un compte",
      badge: "🪙 Gagne en regardant des vidéos",
      card1Title: "🎥 Tâches vidéo",
      card1Text: "Regarde au moins 15 secondes puis valide la mission.",
      card2Title: "💳 Dépôts & retraits",
      card2Text: "Dépôt dès 80 MAD, retraits sur montants fixes.",
      card3Title: "🛡️ Panel admin",
      card3Text: "Validation manuelle des demandes de retrait.",
      langFr: "🇫🇷 Français",
      langAr: "🇲🇦 الدارجة",
    },
    ar: {
      appTitle: "برومو آب",
      appSubtitle: "منصّة ديال لخدمات اللي كيتخلّصو (فيديوهات ودرهم)",
      login: "دخول",
      signup: "تسجيل",
      heroTitleLine1: "تشوف الفيديو، تكمّل الخدمة،",
      heroTitleLine2: "وتشدّ الفلوس فالدرهم.",
      heroText:
        "برومو آب كيعطيك خدمات صغار: كتشوف فيديوهات يوتيوب شوية، من بعد كتصادّق على الخدمة وكيطلع لك الرصيد فالحساب.",
      heroText2:
        "مني توصل لمبلغ مزيان، كتدير طلب ديال السحب (20 / 50 / 100 / 1000 درهم) فالحساب البنكي ديالك، والأدمين كيشوف وكيصادّق.",
      ctaPrimary: "بدا دابا",
      ctaSecondary: "عندي حساب من قبل",
      badge: "🪙 ربح وانت كتفرّج فالفيديو",
      card1Title: "🎥 خدمات الفيديو",
      card1Text: "خاصّك تشوف على القل 15 تانية ومن بعد كتصادّق على الخدمة.",
      card2Title: "💳 ديبوزي و السحب",
      card2Text: "تقدر تدير ديبوزي ابتداءً من 80 درهم، والسحب ابتداءً من 20 درهم.",
      card3Title: "🛡️ بانيل الأدمين",
      card3Text: "الأدمين كيشوف الطلبات وكيصادّق ولا يرفض السحب.",
      langFr: "🇫🇷 Français",
      langAr: "🇲🇦 الدارجة",
    },
  };

  const t = texts[language];

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {/* HEADER */}
      <header className="w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Logo + nom */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/30">
              P
            </div>
            <div className={language === "ar" ? "text-right" : ""}>
              <div className="text-sm font-semibold tracking-tight">
                {t.appTitle}
              </div>
              <div className="text-[11px] text-slate-400">
                {t.appSubtitle}
              </div>
            </div>
          </div>

          {/* Zone droite : langue + boutons login / signup */}
          <div className="flex items-center gap-3">
            {/* Choix de langue */}
            <div className="flex items-center gap-1 text-[11px] border border-slate-700 rounded-full px-2 py-1 bg-slate-900">
              <button
                onClick={() => setLanguage("fr")}
                className={
                  "px-2 py-0.5 rounded-full " +
                  (language === "fr" ? "bg-indigo-600" : "")
                }
              >
                {t.langFr}
              </button>
              <button
                onClick={() => setLanguage("ar")}
                className={
                  "px-2 py-0.5 rounded-full " +
                  (language === "ar" ? "bg-indigo-600" : "")
                }
              >
                {t.langAr}
              </button>
            </div>

            {/* Login / Sign up */}
            <Link
              to="/login"
              className="text-[11px] px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800"
            >
              {t.login}
            </Link>
            <Link
              to="/register"
              className="text-[11px] px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-500/30"
            >
              {t.signup}
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENU CENTRAL */}
      <main className="flex-1 flex items-center">
        <div
          className={
            "max-w-4xl mx-auto px-4 py-10 " +
            (language === "ar" ? "text-right" : "text-left")
          }
        >
          <p className="inline-flex items-center px-2 py-1 rounded-full text-[11px] border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 mb-3">
            {t.badge}
          </p>

          <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-4">
            {t.heroTitleLine1}
            <span className="block text-indigo-400">{t.heroTitleLine2}</span>
          </h1>

          <p className="text-sm text-slate-300 mb-4">{t.heroText}</p>

          <p className="text-sm text-slate-400 mb-6">{t.heroText2}</p>

          <div
            className={
              "flex flex-wrap gap-3 mb-6 " +
              (language === "ar" ? "justify-end" : "justify-start")
            }
          >
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold shadow-lg shadow-indigo-500/30"
            >
              {t.ctaPrimary}
            </Link>
            <Link
              to="/login"
              className="px-4 py-2.5 rounded-xl border border-slate-600 text-sm text-slate-200 hover:bg-slate-800"
            >
              {t.ctaSecondary}
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-[11px] text-slate-400">
            <div>
              <p className="text-slate-200 font-semibold mb-1">
                {t.card1Title}
              </p>
              <p>{t.card1Text}</p>
            </div>
            <div>
              <p className="text-slate-200 font-semibold mb-1">
                {t.card2Title}
              </p>
              <p>{t.card2Text}</p>
            </div>
            <div>
              <p className="text-slate-200 font-semibold mb-1">
                {t.card3Title}
              </p>
              <p>{t.card3Text}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
