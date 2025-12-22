import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function LandingPage() {
  // Utiliser le contexte de langue global
  const { language, setLanguage } = useLanguage();
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
      downloadApp: "Télécharger l'application Windelevery",
      card1Title: "🎥 Tâches vidéo",
      card1Text: "Regarde au moins 15 secondes puis valide la mission.",
      card2Title: "💳 Dépôts & retraits",
      card2Text: "Dépôt dès 80 MAD, retraits sur montants fixes.",
      card3Title: "🛡️ Panel admin",
      card3Text: "Validation manuelle des demandes de retrait.",
      langFr: "🇫🇷 Français",
      langAr: "🇲🇦 الدارجة",
      // Nouvelle section pour la carte de présentation
      aboutTitle: "À propos de Windelevery",
      aboutDescription: "Votre plateforme de confiance pour gagner de l'argent en ligne",
      aboutText: "Windelevery est une plateforme innovante qui vous permet de monétiser votre temps libre. Regardez des vidéos, accomplissez des missions simples et transformez vos moments libres en revenus réels.",
      contactTitle: "Contactez-nous",
      contactEmail: "contact@windelevery.com",
      contactPhone: "+212 6 XX XX XX XX",
      contactAddress: "Casablanca, Maroc",
      contactSupport: "Support disponible 7j/7",
    },
    ar: {
      appTitle: "Windelevery",
      login: "دخول",
      signup: "سجّل",
      heroTitleLine1: "شوف الفيديو، كمّل المهمة،",
      heroTitleLine2: "وشد الفلوس بالدرهم المغربي.",
      heroText:
        "Windelevery كتعطيك مهام بسيطة: كتشوف فيديوهات يوتيوب شوية، من بعد كتأكد المهمة وكيطلع ليك الفلوس فالحساب ديالك.",
      heroText2:
        "ملي توصل لمبلغ مزيان، كتدير طلب السحب (20 / 50 / 100 / 1000 درهم مغربي) للحساب البنكي المغربي ديالك، والأدمين كيشوف وكيأكد.",
      ctaPrimary: "بدا دابا",
      ctaSecondary: "عندي حساب",
      badge: "🪙 ربح وانت كتفرج فالفيديو",
      downloadApp: "تحميل تطبيق Windelevery",
      card1Title: "🎥 مهام الفيديو",
      card1Text: "خاصك تشوف على الأقل 15 ثانية ومن بعد كتأكد المهمة.",
      card2Title: "💳 شحن و سحب",
      card2Text: "تقدر تشحن ابتداءً من 80 درهم مغربي، والسحب ابتداءً من 20 درهم.",
      card3Title: "🛡️ بانيل الأدمين",
      card3Text: "الأدمين كيشوف الطلبات وكيأكد ولا يرفض السحب.",
      langFr: "🇫🇷 فرونصي",
      langAr: "🇲🇦 الدارجة المغربية",
      // Nouvelle section pour la carte de présentation
      aboutTitle: "على Windelevery",
      aboutDescription: "المنصة ديالك باش تربح الدرهم المغربي فالانترنت",
      aboutText: "Windelevery منصة جديدة كتخليك تربح الدرهم المغربي من الوقت الفارغ ديالك. شوف الفيديوهات، كمل المهام البسيطة وبدّل الوقت ديالك لفلوس حقيقيين (درهم مغربي).",
      contactTitle: "تواصل معانا",
      contactEmail: "contact@windelevery.com",
      contactPhone: "+212 6 XX XX XX XX",
      contactAddress: "الدار البيضاء، المغرب",
      contactSupport: "الدعم متاح كل يوم",
    },
  };

  const t = texts[language];

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
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
      {/* HEADER */}
      <header className="w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Logo + nom */}
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              const token = localStorage.getItem("token");
              if (token) navigate("/dashboard");
            }}
          >
            <img
              src="/app-icon.png"
              alt="Windelevery"
              className="h-9 w-9 rounded-2xl object-cover shadow-lg shadow-indigo-500/30"
            />
            <div className={language === "ar" ? "text-right" : ""}>
              <div className="text-sm font-semibold tracking-tight">
                {t.appTitle}
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
          </div>
        </div>
      </header>

      {/* CONTENU CENTRAL */}
      <main className="flex-1 relative z-10">
        {/* Section carte principale centrée */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-4/5 h-4/5 bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 md:p-12 border border-slate-700/50 shadow-2xl shadow-indigo-500/10 overflow-y-auto text-center">
            <p className="inline-flex items-center px-3 py-2 rounded-full text-sm border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 mb-4 mx-auto">
              {t.badge}
            </p>

            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-6">
              {t.heroTitleLine1}
              <span className="block text-indigo-400">{t.heroTitleLine2}</span>
            </h1>

            <p className="text-base text-slate-300 mb-6">{t.heroText}</p>

            <p className="text-base text-slate-400 mb-8">{t.heroText2}</p>


            
            <div className="flex flex-wrap gap-4 justify-center mt-6">
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-base font-semibold shadow-lg shadow-indigo-500/30"
              >
                {t.ctaPrimary}
              </Link>
              <Link
                to="/login"
                className="px-5 py-3 rounded-xl border border-slate-600 text-base text-slate-200 hover:bg-slate-800"
              >
                {t.ctaSecondary}
              </Link>
            </div>
            
            {/* Download APK Button */}
            <div className="mt-6">
              <a
                href="/Windelevery.apk"
                download="Windelevery.apk"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-base font-semibold shadow-lg shadow-emerald-500/30 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {t.downloadApp}
              </a>
              <p className="text-xs text-slate-400 mt-2">Fichier APK pour Android</p>
            </div>
          </div>
        </div>

        {/* Section cartes d'information */}
        <div
          className={
            "max-w-6xl mx-auto px-4 py-10 " +
            (language === "ar" ? "text-right" : "text-left")
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 text-sm text-slate-400 mb-12">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-200 font-semibold mb-2 text-sm sm:text-base">
                {t.card1Title}
              </p>
              <p className="text-xs sm:text-base">{t.card1Text}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-200 font-semibold mb-2 text-sm sm:text-base">
                {t.card2Title}
              </p>
              <p className="text-xs sm:text-base">{t.card2Text}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 col-span-2 sm:col-span-1">
              <p className="text-slate-200 font-semibold mb-2 text-sm sm:text-base">
                {t.card3Title}
              </p>
              <p className="text-xs sm:text-base">{t.card3Text}</p>
            </div>
          </div>


        </div>
      </main>
    </div>
  );
}
