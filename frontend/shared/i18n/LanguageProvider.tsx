"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  translations,
  type Language,
  type TranslationDictionary,
} from "./translations";

const LANGUAGE_COOKIE = "poulix_lang";
const DEFAULT_LANGUAGE: Language = "en";

type LanguageContextType = {
  language: Language;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

function readLanguageCookie(): Language {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const prefix = `${encodeURIComponent(LANGUAGE_COOKIE)}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return DEFAULT_LANGUAGE;
  const value = decodeURIComponent(match.slice(prefix.length));
  return value === "fa" ? "fa" : "en";
}

function writeLanguageCookie(lang: Language) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(LANGUAGE_COOKIE)}=${encodeURIComponent(lang)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = readLanguageCookie();
    setLanguageState(saved);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    writeLanguageCookie(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === "en" ? "fa" : "en";
      writeLanguageCookie(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const dir = language === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    if (language === "fa") {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [language]);

  const value = useMemo(() => {
    const dir: "ltr" | "rtl" = language === "fa" ? "rtl" : "ltr";
    return {
      language,
      dir,
      isRtl: dir === "rtl",
      setLanguage,
      toggleLanguage,
      t: translations[language],
    };
  }, [language, setLanguage, toggleLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
