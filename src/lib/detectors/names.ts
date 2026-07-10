import menFirstNames from "../../../data/men-first-names.json";
import womenFirstNames from "../../../data/women-first-names.json";
import lastNames from "../../../data/last-names.json";
import cities from "../../../data/raw/cities.json";
import areas from "../../../data/raw/areas.json";
import jaroWinkler from "../matching/jaroWinkler";
import type { Detector, EntitySpan } from "../types";

/**
 * Fuzzy-match thresholds, tuned against the SCB name lists. Last names
 * use a stricter threshold because the list is much larger (~108k
 * entries) and more prone to near-collisions.
 */
export const FIRST_NAME_THRESHOLD = 0.8833333333333334;
export const LAST_NAME_THRESHOLD = 0.9428571428571428;

const MIN_FUZZY_LENGTH = 3;
const MAX_LENGTH_DELTA = 3;
const MEMO_LIMIT = 20_000;

/** Both halves of a "First Last" pair corroborate each other. */
const FULL_NAME_SCORE = 0.85;
/** A lone word in a 150k-entry list is much weaker evidence. */
const SINGLE_NAME_SCORE = 0.55;
/** A decomposed compound ("Ecenur" = Ece + Nur) is weaker still. */
const COMPOUND_NAME_SCORE = 0.5;

interface NameIndex {
  /** Names in their canonical casing, for exact single-word lookups. */
  exact: Set<string>;
  /** Lowercased name -> canonical casing, for O(1) fuzzy fast path. */
  lowercase: Map<string, string>;
  /** Lowercased names bucketed by length, for the fuzzy scan. */
  byLength: Map<number, { lower: string; canonical: string }[]>;
  /** Memoized fuzzy results for this index. */
  memo: Map<string, string | null>;
}

function buildIndex(names: readonly string[]): NameIndex {
  const exact = new Set(names);
  const lowercase = new Map<string, string>();
  const byLength = new Map<number, { lower: string; canonical: string }[]>();
  for (const canonical of names) {
    const lower = canonical.toLowerCase();
    if (!lowercase.has(lower)) lowercase.set(lower, canonical);
    let bucket = byLength.get(lower.length);
    if (!bucket) byLength.set(lower.length, (bucket = []));
    bucket.push({ lower, canonical });
  }
  return { exact, lowercase, byLength, memo: new Map() };
}

let firstNameIndex: NameIndex | null = null;
let lastNameIndex: NameIndex | null = null;

function getFirstNameIndex(): NameIndex {
  return (firstNameIndex ??= buildIndex([...menFirstNames, ...womenFirstNames]));
}

function getLastNameIndex(): NameIndex {
  return (lastNameIndex ??= buildIndex(lastNames));
}

/**
 * Find the best fuzzy match for `input` (lowercase) in the index, or
 * null when nothing reaches the threshold. Exact hits short-circuit;
 * the scan only visits length buckets within MAX_LENGTH_DELTA.
 */
function findBestMatch(
  input: string,
  index: NameIndex,
  threshold: number
): string | null {
  if (input.length < MIN_FUZZY_LENGTH) return null;

  const exactHit = index.lowercase.get(input);
  if (exactHit) return exactHit;

  const memoized = index.memo.get(input);
  if (memoized !== undefined) return memoized;

  let bestScore = threshold;
  let best: string | null = null;
  for (
    let length = Math.max(MIN_FUZZY_LENGTH, input.length - MAX_LENGTH_DELTA);
    length <= input.length + MAX_LENGTH_DELTA;
    length++
  ) {
    const bucket = index.byLength.get(length);
    if (!bucket) continue;
    for (const { lower, canonical } of bucket) {
      const score = jaroWinkler(input, lower);
      if (score >= bestScore) {
        bestScore = score;
        best = canonical;
      }
    }
  }

  if (index.memo.size >= MEMO_LIMIT) index.memo.clear();
  index.memo.set(input, best);
  return best;
}

/**
 * Compound given names — common in e.g. Turkish and Scandinavian naming
 * ("Ecenur" = Ece + Nur, "Annbritt" = Ann + Britt) — are often absent
 * from the SCB list even though both halves are registered names.
 *
 * A word counts as a compound first name when it splits into two
 * registered first names of the same gender list, where the tail is a
 * *learned suffix*: a name that itself appears as the tail of at least
 * MIN_SUFFIX_OCCURRENCES registered names. Learning the suffixes from
 * the data keeps accidental decompositions of prose words ("Eng+ine",
 * "Sem+ester") out. Stopword/morpheme halves and place names
 * ("Göteborg" = Göte + Borg) are excluded.
 */
const MIN_COMPOUND_PART = 3;
const MIN_SUFFIX_OCCURRENCES = 10;
const COMPOUND_PART_BLOCKLIST = new Set(["son", "sson", "ine"]);

interface CompoundIndex {
  menLower: Set<string>;
  womenLower: Set<string>;
  /** Tails that recur across registered names ("nur", "britt", …). */
  suffixes: Set<string>;
  /** Known city/suburb/town names — never compound-name evidence. */
  places: Set<string>;
  memo: Map<string, boolean>;
}

let compoundIndex: CompoundIndex | null = null;

function getCompoundIndex(): CompoundIndex {
  if (compoundIndex) return compoundIndex;
  const menLower = new Set(menFirstNames.map((n) => n.toLowerCase()));
  const womenLower = new Set(womenFirstNames.map((n) => n.toLowerCase()));
  const allLower = new Set([...menLower, ...womenLower]);

  const tally = new Map<string, number>();
  for (const name of allLower) {
    if (name.length < MIN_COMPOUND_PART * 2) continue;
    for (let i = MIN_COMPOUND_PART; i <= name.length - MIN_COMPOUND_PART; i++) {
      const head = name.slice(0, i);
      const tail = name.slice(i);
      if (allLower.has(head) && allLower.has(tail)) {
        tally.set(tail, (tally.get(tail) ?? 0) + 1);
      }
    }
  }
  const suffixes = new Set<string>();
  for (const [tail, count] of tally) {
    if (count >= MIN_SUFFIX_OCCURRENCES) suffixes.add(tail);
  }

  const places = new Set(
    [...cities, ...areas].map((place) => place.toLowerCase())
  );
  return (compoundIndex = { menLower, womenLower, suffixes, places, memo: new Map() });
}

/** True when `word` decomposes into two registered same-gender first names. */
export function isCompoundFirstName(word: string): boolean {
  if (word.length < MIN_COMPOUND_PART * 2) return false;
  const index = getCompoundIndex();
  const lower = word.toLowerCase();
  const memoized = index.memo.get(lower);
  if (memoized !== undefined) return memoized;

  let result = false;
  if (!index.places.has(lower)) {
    for (let i = MIN_COMPOUND_PART; i <= lower.length - MIN_COMPOUND_PART; i++) {
      const head = lower.slice(0, i);
      const tail = lower.slice(i);
      if (!index.suffixes.has(tail)) continue;
      if (STOPWORDS.has(head) || STOPWORDS.has(tail)) continue;
      if (COMPOUND_PART_BLOCKLIST.has(head) || COMPOUND_PART_BLOCKLIST.has(tail))
        continue;
      if (
        (index.menLower.has(head) && index.menLower.has(tail)) ||
        (index.womenLower.has(head) && index.womenLower.has(tail))
      ) {
        result = true;
        break;
      }
    }
  }
  if (index.memo.size >= MEMO_LIMIT) index.memo.clear();
  index.memo.set(lower, result);
  return result;
}

/**
 * Match a "First Last" string against the name lists. Returns the
 * canonical matched names, or null when either part misses.
 */
export function matchFullName(
  fullName: string
): { first: string; last: string } | null {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const first = findBestMatch(
    parts[0].toLowerCase(),
    getFirstNameIndex(),
    FIRST_NAME_THRESHOLD
  );
  if (!first) return null;
  const last = findBestMatch(
    parts[1].toLowerCase(),
    getLastNameIndex(),
    LAST_NAME_THRESHOLD
  );
  if (!last) return null;
  return { first, last };
}

/**
 * Function words that are also registered names in the SCB lists ("Vi",
 * "Han", "Men", "Om", "The", "She" all have 10+ bearers). Without this
 * guard, nearly every Swedish sentence-initial pronoun or conjunction
 * would be masked as a person. Genuine name/word homographs that are
 * common as names ("Bo", "Stig") are deliberately NOT listed.
 */
const STOPWORDS = new Set([
  // Swedish pronouns, conjunctions, adverbs, determiners
  "vi", "du", "ni", "jag", "han", "hon", "hen", "den", "det", "de", "dem",
  "man", "men", "och", "om", "nu", "ja", "nej", "inte", "alla", "allt",
  "en", "ett", // indefinite articles — both registered as first names
  "som", "då", "när", "var", "vad", "vem", "hur", "här", "där", "sedan",
  "samt", "eller", "bara", "mycket", "denna", "detta", "dessa", "min",
  "ring", // imperative "call!" — also a registered surname
  "din", "sin", "vår", "er", "hans", "hennes", "deras", "efter", "under",
  "över", "mellan", "mot", "från", "till", "med", "utan", "vid",
  // English equivalents
  "the", "this", "that", "these", "those", "she", "he", "they", "them",
  "was", "were", "are", "is", "and", "but", "all", "not", "one", "two",
  "when", "who", "how", "why", "what", "with", "from", "for", "may",
  "can", "will", "our", "your", "his", "her", "its",
]);

const isStopword = (word: string) => STOPWORDS.has(word.toLowerCase());

// A capitalized (possibly hyphenated) word. Unicode lookarounds stand in
// for \b, which is ASCII-only and never fires before Å/Ä/Ö.
const WORD = "[A-ZÅÄÖÉ][a-zåäöé]+(?:-[A-ZÅÄÖÉa-zåäöé][a-zåäöé]*)?";
const NAME_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}("'\\[’])(${WORD})(?:[ \\t]+(${WORD}))?(?![\\p{L}\\p{N})"'\\]’])`,
  "gu"
);

/**
 * Detect person names:
 * - two adjacent capitalized words are fuzzy-matched as "First Last"
 *   (both parts must match their respective lists), and
 * - single capitalized words are masked on exact list membership.
 */
export const personNames: Detector = {
  labels: ["PER_FIRST", "PER_LAST"],
  detect(text) {
    const spans: EntitySpan[] = [];
    const regex = NAME_PATTERN;
    regex.lastIndex = 0;

    const pushSingle = (
      label: "PER_FIRST" | "PER_LAST",
      word: string,
      start: number,
      score: number
    ) => {
      spans.push({ label, value: word, start, end: start + word.length, score });
    };

    const singleWordLookup = (word: string, start: number): void => {
      if (isStopword(word)) return;
      if (getFirstNameIndex().exact.has(word)) {
        pushSingle("PER_FIRST", word, start, SINGLE_NAME_SCORE);
      } else if (getLastNameIndex().exact.has(word)) {
        pushSingle("PER_LAST", word, start, SINGLE_NAME_SCORE);
      } else if (isCompoundFirstName(word)) {
        pushSingle("PER_FIRST", word, start, COMPOUND_NAME_SCORE);
      }
    };

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const [, p1, p2] = match;
      const p1Start = match.index;
      if (p2) {
        const p2Start = match.index + match[0].length - p2.length;
        // "Men Andersson sa…" must not read the conjunction as a first
        // name, so stopwords disqualify the pair (each word may still
        // match individually below, minus the stopword).
        if (
          !isStopword(p1) &&
          !isStopword(p2) &&
          matchFullName(`${p1} ${p2}`)
        ) {
          pushSingle("PER_FIRST", p1, p1Start, FULL_NAME_SCORE);
          pushSingle("PER_LAST", p2, p2Start, FULL_NAME_SCORE);
          continue;
        }
        singleWordLookup(p1, p1Start);
        singleWordLookup(p2, p2Start);
        continue;
      }
      singleWordLookup(p1, p1Start);
    }
    return spans;
  },
};
