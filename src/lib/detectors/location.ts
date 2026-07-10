import counties from "../../../data/raw/counties.json";
import municipalities from "../../../data/raw/municipalities.json";
import streets from "../../../data/streets.json";
import {
  SCORE,
  contextAware,
  regexDetector,
  termListRegex,
} from "../internal/regex";
import type { Detector, EntitySpan } from "../types";

/**
 * Heuristic Swedish street address: one to three capitalized words where
 * the last one ends in a street-type suffix (gatan, vägen, gränd, …),
 * optionally followed by a house number. Suffix-only names ("Vägen 7")
 * are matched via their capitalized forms; lowercase common nouns like
 * "på vägen hem" deliberately do not match.
 */
const STREET_SUFFIXES = [
  "gatan", "gata", "vägen", "väg", "gränden", "gränd", "backen", "backe",
  "torget", "torg", "allén", "allé", "lunden", "lund", "stigen", "stig",
  "platsen", "plats", "plan", "bron", "bro", "parken", "park", "stranden",
  "strand", "terrassen", "terrass", "berget", "berg", "hamnen", "hamn",
  "ängen", "äng",
];
// Longest first so "vägen" wins over "väg".
const sortedSuffixes = [...STREET_SUFFIXES].sort((a, b) => b.length - a.length);
const capitalize = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);

const capitalizedWord = "[A-ZÅÄÖ][a-zåäöé]+(?:-[A-Za-zÅÄÖåäöé]+)?";
const streetWord =
  `(?:[A-ZÅÄÖ][a-zåäöé]*(?:${sortedSuffixes.join("|")})` +
  `|${sortedSuffixes.map(capitalize).join("|")})`;

export const seStreetAddress: Detector = regexDetector(
  "SE_STREET_ADDRESS",
  new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${capitalizedWord}\\s){0,2}` + // leading words ("Lilla ")
      streetWord + // word ending in a street suffix
      `(?:\\s\\d{1,4}(?:\\s?[A-Z])?)?` + // optional house number + entrance letter
      `(?![\\p{L}\\p{N}])`,
    "gu"
  ),
  { score: SCORE.HEURISTIC }
);

/**
 * Exact lookup against the OSM street list (data/streets.json, extracted
 * by scripts/extract-osm-data.sh). This catches real street names that
 * carry no street-type suffix ("Aftonsången", "Akalla By") which the
 * heuristic above can never see. Single-word street names shorter than
 * MIN_SINGLE_WORD_STREET characters ("Al", "By", "Gata") are skipped —
 * they collide with ordinary capitalized prose words.
 */
const MIN_SINGLE_WORD_STREET = 5;
const MAX_STREET_WORDS = 4; // longest names in the dataset ("A F Carlssons gata")

interface StreetIndex {
  multiWord: Set<string>;
  singleWord: Set<string>;
}

let streetIndex: StreetIndex | null = null;

function getStreetIndex(): StreetIndex {
  if (streetIndex) return streetIndex;
  const multiWord = new Set<string>();
  const singleWord = new Set<string>();
  for (const street of streets) {
    const lower = street.toLowerCase();
    if (lower.includes(" ")) multiWord.add(lower);
    else if (lower.length >= MIN_SINGLE_WORD_STREET) singleWord.add(lower);
  }
  return (streetIndex = { multiWord, singleWord });
}

// A street-name token: letters/digits with internal :, . or - ("2:a",
// "ASJ-vägen"). Trailing punctuation stays outside the token.
const STREET_TOKEN = /[\p{L}\p{N}]+(?:[:.\-'][\p{L}\p{N}]+)*/gu;
const HOUSE_NUMBER = /^ \d{1,4}( ?[A-Z])?(?![\p{L}\p{N}])/u;

function detectKnownStreets(text: string, mode: "multi" | "single"): EntitySpan[] {
  const index = getStreetIndex();
  const spans: EntitySpan[] = [];

  const tokens: { start: number; end: number; value: string }[] = [];
  const tokenizer = STREET_TOKEN;
  tokenizer.lastIndex = 0;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenizer.exec(text)) !== null) {
    tokens.push({
      start: tokenMatch.index,
      end: tokenMatch.index + tokenMatch[0].length,
      value: tokenMatch[0],
    });
  }

  const mostWords = mode === "multi" ? MAX_STREET_WORDS : 1;
  const fewestWords = mode === "multi" ? 2 : 1;

  let i = 0;
  while (i < tokens.length) {
    // Street names start with an uppercase letter or a digit ("2:a …").
    if (!/^[\p{Lu}\p{N}]/u.test(tokens[i].value)) {
      i++;
      continue;
    }
    let matchedEnd = 0;
    const maxWords = Math.min(mostWords, tokens.length - i);
    for (let words = maxWords; words >= fewestWords; words--) {
      const last = tokens[i + words - 1];
      const candidate = text.slice(tokens[i].start, last.end);
      if (/[\n\r]|\s{2,}/.test(candidate)) continue; // spans a line break
      const lookup = candidate.toLowerCase();
      const hit =
        words > 1 ? index.multiWord.has(lookup) : index.singleWord.has(lookup);
      if (hit) {
        matchedEnd = last.end;
        break;
      }
    }
    if (matchedEnd === 0) {
      i++;
      continue;
    }
    const houseNumber = HOUSE_NUMBER.exec(text.slice(matchedEnd));
    const end = matchedEnd + (houseNumber ? houseNumber[0].length : 0);
    spans.push({
      label: "SE_STREET_ADDRESS",
      value: text.slice(tokens[i].start, end),
      start: tokens[i].start,
      end,
      // Multi-word gazetteer hits are near-certain; single words share
      // their shape with prose and score lower.
      score: mode === "multi" ? SCORE.EXACT_MATCH : 0.7,
    });
    // Continue after the consumed street (skip its house number tokens too).
    while (i < tokens.length && tokens[i].start < end) i++;
  }
  return spans;
}

/**
 * Multi-word OSM street matches ("Akalla By", "A F Carlssons gata").
 * These are precise enough to outrank even person-name detection —
 * otherwise "By" (a registered surname) would claim part of the street.
 */
export const seKnownStreetAddressMultiWord: Detector = {
  labels: ["SE_STREET_ADDRESS"],
  detect: (text) => detectKnownStreets(text, "multi"),
};

/**
 * Single-word OSM street matches ("Aftonsången"). Runs after person
 * names: ~1% of single-word street names are also registered names
 * ("Aspen", "Berget"), where the name reading is the safer default.
 */
export const seKnownStreetAddressSingleWord: Detector = {
  labels: ["SE_STREET_ADDRESS"],
  detect: (text) => detectKnownStreets(text, "single"),
};

/**
 * Swedish postal code: five digits (optionally split 3+2). Swedish
 * postal codes never start with 0. Context-boosted: any five-digit
 * number fits the shape, so either an address cue must precede it or a
 * capitalized place name must follow it ("114 55 Stockholm") — matches
 * without either drop below the default score threshold.
 */
export const sePostalCode: Detector = contextAware(
  regexDetector("SE_POSTAL_CODE", /\b[1-9]\d{2}\s?\d{2}\b/g),
  {
    before: /post(?:nummer|nr|adress)|adress|zip/i,
    after: /^[ ]?,?[ ]?\p{Lu}/u,
    window: 30,
  }
);

/** All Swedish municipalities ("Ale kommun" … "Övertorneå kommun"). */
export const seMunicipality: Detector = regexDetector(
  "SE_MUNICIPALITY",
  () => termListRegex(municipalities),
  { score: SCORE.CONTEXT }
);

/** All Swedish counties ("Blekinge län" … "Örebro län"). */
export const seCounty: Detector = regexDetector(
  "SE_COUNTY",
  () => termListRegex(counties),
  { score: SCORE.CONTEXT }
);

/**
 * Location detectors in local priority order. Note that the engine
 * hoists seKnownStreetAddressMultiWord above person names.
 */
export const locationDetectors: Detector[] = [
  // Exact OSM lookup first: it is more precise than the suffix heuristic
  // and can claim suffix-less street names the heuristic would miss.
  seKnownStreetAddressSingleWord,
  seStreetAddress,
  sePostalCode,
  seMunicipality,
  seCounty,
];
