import { regexDetector } from "../internal/regex";
import { swedishIdChecksum } from "../validation/luhn";
import { isValidIdentityDate } from "../validation/date";
import type { Detector, PiiLabel } from "../types";

/**
 * Swedish personal identity numbers (personnummer) and coordination
 * numbers (samordningsnummer).
 *
 * Format: YYMMDD±NNNC or YYYYMMDD-NNNC, where the second-to-last digit
 * is odd for men and even for women, and C is a Luhn check digit over
 * the last 10 digits. Coordination numbers store the day as day + 60.
 * The "+" separator marks people aged 100 or more.
 */
function buildIdentityNumberDetector(
  label: PiiLabel,
  sex: "male" | "female",
  kind: "personnummer" | "samordningsnummer"
): Detector {
  const fullYear = "(?:19|20)\\d{2}";
  const shortYear = "\\d{2}";
  const month = "(?:0[1-9]|1[0-2])";
  const day =
    kind === "personnummer"
      ? "(?:0[1-9]|[12]\\d|3[01])" // 01–31
      : "(?:6[1-9]|[78]\\d|9[01])"; // 61–91 (real day + 60)
  const sexDigit = sex === "male" ? "[13579]" : "[02468]";
  const suffix = `\\d{2}${sexDigit}\\d`;

  // 12 digits with optional hyphen, or 10 digits with mandatory - or +
  // (a bare 10-digit run is ambiguous with phone/bank numbers).
  const pattern = new RegExp(
    `\\b(?:${fullYear}${month}${day}-?${suffix}|${shortYear}${month}${day}[-+]${suffix})\\b`,
    "g"
  );

  const dayOffset = kind === "samordningsnummer" ? 60 : 0;
  return regexDetector(label, pattern, {
    validate: (match) => {
      const value = match[0];
      return swedishIdChecksum(value) && isValidIdentityDate(value, dayOffset);
    },
  });
}

export const malePersonnummer = buildIdentityNumberDetector(
  "SE_PERSONAL_IDENTITY_NUMBER_MALE",
  "male",
  "personnummer"
);

export const femalePersonnummer = buildIdentityNumberDetector(
  "SE_PERSONAL_IDENTITY_NUMBER_FEMALE",
  "female",
  "personnummer"
);

export const maleSamordningsnummer = buildIdentityNumberDetector(
  "SE_COORDINATION_NUMBER_MALE",
  "male",
  "samordningsnummer"
);

export const femaleSamordningsnummer = buildIdentityNumberDetector(
  "SE_COORDINATION_NUMBER_FEMALE",
  "female",
  "samordningsnummer"
);

export const idNumberDetectors: Detector[] = [
  malePersonnummer,
  femalePersonnummer,
  maleSamordningsnummer,
  femaleSamordningsnummer,
];
