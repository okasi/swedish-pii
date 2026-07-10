/**
 * Luhn (mod 10) checksum, used by payment card numbers, Swedish personal
 * identity numbers (personnummer), coordination numbers and organization
 * numbers.
 */
export function luhnCheck(digits: string): boolean {
  const cleaned = digits.replace(/\D/g, "");
  if (cleaned.length < 2) return false;

  let sum = 0;
  let double = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = cleaned.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Validate the checksum of a Swedish personnummer / samordningsnummer /
 * organisationsnummer. The Luhn sum is always computed over the final
 * 10 digits (century digits are excluded).
 */
export function swedishIdChecksum(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 12) return false;
  return luhnCheck(digits.slice(-10));
}
