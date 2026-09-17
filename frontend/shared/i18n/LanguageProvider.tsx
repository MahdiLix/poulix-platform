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
  DEFAULT_LANGUAGE,
  languageDirection,
  readLanguageCookie,
  writeLanguageCookie,
} from "./language-cookie";
import {
  translations,
  type Language,
  type TranslationDictionary,
} from "./translations";

type LanguageContextType = {
  language: Language;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  isLanguageReady: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

function applyDocumentLanguage(language: Language) {
  if (typeof document === "undefined") return;
  const dir = languageDirection(language);
  document.documentElement.lang = language;
  document.documentElement.dir = dir;
  document.documentElement.classList.toggle("rtl", language === "fa");
}

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(
    () => initialLanguage ?? DEFAULT_LANGUAGE,
  );
  const [isLanguageReady, setIsLanguageReady] = useState(
    () => initialLanguage != null,
  );

  useEffect(() => {
    if (initialLanguage == null) {
      setLanguageState(readLanguageCookie());
    }
    setIsLanguageReady(true);
    applyDocumentLanguage(initialLanguage ?? readLanguageCookie());
  }, [initialLanguage]);

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
    applyDocumentLanguage(language);
  }, [language]);

  const value = useMemo(() => {
    const dir = languageDirection(language);
    return {
      language,
      dir,
      isRtl: dir === "rtl",
      isLanguageReady,
      setLanguage,
      toggleLanguage,
      t: translations[language],
    };
  }, [language, isLanguageReady, setLanguage, toggleLanguage]);

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
