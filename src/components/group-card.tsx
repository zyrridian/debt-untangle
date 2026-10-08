import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../store/useAppStore';
import { radius, typography } from '../theme';

export type GroupStatusType = 'owed' | 'owes' | 'settled';

interface GroupCardProps {
  icon: string;
  title: string;
  currency: string;
  status: GroupStatusType;
  statusText: string;
  onPress?: () => void;
}

export default function GroupCard({ icon, title, currency, status, statusText, onPress }: GroupCardProps) {
  const colors = useColors();

  const statusColor =
    status === 'owed'  ? '#F59E0B' :
    status === 'owes'  ? colors.error :
    colors.textMuted;

  const statusIconName =
    status === 'settled' ? 'check-circle' : 'credit-card';

  return (
    <Pressable style={s.wrapper} onPress={onPress}>
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <View style={s.topRow}>
          <View style={[s.iconBox, { backgroundColor: colors.primary }]}>
            <Feather name={icon as any} size={24} color="#1A1C1E" />
          </View>
          <View style={s.titleBlock}>
            <Text style={[s.title, { color: colors.dark, fontFamily: typography.bold }]} numberOfLines={1}>{title}</Text>
            <Text style={[s.currencyLabel, { color: colors.textMuted, fontFamily: typography.regular }]}>{currency}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </View>

        <View style={[s.divider, { backgroundColor: colors.border }]} />

        <View style={s.statusRow}>
          <Feather name={statusIconName} size={16} color={statusColor} />
          <Text style={[s.statusText, { color: statusColor, fontFamily: typography.semiBold }]}>{statusText}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrapper:     { paddingHorizontal: 16, paddingBottom: 8 },
  card:        { borderRadius: radius.lg, overflow: 'hidden' },
  topRow:      { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 14 },
  iconBox:     { width: 52, height: 52, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  iconText:    { fontSize: 26 },
  titleBlock:  { flex: 1 },
  title:       { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 3 },
  currencyLabel:{ fontSize: 13 },
  divider:     { height: 1, marginHorizontal: 20 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16 },
  statusText:  { fontSize: 14, fontWeight: '600' },
});