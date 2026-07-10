import { describe, expect, it } from "vitest";
import { detectPII } from "@/lib";
import type { Detector } from "@/lib/types";
import { DEFAULT_SCORE_THRESHOLD } from "@/lib/internal/regex";
import { personNames } from "@/lib/detectors/names";
import { bicCode, ibanCode, seBankNumber } from "@/lib/detectors/financial";
import { emailAddress, socialMedia } from "@/lib/detectors/contact";
import {
  geneticSex,
  maritalStatusAmbiguous,
} from "@/lib/detectors/sensitiveAttributes";
import { seLicensePlate } from "@/lib/detectors/misc";

function values(detector: Detector, text: string): string[] {
  return detector
    .detect(text, { strict: false, scoreThreshold: DEFAULT_SCORE_THRESHOLD })
    .filter((s) => s.score >= DEFAULT_SCORE_THRESHOLD)
    .map((s) => s.value);
}

/**
 * Regression tests for false positives. Three tiers:
 *
 * 1. Clean prose must produce ZERO entities — the strongest guarantee.
 * 2. Per-detector guards for specific traps we have fixed.
 * 3. Documented tradeoffs: false positives we consciously accept. These
 *    assert CURRENT behavior so that any change — fix or regression —
 *    shows up in the test run instead of slipping by silently.
 */

describe("clean prose produces zero entities", () => {
  const cleanTexts = [
    // Swedish office prose: sentence-initial pronouns ("Vi", "Han",
    // "Hon", "Det") are registered SCB names and used to be masked.
    "Vi ses efter mötet imorgon. Han tar med rapporten och hon presenterar planen. Det blir bra.",
    "Men det viktigaste är att kunden blir nöjd. Om inte, tar vi det igen nästa vecka.",
    "Nu börjar vi. Alla ska lämna synpunkter innan fredag. Ja, även styrelsen.",
    "Det kostar 10 000 kr i månaden och betalas kvartalsvis.",
    "Under veckan planerar bolaget nya satsningar i Sverige.",
    // English office prose ("The", "This", "She" are also SCB names).
    "The customer was happy with the report. This will be signed next week.",
    "She said the numbers are fine. They will review them when possible.",
    // Pure numbers that are not identifiers
    "Kapitel 7, sidan 42, stycke 3.",
    "Versionen är 2.4 och bygget tar 90 sekunder.",
    // Ten digits without account context (used to read as a bank number)
    "Fakturanummer 8123456789 förfaller i mars.",
    // Five digits without address context (used to read as a postal code)
    "Vi har sålt 11455 exemplar hittills.",
  ];

  for (const text of cleanTexts) {
    it(`does not mask: "${text.slice(0, 50)}…"`, () => {
      expect(detectPII(text)).toEqual([]);
    });
  }
});

describe("function words are never masked as names", () => {
  it("skips Swedish pronouns and conjunctions that are registered names", () => {
    for (const word of ["Vi", "Han", "Hon", "Men", "Om", "Nu", "Ja", "Alla", "Man", "Den", "En", "Ett"]) {
      expect(
        values(personNames, `${word} bestämde sig igår`),
        word
      ).toEqual([]);
    }
  });

  it("skips English function words that are registered names", () => {
    for (const word of ["The", "She", "He", "This", "All", "When"]) {
      expect(values(personNames, `${word} arrived late`), word).toEqual([]);
    }
  });

  it("skips 'Ring' — the Swedish imperative for 'call'", () => {
    expect(values(personNames, "Ring mig imorgon")).toEqual([]);
  });

  it("still catches a real surname next to a stopword", () => {
    expect(values(personNames, "Men Andersson då?")).toEqual(["Andersson"]);
  });

  it("still catches real full names — the stoplist must not overreach", () => {
    expect(values(personNames, "Anna Andersson kom hem")).toEqual([
      "Anna",
      "Andersson",
    ]);
  });
});

describe("financial code guards", () => {
  it("does not read ALL-CAPS words as BIC codes (ISO country check)", () => {
    for (const word of ["PASSWORD", "SHOUTING", "DOWNLOAD", "KEYBOARD", "STOCKHOLM"]) {
      expect(values(bicCode, `error: ${word} rejected`), word).toEqual([]);
    }
  });

  it("requires BIC/SWIFT context even for country-valid shapes", () => {
    // "FEEDBACK" carries a valid ISO code (BA) in the country position
    expect(values(bicCode, "your FEEDBACK matters")).toEqual([]);
    expect(values(bicCode, "SWIFT code FEEDBACK")).toEqual(["FEEDBACK"]);
  });

  it("requires account context for bank numbers", () => {
    expect(values(seBankNumber, "ordernummer 8327-9123456")).toEqual([]);
    expect(values(seBankNumber, "kontonummer 8327-9123456")).toEqual([
      "8327-9123456",
    ]);
  });

  it("still accepts real BICs after the country-code tightening", () => {
    expect(values(bicCode, "BIC: ESSESESS")).toEqual(["ESSESESS"]);
    expect(values(bicCode, "BIC: DEUTDEFF500")).toEqual(["DEUTDEFF500"]);
    expect(values(bicCode, "BIC: NDEASESS")).toEqual(["NDEASESS"]);
  });

  it("rejects IBAN-shaped strings with an invalid country code", () => {
    expect(values(ibanCode, "AB12 CDEF GHIJ KLMN OPQR")).toEqual([]);
    expect(values(ibanCode, "XX90 1234 5678 9012 3456")).toEqual([]);
  });

  it("still accepts real IBANs after the country-code tightening", () => {
    expect(values(ibanCode, "SE3550000000054910000003")).toEqual([
      "SE3550000000054910000003",
    ]);
  });
});

describe("contact guards", () => {
  it("does not mask a lone @ or price tags", () => {
    expect(values(socialMedia, "vi ses @ kontoret")).toEqual([]);
    expect(values(emailAddress, "rabatt pris@50% idag")).toEqual([]);
  });
});

describe("misc guards", () => {
  it("does not read four-digit codes as license plates", () => {
    expect(values(seLicensePlate, "ABC 1234")).toEqual([]);
  });

  it("no longer masks the Swedish pronoun 'man' as genetic sex", () => {
    expect(values(geneticSex, "man kan säga att man trivs")).toEqual([]);
    expect(values(geneticSex, "Man vet aldrig")).toEqual([]);
  });

  it("still masks the remaining genetic sex terms", () => {
    expect(values(geneticSex, "en kvinna och en pojke")).toEqual([
      "kvinna",
      "pojke",
    ]);
  });
});

describe("marital status homographs", () => {
  it("skips English 'a gift' but keeps Swedish 'är gift'", () => {
    expect(values(maritalStatusAmbiguous, "he bought a gift")).toEqual([]);
    expect(values(maritalStatusAmbiguous, "the perfect gift for her")).toEqual(
      []
    );
    expect(values(maritalStatusAmbiguous, "han är gift med Anna")).toEqual([
      "gift",
    ]);
    expect(values(maritalStatusAmbiguous, "Gift, två barn")).toEqual(["Gift"]);
  });

  it("skips technical 'single' compounds but keeps the marital sense", () => {
    expect(values(maritalStatusAmbiguous, "use single sign-on")).toEqual([]);
    expect(values(maritalStatusAmbiguous, "a single-page app")).toEqual([]);
    expect(values(maritalStatusAmbiguous, "she is single and happy")).toEqual([
      "single",
    ]);
  });
});

describe("demonym case sensitivity", () => {
  it("skips lowercase English homographs", () => {
    expect(detectPII("polish the furniture")).toEqual([]);
    expect(detectPII("vi äter thai ikväll")).toEqual([]);
  });

  it("keeps capitalized English and lowercase Swedish demonyms", () => {
    expect(detectPII("the Polish delegation").map((e) => e.label)).toEqual([
      "DEMOGRAPHIC",
    ]);
    expect(detectPII("hon är svensk").map((e) => e.label)).toEqual([
      "DEMOGRAPHIC",
    ]);
  });
});

describe("documented tradeoffs (change here = intentional behavior shift)", () => {
  it("sport scores in HH:MM shape read as times", () => {
    const labels = detectPII("matchen slutade 12:34").map((e) => e.label);
    expect(labels).toEqual(["TIME"]);
  });

  it("name/noun homographs that are common real names stay masked", () => {
    // "Stig" (path / climb) and "Bo" (live) are kept: they are among the
    // most common Swedish male names, so recall wins over precision here.
    const labels = detectPII("Stig försiktigt").map((e) => e.label);
    expect(labels).toEqual(["PER_FIRST"]);
  });
});
