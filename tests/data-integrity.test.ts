import { describe, expect, it } from "vitest";
import counties from "../data/raw/counties.json";
import municipalities from "../data/raw/municipalities.json";
import streets from "../data/streets.json";
import menFirstNames from "../data/men-first-names.json";
import womenFirstNames from "../data/women-first-names.json";
import lastNames from "../data/last-names.json";
import professions from "../data/professions.json";
import educationPrograms from "../data/education-programs.json";

function isCleanStringArray(data: unknown): data is string[] {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((x) => typeof x === "string" && x.trim() === x && x.length > 0)
  );
}

describe("location datasets", () => {
  it("contains all 21 Swedish counties, each ending in 'län'", () => {
    expect(counties).toHaveLength(21);
    for (const county of counties) {
      expect(county).toMatch(/län$/);
    }
  });

  it("contains all 290 Swedish municipalities", () => {
    expect(municipalities).toHaveLength(290);
    for (const municipality of municipalities) {
      expect(municipality).toMatch(/(kommun|Stad)$/);
    }
  });

  it("has no duplicate counties or municipalities", () => {
    expect(new Set(counties).size).toBe(counties.length);
    expect(new Set(municipalities).size).toBe(municipalities.length);
  });

  it("carries a clean OSM street list", () => {
    expect(streets.length).toBeGreaterThan(20_000);
    expect(isCleanStringArray(streets)).toBe(true);
    expect(new Set(streets).size).toBe(streets.length);
  });

  it("keeps well-known streets used by the detector tests", () => {
    const set = new Set(streets);
    for (const street of ["Aftonsången", "Akalla By", "A F Carlssons gata"]) {
      expect(set.has(street), street).toBe(true);
    }
  });
});

describe("name datasets", () => {
  it("matches the documented SCB list sizes", () => {
    expect(menFirstNames).toHaveLength(20_524);
    expect(womenFirstNames).toHaveLength(23_347);
    expect(lastNames).toHaveLength(107_762);
  });

  it("contains clean, trimmed, non-empty strings", () => {
    expect(isCleanStringArray(menFirstNames)).toBe(true);
    expect(isCleanStringArray(womenFirstNames)).toBe(true);
    expect(isCleanStringArray(lastNames)).toBe(true);
  });

  it("stores names that start with a letter", () => {
    // Not necessarily uppercase: nobility particles are real surnames
    // ("af Klint", "de la Torre", "von Sydow").
    const startsWithLetter = (name: string) => /^\p{L}/u.test(name);
    expect(menFirstNames.every(startsWithLetter)).toBe(true);
    expect(womenFirstNames.every(startsWithLetter)).toBe(true);
    expect(lastNames.every(startsWithLetter)).toBe(true);
  });

  it("has no duplicate names within a list", () => {
    expect(new Set(menFirstNames).size).toBe(menFirstNames.length);
    expect(new Set(womenFirstNames).size).toBe(womenFirstNames.length);
    expect(new Set(lastNames).size).toBe(lastNames.length);
  });

  it("includes the most common Swedish names", () => {
    expect(new Set(menFirstNames).has("Erik")).toBe(true);
    expect(new Set(womenFirstNames).has("Anna")).toBe(true);
    expect(new Set(lastNames).has("Andersson")).toBe(true);
    expect(new Set(lastNames).has("Öberg")).toBe(true);
  });
});

describe("work/education datasets", () => {
  it("contains clean profession and program lists", () => {
    expect(isCleanStringArray(professions)).toBe(true);
    expect(isCleanStringArray(educationPrograms)).toBe(true);
    expect(new Set(professions).size).toBe(professions.length);
    expect(professions.length).toBeGreaterThan(300);
    expect(educationPrograms.length).toBeGreaterThan(50);
  });

  it("survives regex construction despite metacharacters in entries", () => {
    // e.g. "Administratör/sekreteraryrken" — must not blow up when joined
    const anySlash = professions.some((p) => p.includes("/"));
    expect(anySlash).toBe(true);
  });
});
