import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';

const STORE_LANGUAGE_KEY = 'userLanguage';

const languageDetectorPlugin = {
  type: 'languageDetector' as const,
  async: true,
  init: () => { },
  detect: async function (callback: (lang: string) => void) {
    try {
      // Get stored language from local storage
      const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
      if (language) {
        return callback(language);
      } else {
        // If no language stored, fallback to device language or English
        const bestLang = Localization.getLocales()[0]?.languageCode;
        // Check if device language is supported, else fallback to 'en'
        if (bestLang && ['en', 'te', 'hi', 'kn'].includes(bestLang)) {
          return callback(bestLang);
        }
        return callback('en');
      }
    } catch (error) {
      console.log('Error reading language', error);
      callback('en');
    }
  },
  cacheUserLanguage: async function (language: string) {
    try {
      await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error caching language', error);
    }
  },
};

const resources = {
  en: { translation: en },
  te: { translation: te },
  hi: { translation: hi },
  kn: { translation: kn },
};

i18n
  .use(initReactI18next)
  .use(languageDetectorPlugin)
  .init({
    resources,
    compatibilityJSON: 'v3',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safely escapes
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
