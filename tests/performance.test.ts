import { describe, expect, it } from "vitest";
import { detectPII, maskPII } from "@/lib";

/**
 * Performance regression tripwires. Budgets are deliberately generous
 * (5–10x local timings) so they don't flake on slow CI — they exist to
 * catch order-of-magnitude regressions: recompiling the large
 * list-based alternations per call, catastrophic regex backtracking,
 * or accidental O(n²) blowups in overlap resolution.
 */

const SAMPLE =
  "Anna Andersson (pnr 811218-9876) bor på Storgatan 12, 114 55 Åre kommun. " +
  "Nå henne på 070-123 45 67 eller anna.andersson@email.se. IBAN " +
  "SE3550000000054910000003, BIC ESSESESS, konto 8327-9123456, kort " +
  "4111 1111 1111 1111. Bilen ABC 123 står på Aftonsången 3. Hon är " +
  "gift, kristen och socialdemokrat. Möte 2024-06-01 kl 14:30 från " +
  "192.168.1.1 (MAC 00:1A:2B:3C:4D:5E). Org.nr 556012-5790. ";

describe("throughput", () => {
  it("handles repeated small calls cheaply (compile-once regexes)", () => {
    maskPII(SAMPLE); // warm up lazy indexes outside the timed section
    const started = performance.now();
    for (let i = 0; i < 200; i++) {
      maskPII(SAMPLE);
    }
    const elapsed = performance.now() - started;
    // ~200 calls × ~500 chars; recompiling the term-list alternations
    // per call pushes this over 10x higher.
    expect(elapsed).toBeLessThan(3_000);
  });

  it("handles a ~100 kB document in one pass", () => {
    const large = SAMPLE.repeat(260);
    expect(large.length).toBeGreaterThan(100_000);
    const started = performance.now();
    const { entities } = maskPII(large);
    const elapsed = performance.now() - started;
    expect(entities.length).toBeGreaterThan(2_000);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("degrades gracefully on pathological digit soup", () => {
    const soup = ("1234567890".repeat(10) + " ").repeat(200);
    const started = performance.now();
    detectPII(soup);
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("degrades gracefully on capitalized-word soup (name lookups)", () => {
    const words = ["Xantippa", "Qwerty", "Zorro", "Blorp", "Knasen", "Snorkel"];
    const soup = Array.from(
      { length: 5_000 },
      (_, i) => words[i % words.length]
    ).join(" ");
    const started = performance.now();
    detectPII(soup);
    expect(performance.now() - started).toBeLessThan(3_000);
  });
});

describe("scaling shape", () => {
  it("stays roughly linear in input size", () => {
    const time = (text: string) => {
      const started = performance.now();
      maskPII(text);
      return performance.now() - started;
    };
    const small = SAMPLE.repeat(20);
    const big = SAMPLE.repeat(160); // 8x the input
    time(small); // warm-up
    const smallTime = Math.max(1, time(small));
    const bigTime = time(big);
    // 8x input should not cost anywhere near 64x (quadratic) — allow a
    // very generous 32x before failing.
    expect(bigTime / smallTime).toBeLessThan(32);
  });
});
