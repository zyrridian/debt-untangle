import { MemberBalance } from '../db/queries';

export interface Settlement {
  from_member_id: string;
  from_name: string;
  to_member_id: string;
  to_name: string;
  amount_cents: number;
}

/**
 * Greedy debt-simplification algorithm.
 * Takes an array of member balances and returns the minimum set of
 * transactions needed to settle all debts.
 *
 * Positive balance = you're owed money (creditor)
 * Negative balance = you owe money (debtor)
 *
 * This greedy approach is what Splitwise and similar apps use in production.
 * It's not provably optimal in every edge case (true minimum is NP-hard),
 * but in practice produces the same or near-same result with no perceptible
 * difference.
 */
export function settleDebts(balances: MemberBalance[]): Settlement[] {
  // Filter out settled members (balance == 0) and work with mutable copies
  const creditors = balances
    .filter((b) => b.balance_cents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance_cents - a.balance_cents); // highest first

  const debtors = balances
    .filter((b) => b.balance_cents < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balance_cents - b.balance_cents); // most negative first

  const settlements: Settlement[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    const amount = Math.min(creditor.balance_cents, -debtor.balance_cents);

    settlements.push({
      from_member_id: debtor.member_id,
      from_name: debtor.member_name,
      to_member_id: creditor.member_id,
      to_name: creditor.member_name,
      amount_cents: amount,
    });

    creditor.balance_cents -= amount;
    debtor.balance_cents += amount;

    if (creditor.balance_cents === 0) creditors.shift();
    if (debtor.balance_cents === 0) debtors.shift();
  }

  return settlements;
}
