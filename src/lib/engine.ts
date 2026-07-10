import type {
  DetectOptions,
  Detector,
  EntitySpan,
  MaskResult,
  MaskedData,
  PiiEntity,
} from "./types";
import { personNames } from "./detectors/names";
import {
  amexCreditCard,
  bicCode,
  ibanCode,
  mastercardCreditCard,
  seBankNumber,
  visaCreditCard,
} from "./detectors/financial";
import { idNumberDetectors } from "./detectors/idNumbers";
import { contactDetectors } from "./detectors/contact";
import {
  locationDetectors,
  seKnownStreetAddressMultiWord,
} from "./detectors/location";
import {
  seEducationOrganization,
  seEducationProgram,
  seOrganizationNumber,
  seWorkOrganization,
  seWorkProfession,
} from "./detectors/workEducation";
import { sensitiveAttributeDetectors } from "./detectors/sensitiveAttributes";
import { miscDetectors } from "./detectors/misc";
import { DEFAULT_SCORE_THRESHOLD } from "./internal/regex";

/**
 * Detectors in priority order: when two detectors match overlapping
 * text, the one listed first wins. Names run first, then patterns from
 * most to least specific — in particular, the generic Swedish bank
 * account number (10–11 digits) runs after personnummer, organization
 * numbers, cards and phone numbers, all of which it would otherwise
 * shadow.
 */
export const detectors: Detector[] = [
  // Exact multi-word OSM street matches outrank person names: in
  // "Akalla By", the surname "By" must not break up the street.
  seKnownStreetAddressMultiWord,
  personNames,
  ...idNumberDetectors,
  seOrganizationNumber,
  amexCreditCard,
  mastercardCreditCard,
  visaCreditCard,
  ibanCode,
  bicCode,
  ...contactDetectors,
  seBankNumber,
  ...locationDetectors,
  seWorkOrganization,
  seEducationOrganization,
  seEducationProgram,
  seWorkProfession,
  ...sensitiveAttributeDetectors,
  ...miscDetectors,
];

/**
 * Insert `span` into `sorted` (ordered by start) unless it overlaps an
 * existing span. Binary search keeps overlap resolution at O(log n)
 * per candidate instead of a linear scan of everything accepted so far.
 */
function insertIfFree(sorted: EntitySpan[], span: EntitySpan): boolean {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].start < span.start) lo = mid + 1;
    else hi = mid;
  }
  const previous = sorted[lo - 1];
  if (previous && previous.end > span.start) return false;
  const next = sorted[lo];
  if (next && next.start < span.end) return false;
  sorted.splice(lo, 0, span);
  return true;
}

/**
 * Replace the given spans with NUL filler characters of equal length.
 * Offsets are preserved, and no detector pattern can match a NUL, so
 * blanked regions act as hard boundaries for lower-priority detectors.
 */
function blankSpans(text: string, spans: EntitySpan[]): string {
  const ordered = [...spans].sort((a, b) => a.start - b.start);
  const parts: string[] = [];
  let cursor = 0;
  for (const span of ordered) {
    parts.push(text.slice(cursor, span.start));
    parts.push("\u0000".repeat(span.end - span.start));
    cursor = span.end;
  }
  parts.push(text.slice(cursor));
  return parts.join("");
}

/**
 * Run all detectors in priority order. Each detector sees the input
 * with higher-priority matches blanked out (never with placeholder text,
 * so placeholders can't be re-matched or corrupted). Blanking — rather
 * than dropping overlapping candidates outright — lets a lower-priority
 * detector still match the uncovered remainder: in "Lilla Vägen 7",
 * where "Lilla" is a registered first name, the street detector can
 * still mask "Vägen 7".
 *
 * Every candidate carries a confidence score; candidates below
 * `scoreThreshold` are discarded before overlap resolution.
 */
export function detectPII(text: string, options: DetectOptions = {}): PiiEntity[] {
  const resolvedOptions: Required<DetectOptions> = {
    strict: options.strict ?? false,
    scoreThreshold: options.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD,
  };

  const accepted: EntitySpan[] = [];
  let working = text;
  for (const detector of detectors) {
    const newlyAccepted: EntitySpan[] = [];
    for (const span of detector.detect(working, resolvedOptions)) {
      if (span.score < resolvedOptions.scoreThreshold) continue;
      // Take the value from the original text: `working` may contain
      // filler characters adjacent to (never inside) a match.
      const candidate = { ...span, value: text.slice(span.start, span.end) };
      if (insertIfFree(accepted, candidate)) {
        newlyAccepted.push(candidate);
      }
    }
    if (newlyAccepted.length > 0) {
      working = blankSpans(working, newlyAccepted);
    }
  }

  // `accepted` is already sorted by start, courtesy of insertIfFree.
  const counters = new Map<string, number>();
  return accepted.map((span) => {
    const next = (counters.get(span.label) ?? 0) + 1;
    counters.set(span.label, next);
    return { ...span, id: `${span.label}_${next}` };
  });
}

/**
 * Mask every detected entity in `text`, replacing it with `<LABEL_n>`.
 * The returned `maskedData` maps each label to its values in order of
 * appearance, and `entities` carries exact offsets into the input.
 */
export function maskPII(text: string, options: DetectOptions = {}): MaskResult {
  const entities = detectPII(text, options);

  let maskedText = "";
  let cursor = 0;
  const maskedData: MaskedData = {};
  for (const entity of entities) {
    maskedText += text.slice(cursor, entity.start) + `<${entity.id}>`;
    cursor = entity.end;
    (maskedData[entity.label] ??= []).push({
      id: entity.id,
      value: entity.value,
    });
  }
  maskedText += text.slice(cursor);

  return { maskedText, maskedData, entities };
}
