"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "../src/i18n/en.json";
import hiTranslations from "../src/i18n/hi.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
    },
    lng: "hi", // Default to Hindi
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
  });

export default i18n;
