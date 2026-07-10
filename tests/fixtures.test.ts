import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectPII, maskPII } from "@/lib";

/**
 * End-to-end runs over the real example corpora in data/examples/.
 * Each CSV row is one quoted free-text record stuffed with synthetic PII.
 */
function loadExamples(file: string): string[] {
  const raw = readFileSync(join(__dirname, "..", "data", "examples", file), "utf8");
  return raw
    .split("\n")
    .slice(1) // header row: "text"
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .map((line) => line.replace(/^"|"$/g, "").replace(/""/g, '"'));
}

const swedishExamples = loadExamples("swedish_examples.csv");
const englishExamples = loadExamples("english_examples.csv");
const allExamples = [...swedishExamples, ...englishExamples];

describe("example corpora", () => {
  it("loads both corpora", () => {
    expect(swedishExamples.length).toBeGreaterThanOrEqual(10);
    expect(englishExamples.length).toBeGreaterThanOrEqual(10);
  });

  it("masks every example without crashing, in both modes", () => {
    for (const text of allExamples) {
      expect(() => maskPII(text)).not.toThrow();
      expect(() => maskPII(text, { strict: true })).not.toThrow();
    }
  });

  it("returns offset-faithful entities for every example", () => {
    for (const text of allExamples) {
      for (const entity of detectPII(text)) {
        expect(text.slice(entity.start, entity.end)).toBe(entity.value);
      }
    }
  });

  it("produces non-overlapping entities in ascending order", () => {
    for (const text of allExamples) {
      const entities = detectPII(text);
      for (let i = 1; i < entities.length; i++) {
        expect(entities[i].start).toBeGreaterThanOrEqual(entities[i - 1].end);
      }
    }
  });

  it("reconstructs the original text from masked output + entities", () => {
    for (const text of allExamples) {
      const { maskedText, entities } = maskPII(text);
      let restored = maskedText;
      for (const entity of entities) {
        restored = restored.replace(`<${entity.id}>`, entity.value);
      }
      expect(restored).toBe(text);
    }
  });

  it("removes the high-signal PII from every Swedish example", () => {
    for (const text of swedishExamples) {
      const { maskedText } = maskPII(text);
      // Every corpus row contains an email, a personnummer and an IBAN.
      expect(maskedText).not.toMatch(/[\w.]+@[\w.]+\.\w+/);
      expect(maskedText).not.toMatch(/\b\d{6}[-+]\d{4}\b/);
      expect(maskedText).not.toMatch(/\bSE\d{22}\b/);
    }
  });

  it("masks all names present in the corpus rows", () => {
    const knownNames = [
      "Erik Johansson",
      "Maria Svensson",
      "Johan Nilsson",
      "Emma Karlsson",
    ];
    const joined = swedishExamples.join("\n");
    for (const name of knownNames) {
      if (!joined.includes(name)) continue;
      const { maskedText } = maskPII(joined);
      expect(maskedText).not.toContain(name);
    }
  });

  it("is idempotent: masking masked output finds nothing new", () => {
    for (const text of allExamples) {
      const { maskedText } = maskPII(text);
      const second = maskPII(maskedText);
      expect(second.maskedText).toBe(maskedText);
      expect(second.entities).toEqual([]);
    }
  });

  it("keeps all invariants in strict mode too", () => {
    // Note: strict mode can yield MORE entities than lenient mode — when
    // an invalid personnummer is rejected, lower-priority detectors
    // (bank number, postal code) may legitimately match its digits.
    for (const text of allExamples) {
      const entities = detectPII(text, { strict: true });
      for (let i = 0; i < entities.length; i++) {
        expect(text.slice(entities[i].start, entities[i].end)).toBe(
          entities[i].value
        );
        if (i > 0) {
          expect(entities[i].start).toBeGreaterThanOrEqual(entities[i - 1].end);
        }
      }
    }
  });

  it("handles a large input (~60 kB) without pathological backtracking", () => {
    const large = allExamples.join(" ").repeat(4);
    expect(large.length).toBeGreaterThan(50_000);
    const started = Date.now();
    const { entities } = maskPII(large);
    expect(entities.length).toBeGreaterThan(100);
    // Generous bound — catches catastrophic regex backtracking regressions.
    expect(Date.now() - started).toBeLessThan(4_000);
  });
});

describe("unusual inputs", () => {
  const oddInputs = [
    "",
    " ",
    "\n\n\t",
    "😀🎉 emoji only",
    "<PER_FIRST_1> already masked",
    "a".repeat(10_000),
    "0".repeat(10_000),
    'quotes "inside" and \'apostrophes\'',
    "HTML <b>bold</b> & entities &amp;",
    "newline\r\nwindows and  nbsp",
    "ÅÄÖ åäö é ü ß",
  ];

  it("never throws and never corrupts non-PII text", () => {
    for (const text of oddInputs) {
      const { maskedText, entities } = maskPII(text);
      expect(typeof maskedText).toBe("string");
      for (const entity of entities) {
        expect(text.slice(entity.start, entity.end)).toBe(entity.value);
      }
    }
  });
});
