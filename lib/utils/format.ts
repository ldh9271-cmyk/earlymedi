export function formatPercent(bp: number, locale: string = 'ko-KR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(bp / 10_000);
}

export function formatNumber(value: number, locale: string = 'ko-KR'): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function truncateMiddle(str: string, max: number = 16): string {
  if (str.length <= max) return str;
  const half = Math.floor((max - 1) / 2);
  return `${str.slice(0, half)}…${str.slice(-half)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}
