import { japanMonth } from './automatic-sharing';

export function roomMonths(now = new Date()) {
  const [year, month] = japanMonth(now).split('-').map(Number);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

export const monthLabel = (month: string) => `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
