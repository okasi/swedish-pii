import { describe, expect, it } from "vitest";
import { detectPII, detectors, maskPII } from "@/lib";
import { personNames } from "@/lib/detectors/names";

describe("detector registry", () => {
  it("runs multi-word OSM streets, then person names, first", () => {
    expect(detectors[0].labels).toEqual(["SE_STREET_ADDRESS"]);
    expect(detectors[1]).toBe(personNames);
  });

  it("has no duplicate detectors", () => {
    expect(new Set(detectors).size).toBe(detectors.length);
  });

  it("covers every category with at least one detector", () => {
    const labels = new Set(detectors.flatMap((d) => d.labels));
    for (const expected of [
      "PER_FIRST",
      "SE_PERSONAL_IDENTITY_NUMBER_MALE",
      "VISA_CREDIT_CARD",
      "EMAIL_ADDRESS",
      "SE_STREET_ADDRESS",
      "SE_WORK_ORGANIZATION",
      "MARITAL_STATUS",
      "SE_LICENSE_PLATE",
    ]) {
      expect(labels.has(expected as never)).toBe(true);
    }
  });
});

describe("overlap priority", () => {
  const soleLabel = (text: string) => {
    const entities = detectPII(text);
    expect(entities).toHaveLength(1);
    return entities[0].label;
  };

  it("personnummer beats bank number and phone number", () => {
    expect(soleLabel("811218-9876")).toBe("SE_PERSONAL_IDENTITY_NUMBER_MALE");
    expect(soleLabel("198112189876")).toBe("SE_PERSONAL_IDENTITY_NUMBER_MALE");
  });

  it("coordination number beats bank number", () => {
    expect(soleLabel("811278-9876")).toBe("SE_COORDINATION_NUMBER_MALE");
  });

  it("organization number beats bank number", () => {
    expect(soleLabel("556012-5790")).toBe("SE_ORGANIZATION_NUMBER");
  });

  it("credit card beats bank number", () => {
    expect(soleLabel("5105105105105100")).toBe("MASTERCARD_CREDIT_CARD");
  });

  it("IBAN beats bank number and postal code", () => {
    expect(soleLabel("SE3550000000054910000003")).toBe("IBAN_CODE");
  });

  it("phone number beats bank number", () => {
    expect(soleLabel("+46701234567")).toBe("PHONE_NUMBER");
    expect(soleLabel("0701234567")).toBe("PHONE_NUMBER");
  });

  it("clearing+account digits with account context resolve to bank number", () => {
    expect(soleLabel("konto 8327-9123456")).toBe("SE_BANK_NUMBER");
  });

  it("email beats social media for the @-part", () => {
    const labels = detectPII("mejla anna@email.se").map((e) => e.label);
    expect(labels).toEqual(["EMAIL_ADDRESS"]);
  });

  it("street address beats postal-code-sized digit runs inside it", () => {
    const entities = detectPII("Storgatan 1234 i stan");
    expect(entities.map((e) => e.label)).toEqual(["SE_STREET_ADDRESS"]);
    expect(entities[0].value).toBe("Storgatan 1234");
  });

  it("multi-word OSM street beats the surname reading of its words", () => {
    // "By" is a registered surname; the street must stay in one piece.
    const { maskedText, entities } = maskPII("Möt mig vid Akalla By kl 14:30");
    expect(maskedText).toBe("Möt mig vid <SE_STREET_ADDRESS_1> kl <TIME_1>");
    expect(entities[0].value).toBe("Akalla By");
  });

  it("single-word OSM street yields to the name reading", () => {
    // "Aspen" is both an OSM street and a registered name — the name
    // interpretation wins for a lone capitalized word.
    const labels = detectPII("Aspen").map((e) => e.label);
    expect(labels.length).toBeLessThanOrEqual(1);
    if (labels.length === 1) {
      expect(["PER_FIRST", "PER_LAST"]).toContain(labels[0]);
    }
  });
});

describe("engine invariants", () => {
  const fixture =
    "Anna Andersson (pnr 811218-9876) på Storgatan 12, 114 55 Åre kommun, " +
    "mejl anna@email.se, tel 070-123 45 67, kör ABC 123, IBAN " +
    "SE3550000000054910000003, jobbar på Volvo AB, org.nr 556012-5790, " +
    "möte 2024-06-01 kl 14:30 från 192.168.1.1.";

  it("returns entities sorted by start offset", () => {
    const entities = detectPII(fixture);
    for (let i = 1; i < entities.length; i++) {
      expect(entities[i].start).toBeGreaterThanOrEqual(entities[i - 1].start);
    }
  });

  it("produces strictly non-overlapping entities", () => {
    const entities = detectPII(fixture);
    for (let i = 1; i < entities.length; i++) {
      expect(entities[i].start).toBeGreaterThanOrEqual(entities[i - 1].end);
    }
  });

  it("keeps maskedData in sync with entities", () => {
    const { maskedData, entities } = maskPII(fixture);
    const flattened = Object.values(maskedData).flat();
    expect(flattened).toHaveLength(entities.length);
    for (const entity of entities) {
      expect(flattened).toContainEqual({ id: entity.id, value: entity.value });
    }
  });

  it("assigns ids that are unique and sequential per label", () => {
    const text = "kl 09:00, kl 10:00 och kl 11:00";
    const ids = detectPII(text).map((e) => e.id);
    expect(ids).toEqual(["TIME_1", "TIME_2", "TIME_3"]);
  });

  it("masks every entity exactly once in the output", () => {
    const { maskedText, entities } = maskPII(fixture);
    for (const entity of entities) {
      const occurrences = maskedText.split(`<${entity.id}>`).length - 1;
      expect(occurrences).toBe(1);
    }
  });

  it("defaults to lenient mode", () => {
    const invalid = "4111 1111 1111 1112";
    expect(detectPII(invalid)).toHaveLength(1);
    expect(detectPII(invalid, {})).toHaveLength(1);
    expect(detectPII(invalid, { strict: true })).toHaveLength(0);
  });

  it("detects everything in the mixed fixture", () => {
    const labels = new Set(detectPII(fixture).map((e) => e.label));
    for (const expected of [
      "PER_FIRST",
      "PER_LAST",
      "SE_PERSONAL_IDENTITY_NUMBER_MALE",
      "SE_STREET_ADDRESS",
      "SE_POSTAL_CODE",
      "SE_MUNICIPALITY",
      "EMAIL_ADDRESS",
      "PHONE_NUMBER",
      "SE_LICENSE_PLATE",
      "IBAN_CODE",
      "SE_ORGANIZATION_NUMBER",
      "DATE",
      "TIME",
      "IP_ADDRESS",
    ]) {
      expect(labels.has(expected as never), `missing ${expected}`).toBe(true);
    }
  });
});
