import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  addMember,
  archiveGroup,
  deleteGroup,
  getMembers,
  getGroupById,
  Member,
  removeMember,
  Group,
  unarchiveGroup,
  updateGroupName,
} from "../db/queries";
import { useAppStore, useColors, useTranslation } from "../store/useAppStore";
import { radius, typography } from "../theme";

export default function GroupSettings() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const colors = useColors();
  const { t } = useTranslation();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  const load = () => {
    if (!groupId) return;
    const t = getGroupById(groupId);
    setGroup(t);
    setGroupName(t?.name ?? '');
    setMembers(getMembers(groupId));
  };

  useEffect(() => { load(); }, [groupId]);

  const handleSaveName = () => {
    const name = groupName.trim();
    if (!name || !groupId) return;
    updateGroupName(groupId, name);
    setGroup((prev) => prev ? { ...prev, name } : prev);
  };

  const handleAddMember = () => {
    const name = newMemberName.trim();
    if (!name || !groupId) return;
    addMember(groupId, name);
    setNewMemberName('');
    setMembers(getMembers(groupId));
  };

  const handleRemoveMember = (member: Member) => {
    Alert.alert(
      t('removeMemberTitle'),
      t('removeMemberConfirm').replace('{name}', member.name),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('removeMemberBtn'),
          style: 'destructive',
          onPress: () => {
            try {
              removeMember(member.id);
              setMembers(getMembers(groupId!));
            } catch {
              Alert.alert(t('cannotRemoveTitle'), t('cannotRemoveDesc'));
            }
          },
        },
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      t('archiveAlertTitle'),
      t('archiveAlertDesc'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('archive'),
          onPress: () => {
            archiveGroup(groupId!);
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleUnarchive = () => {
    unarchiveGroup(groupId!);
    router.replace('/');
  };

  const handleDelete = () => {
    Alert.alert(
      t('deleteAlertTitle'),
      t('deleteAlertDesc'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            deleteGroup(groupId!);
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: colors.surface }]} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.dark} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('settingsHeader')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Group Name */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('groupNameField')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.nameInput, { color: colors.dark }]}
            value={groupName}
            onChangeText={setGroupName}
            onEndEditing={handleSaveName}
            placeholder="Group name"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
          />
        </View>

        {/* Members */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('membersSection')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {members.map((member, i) => (
            <View key={member.id}>
              {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.memberAvatarText, { color: "#1A1C1E" }]}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.memberName, { color: colors.dark }]}>
                  {member.name}
                  {member.id === group?.my_member_id ? ' (you)' : ''}
                </Text>
                {member.id !== group?.my_member_id && (
                  <Pressable onPress={() => handleRemoveMember(member)} hitSlop={8}>
                    <Feather name="x" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Add new member inline */}
          <View style={styles.addMemberRow}>
            <Feather name="plus" size={18} color={colors.dark} />
            <TextInput
              style={[styles.addMemberInput, { color: colors.dark }]}
              value={newMemberName}
              onChangeText={setNewMemberName}
              placeholder={t('addMemberBtn')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleAddMember}
            />
            {newMemberName.trim().length > 0 && (
              <Pressable onPress={handleAddMember} hitSlop={8}>
                <Text style={[styles.addMemberConfirm, { color: colors.dark }]}>{t('add')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionLabel, { color: colors.error }]}>{t('dangerZoneSection')}</Text>

        {group?.archived_at ? (
          <Pressable style={[styles.archiveBtn, { backgroundColor: colors.surface }]} onPress={handleUnarchive}>
            <Feather name="corner-up-left" size={18} color={colors.textMuted} />
            <Text style={[styles.archiveBtnText, { color: colors.textMuted }]}>{t('unarchiveGroupBtn')}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.archiveBtn, { backgroundColor: colors.surface }]} onPress={handleArchive}>
            <Feather name="archive" size={18} color={colors.textMuted} />
            <Text style={[styles.archiveBtnText, { color: colors.textMuted }]}>{t('archiveGroupBtn')}</Text>
          </Pressable>
        )}

        <Pressable style={[styles.deleteBtn, { backgroundColor: colors.error }]} onPress={handleDelete}>
          <Feather name="trash-2" size={18} color="#FFFFFF" />
          <Text style={[styles.deleteBtnText, { color: "#FFFFFF" }]}>{t('deleteGroupBtn')}</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: typography.bold },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
  sectionLabel: { fontSize: 11, fontWeight: '700', fontFamily: typography.bold, letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  card: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: 32 },
  nameInput: { fontSize: 20, fontWeight: '700', fontFamily: typography.bold, paddingHorizontal: 20, paddingVertical: 18 },
  rowDivider: { height: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 16, fontWeight: '800', fontFamily: typography.extraBold },
  memberName: { flex: 1, fontSize: 16, fontWeight: '600', fontFamily: typography.semiBold },
  addMemberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4, gap: 12 },
  addMemberInput: { flex: 1, fontSize: 16, fontFamily: typography.regular, paddingVertical: 14 },
  addMemberConfirm: { fontSize: 15, fontWeight: '700', fontFamily: typography.bold },
  archiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingVertical: 18, marginBottom: 12, gap: 10 },
  archiveBtnText: { fontSize: 15, fontWeight: '700', fontFamily: typography.bold },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingVertical: 18, gap: 10 },
  deleteBtnText: { fontSize: 15, fontWeight: '700', fontFamily: typography.bold },
});
