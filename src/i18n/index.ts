import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import lo from './locales/lo';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      lo: { translation: lo },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'lo'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Keep <html lang> in sync so CSS font rules trigger correctly
const syncLang = (lng: string) => {
  document.documentElement.lang = lng.startsWith('lo') ? 'lo' : 'en';
};

i18n.on('languageChanged', syncLang);
i18n.isInitialized ? syncLang(i18n.language) : i18n.on('initialized', () => syncLang(i18n.language));

export default i18n;
