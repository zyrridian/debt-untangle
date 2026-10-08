import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from "react-native-safe-area-context";
import BalanceRow from "../components/BalanceRow";
import ExpenseRow from "../components/ExpenseRow";
import { createExpense, deleteExpense } from "../db/queries";
import { useGroupDetail } from "../hooks/useGroupDetail";
import { formatAmount, getCurrencySymbol, parseToCents, roundForCash, getCashStepCents } from "../lib/currency";
import { useAppStore, useColors, useTranslation } from "../store/useAppStore";
import { radius, typography } from "../theme";

const AnimatedEmptyIcon = ({ name }: { name: React.ComponentProps<typeof Feather>['name'] }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const colors = useColors();

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -12, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={{ transform: [{ translateY: anim }], marginBottom: 16, marginTop: 24 }}>
      <View style={{ backgroundColor: colors.surface, width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' }}>
        <Feather name={name} size={40} color={colors.primary} />
      </View>
    </Animated.View>
  );
};

const CATEGORIES = [
  { key: 'food',      labelKey: 'catFood',      icon: 'coffee' },
  { key: 'transport', labelKey: 'catTransport', icon: 'truck' },
  { key: 'lodging',   labelKey: 'catLodging',   icon: 'home' },
  { key: 'activity',  labelKey: 'catActivity',  icon: 'compass' },
  { key: 'shopping',  labelKey: 'catShopping',  icon: 'shopping-bag' },
  { key: 'other',     labelKey: 'catOther',     icon: 'tag' },
] as const;

export default function GroupDetail() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { group, members, groupedExpenses, balances, settlements, totalCents, loading, reload } =
    useGroupDetail(groupId ?? '');

  const colors = useColors();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'BALANCES' | 'SETTLE UP'>('EXPENSES');
  const [isCashRounding, setIsCashRounding] = useState(false);
  
  // Gacha states
  const [gachaVisible, setGachaVisible] = useState(false);
  const [gachaRemainder, setGachaRemainder] = useState(0);
  const [gachaLoserId, setGachaLoserId] = useState<string | null>(null);
  const [gachaSpinning, setGachaSpinning] = useState(false);
  const [gachaCurrentName, setGachaCurrentName] = useState('');

  const pagerRef = useRef<PagerView>(null);

  const handleTabPress = (tab: 'EXPENSES' | 'BALANCES' | 'SETTLE UP', index: number) => {
    setActiveTab(tab);
    pagerRef.current?.setPage(index);
  };

  // ── Add Expense modal ──────────────────────────────────────────────────────
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const expenseSlideAnim = useRef(new Animated.Value(800)).current;
  const expenseFadeAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [paidByMemberId, setPaidByMemberId] = useState<string>('');
  const [splitMemberIds, setSplitMemberIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const openExpenseModal = () => {
    const defaultPayer = group?.my_member_id ?? members[0]?.id ?? '';
    setPaidByMemberId(defaultPayer);
    setSplitMemberIds(new Set(members.map((m) => m.id)));
    setAmountText('');
    setDescription('');
    setCategory('food');

    setExpenseModalVisible(true);
    Animated.parallel([
      Animated.timing(expenseFadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(expenseSlideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  };

  const closeExpenseModal = () => {
    Animated.parallel([
      Animated.timing(expenseFadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(expenseSlideAnim, { toValue: 800, duration: 220, useNativeDriver: true }),
    ]).start(() => setExpenseModalVisible(false));
  };

  const toggleSplitMember = (memberId: string) => {
    const next = new Set(splitMemberIds);
    if (next.has(memberId)) {
      if (next.size === 1) return;
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    setSplitMemberIds(next);
  };

  const handleAddExpense = () => {
    const currency = group?.currency ?? 'USD';
    const cents = parseToCents(amountText, currency);

    if (!amountText || isNaN(Number(amountText))) {
      Alert.alert(t('error'), t('invalidAmountDesc'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('error'), t('missingDescriptionDesc'));
      return;
    }
    if (splitMemberIds.size === 0) {
      Alert.alert(t('error'), t('missingSplitDesc'));
      return;
    }

    // Check for un-splittable remainder
    const cashStep = getCashStepCents(currency);
    const count = splitMemberIds.size;
    const baseShare = Math.floor(cents / count);
    const roundedBase = Math.floor(baseShare / cashStep) * cashStep;
    const remainder = cents - (roundedBase * count);

    if (remainder > 0 && count > 1) {
      setGachaRemainder(remainder);
      setGachaLoserId(null);
      setGachaCurrentName('???');
      setGachaVisible(true);
      return;
    }

    executeSaveExpense(null);
  };

  const executeSaveExpense = (loserId: string | null) => {
    const currency = group?.currency ?? 'USD';
    try {
      setSubmitting(true);
      createExpense({
        groupId: group!.id,
        description: description.trim(),
        amountCents: parseToCents(amountText, currency),
        category,
        paidByMemberId,
        splitMemberIds: Array.from(splitMemberIds),
        cashStepCents: getCashStepCents(currency),
        loserMemberId: loserId || undefined,
      });
      setGachaVisible(false);
      setExpenseModalVisible(false);
      setTimeout(reload, 300);
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('cannotSaveExpenseDesc'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpinGacha = () => {
    if (gachaSpinning) return;
    setGachaSpinning(true);
    setGachaLoserId(null);
    const membersList = members.filter(m => splitMemberIds.has(m.id));
    let ticks = 0;
    const interval = setInterval(() => {
      setGachaCurrentName(membersList[ticks % membersList.length].name);
      ticks++;
      if (ticks > 20) {
        clearInterval(interval);
        const loser = membersList[Math.floor(Math.random() * membersList.length)];
        setGachaCurrentName(loser.name);
        setGachaLoserId(loser.id);
        setGachaSpinning(false);
      }
    }, 100);
  };

  const handleDeleteExpense = (expenseId: string, desc: string) => {
    Alert.alert(
      t('deleteAlertTitle'),
      desc,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => { deleteExpense(expenseId); reload(); } },
      ]
    );
  };

  const handleMarkPaid = (fromId: string, toId: string, exactAmount: number, displayAmount: number) => {
    if (!group) return;
    try {
      // 1. The actual cash payment made
      createExpense({
        groupId: group.id,
        description: t('payment'),
        amountCents: displayAmount,
        category: 'other',
        paidByMemberId: fromId,
        splitMemberIds: [toId],
      });

      // 2. The write-off / rounding adjustment
      const diff = exactAmount - displayAmount;
      if (diff !== 0) {
        // If diff > 0, the debtor underpaid. They "virtually" pay the remainder to clear it.
        // If diff < 0, the debtor overpaid. The creditor "virtually" pays the remainder back to clear it.
        const adjPaidBy = diff > 0 ? fromId : toId;
        const adjSplitWith = diff > 0 ? toId : fromId;

        createExpense({
          groupId: group.id,
          description: t('roundingAdjustment'),
          amountCents: Math.abs(diff),
          category: 'other',
          paidByMemberId: adjPaidBy,
          splitMemberIds: [adjSplitWith],
        });
      }

      reload();
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('cannotSaveExpenseDesc'));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading || !group) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.dark} />
      </SafeAreaView>
    );
  }

  const currency = group.currency;
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: colors.surface }]} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.dark} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.dark, fontFamily: typography.bold }]} numberOfLines={1}>{group.name}</Text>
        <Pressable
          onPress={() => router.push({ pathname: '/group-settings', params: { groupId: group.id } })}
          style={[styles.headerBtn, { backgroundColor: colors.surface }]}
          hitSlop={8}
        >
          <Feather name="settings" size={22} color={colors.dark} />
        </Pressable>
      </View>

      <View style={styles.container}>

        {/* Group hero */}
        <View style={[styles.heroRow, { paddingHorizontal: 20, paddingTop: 20 }]}>
          <Feather name={group.icon as any} size={44} color={colors.dark} />
          <View>
            <Text style={[styles.heroName, { color: colors.dark, fontFamily: typography.extraBold }]}>{group.name}</Text>
            <Text style={[styles.heroMeta, { color: colors.textMuted, fontFamily: typography.regular }]}>
              {members.length} {members.length !== 1 ? t('memberPlural') : t('memberSingular')} · {formatAmount(totalCents, currency)} {t('total')}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.surface, marginHorizontal: 20, marginBottom: 16 }]}>
          {(['EXPENSES', 'BALANCES', 'SETTLE UP'] as const).map((tab, index) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: colors.dark }]}
              onPress={() => handleTabPress(tab, index)}
            >
              <Text style={[styles.tabText, { color: colors.textMuted, fontFamily: typography.bold }, activeTab === tab && { color: colors.background }]}>
                {tab === 'EXPENSES' ? t('tabExpenses') : tab === 'BALANCES' ? t('tabBalances') : t('tabSettleUp')}
              </Text>
            </Pressable>
          ))}
        </View>

        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={0}
          onPageSelected={(e) => {
            setActiveTab(['EXPENSES', 'BALANCES', 'SETTLE UP'][e.nativeEvent.position] as any);
          }}
        >
          {/* ── EXPENSES TAB ──────────────────────────────────────────────────── */}
          <View key="0">
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 24 }}>
              {groupedExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <AnimatedEmptyIcon name="file-text" />
                <Text style={[styles.emptyTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('noExpensesYet')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: typography.regular }]}>{t('tapToAddExpense')}</Text>
              </View>
            ) : (
              groupedExpenses.map((group) => (
                <View key={group.date} style={styles.dateGroup}>
                  <Text style={[styles.dateLabel, { color: colors.textMuted, fontFamily: typography.bold }]}>
                    {new Date(group.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={[styles.expenseCard, { backgroundColor: colors.surface }]}>
                    {group.items.map((expense, i) => (
                      <View key={expense.id}>
                        {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                        <ExpenseRow
                          expense={expense}
                          currency={currency}
                          onLongPress={() => handleDeleteExpense(expense.id, expense.description)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
            </ScrollView>
          </View>

          {/* ── BALANCES TAB ──────────────────────────────────────────────────── */}
          <View key="1">
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 24 }}>
              {balances.length === 0 ? (
              <View style={styles.emptyState}>
                <AnimatedEmptyIcon name="pie-chart" />
                <Text style={[styles.emptyTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('noBalancesYet')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: typography.regular }]}>{t('addExpensesToSeeBalances')}</Text>
              </View>
            ) : (
              <View style={[styles.expenseCard, { backgroundColor: colors.surface }]}>
                {balances.map((b, i) => (
                  <View key={b.member_id}>
                    {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                    <BalanceRow balance={b} currency={currency} isMe={b.member_id === group.my_member_id} />
                  </View>
                ))}
              </View>
            )}
            </ScrollView>
          </View>

          {/* ── SETTLE UP TAB ─────────────────────────────────────────────────── */}
          <View key="2">
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 24 }}>
              {settlements.length === 0 ? (
              <View style={styles.emptyState}>
                <AnimatedEmptyIcon name="check-circle" />
                <Text style={[styles.emptyTitle, { color: colors.dark, fontFamily: typography.bold }]}>{t('allSettledUp')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: typography.regular }]}>{t('noPaymentsNeeded')}</Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={styles.roundingToggleRow}>
                  <Text style={[styles.roundingLabel, { color: colors.dark, fontFamily: typography.semiBold }]}>
                    {t('cashRoundingToggle')}
                  </Text>
                  <Switch 
                    value={isCashRounding} 
                    onValueChange={setIsCashRounding} 
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={isCashRounding ? '#1A1C1E' : '#FFFFFF'}
                  />
                </View>
                {settlements.map((s, i) => {
                  const displayCents = isCashRounding ? roundForCash(s.amount_cents, currency) : s.amount_cents;
                  // If rounding drops it to 0, you might want to hide it, but let's just display 0
                  return (
                  <View key={i} style={[styles.settleCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.settleTop}>
                      <View style={styles.settleParty}>
                        <Text style={[styles.settleRole, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('settleFrom')}</Text>
                        <Text style={[styles.settleInitials, { color: colors.dark, fontFamily: typography.extraBold }]}>
                          {s.from_name.substring(0, 3).toUpperCase()}
                        </Text>
                        <Text style={[styles.settleName, { color: colors.textMuted, fontFamily: typography.regular }]}>{s.from_name}</Text>
                      </View>

                      <Feather name="send" size={18} color={colors.textMuted} style={{ transform: [{ rotate: '-45deg' }] }} />

                      <View style={[styles.settleParty, { alignItems: 'flex-end' }]}>
                        <Text style={[styles.settleRole, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('settleTo')}</Text>
                        <Text style={[styles.settleInitials, { color: colors.dark, fontFamily: typography.extraBold }]}>
                          {s.to_name.substring(0, 3).toUpperCase()}
                        </Text>
                        <Text style={[styles.settleName, { color: colors.textMuted, fontFamily: typography.regular }]}>{s.to_name}</Text>
                      </View>
                    </View>

                    <View style={styles.settleSeparator}>
                      <View style={[styles.settleCircle, { backgroundColor: colors.background }]} />
                      <View style={[styles.dashedLine, { borderColor: colors.border }]} />
                      <Feather name="scissors" size={14} color={colors.border} />
                      <View style={[styles.dashedLine, { borderColor: colors.border }]} />
                      <View style={[styles.settleCircle, { backgroundColor: colors.background }]} />
                    </View>

                    <View style={styles.settleBottom}>
                      <View>
                        <Text style={[styles.settleAmountLabel, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('amountDue')}</Text>
                        <Text style={[styles.settleAmount, { color: colors.dark, fontFamily: typography.extraBold }]}>
                          {formatAmount(displayCents, currency)}
                        </Text>
                      </View>
                      <Pressable 
                        style={[styles.payBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleMarkPaid(s.from_member_id, s.to_member_id, s.amount_cents, displayCents)}
                      >
                        <Text style={[styles.payBtnText, { color: '#1A1C1E', fontFamily: typography.extraBold }]}>{t('markPaid')}</Text>
                      </Pressable>
                    </View>
                  </View>
                  );
                })}
              </View>
            )}
            </ScrollView>
          </View>
        </PagerView>
      </View>

      {/* FAB */}
      {activeTab === 'EXPENSES' && (
        <Pressable style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openExpenseModal}>
          <Feather name="plus" size={20} color="#1A1C1E" />
          <Text style={[styles.fabText, { color: '#1A1C1E', fontFamily: typography.extraBold }]}>{t('fabAddExpense')}</Text>
        </Pressable>
      )}

      {/* ── Add Expense Modal ────────────────────────────────────────────────── */}
      <Modal transparent visible={isExpenseModalVisible} onRequestClose={closeExpenseModal} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: expenseFadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeExpenseModal} />

          <Animated.View style={[styles.modalContent, { backgroundColor: colors.background, transform: [{ translateY: expenseSlideAnim }] }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.dark, fontFamily: typography.extraBold }]}>{t('addExpenseModalTitle')}</Text>
              <Pressable onPress={closeExpenseModal} hitSlop={12}>
                <Feather name="x" size={22} color={colors.dark} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">

              {/* Amount */}
              <View style={styles.amountSection}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('amountField')}</Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, { color: colors.dark, fontFamily: typography.extraBold }]}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.dark, fontFamily: typography.extraBold }]}
                    value={amountText} onChangeText={setAmountText}
                    keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.border} selectTextOnFocus
                  />
                </View>
                <View style={[styles.amountUnderline, { backgroundColor: colors.border }]} />
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('descriptionField')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.dark, fontFamily: typography.regular }]}
                  value={description} onChangeText={setDescription}
                  placeholder={t('descriptionPlaceholder')} placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('categoryField')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryRow}>
                    {CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat.key}
                        style={[styles.categoryBtn, { backgroundColor: category === cat.key ? colors.dark : colors.surface }]}
                        onPress={() => setCategory(cat.key)}
                      >
                        <Feather name={cat.icon} size={15} color={category === cat.key ? colors.background : colors.textMuted} />
                        <Text style={[styles.categoryText, { color: category === cat.key ? colors.background : colors.textMuted, fontFamily: typography.semiBold }]}>
                          {t(cat.labelKey as any)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Paid by */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('paidByField')}</Text>
                <View style={styles.memberChipRow}>
                  {members.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[styles.memberChip, { backgroundColor: paidByMemberId === m.id ? colors.dark : colors.surface }]}
                      onPress={() => setPaidByMemberId(m.id)}
                    >
                      <Text style={[styles.memberChipText, { color: paidByMemberId === m.id ? colors.background : colors.textMuted, fontFamily: typography.semiBold }]}>
                        {m.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Split between */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: typography.bold }]}>{t('splitBetweenField')}</Text>
                <View style={styles.memberChipRow}>
                  {members.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[styles.memberChip, { backgroundColor: splitMemberIds.has(m.id) ? colors.dark : colors.surface }]}
                      onPress={() => toggleSplitMember(m.id)}
                    >
                      <Text style={[styles.memberChipText, { color: splitMemberIds.has(m.id) ? colors.background : colors.textMuted, fontFamily: typography.semiBold }]}>
                        {m.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { backgroundColor: colors.background }]}>
              <Pressable
                style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.5 }]}
                onPress={handleAddExpense} disabled={submitting}
              >
                <Text style={[styles.submitBtnText, { color: '#1A1C1E', fontFamily: typography.extraBold }]}>
                  {submitting ? t('adding') : t('add')}
                </Text>
                <Feather name="check" size={18} color="#1A1C1E" />
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Gacha Modal */}
      <Modal visible={gachaVisible} animationType="fade" transparent onRequestClose={() => !gachaSpinning && setGachaVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, paddingVertical: 40 }]}>
            <Text style={[{ color: colors.dark, fontFamily: typography.extraBold, fontSize: 24, textAlign: 'center', marginBottom: 20 }]}>
              {t('gachaTitle')}
            </Text>

            <View style={styles.gachaBox}>
              <Text style={[{ color: gachaLoserId ? colors.primary : colors.dark, fontFamily: typography.extraBold, fontSize: 32, textAlign: 'center' }]}>
                {gachaCurrentName}
              </Text>
            </View>

            {gachaLoserId ? (
              <View style={{ gap: 24, marginTop: 20 }}>
                <Text style={[{ color: colors.textMuted, fontFamily: typography.semiBold, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 }]}>
                  {t('gachaResult', { name: gachaCurrentName, amount: formatAmount(gachaRemainder, currency) })}
                </Text>
                <Pressable
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={() => executeSaveExpense(gachaLoserId)}
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#1A1C1E" /> : <Text style={[styles.submitBtnText, { color: '#1A1C1E' }]}>{t('gachaConfirm')}</Text>}
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 24, marginTop: 20 }}>
                <Text style={[{ color: colors.textMuted, fontFamily: typography.regular, fontSize: 15, textAlign: 'center', paddingHorizontal: 20 }]}>
                  Remaining: {formatAmount(gachaRemainder, currency)}
                </Text>
                <Pressable
                  style={[styles.submitBtn, { backgroundColor: colors.dark }]}
                  onPress={handleSpinGacha}
                  disabled={gachaSpinning}
                >
                  <Text style={[styles.submitBtnText, { color: colors.background }]}>{t('gachaSpin')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', marginHorizontal: 12 },
  container: { flex: 1 },
  content: { paddingBottom: 120 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  heroEmoji: { fontSize: 44 },
  heroName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  heroMeta: { fontSize: 14 },
  tabsContainer: { flexDirection: 'row', borderRadius: radius.pill, padding: 5, marginHorizontal: 20, marginBottom: 28 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.pill },
  tabText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  tabContent: { paddingHorizontal: 20 },
  dateGroup: { marginBottom: 24 },
  dateLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 10, paddingHorizontal: 4 },
  expenseCard: { borderRadius: radius.lg, overflow: 'hidden' },
  rowDivider: { height: 1, marginHorizontal: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14 },
  settleCard: { borderRadius: radius.lg, padding: 24 },
  settleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settleParty: { gap: 2 },
  settleRole: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  settleInitials: { fontSize: 22, fontWeight: '800' },
  settleName: { fontSize: 13 },
  settleSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 4 },
  settleCircle: { width: 10, height: 10, borderRadius: 5 },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed' },
  settleBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  settleAmountLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  settleAmount: { fontSize: 26, fontWeight: '800' },
  payBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill },
  payBtnText: { fontSize: 12, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 64, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: radius.pill, gap: 8 },
  fabText: { fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { height: '90%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 12 },
  dragHandle: { width: 44, height: 4, borderRadius: radius.pill, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalForm: { paddingHorizontal: 24, paddingBottom: 16, gap: 0 },
  fieldGroup: { marginBottom: 28 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  textInput: { borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16 },
  amountSection: { alignItems: 'center', marginBottom: 36 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  currencySymbol: { fontSize: 28, fontWeight: '800' },
  amountInput: { fontSize: 52, fontWeight: '800', minWidth: 120, textAlign: 'center' },
  amountUnderline: { width: '80%', height: 1, marginTop: 12 },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  categoryText: { fontSize: 13, fontWeight: '600' },
  memberChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  memberChipText: { fontSize: 14, fontWeight: '600' },
  modalFooter: { padding: 24, paddingBottom: 40 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: radius.pill, gap: 10 },
  submitBtnText: { fontWeight: '800', fontSize: 16 },
  addMemberText: { fontSize: 15 },
  roundingToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 8 },
  roundingLabel: { fontSize: 15 },
  gachaBox: { backgroundColor: 'rgba(0,0,0,0.05)', paddingVertical: 32, paddingHorizontal: 20, borderRadius: radius.lg, marginVertical: 20 },
});
