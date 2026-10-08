import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MemberBalance } from '../db/queries';
import { formatAmount } from '../lib/currency';
import { useAppStore, useColors, useTranslation } from '../store/useAppStore';
import { radius, typography } from '../theme';

interface BalanceRowProps {
  balance: MemberBalance;
  currency: string;
  isMe: boolean;
}

export default function BalanceRow({ balance, currency, isMe }: BalanceRowProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const cents = balance.balance_cents;
  const isOwed = cents > 0;
  const isOwes = cents < 0;

  const statusColor = isOwed ? '#10B981' : isOwes ? colors.error : colors.textMuted;
  const statusText  = isOwed
    ? `+${formatAmount(cents, currency)}`
    : isOwes
    ? `-${formatAmount(-cents, currency)}`
    : t('settledUp');
  const badgeText = isOwed ? t('owedBadge') : isOwes ? t('owesBadge') : '✓';

  return (
    <View style={s.row}>
      <View style={[s.avatar, { borderColor: statusColor, backgroundColor: colors.surface }]}>
        <Text style={[s.avatarText, { color: statusColor, fontFamily: typography.extraBold }]}>
          {balance.member_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={s.info}>
        <Text style={[s.name, { color: colors.dark, fontFamily: typography.semiBold }]}>
          {balance.member_name}{isMe ? ` (${t('you')})` : ''}
        </Text>
        <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[s.badgeText, { color: statusColor, fontFamily: typography.extraBold }]}>{badgeText}</Text>
        </View>
      </View>
      <Text style={[s.amount, { color: statusColor, fontFamily: typography.bold }]}>
        {cents === 0 ? '—' : statusText}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  avatar:     { width: 44, height: 44, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  info:       { flex: 1, gap: 4 },
  name:       { fontSize: 15, fontWeight: '600' },
  badge:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  badgeText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  amount:     { fontSize: 16, fontWeight: '700' },
});
