/**
 * Utilities for formatting column values, numbers, currencies, dates, and labels.
 */

const CURRENCY_REGEX = /(fee|price|cost|salary|revenue|pay|amount|charge|bill|total_cost|avg_fee|average_fee)/i;
const PERCENT_REGEX = /(pct|percentage|rate|ratio|share|portion)/i;
const DATE_REGEX = /^\d{4}[-/.]\d{2}([-/.]\d{2})?/;

export function isCurrencyColumn(colName: string): boolean {
  return CURRENCY_REGEX.test(colName);
}

export function isPercentageColumn(colName: string): boolean {
  return PERCENT_REGEX.test(colName);
}

export function formatColumnLabel(colName: string): string {
  if (!colName) return '';
  return colName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatNumber(num: number, isCurrency: boolean = false, isPercent: boolean = false): string {
  if (isNaN(num) || num === null || num === undefined) return '—';

  if (isPercent) {
    const val = num > 1 ? num : num * 100;
    return `${val.toFixed(1)}%`;
  }

  if (isCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: num % 1 === 0 ? 0 : 2
    }).format(num);
  }

  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 10_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }

  return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}

export function formatDate(val: any): string {
  if (!val) return '—';
  const str = String(val).trim();
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;

  // If date string contains month name or year month
  if (str.length === 7 && /^\d{4}-\d{2}$/.test(str)) {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatCellValue(val: any, colName: string = ''): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'True' : 'False';

  const colLower = colName.toLowerCase();
  const isCurr = isCurrencyColumn(colLower);
  const isPct = isPercentageColumn(colLower);

  if (typeof val === 'number') {
    return formatNumber(val, isCurr, isPct);
  }

  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== '' && !colLower.endsWith('_id') && colLower !== 'id') {
      return formatNumber(num, isCurr, isPct);
    }
    if (DATE_REGEX.test(val)) {
      return formatDate(val);
    }
    return val;
  }

  return String(val);
}
