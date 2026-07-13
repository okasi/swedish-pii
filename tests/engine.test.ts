import { describe, expect, it } from "vitest";
import { detectPII, maskPII } from "@/lib";

describe("detectPII", () => {
  it("validates score thresholds and normalizes strict mode at runtime", () => {
    for (const scoreThreshold of [-0.1, 1.1, Infinity, Number.NaN]) {
      expect(() => detectPII("x", { scoreThreshold })).toThrow(RangeError);
    }

    const invalidCard = "4111 1111 1111 1112";
    expect(
      detectPII(invalidCard, { strict: "true" as unknown as boolean })
    ).toHaveLength(1);
  });

  it("returns entities with exact offsets", () => {
    const text = "Mejla anna.andersson@email.se innan 14:30.";
    const entities = detectPII(text);
    for (const entity of entities) {
      expect(text.slice(entity.start, entity.end)).toBe(entity.value);
    }
  });

  it("resolves overlaps by detector priority (no double masking)", () => {
    // A personnummer must not additionally be reported as a phone/bank number.
    const text = "pnr 811218-9876 slut";
    const labels = detectPII(text).map((e) => e.label);
    expect(labels).toEqual(["SE_PERSONAL_IDENTITY_NUMBER_MALE"]);
  });

  it("numbers ids per label in order of appearance", () => {
    const text = "nå 070-123 45 67 eller 070-765 43 21.";
    const ids = detectPII(text)
      .filter((e) => e.label === "PHONE_NUMBER")
      .map((e) => e.id);
    expect(ids).toEqual(["PHONE_NUMBER_1", "PHONE_NUMBER_2"]);
  });
});

describe("maskPII", () => {
  it("replaces entities with <LABEL_n> placeholders", () => {
    const { maskedText, maskedData } = maskPII("Mejla anna@email.se nu!");
    expect(maskedText).toBe("Mejla <EMAIL_ADDRESS_1> nu!");
    expect(maskedData.EMAIL_ADDRESS).toEqual([
      { id: "EMAIL_ADDRESS_1", value: "anna@email.se" },
    ]);
  });

  it("never re-matches inside placeholders (regression: sequential replace)", () => {
    // MASTERCARD placeholder text itself looks like a BIC code; ensure the
    // masked output contains exactly one placeholder.
    const { maskedText } = maskPII("kort 5555-4444-3333-1111 slut");
    expect(maskedText).toBe("kort <MASTERCARD_CREDIT_CARD_1> slut");
  });

  it("keeps surrounding text byte-for-byte", () => {
    const text = "  spaces\tand\nnewlines 14:30 kept  ";
    const { maskedText } = maskPII(text);
    expect(maskedText).toBe("  spaces\tand\nnewlines <TIME_1> kept  ");
  });

  it("returns empty results for text without PII", () => {
    const { maskedText, maskedData, entities } = maskPII("inget här");
    expect(maskedText).toBe("inget här");
    expect(maskedData).toEqual({});
    expect(entities).toEqual([]);
  });

  it("handles empty input", () => {
    expect(maskPII("").maskedText).toBe("");
  });

  it("masks the documented example end to end", () => {
    const text =
      "Anna Andersson was born on 1990-05-12 and lives at Storgatan 12, " +
      "114 55 Stockholm. Her IBAN is SE3550000000054910000003 and her " +
      "email is anna.andersson@email.se. Reach her at +46701234567. " +
      "Her car's license plate is ABC 123. Her computer's IP address is " +
      "192.168.1.1 and MAC address is 00:1A:2B:3C:4D:5E. " +
      "She has a meeting at 14:30 on 2024-06-01.";
    const { maskedText, maskedData } = maskPII(text);

    expect(maskedText).toContain("<PER_FIRST_1> <PER_LAST_1>");
    expect(maskedText).toContain("<DATE_1>");
    expect(maskedText).toContain("<SE_STREET_ADDRESS_1>");
    expect(maskedText).toContain("<SE_POSTAL_CODE_1>");
    expect(maskedText).toContain("<IBAN_CODE_1>");
    expect(maskedText).toContain("<EMAIL_ADDRESS_1>");
    expect(maskedText).toContain("<PHONE_NUMBER_1>");
    expect(maskedText).toContain("<SE_LICENSE_PLATE_1>");
    expect(maskedText).toContain("<IP_ADDRESS_1>");
    expect(maskedText).toContain("<MAC_ADDRESS_1>");
    expect(maskedText).toContain("<TIME_1>");

    expect(maskedData.PER_FIRST?.[0].value).toBe("Anna");
    expect(maskedData.PER_LAST?.[0].value).toBe("Andersson");
    expect(maskedData.EMAIL_ADDRESS?.[0].value).toBe(
      "anna.andersson@email.se"
    );

    // No raw PII left behind
    expect(maskedText).not.toContain("Anna");
    expect(maskedText).not.toContain("Andersson");
    expect(maskedText).not.toContain("anna.andersson@email.se");
    expect(maskedText).not.toContain("+46701234567");
    expect(maskedText).not.toContain("192.168.1.1");
  });

  it("supports strict mode via options", () => {
    const invalidCard = "kort 4111 1111 1111 1112 slut";
    expect(maskPII(invalidCard).maskedText).toContain("<VISA_CREDIT_CARD_1>");
    const strict = maskPII(invalidCard, { strict: true });
    expect(strict.maskedText).not.toContain("VISA_CREDIT_CARD");
  });
});
