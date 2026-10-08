import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { getBalances, getGroups, getArchivedGroups, Group } from '../db/queries';
import { formatAmount } from '../lib/currency';
import { useTranslation } from '../store/useAppStore';

export type GroupStatus = 'owed' | 'owes' | 'settled';

export interface GroupWithStatus extends Group {
  status: GroupStatus;
  statusText: string;
  statusCents: number;
}

export function useGroups() {
  const { t, language } = useTranslation();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useFocusEffect(reload);

  const rawGroups = useMemo(() => getGroups(), [tick]);
  const rawArchivedGroups = useMemo(() => getArchivedGroups(), [tick]);

  const processGroups = useCallback((rawList: Group[]) => {
    return rawList.map((group) => {
      if (!group.my_member_id) {
        return { ...group, status: 'settled' as GroupStatus, statusText: t('settledUp'), statusCents: 0 };
      }

      const balances = getBalances(group.id);
      const myBalance = balances.find((b) => b.member_id === group.my_member_id);
      const cents = myBalance?.balance_cents ?? 0;

      let status: GroupStatus;
      let statusText: string;

      if (cents > 0) {
        status = 'owed';
        statusText = t('youAreOwed', { amount: formatAmount(cents, group.currency) });
      } else if (cents < 0) {
        status = 'owes';
        statusText = t('youOwe', { amount: formatAmount(-cents, group.currency) });
      } else {
        status = 'settled';
        statusText = t('settledUp');
      }

      return { ...group, status, statusText, statusCents: cents };
    });
  }, [language, t]);

  const groupsProcessed = useMemo(() => processGroups(rawGroups), [rawGroups, processGroups]);
  const archivedProcessed = useMemo(() => processGroups(rawArchivedGroups), [rawArchivedGroups, processGroups]);

  return { groups: groupsProcessed, archivedGroups: archivedProcessed, loading: false, reload };
}
