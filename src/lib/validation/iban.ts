/**
 * IBAN mod-97 checksum (ISO 13616): move the first four characters to
 * the end, convert letters to numbers (A=10 … Z=35), and the whole
 * number must be ≡ 1 (mod 97). Computed digit-by-digit to stay within
 * safe integer range regardless of IBAN length.
 */
export function ibanChecksum(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) return false;

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value =
      char >= "0" && char <= "9"
        ? char
        : String(char.charCodeAt(0) - 55); // A=10 … Z=35
    for (const digit of value) {
      remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
    }
  }
  return remainder === 1;
}
