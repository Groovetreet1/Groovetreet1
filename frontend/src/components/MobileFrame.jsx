import { useTranslation } from "../contexts/LanguageContext.jsx";

/**
 * MobileFrame - Wrapper pour afficher l'app en mode portrait
 * Sur desktop: simule un écran de téléphone centré
 * Sur mobile: prend toute la largeur, force le mode portrait
 */
export default function MobileFrame({ children }) {
  const { t, language } = useTranslation();
  
  return (
    <>
      {/* Overlay affiché quand le téléphone est en mode paysage */}
      <div className="rotate-overlay" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="rotate-icon">📱</div>
        <h2 className="text-xl font-bold">{t.rotatePhone}</h2>
        <p className="text-slate-400 text-sm">
          {t.portraitOnly}
        </p>
      </div>

      {/* Conteneur principal de l'app en mode portrait */}
      <div className="mobile-frame">
        {children}
      </div>
    </>
  );
}
