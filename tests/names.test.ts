import { describe, expect, it } from "vitest";
import { jaroWinkler } from "@/lib/matching/jaroWinkler";
import {
  isCompoundFirstName,
  matchFullName,
  personNames,
} from "@/lib/detectors/names";
import type { EntitySpan } from "@/lib/types";

const detect = (text: string): EntitySpan[] =>
  personNames.detect(text, { strict: false, scoreThreshold: 0.4 });

describe("jaroWinkler", () => {
  it("returns 1 for identical strings and 0 for disjoint ones", () => {
    expect(jaroWinkler("anna", "anna")).toBe(1);
    expect(jaroWinkler("abc", "xyz")).toBe(0);
    expect(jaroWinkler("", "anna")).toBe(0);
  });

  it("scores close names higher than distant ones", () => {
    const close = jaroWinkler("johansson", "johanson");
    const far = jaroWinkler("johansson", "eriksson");
    expect(close).toBeGreaterThan(0.94);
    expect(close).toBeGreaterThan(far);
  });

  it("only applies the Winkler boost above the 0.7 base threshold", () => {
    // "a" shared prefix but low base similarity: no boost applied
    expect(jaroWinkler("about", "axolotls")).toBeLessThanOrEqual(0.7);
  });

  it("is symmetric", () => {
    expect(jaroWinkler("martha", "marhta")).toBeCloseTo(
      jaroWinkler("marhta", "martha")
    );
  });
});

describe("matchFullName", () => {
  it("matches exact full names", () => {
    expect(matchFullName("Anna Andersson")).toEqual({
      first: "Anna",
      last: "Andersson",
    });
  });

  it("matches slightly misspelled names", () => {
    expect(matchFullName("Anna Anderson")).not.toBeNull();
  });

  it("rejects non-names", () => {
    expect(matchFullName("Zzyzx Qqqqq")).toBeNull();
    expect(matchFullName("OnlyOneWord")).toBeNull();
  });
});

describe("personNames detector", () => {
  it("detects full names with separate first/last spans", () => {
    const spans = detect("Anna Andersson bor i Lund.");
    const first = spans.find((s) => s.label === "PER_FIRST");
    const last = spans.find((s) => s.label === "PER_LAST");
    expect(first).toMatchObject({ value: "Anna", start: 0, end: 4 });
    expect(last).toMatchObject({ value: "Andersson", start: 5, end: 14 });
  });

  it("detects names starting with Å/Ä/Ö (regression: ASCII-only \\b)", () => {
    const spans = detect("Örjan Öberg kom hem.");
    expect(spans.map((s) => s.value)).toEqual(["Örjan", "Öberg"]);
  });

  it("detects single first names by exact lookup", () => {
    const spans = detect("prata med Anna imorgon.");
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ label: "PER_FIRST", value: "Anna" });
  });

  it("does not mask arbitrary capitalized words", () => {
    expect(detect("Zzyzx Qqqqq")).toEqual([]);
  });

  it("computes correct offsets mid-sentence", () => {
    const text = "Igår träffade jag Erik Johansson på stan.";
    const spans = detect(text);
    for (const span of spans) {
      expect(text.slice(span.start, span.end)).toBe(span.value);
    }
    expect(spans.some((s) => s.value === "Erik")).toBe(true);
    expect(spans.some((s) => s.value === "Johansson")).toBe(true);
  });

  it("detects several names in one text with correct offsets", () => {
    const text = "möte: Anna Andersson och Erik Johansson deltar";
    const spans = detect(text);
    expect(spans.map((s) => s.value)).toEqual([
      "Anna",
      "Andersson",
      "Erik",
      "Johansson",
    ]);
    for (const span of spans) {
      expect(text.slice(span.start, span.end)).toBe(span.value);
    }
  });

  it("detects names at the very start and end of the text", () => {
    expect(detect("Anna Andersson")).toHaveLength(2);
    const spans = detect("mejla Anna Andersson");
    expect(spans[spans.length - 1].end).toBe("mejla Anna Andersson".length);
  });

  it("skips quoted and bracketed words (quote guard)", () => {
    expect(detect("'Anna'")).toEqual([]);
    expect(detect('"Anna"')).toEqual([]);
    expect(detect("(Anna)")).toEqual([]);
    expect(detect("[Anna]")).toEqual([]);
    expect(detect("’Anna’")).toEqual([]);
  });

  it("skips fully uppercase and lowercase words", () => {
    expect(detect("ANNA bor här")).toEqual([]);
    expect(detect("anna bor här")).toEqual([]);
  });

  it("returns stable results across repeated calls (memoization)", () => {
    const first = matchFullName("Anna Anderson");
    const second = matchFullName("Anna Anderson");
    expect(second).toEqual(first);
  });

  it("handles hyphenated words without crashing", () => {
    const spans = detect("Anna-Karin kom hit");
    for (const span of spans) {
      expect("Anna-Karin kom hit".slice(span.start, span.end)).toBe(span.value);
    }
  });
});

describe("compound first names", () => {
  it("detects 'Ecenur' as a first name (regression: Ece + Nur)", () => {
    // "Ecenur" is not in the SCB list, but both "Ece" and "Nur" are.
    const spans = detect("prata med Ecenur imorgon");
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ label: "PER_FIRST", value: "Ecenur" });
  });

  it("detects other compounds built from registered names", () => {
    for (const name of ["Aycanur", "Elifnaz"]) {
      const spans = detect(`hälsa på ${name} idag`);
      expect(spans.map((s) => s.value), name).toEqual([name]);
      expect(spans[0].label).toBe("PER_FIRST");
    }
  });

  it("scores compounds below exact single-name hits", () => {
    const [compound] = detect("prata med Ecenur imorgon");
    const [exact] = detect("prata med Anna imorgon");
    expect(compound.score).toBeLessThan(exact.score);
    expect(compound.score).toBeGreaterThanOrEqual(0.4); // above threshold
  });

  it("works in a full-name pair with a registered surname", () => {
    const spans = detect("Ecenur Andersson kom hem");
    expect(spans.map((s) => `${s.label}:${s.value}`)).toEqual([
      "PER_FIRST:Ecenur",
      "PER_LAST:Andersson",
    ]);
  });

  it("does not decompose ordinary words that happen to split into names", () => {
    // Eng+ine, Sem+ester, Fre+dag, Kun+den, Eko+nomi, Vid+are …
    for (const word of [
      "Engine", "Semester", "Fredag", "Kunden", "Ekonomi", "Vidare",
      "Personal", "Runtime", "Unique", "Pipeline", "Marital",
    ]) {
      expect(detect(`${word} slutade fint`), word).toEqual([]);
    }
  });

  it("does not decompose Swedish place names", () => {
    expect(isCompoundFirstName("Göteborg")).toBe(false); // Göte + Borg
  });

  it("exposes the decomposition check directly", () => {
    expect(isCompoundFirstName("Ecenur")).toBe(true);
    expect(isCompoundFirstName("ECENUR")).toBe(true); // case-insensitive
    expect(isCompoundFirstName("Zzyzx")).toBe(false);
    expect(isCompoundFirstName("Ece")).toBe(false); // too short to split
  });
});
