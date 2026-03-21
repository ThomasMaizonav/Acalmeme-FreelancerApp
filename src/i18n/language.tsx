import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "pt" | "en";
export type LocalizedText = string | { pt: string; en: string };

const detectLanguage = (): AppLanguage => {
  if (typeof navigator === "undefined") return "pt";

  const candidates = [...(navigator.languages ?? []), navigator.language]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return candidates.some((value) => value.startsWith("pt")) ? "pt" : "en";
};

const resolveLocalizedText = (text: LocalizedText, language: AppLanguage) =>
  typeof text === "string" ? text : text[language];

interface LanguageContextValue {
  language: AppLanguage;
  isEnglish: boolean;
  isPortuguese: boolean;
  text: (value: LocalizedText) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language] = useState<AppLanguage>(() => detectLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isEnglish: language === "en",
      isPortuguese: language === "pt",
      text: (value) => resolveLocalizedText(value, language),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
};
