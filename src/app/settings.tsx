import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSetting, setSetting } from "../db/settings";
import { SUPPORTED_CURRENCIES } from "../lib/currency";
import { Language } from "../lib/i18n";
import { useAppStore, useColors, useTranslation } from "../store/useAppStore";
import { radius, typography } from "../theme";

const THEME_OPTIONS = ['Light', 'Dark', 'System'] as const;
type ThemeOption = typeof THEME_OPTIONS[number];

export default function AppSettings() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const { themeMode: storedMode, setThemeMode, setLanguage } = useAppStore();
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(storedMode);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  useEffect(() => {
    const savedCurrency = getSetting('default_currency');
    if (savedCurrency) setDefaultCurrency(savedCurrency);
  }, []);

  const handleThemeChange = (t: ThemeOption) => {
    setSelectedTheme(t);
    setSetting('theme', t);
    setThemeMode(t); // triggers immediate re-render via Zustand
  };

  const handleCurrencyChange = (code: string) => {
    setDefaultCurrency(code);
    setSetting('default_currency', code);
    setCurrencyModalVisible(false);
  };

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={[s.headerBtn, { backgroundColor: colors.surface }]} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.dark} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('appSettingsHeader')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.container} contentContainerStyle={s.content}>

        {/* APPEARANCE */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{t('preferencesSection')}</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <View style={s.cardRow}>
            <Text style={[s.rowLabel, { color: colors.dark, fontFamily: typography.semiBold }]}>{t('themeLabel')}</Text>
            <View style={[s.themeToggle, { backgroundColor: colors.background }]}>
              {THEME_OPTIONS.map((t) => (
                <Pressable
                  key={t}
                  style={[s.themeBtn, selectedTheme === t && { backgroundColor: colors.dark }]}
                  onPress={() => handleThemeChange(t)}
                >
                  <Text style={[
                    s.themeBtnText,
                    { color: colors.textMuted, fontFamily: typography.semiBold },
                    selectedTheme === t && { color: colors.background },
                  ]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[s.rowDivider, { backgroundColor: colors.border }]} />

          <View style={s.cardRow}>
            <Text style={[s.rowLabel, { color: colors.dark, fontFamily: typography.semiBold }]}>{t('languageLabel')}</Text>
            <View style={[s.themeToggle, { backgroundColor: colors.background }]}>
              {(['en', 'id'] as Language[]).map((l) => (
                <Pressable
                  key={l}
                  style={[s.themeBtn, language === l && { backgroundColor: colors.dark }]}
                  onPress={() => setLanguage(l)}
                >
                  <Text style={[
                    s.themeBtnText,
                    { color: colors.textMuted, fontFamily: typography.semiBold },
                    language === l && { color: colors.background },
                  ]}>
                    {l === 'en' ? 'EN' : 'ID'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* DEFAULTS */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{t('defaultsSection')}</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Pressable style={s.cardRow} onPress={() => setCurrencyModalVisible(true)}>
            <View style={s.rowTextBlock}>
              <Text style={[s.rowLabel, { color: colors.dark, fontFamily: typography.semiBold }]}>{t('defaultCurrencyLabel')}</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={[s.rowValue, { color: colors.textMuted, fontFamily: typography.semiBold }]}>{defaultCurrency}</Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>

        {/* ABOUT */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{t('aboutSection')}</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <View style={s.cardRow}>
            <Text style={[s.rowLabel, { color: colors.dark, fontFamily: typography.semiBold }]}>{t('versionLabel')}</Text>
            <Text style={[s.rowValue, { color: colors.textMuted, fontFamily: typography.semiBold }]}>1.0.0</Text>
          </View>
        </View>

        <Text style={[s.footerText, { color: colors.textMuted, fontFamily: typography.regular }]}>
          {t('privacyDisclaimer')}
        </Text>

      </ScrollView>

      {/* Currency picker sheet */}
      <Modal
        transparent
        visible={currencyModalVisible}
        animationType="slide"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <Pressable style={s.pickerOverlay} onPress={() => setCurrencyModalVisible(false)} />
        <View style={[s.pickerSheet, { backgroundColor: colors.background }]}>
          <View style={[s.dragHandle, { backgroundColor: colors.border }]} />
          <Text style={[s.pickerTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('defaultCurrencyLabel')}</Text>

          <ScrollView>
            {SUPPORTED_CURRENCIES.map((c, i) => (
              <View key={c.code}>
                {i > 0 && <View style={[s.pickerDivider, { backgroundColor: colors.border }]} />}
                <Pressable style={s.pickerRow} onPress={() => handleCurrencyChange(c.code)}>
                  <View style={s.pickerLeft}>
                    <Text style={[s.pickerSymbol, { color: colors.dark, fontFamily: typography.bold }]}>{c.symbol}</Text>
                    <Text style={[s.pickerLabel, { color: colors.dark, fontFamily: typography.regular }]}>{c.label}</Text>
                  </View>
                  {defaultCurrency === c.code && (
                    <Feather name="check" size={18} color={colors.dark} />
                  )}
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea:      { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn:     { width: 40, height: 40, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700' },
  container:     { flex: 1 },
  content:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 },
  sectionLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  card:          { borderRadius: radius.lg, overflow: 'hidden', marginBottom: 32 },
  cardRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  rowTextBlock:  { flex: 1 },
  rowLabel:      { fontSize: 15, fontWeight: '600' },
  rowSubLabel:   { fontSize: 12, marginTop: 2 },
  rowDivider:    { height: 1, marginHorizontal: 20 },
  footerText:    { fontSize: 13, textAlign: 'center', marginTop: 16, paddingHorizontal: 24, lineHeight: 18 },
  rowRight:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue:      { fontSize: 15, fontWeight: '600' },
  versionValue:  { fontSize: 15, letterSpacing: 1.5 },
  themeToggle:   { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  themeBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  themeBtnText:  { fontSize: 13, fontWeight: '600' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  pickerSheet:   { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 12, paddingBottom: 48, maxHeight: '60%' },
  dragHandle:    { width: 44, height: 4, borderRadius: radius.pill, alignSelf: 'center', marginBottom: 20 },
  pickerTitle:   { fontSize: 18, fontWeight: '700', paddingHorizontal: 24, marginBottom: 8 },
  pickerDivider: { height: 1, marginHorizontal: 24 },
  pickerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  pickerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pickerSymbol:  { fontSize: 16, fontWeight: '700', width: 36 },
  pickerLabel:   { fontSize: 15 },
});
