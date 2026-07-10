import { describe, expect, it } from "vitest";
import { DEFAULT_SCORE_THRESHOLD, SCORE, detectPII, maskPII } from "@/lib";

describe("confidence scores", () => {
  it("scores checksum-valid identity numbers as validated", () => {
    const [entity] = detectPII("pnr 811218-9876");
    expect(entity.label).toBe("SE_PERSONAL_IDENTITY_NUMBER_MALE");
    expect(entity.score).toBe(SCORE.VALIDATED);
  });

  it("keeps checksum-invalid numbers, at a reduced score", () => {
    const [entity] = detectPII("pnr 811218-9896");
    expect(entity.label).toBe("SE_PERSONAL_IDENTITY_NUMBER_MALE");
    expect(entity.score).toBe(SCORE.FAILED_VALIDATION);
  });

  it("scores validated credit cards above unvalidated ones", () => {
    const valid = detectPII("kort 4111 1111 1111 1111")[0];
    const invalid = detectPII("kort 4111 1111 1111 1112")[0];
    expect(valid.score).toBe(SCORE.VALIDATED);
    expect(invalid.score).toBe(SCORE.FAILED_VALIDATION);
    expect(valid.score).toBeGreaterThan(invalid.score);
  });

  it("scores IBANs by mod-97 checksum", () => {
    expect(detectPII("IBAN GB82 WEST 1234 5698 7654 32")[0].score).toBe(
      SCORE.VALIDATED
    );
    expect(detectPII("IBAN GB82 WEST 1234 5698 7654 33")[0].score).toBe(
      SCORE.FAILED_VALIDATION
    );
  });

  it("scores exact multi-word street matches above the heuristic", () => {
    const osm = detectPII("vid Akalla By")[0];
    const heuristic = detectPII("vid Påhittadgatan 99")[0];
    expect(osm.score).toBe(SCORE.EXACT_MATCH);
    expect(heuristic.score).toBe(SCORE.HEURISTIC);
  });

  it("scores full names above single-word name hits", () => {
    const pair = detectPII("Anna Andersson");
    const single = detectPII("prata med Anna imorgon");
    expect(pair[0].score).toBeGreaterThan(single[0].score);
  });

  it("boosts context-corroborated bank numbers", () => {
    const [entity] = detectPII("kontonummer 8327-9123456");
    expect(entity.label).toBe("SE_BANK_NUMBER");
    expect(entity.score).toBe(SCORE.CONTEXT);
  });

  it("returns scores in maskPII output too", () => {
    const { entities } = maskPII("mejla anna@email.se");
    expect(entities[0].score).toBeGreaterThan(0);
  });
});

describe("scoreThreshold option", () => {
  it("defaults to DEFAULT_SCORE_THRESHOLD", () => {
    expect(DEFAULT_SCORE_THRESHOLD).toBeGreaterThan(SCORE.NO_CONTEXT);
    expect(DEFAULT_SCORE_THRESHOLD).toBeLessThan(SCORE.FAILED_VALIDATION);
  });

  it("recovers context-starved matches when lowered", () => {
    const bare = "ordernummer 8327-9123456";
    expect(detectPII(bare)).toEqual([]);
    const recovered = detectPII(bare, { scoreThreshold: 0.2 });
    expect(recovered.map((e) => e.label)).toEqual(["SE_BANK_NUMBER"]);
    expect(recovered[0].score).toBe(SCORE.NO_CONTEXT);
  });

  it("keeps only high-confidence entities when raised", () => {
    const text = "prata med Anna om pnr 811218-9876";
    const all = detectPII(text);
    expect(all.map((e) => e.label)).toContain("PER_FIRST");

    const confident = detectPII(text, { scoreThreshold: 0.9 });
    expect(confident.map((e) => e.label)).toEqual([
      "SE_PERSONAL_IDENTITY_NUMBER_MALE",
    ]);
  });

  it("threshold zero keeps everything a detector emits", () => {
    const text = "ordernummer 8327-9123456 och 11455 exemplar";
    const everything = detectPII(text, { scoreThreshold: 0 });
    expect(everything.length).toBeGreaterThanOrEqual(2);
  });

  it("filtering happens before overlap resolution", () => {
    // With a high threshold the low-scoring name "Anna" is gone, so it
    // cannot block anything else; the text has no other candidates.
    expect(detectPII("prata med Anna", { scoreThreshold: 0.9 })).toEqual([]);
  });

  it("every emitted score is within (0, 1]", () => {
    const text =
      "Anna Andersson (811218-9876) bor på Storgatan 12, 114 55 Åre kommun. " +
      "IBAN GB82 WEST 1234 5698 7654 32, konto 8327-9123456, kort " +
      "4111 1111 1111 1112, mejl anna@email.se kl 14:30 den 2024-06-01.";
    const entities = detectPII(text, { scoreThreshold: 0 });
    expect(entities.length).toBeGreaterThan(8);
    for (const entity of entities) {
      expect(entity.score).toBeGreaterThan(0);
      expect(entity.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("strict mode with scores", () => {
  it("strict drops failed validations regardless of threshold", () => {
    const invalid = "pnr 811218-9896";
    const labels = detectPII(invalid, { strict: true, scoreThreshold: 0 }).map(
      (e) => e.label
    );
    // The personnummer itself is gone; at threshold 0 the (context-dim)
    // bank-number shape may legitimately claim the digits instead.
    expect(labels).not.toContain("SE_PERSONAL_IDENTITY_NUMBER_MALE");
    expect(detectPII(invalid, { strict: true })).toEqual([]);
  });

  it("strict keeps validated entities", () => {
    const entities = detectPII("pnr 811218-9876", { strict: true });
    expect(entities).toHaveLength(1);
    expect(entities[0].score).toBe(SCORE.VALIDATED);
  });
});
