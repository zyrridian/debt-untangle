import { getDb } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  icon: string;
  currency: string;
  my_member_id: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  category: string;
  paid_by_member_id: string;
  paid_by_name: string; // joined from members
  date: string;
  created_at: string;
  splits: Split[];
}

export interface Split {
  id: string;
  expense_id: string;
  member_id: string;
  member_name: string; // joined from members
  share_cents: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Group queries ─────────────────────────────────────────────────────────────

export function getGroups(): Group[] {
  return getDb().getAllSync<Group>(
    'SELECT * FROM groups WHERE archived_at IS NULL ORDER BY created_at DESC'
  );
}

export function getArchivedGroups(): Group[] {
  return getDb().getAllSync<Group>(
    'SELECT * FROM groups WHERE archived_at IS NOT NULL ORDER BY archived_at DESC'
  );
}

export function getGroupById(id: string): Group | null {
  return getDb().getFirstSync<Group>('SELECT * FROM groups WHERE id = ?', [id]) ?? null;
}

export function createGroup(
  name: string,
  icon: string,
  currency: string,
  myMemberName: string
): Group {
  const db = getDb();
  const groupId = uuid();
  const memberId = uuid();
  const ts = now();

  db.runSync(
    'INSERT INTO groups (id, name, icon, currency, my_member_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [groupId, name, icon, currency, memberId, ts]
  );
  db.runSync(
    'INSERT INTO members (id, group_id, name, created_at) VALUES (?, ?, ?, ?)',
    [memberId, groupId, myMemberName, ts]
  );

  return db.getFirstSync<Group>('SELECT * FROM groups WHERE id = ?', [groupId])!;
}

export function updateGroupName(id: string, name: string): void {
  getDb().runSync('UPDATE groups SET name = ? WHERE id = ?', [name, id]);
}

export function archiveGroup(id: string): void {
  getDb().runSync('UPDATE groups SET archived_at = ? WHERE id = ?', [now(), id]);
}

export function unarchiveGroup(id: string): void {
  getDb().runSync('UPDATE groups SET archived_at = NULL WHERE id = ?', [id]);
}

export function deleteGroup(id: string): void {
  getDb().runSync('DELETE FROM groups WHERE id = ?', [id]);
}

// ─── Member queries ────────────────────────────────────────────────────────────

export function getMembers(groupId: string): Member[] {
  return getDb().getAllSync<Member>(
    'SELECT * FROM members WHERE group_id = ? ORDER BY created_at ASC',
    [groupId]
  );
}

export function addMember(groupId: string, name: string): Member {
  const db = getDb();
  const id = uuid();
  const ts = now();
  db.runSync(
    'INSERT INTO members (id, group_id, name, created_at) VALUES (?, ?, ?, ?)',
    [id, groupId, name, ts]
  );
  return db.getFirstSync<Member>('SELECT * FROM members WHERE id = ?', [id])!;
}

export function removeMember(id: string): void {
  getDb().runSync('DELETE FROM members WHERE id = ?', [id]);
}

// ─── Expense queries ───────────────────────────────────────────────────────────

export function getExpenses(groupId: string): Expense[] {
  const db = getDb();

  const rows = db.getAllSync<Omit<Expense, 'splits'>>(
    `SELECT e.*, m.name AS paid_by_name
     FROM expenses e
     JOIN members m ON m.id = e.paid_by_member_id
     WHERE e.group_id = ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [groupId]
  );

  return rows.map((row) => {
    const splits = db.getAllSync<Split>(
      `SELECT s.*, m.name AS member_name
       FROM splits s
       JOIN members m ON m.id = s.member_id
       WHERE s.expense_id = ?`,
      [row.id]
    );
    return { ...row, splits };
  });
}

export function createExpense(params: {
  groupId: string;
  description: string;
  amountCents: number;
  category: string;
  paidByMemberId: string;
  splitMemberIds: string[];
  date?: string;
  loserMemberId?: string;
  cashStepCents?: number;
}): void {
  const db = getDb();
  const expenseId = uuid();
  const ts = now();
  const date = params.date ?? today();

  db.runSync(
    'INSERT INTO expenses (id, group_id, description, amount_cents, category, paid_by_member_id, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [expenseId, params.groupId, params.description, params.amountCents, params.category, params.paidByMemberId, date, ts]
  );

  const count = params.splitMemberIds.length;
  let baseShare = Math.floor(params.amountCents / count);

  if (params.cashStepCents && params.cashStepCents > 1) {
    baseShare = Math.floor(baseShare / params.cashStepCents) * params.cashStepCents;
  }

  const remainder = params.amountCents - baseShare * count;
  const loserId = params.loserMemberId ?? params.splitMemberIds[0];

  params.splitMemberIds.forEach((memberId) => {
    const share = memberId === loserId ? baseShare + remainder : baseShare;
    db.runSync(
      'INSERT INTO splits (id, expense_id, member_id, share_cents) VALUES (?, ?, ?, ?)',
      [uuid(), expenseId, memberId, share]
    );
  });
}

export function deleteExpense(id: string): void {
  getDb().runSync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ─── Balance computation (pure DB read) ───────────────────────────────────────

export interface MemberBalance {
  member_id: string;
  member_name: string;
  /** positive = owed money, negative = owes money, cents */
  balance_cents: number;
}

export function getBalances(groupId: string): MemberBalance[] {
  return getDb().getAllSync<MemberBalance>(
    `SELECT
       m.id   AS member_id,
       m.name AS member_name,
       COALESCE(paid.total, 0) - COALESCE(owed.total, 0) AS balance_cents
     FROM members m
     LEFT JOIN (
       SELECT paid_by_member_id AS member_id, SUM(amount_cents) AS total
       FROM expenses WHERE group_id = ?
       GROUP BY paid_by_member_id
     ) paid ON paid.member_id = m.id
     LEFT JOIN (
       SELECT s.member_id, SUM(s.share_cents) AS total
       FROM splits s
       JOIN expenses e ON e.id = s.expense_id
       WHERE e.group_id = ?
       GROUP BY s.member_id
     ) owed ON owed.member_id = m.id
     WHERE m.group_id = ?
     ORDER BY balance_cents DESC`,
    [groupId, groupId, groupId]
  );
}
