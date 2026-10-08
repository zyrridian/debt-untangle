import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Expense, getBalances, getExpenses, getMembers, getGroupById, MemberBalance, Member, Group } from '../db/queries';
import { settleDebts, Settlement } from '../lib/settleDebts';

export interface GroupedExpenses {
  date: string; // YYYY-MM-DD
  items: Expense[];
}

export interface GroupDetailData {
  group: Group | null;
  members: Member[];
  groupedExpenses: GroupedExpenses[];
  balances: MemberBalance[];
  settlements: Settlement[];
  totalCents: number;
  loading: boolean;
  reload: () => void;
}

export function useGroupDetail(groupId: string): GroupDetailData {
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useFocusEffect(reload);

  const data = useMemo(() => {
    if (!groupId) return null;

    const group = getGroupById(groupId);
    const members = getMembers(groupId);
    const expensesData = getExpenses(groupId);
    const balances = getBalances(groupId);
    const settlements = settleDebts(balances);

    const grouped: Record<string, Expense[]> = {};
    for (const exp of expensesData) {
      if (!grouped[exp.date]) grouped[exp.date] = [];
      grouped[exp.date].push(exp);
    }
    const groupedExpenses: GroupedExpenses[] = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));

    const totalCents = expensesData.reduce((sum, e) => sum + e.amount_cents, 0);

    return { group, members, groupedExpenses, balances, settlements, totalCents };
  }, [groupId, tick]);

  if (!data) {
    return {
      group: null,
      members: [],
      groupedExpenses: [],
      balances: [],
      settlements: [],
      totalCents: 0,
      loading: true,
      reload,
    };
  }

  return { ...data, loading: false, reload };
}
