import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, languages } from "@/lib/i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("certiguard-lang") || "en";
  });

  useEffect(() => {
    localStorage.setItem("certiguard-lang", language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { language: "en", setLanguage: () => {}, t: (k) => k, languages };
  return ctx;
}