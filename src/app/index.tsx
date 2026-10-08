import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupCard from "../components/group-card";
import { createGroup } from "../db/queries";
import { getSetting } from "../db/settings";
import { useGroups } from "../hooks/useGroups";
import { SUPPORTED_CURRENCIES } from "../lib/currency";
import { useAppStore, useColors, useTranslation } from "../store/useAppStore";
import { radius, spacing, typography } from "../theme";
import { RefreshControl } from "react-native-gesture-handler";

const ICON_OPTIONS = ['users', 'home', 'briefcase', 'coffee', 'shopping-bag', 'heart', 'star', 'sun', 'camera', 'headphones', 'music', 'book'] as const;

export default function Index() {
  const colors = useColors();
  const { t } = useTranslation();
  const { groups, archivedGroups, loading, reload } = useGroups();
  const setActiveGroupId = useAppStore((s) => s.setActiveGroupId);

  const [isModalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [groupName, setGroupName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('users');
  const [currency, setCurrency] = useState('USD');
  const [myName, setMyName] = useState('');
  const [extraMembers, setExtraMembers] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  };

  const openModal = () => {
    const savedCurrency = getSetting('default_currency');
    if (savedCurrency) setCurrency(savedCurrency);
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 800, duration: 220, useNativeDriver: true }),
    ]).start(() => { setModalVisible(false); resetForm(); });
  };

  const resetForm = () => {
    setGroupName('');
    setSelectedIcon('users'); setCurrency('USD');
    setMyName(''); setExtraMembers(['']);
  };

  const updateMember = (i: number, v: string) => {
    const u = [...extraMembers]; u[i] = v; setExtraMembers(u);
  };
  const addMemberField = () => setExtraMembers([...extraMembers, '']);
  const removeMemberField = (i: number) => setExtraMembers(extraMembers.filter((_, idx) => idx !== i));

  const handleCreate = () => {
    const name = groupName.trim();
    const me = myName.trim();
    if (!name) { Alert.alert(t('groupNameRequired'), t('pleaseEnterName')); return; }
    if (!me) { Alert.alert(t('yourNameRequired'), t('addYourName')); return; }
    setSubmitting(true);
    try {
      const group = createGroup(name, selectedIcon, currency, me);
      const { addMember } = require('../db/queries');
      extraMembers.map((m) => m.trim()).filter(Boolean).forEach((n: string) => addMember(group.id, n));
      setActiveGroupId(group.id);
      closeModal();
      setTimeout(() => { router.push({ pathname: '/group', params: { groupId: group.id } }); reload(); }, 300);
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('couldNotCreateGroup'));
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>

        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.dark, fontFamily: typography.bold }]}>Debt Untangle</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => router.push('/settings')} style={[s.iconButton, { backgroundColor: colors.surface }]}>
              <Feather name="settings" size={22} color={colors.dark} />
            </Pressable>
            <Pressable onPress={openModal} style={[s.addButton, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={22} color="#1A1C1E" />
            </Pressable>
          </View>
        </View>

        <Text style={[s.sectionTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('yourGroups')}</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.dark} />
        ) : groups.length === 0 ? (
          <View style={s.emptyState}>
            <Feather name="users" size={44} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[s.emptyTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('noGroupsYet')}</Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted, fontFamily: typography.regular }]}>{t('tapToCreateGroup')}</Text>
          </View>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              icon={group.icon}
              title={group.name}
              currency={group.currency}
              status={group.status}
              statusText={group.statusText}
              onPress={() => {
                setActiveGroupId(group.id);
                router.push({ pathname: '/group', params: { groupId: group.id } });
              }}
            />
          ))
        )}

        {archivedGroups.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[s.sectionTitle, { color: colors.dark, fontFamily: typography.bold, opacity: 0.5 }]}>{t('archivedGroups')}</Text>
            {archivedGroups.map((group) => (
              <View key={group.id} style={{ opacity: 0.5 }}>
                <GroupCard
                  icon={group.icon}
                  title={group.name}
                  currency={group.currency}
                  status={group.status}
                  statusText={group.statusText}
                  onPress={() => {
                    setActiveGroupId(group.id);
                    router.push({ pathname: '/group', params: { groupId: group.id } });
                  }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={isModalVisible} onRequestClose={closeModal} animationType="none">
        <Animated.View style={[s.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <Animated.View style={[s.modalContent, { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] }]}>
            <View style={[s.dragHandle, { backgroundColor: colors.border }]} />

            <View style={s.modalHeaderRow}>
              <Text style={[s.modalTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('newGroup')}</Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Feather name="x" size={22} color={colors.dark} />
              </Pressable>
            </View>

            <View style={[s.modalDivider, { backgroundColor: colors.border }]} />

            <ScrollView contentContainerStyle={s.modalForm} keyboardShouldPersistTaps="handled">
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('groupName')}</Text>
                <TextInput
                  style={[s.textInput, { backgroundColor: colors.surface, color: colors.dark, fontFamily: typography.regular }]}
                  value={groupName} onChangeText={setGroupName}
                  placeholder={t('groupNamePlaceholder')} placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('icon')}</Text>
                <View style={s.emojiGrid}>
                  {ICON_OPTIONS.map((iconName) => (
                    <Pressable
                      key={iconName}
                      style={[s.emojiOption, { backgroundColor: selectedIcon === iconName ? colors.primary : colors.surface }]}
                      onPress={() => setSelectedIcon(iconName)}
                    >
                      <Feather name={iconName as any} size={20} color={selectedIcon === iconName ? "#1A1C1E" : colors.dark} />
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('currency')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <Pressable
                        key={c.code}
                        style={[s.currencyChip, { backgroundColor: currency === c.code ? colors.primary : colors.surface }]}
                        onPress={() => setCurrency(c.code)}
                      >
                        <Text style={[s.currencyChipText, { color: currency === c.code ? '#1A1C1E' : colors.textMuted }]}>
                          {c.code}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('yourName')}</Text>
                <TextInput
                  style={[s.textInput, { backgroundColor: colors.surface, color: colors.dark, fontFamily: typography.regular }]}
                  value={myName} onChangeText={setMyName}
                  placeholder={t('yourNamePlaceholder')} placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{t('otherMembers')}</Text>
                <View style={[s.membersContainer, { backgroundColor: colors.surface }]}>
                  {extraMembers.map((member, index) => (
                    <View key={index}>
                      {index > 0 && <View style={[s.memberDivider, { backgroundColor: colors.border }]} />}
                      <View style={s.memberRow}>
                        <TextInput
                          style={[s.memberInput, { color: colors.dark, fontFamily: typography.regular }]}
                          value={member} onChangeText={(v) => updateMember(index, v)}
                          placeholder={t('memberName')} placeholderTextColor={colors.textMuted}
                        />
                        {extraMembers.length > 1 && (
                          <Pressable onPress={() => removeMemberField(index)} hitSlop={8}>
                            <Feather name="x" size={18} color={colors.textMuted} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))}
                  <View style={[s.memberDivider, { backgroundColor: colors.border }]} />
                  <Pressable style={s.addMemberRow} onPress={addMemberField}>
                    <Feather name="plus" size={18} color={colors.dark} />
                    <Text style={[s.addMemberText, { color: colors.dark, fontFamily: typography.semiBold }]}>{t('addMember')}</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                style={[s.submitBtn, { backgroundColor: colors.primary, marginBottom: 48 }, submitting && { opacity: 0.5 }]}
                onPress={handleCreate} disabled={submitting}
              >
                <Text style={[s.submitBtnText, { color: '#1A1C1E', fontFamily: typography.bold }]}>
                  {submitting ? t('creating') : t('createGroup')}
                </Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea:        { flex: 1 },
  container:       { flex: 1 },
  content:         { paddingTop: 8, paddingBottom: 48 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, marginBottom: 8 },
  headerTitle:     { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  iconButton:      { width: 44, height: 44, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
  addButton:       { width: 44, height: 44, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:    { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, marginBottom: 16 },
  emptyState:      { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle:      { fontSize: 20, fontWeight: '700' },
  emptySubtitle:   { fontSize: 15 },
  // Modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent:    { height: '90%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 12 },
  dragHandle:      { width: 44, height: 4, borderRadius: radius.pill, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  modalTitle:      { fontSize: 18, fontWeight: '700' },
  modalDivider:    { height: 1 },
  modalForm:       { padding: 24, paddingBottom: 48 },
  // Form
  fieldGroup:      { marginBottom: 28 },
  fieldLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  textInput:       { borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16 },
  emojiGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiOption:     { width: 52, height: 52, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  emojiText:       { fontSize: 24 },
  currencyChip:    { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill },
  currencyChipText:{ fontSize: 14, fontWeight: '600' },
  membersContainer:{ borderRadius: radius.lg, overflow: 'hidden' },
  memberRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 4, gap: 12 },
  memberInput:     { flex: 1, fontSize: 16, paddingVertical: 14 },
  memberDivider:   { height: 1 },
  addMemberRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  addMemberText:   { fontSize: 16, fontWeight: '600' },
  submitBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: radius.pill, gap: 10 },
  submitBtnText:   { fontSize: 16 },
});
