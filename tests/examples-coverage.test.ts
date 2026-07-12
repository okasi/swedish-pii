import { describe, expect, it } from "vitest";
import { detectPII } from "@/lib";
import type { PiiLabel } from "@/lib/types";
import { EXAMPLES } from "@/app/examples";

const ALL_LABELS: PiiLabel[] = [
  "PER_FIRST", "PER_LAST",
  "AMEX_CREDIT_CARD", "MASTERCARD_CREDIT_CARD", "VISA_CREDIT_CARD",
  "IBAN_CODE", "BIC_CODE", "SE_BANK_NUMBER",
  "SE_BANKGIRO", "SE_PLUSGIRO", "SE_VAT_NUMBER", "CRYPTO_WALLET",
  "SE_PERSONAL_IDENTITY_NUMBER_MALE", "SE_PERSONAL_IDENTITY_NUMBER_FEMALE",
  "SE_COORDINATION_NUMBER_MALE", "SE_COORDINATION_NUMBER_FEMALE",
  "SE_PASSPORT_NUMBER",
  "EMAIL_ADDRESS", "PHONE_NUMBER", "SOCIAL_MEDIA",
  "SE_STREET_ADDRESS", "SE_POSTAL_CODE", "SE_MUNICIPALITY", "SE_COUNTY",
  "SE_CITY", "SE_PROPERTY_DESIGNATION", "COORDINATE",
  "SE_WORK_ORGANIZATION", "SE_EDUCATION_ORGANIZATION",
  "SE_EDUCATION_PROGRAM", "SE_WORK_PROFESSION", "SE_ORGANIZATION_NUMBER",
  "MARITAL_STATUS", "GENETIC_SEX", "DISABILITY", "RELIGION",
  "SEXUAL_ORIENTATION", "DEMOGRAPHIC", "POLITICAL_IDEOLOGIES",
  "SE_LABOR_UNION",
  "SE_LICENSE_PLATE", "IP_ADDRESS", "MAC_ADDRESS", "DATE", "TIME",
  "SE_CASE_NUMBER", "AGE",
];

describe("playground examples", () => {
  const flagship = EXAMPLES[0];

  it("the flagship dossier triggers every one of the 47 labels", () => {
    const found = new Set(detectPII(flagship.text).map((e) => e.label));
    const missing = ALL_LABELS.filter((label) => !found.has(label));
    expect(missing, `missing labels: ${missing.join(", ")}`).toEqual([]);
    expect(ALL_LABELS).toHaveLength(47);
  });

  it("the flagship dossier survives strict mode almost intact", () => {
    // All checksummed values in the dossier are genuinely valid (Luhn,
    // mod-97, calendar dates), so strict mode keeps every one of them.
    const strictLabels = new Set(
      detectPII(flagship.text, { strict: true }).map((e) => e.label)
    );
    for (const label of [
      "SE_PERSONAL_IDENTITY_NUMBER_MALE",
      "SE_PERSONAL_IDENTITY_NUMBER_FEMALE",
      "SE_COORDINATION_NUMBER_MALE",
      "SE_COORDINATION_NUMBER_FEMALE",
      "VISA_CREDIT_CARD", "MASTERCARD_CREDIT_CARD", "AMEX_CREDIT_CARD",
      "IBAN_CODE", "SE_ORGANIZATION_NUMBER", "DATE",
      "SE_VAT_NUMBER", "SE_BANKGIRO", "SE_PLUSGIRO",
    ] as PiiLabel[]) {
      expect(strictLabels.has(label), `strict dropped ${label}`).toBe(true);
    }
  });

  it("all checksummed dossier entities score as validated", () => {
    const entities = detectPII(flagship.text);
    for (const entity of entities) {
      if (
        /IDENTITY|COORDINATION_NUMBER|CREDIT_CARD|IBAN|ORGANIZATION_NUMBER|VAT_NUMBER|BANKGIRO|PLUSGIRO/.test(
          entity.label
        )
      ) {
        expect(entity.score, `${entity.id} (${entity.value})`).toBe(0.95);
      }
    }
  });

  it("the clean-prose example yields zero entities", () => {
    expect(detectPII(EXAMPLES[2].text)).toEqual([]);
  });

  it("every example round-trips through mask offsets", () => {
    for (const example of EXAMPLES) {
      for (const entity of detectPII(example.text)) {
        expect(example.text.slice(entity.start, entity.end)).toBe(entity.value);
      }
    }
  });
});
