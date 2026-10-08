import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { dictionaries, DictKey, Language } from '../lib/i18n';
import { getSetting, setSetting } from '../db/settings';
import { ColorTokens, darkColors, lightColors } from '../theme';

export type ThemeMode = 'Light' | 'Dark' | 'System';

interface AppStore {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;

  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  language: Language;
  setLanguage: (lang: Language) => void;

  hydrateSettings: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeGroupId: null,
  setActiveGroupId: (id) => set({ activeGroupId: id }),

  themeMode: 'System',
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    setSetting('theme', mode);
  },

  language: 'en',
  setLanguage: (lang) => {
    set({ language: lang });
    setSetting('language', lang);
  },

  hydrateSettings: () => {
    try {
      const theme = getSetting('theme') as ThemeMode;
      const lang = getSetting('language') as Language;
      if (theme) set({ themeMode: theme });
      if (lang) set({ language: lang });
    } catch (e) {
      console.warn('Failed to hydrate settings', e);
    }
  }
}));

/**
 * Returns the active color tokens based on the user's theme preference.
 * Call inside any component — re-renders automatically when themeMode changes.
 */
export function useColors(): ColorTokens {
  const themeMode = useAppStore((s) => s.themeMode);
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const isDark =
    themeMode === 'Dark' ||
    (themeMode === 'System' && systemScheme === 'dark');

  return isDark ? darkColors : lightColors;
}

export function useTranslation() {
  const language = useAppStore((state) => state.language);

  const t = (key: DictKey, params?: Record<string, string | number>) => {
    const dict = dictionaries[language] || dictionaries.en;
    let str = dict[key] || dictionaries.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }

    return str;
  };

  return { t, language };
}
