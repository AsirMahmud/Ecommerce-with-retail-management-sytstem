"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import bnMessages from "@/messages/bn.json";

export type Language = "en" | "bn";

const messagesMap: Record<Language, any> = {
  en: enMessages,
  bn: bnMessages,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  messages: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("rms_language") as Language;
      if (saved === "en" || saved === "bn") {
        setLanguageState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("rms_language", lang);
      document.cookie = `rms_language=${lang}; path=/; max-age=31536000`;
    } catch {
      // ignore
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, messages: messagesMap[language] }}>
      <NextIntlClientProvider
        key={language}
        locale={language}
        messages={messagesMap[language]}
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "en" as Language,
      setLanguage: () => {},
      messages: enMessages,
    };
  }
  return context;
}
