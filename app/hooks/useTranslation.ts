"use client";

import { useLanguage } from "../contexts/LanguageContext";
import { t } from "../lib/i18n";

export function useTranslation() {
  const { language } = useLanguage();

  return {
    t: (key: string) => t(key, language),
    language,
  };
}
