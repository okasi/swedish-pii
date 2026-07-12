import { contextAware, regexDetector } from "../internal/regex";
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

/**
 * Court and authority case numbers: "Dnr 2024/1123", "mål nr T 1234-20",
 * "ärendenummer 123/45". The prefix is part of the match, which makes
 * the pattern self-contextual.
 */
export const seCaseNumber: Detector = regexDetector(
  "SE_CASE_NUMBER",
  // (?<!…) instead of \b: "ärende" starts with a non-ASCII-word char.
  // Bare "mål" (no nr/nummer) needs an uppercase court-series letter
  // ("mål T 1234-20") — otherwise sports scores ("mål 3-2") match.
  /(?<![\p{L}\p{N}])(?:[Dd]nr|[Dd]iarienummer|[Mm]ål\s?(?:nr|nummer)|[Mm]ål(?=\s[A-ZÅÄÖ]{1,3}\s?\d)|[Ää]rende(?:nr|nummer)?)\.?:?\s?[A-ZÅÄÖ]{0,3}\s?\d{1,6}[-/]\d{1,6}\b/gu
);

/**
 * Pragmatic IPv6: the full 8-group form, or a "::"-compressed form with
 * at least two groups. Runs after MAC/TIME in the registry, whose
 * colon-separated shapes it must not reclaim.
 */
export const ipv6Address: Detector = regexDetector(
  "IP_ADDRESS",
  /(?<![\w:.])(?:(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}|(?:[A-Fa-f0-9]{1,4}:){1,6}:(?:[A-Fa-f0-9]{1,4}(?::[A-Fa-f0-9]{1,4}){0,5})?)(?![\w:.])/g
);

/**
 * Age, explicit forms: "34 år gammal", "i 70-årsåldern" style
 * "NN års ålder", "34 years old", "aged 34", "ålder: 34".
 */
export const ageExplicit: Detector = regexDetector(
  "AGE",
  /(?<![\p{L}\p{N}])(?:\d{1,3} ?år(?:s ålder| gammal| ung)|\d{1,3} ?years? old|aged \d{1,3}|ålder:? ?\d{1,3})(?![\p{L}\p{N}])/giu
);

/**
 * Age, bare "34 år": only near a verb/age cue ("är", "fyller"), since
 * the same shape is a duration ("för 5 år sedan", "10 års garanti").
 */
export const ageContextual: Detector = contextAware(
  regexDetector("AGE", /(?<![\p{L}\p{N}])\d{1,3} ?år(?![\p{L}\p{N}])/gu),
  { before: /(?:är|blir|fyller|fyllde|vid|ålder)[, ]*$/iu, window: 14 }
);

export const miscDetectors: Detector[] = [
  // Case numbers first: "Dnr 2024-1123" must win over the date shape.
  seCaseNumber,
  seLicensePlate,
  ipAddress,
  macAddress,
  date,
  time,
  // IPv6 after MAC and TIME, whose colon shapes overlap its pattern.
  ipv6Address,
  ageExplicit,
  ageContextual,
];
