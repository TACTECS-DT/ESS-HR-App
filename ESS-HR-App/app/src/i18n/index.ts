import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {I18nManager} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import ar from './ar.json';

const LANGUAGE_KEY = '@ess_language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      callback(stored ?? 'en');
    } catch {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    } catch {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {translation: en},
      ar: {translation: ar},
    },
    fallbackLng: 'en',
    interpolation: {escapeValue: false},
    compatibilityJSON: 'v3',
  });

/**
 * Toggle language between 'en' and 'ar'.
 * Forces RTL layout for Arabic and LTR for English.
 * The app must reload for RTL changes to take full effect.
 */
export async function toggleLanguage(): Promise<void> {
  const current = i18n.language;
  const next = current === 'en' ? 'ar' : 'en';
  await i18n.changeLanguage(next);
  const isRTL = next === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
  }
}

export default i18n;
