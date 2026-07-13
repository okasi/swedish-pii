import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORE_THRESHOLD,
  SCORE,
  alternation,
  contextAware,
  escapeRegex,
  regexDetector,
  termListRegex,
  wordBounded,
} from "@/lib/internal/regex";

describe("escapeRegex", () => {
  it("escapes every regex metacharacter", () => {
    const meta = ".*+?^${}()|[]\\";
    const escaped = escapeRegex(meta);
    expect(new RegExp(`^${escaped}$`).test(meta)).toBe(true);
  });

  it("leaves plain text untouched", () => {
    expect(escapeRegex("Volvo")).toBe("Volvo");
    expect(escapeRegex("Åre kommun")).toBe("Åre kommun");
  });

  it("makes slash-containing terms safe (professions data)", () => {
    const term = "Administratör/sekreteraryrken";
    expect(new RegExp(escapeRegex(term)).test(term)).toBe(true);
  });
});

describe("alternation", () => {
  it("orders longest term first so it wins the alternation", () => {
    expect(alternation(["Gift", "Registrerad partner"])).toBe(
      "Registrerad partner|Gift"
    );
  });

  it("deduplicates terms", () => {
    expect(alternation(["a", "a", "b"])).toBe("a|b");
  });

  it("drops empty terms", () => {
    expect(alternation(["", "x"])).toBe("x");
  });

  it("escapes metacharacters in terms", () => {
    const regex = new RegExp(alternation(["C++", "C#"]));
    expect(regex.test("C++")).toBe(true);
  });

  it("breaks length ties deterministically (locale order)", () => {
    expect(alternation(["bb", "aa"])).toBe("aa|bb");
  });
});

describe("wordBounded", () => {
  it("matches terms at Unicode word edges where \\b fails", () => {
    const regex = new RegExp(wordBounded("Åre"), "u");
    expect(regex.test("i Åre idag")).toBe(true);
    expect(regex.test("Åre")).toBe(true);
  });

  it("rejects matches inside longer words", () => {
    const regex = new RegExp(wordBounded("gift"), "iu");
    expect(regex.test("gift")).toBe(true);
    expect(regex.test("giftig")).toBe(false); // Swedish letter suffix
    expect(regex.test("ogift")).toBe(false); // letter prefix
    expect(regex.test("gift5")).toBe(false); // digit suffix
    expect(regex.test("gift_x")).toBe(false); // underscore suffix
  });

  it("treats punctuation as a boundary", () => {
    const regex = new RegExp(wordBounded("Sambo"), "u");
    expect(regex.test("(Sambo)")).toBe(true);
    expect(regex.test("Sambo,")).toBe(true);
  });
});

describe("termListRegex", () => {
  it("is case-insensitive by default", () => {
    const regex = termListRegex(["Katolik"]);
    expect("hon är KATOLIK".match(regex)?.[0]).toBe("KATOLIK");
  });

  it("matches all occurrences (global flag)", () => {
    const regex = termListRegex(["ja"]);
    expect("ja och ja och ja".match(regex)).toHaveLength(3);
  });
});

const OPTS = { strict: false, scoreThreshold: DEFAULT_SCORE_THRESHOLD };
const STRICT = { strict: true, scoreThreshold: DEFAULT_SCORE_THRESHOLD };

describe("regexDetector", () => {
  it("rejects patterns without the g flag at construction", () => {
    expect(() => regexDetector("TIME", /\d/)).toThrow(/"g" flag/);
  });

  it("is stateless across runs (no shared lastIndex)", () => {
    const detector = regexDetector("TIME", /\d{2}:\d{2}/g);
    const first = detector.detect("kl 12:30", OPTS);
    const second = detector.detect("kl 12:30", OPTS);
    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
  });

  it("reports exact spans with the base score", () => {
    const detector = regexDetector("TIME", /\d{2}:\d{2}/g);
    const [span] = detector.detect("kl 12:30 nu", OPTS);
    expect(span).toEqual({
      label: "TIME",
      value: "12:30",
      start: 3,
      end: 8,
      score: SCORE.PATTERN,
    });
  });

  it("adjusts the score by validation outcome, dropping only in strict mode", () => {
    const failing = regexDetector("TIME", /\d{2}:\d{2}/g, {
      validate: () => false,
    });
    const lenient = failing.detect("12:30", OPTS);
    expect(lenient).toHaveLength(1);
    expect(lenient[0].score).toBe(SCORE.FAILED_VALIDATION);
    expect(failing.detect("12:30", STRICT)).toHaveLength(0);

    const passing = regexDetector("TIME", /\d{2}:\d{2}/g, {
      validate: () => true,
    });
    expect(passing.detect("12:30", OPTS)[0].score).toBe(SCORE.VALIDATED);
    expect(passing.detect("12:30", STRICT)).toHaveLength(1);
  });

  it("honors custom scores", () => {
    const detector = regexDetector("TIME", /\d{2}:\d{2}/g, { score: 0.7 });
    expect(detector.detect("12:30", OPTS)[0].score).toBe(0.7);
  });

  it("compiles factory patterns exactly once", () => {
    let calls = 0;
    const detector = regexDetector("TIME", () => {
      calls++;
      return /\d{2}:\d{2}/g;
    });
    detector.detect("12:30", OPTS);
    detector.detect("13:30 14:40", OPTS);
    detector.detect("no match here", OPTS);
    expect(calls).toBe(1);
  });

  it("does not loop forever on zero-length matches", () => {
    const detector = regexDetector("TIME", /x*/g);
    expect(detector.detect("abc", OPTS)).toEqual([]);
  });
});

describe("contextAware", () => {
  const base = regexDetector("SE_BANK_NUMBER", /\d{10}/g);
  const detector = contextAware(base, {
    before: /konto/i,
    window: 20,
  });

  it("boosts matches near context and dims matches without it", () => {
    const boosted = detector.detect("konto 1234567890", OPTS);
    expect(boosted[0].score).toBe(SCORE.CONTEXT);
    const dimmed = detector.detect("order 1234567890", OPTS);
    expect(dimmed[0].score).toBe(SCORE.NO_CONTEXT);
  });

  it("only looks within the configured window", () => {
    const farAway = `konto${" ".repeat(30)}1234567890`;
    expect(detector.detect(farAway, OPTS)[0].score).toBe(SCORE.NO_CONTEXT);
  });

  it("supports after-context", () => {
    const afterDetector = contextAware(base, { after: /kr/, window: 10 });
    expect(afterDetector.detect("1234567890 kr", OPTS)[0].score).toBe(
      SCORE.CONTEXT
    );
  });

  it("does not leak lastIndex from global context expressions", () => {
    const globalContext = contextAware(base, {
      before: /konto/gi,
      window: 20,
    });
    const text = "konto 1234567890 och konto 0987654321";

    const scores = () =>
      globalContext.detect(text, OPTS).map((span) => span.score);
    expect(scores()).toEqual([SCORE.CONTEXT, SCORE.CONTEXT]);
    expect(scores()).toEqual([SCORE.CONTEXT, SCORE.CONTEXT]);
  });

  it("never lowers an already-dim score below dimmedScore floor logic", () => {
    const custom = contextAware(base, {
      before: /konto/i,
      boostedScore: 0.9,
      dimmedScore: 0.1,
    });
    expect(custom.detect("konto 1234567890", OPTS)[0].score).toBe(0.9);
    expect(custom.detect("order 1234567890", OPTS)[0].score).toBe(0.1);
  });
});
