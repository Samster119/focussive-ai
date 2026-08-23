/* Shared time-period utilities.
   Extracted here so both TimeBackground and themeContext can import
   without creating a circular module dependency. */

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export function getTimePeriod(date: Date = new Date()): TimePeriod {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}
