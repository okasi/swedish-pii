import { regexDetector } from "../internal/regex";
import { isRealDate } from "../validation/date";
import type { Detector } from "../types";

/**
 * Swedish vehicle registration plate: three letters, two digits, then a
 * digit or letter (since 2019), e.g. ABC 123 or ABC 12A. The letters
 * I, Q, V, Å, Ä and Ö are never issued.
 */
export const seLicensePlate: Detector = regexDetector(
  "SE_LICENSE_PLATE",
  /\b[A-HJ-PR-UW-Z]{3}\s?\d{2}[0-9A-HJ-PR-UW-Z]\b/g
);

/** IPv4 address with octet-accurate ranges (0–255). */
export const ipAddress: Detector = regexDetector(
  "IP_ADDRESS",
  /(?<!\d\.)\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b(?!\.\d)/g
);

/** MAC address: six hex pairs with a consistent ":" or "-" separator. */
export const macAddress: Detector = regexDetector(
  "MAC_ADDRESS",
  /\b[0-9A-Fa-f]{2}([:-])(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}\b/g
);

/** ISO-style date (YYYY-MM-DD or YYYY/MM/DD) with a consistent separator. */
export const date: Detector = regexDetector(
  "DATE",
  /\b\d{4}([-/])(?:0[1-9]|1[0-2])\1(?:0[1-9]|[12]\d|3[01])\b/g,
  {
    validate: (match) => {
      const [y, m, d] = match[0].split(/[-/]/).map(Number);
      return isRealDate(y, m, d);
    },
  }
);

/** 24-hour time (HH:MM or HH:MM:SS). */
export const time: Detector = regexDetector(
  "TIME",
  /\b(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/g
);

export const miscDetectors: Detector[] = [
  seLicensePlate,
  ipAddress,
  macAddress,
  date,
  time,
];
