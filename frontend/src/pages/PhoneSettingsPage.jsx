import React from 'react';
import { useTranslation } from '../contexts/LanguageContext.jsx';


const PhoneSettingsPage = () => {
  const { t, language } = useTranslation();
  
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-white to-blue-200 flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header sticky mobile */}
      <header className="sticky top-0 z-10 bg-white/90 shadow-sm py-4 px-6 flex items-center justify-center border-b border-blue-200">
        <h1 className="text-xl font-bold text-blue-700 tracking-tight">{t.phoneSettings}</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-start px-2 py-6">
        <section className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-6">
          {/* Paramètres notifications */}
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-700 font-medium">{t.notifications}</span>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
              <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
            </label>
          </div>
          {/* Paramètres mode sombre */}
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-700 font-medium">{t.darkMode}</span>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
              <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
            </label>
          </div>
          <button className="w-full py-3 rounded-xl text-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition">{t.save}</button>
        </section>
      </main>
    </div>
  );
};

export default PhoneSettingsPage;
