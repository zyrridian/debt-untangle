/**
 * Format an amount in cents to a display string.
 * Handles currencies with no decimal places (JPY, IDR) automatically.
 */

const NO_DECIMAL_CURRENCIES = new Set(['JPY', 'IDR', 'KRW', 'VND']);

export function formatAmount(cents: number, currency: string): string {
  const isNoDecimal = NO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const value = isNoDecimal ? cents : cents / 100;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: isNoDecimal ? 0 : 2,
    maximumFractionDigits: isNoDecimal ? 0 : 2,
  }).format(value);
}

/**
 * Parse a user-entered string like "12.50" → 1250 (cents).
 * Returns 0 if invalid.
 */
export function parseToCents(input: string, currency: string): number {
  const isNoDecimal = NO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const num = parseFloat(input.replace(/,/g, ''));
  if (isNaN(num) || num < 0) return 0;
  return isNoDecimal ? Math.round(num) : Math.round(num * 100);
}

export function getCashStepCents(currency: string): number {
  const c = currency.toUpperCase();
  if (c === 'IDR' || c === 'VND') return 1000;
  if (c === 'JPY' || c === 'KRW' || ['USD', 'EUR', 'GBP', 'CHF'].includes(c)) return 100;
  return 1;
}

/**
 * Rounds an amount in cents to the nearest "cash" denomination for a given currency.
 * Used when settling debts to avoid unpayable physical cash amounts.
 */
export function roundForCash(cents: number, currency: string): number {
  const stepInCents = getCashStepCents(currency);
  return Math.round(cents / stepInCents) * stepInCents;
}

/** Currency symbol lookup */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CHF: 'CHF',
    JPY: '¥',
    IDR: 'Rp',
    KRW: '₩',
  };
  return symbols[currency.toUpperCase()] ?? currency;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'USD – US Dollar', symbol: '$' },
  { code: 'EUR', label: 'EUR – Euro', symbol: '€' },
  { code: 'GBP', label: 'GBP – British Pound', symbol: '£' },
  { code: 'CHF', label: 'CHF – Swiss Franc', symbol: 'CHF' },
  { code: 'JPY', label: 'JPY – Japanese Yen', symbol: '¥' },
  { code: 'IDR', label: 'IDR – Indonesian Rupiah', symbol: 'Rp' },
  { code: 'KRW', label: 'KRW – Korean Won', symbol: '₩' },
];
