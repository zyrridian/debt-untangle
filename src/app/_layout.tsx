import { Stack } from "expo-router";
import { useEffect } from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Appearance } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initSettingsTable } from '../db/settings';
import { useAppStore, useColors } from '../store/useAppStore';
import { initSchema } from '../db/schema';

SplashScreen.preventAutoHideAsync();

// Init DB schema at module load — synchronous, runs before any component mounts
try {
  initSchema();
  initSettingsTable();
  useAppStore.getState().hydrateSettings();
} catch (e) {
  console.error('[DB] Schema init failed:', e);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  const colors = useColors();
  const themeMode = useAppStore((s) => s.themeMode);

  useEffect(() => {
    if (themeMode === 'System') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(themeMode === 'Dark' ? 'dark' : 'light');
    }
  }, [themeMode]);

  if (!loaded && !error) {
    return null;
  }

  const navTheme = {
    ...DefaultTheme,
    dark: colors.dark === '#ECEEF0',
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.dark,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={navTheme}>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
