export function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid date: ${yyyyMmDd}`);
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function diffInDays(fromYmd: string, toYmd: string): number {
  const f = ymdToUtcMs(fromYmd);
  const t = ymdToUtcMs(toYmd);
  return Math.round((t - f) / 86_400_000);
}

function ymdToUtcMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid date: ${yyyyMmDd}`);
  }
  return Date.UTC(y, m - 1, d);
}
