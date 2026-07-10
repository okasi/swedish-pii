/**
 * True when year/month/day form a real calendar date (leap years included).
 * Month and day are 1-based.
 */
export function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/**
 * Validate the date part of a Swedish identity number.
 *
 * @param digits - The identity number's digits (10 or 12, separators removed).
 * @param dayOffset - 60 for samordningsnummer (day is stored as day + 60).
 */
export function isValidIdentityDate(digits: string, dayOffset = 0): boolean {
  const cleaned = digits.replace(/\D/g, "");
  let year: number;
  let rest: string;

  if (cleaned.length === 12) {
    year = Number(cleaned.slice(0, 4));
    rest = cleaned.slice(4);
  } else if (cleaned.length === 10) {
    // Two-digit year: resolve to the most recent century that is not in
    // the future (the "+" separator for 100+ year olds is handled by the
    // caller keeping the raw string; for validation both centuries are ok).
    const twoDigit = Number(cleaned.slice(0, 2));
    const currentYear = new Date().getFullYear();
    year = 2000 + twoDigit > currentYear ? 1900 + twoDigit : 2000 + twoDigit;
    rest = cleaned.slice(2);
  } else {
    return false;
  }

  const month = Number(rest.slice(0, 2));
  const day = Number(rest.slice(2, 4)) - dayOffset;
  if (year > new Date().getFullYear()) return false;
  return isRealDate(year, month, day);
}
