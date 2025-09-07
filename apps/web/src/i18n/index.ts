import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptTranslations from './pt.json';
import enTranslations from './en.json';
import esTranslations from './es.json';

const resources = {
  pt: { translation: ptTranslations },
  en: { translation: enTranslations },
  es: { translation: esTranslations },
};

const savedLang = localStorage.getItem('bazari:lang') || 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;