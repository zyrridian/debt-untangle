import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Expense } from '../db/queries';
import { formatAmount } from '../lib/currency';
import { useAppStore, useColors, useTranslation } from '../store/useAppStore';
import { radius, typography } from '../theme';

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  food:      { icon: 'coffee',       color: '#F59E0B' },
  transport: { icon: 'truck',        color: '#3B82F6' },
  lodging:   { icon: 'home',         color: '#8B5CF6' },
  activity:  { icon: 'compass',      color: '#10B981' },
  shopping:  { icon: 'shopping-bag', color: '#EC4899' },
  other:     { icon: 'tag',          color: '#8D929A' },
};

interface ExpenseRowProps {
  expense: Expense;
  currency: string;
  onLongPress?: () => void;
}

export default function ExpenseRow({ expense, currency, onLongPress }: ExpenseRowProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const cat = CATEGORY_ICONS[expense.category] ?? CATEGORY_ICONS.other;

  return (
    <Pressable style={s.row} onLongPress={onLongPress}>
      <View style={[s.iconBox, { backgroundColor: colors.background }]}>
        <Feather name={cat.icon as any} size={18} color={colors.dark} />
      </View>
      <View style={s.textBlock}>
        <Text style={[s.description, { color: colors.dark, fontFamily: typography.semiBold }]} numberOfLines={1}>
          {expense.description}
        </Text>
        <Text style={[s.meta, { color: colors.textMuted, fontFamily: typography.regular }]}>
          {t('paidBy', { name: expense.paid_by_name })}
        </Text>
      </View>
      <Text style={[s.amount, { color: colors.dark, fontFamily: typography.bold }]}>
        {formatAmount(expense.amount_cents, currency)}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  iconBox:     { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  textBlock:   { flex: 1 },
  description: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  meta:        { fontSize: 13 },
  amount:      { fontSize: 15, fontWeight: '700' },
});
