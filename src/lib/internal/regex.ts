import type { Detector, EntitySpan, PiiLabel } from "../types";

/**
 * Confidence levels, Presidio-style: recognizers report how sure they
 * are, callers filter with `scoreThreshold`.
 */
export const SCORE = {
  /** Checksum (Luhn / mod-97) or calendar validation passed. */
  VALIDATED: 0.95,
  /** Exact hit in a curated gazetteer (streets, municipalities). */
  EXACT_MATCH: 0.9,
  /** Fuzzy full-name match or context-corroborated shape. */
  CONTEXT: 0.85,
  /** Exact single-word lookup in a large list (names). */
  LOOKUP: 0.55,
  /** A plain pattern/term match with no further evidence. */
  PATTERN: 0.6,
  /** Heuristic shape (capitalized words + street suffix). */
  HEURISTIC: 0.5,
  /** Shape matched but its checksum failed. */
  FAILED_VALIDATION: 0.45,
  /** Shape matched but the expected nearby context is missing. */
  NO_CONTEXT: 0.25,
} as const;

/** Entities scoring below this are dropped unless the caller opts in. */
export const DEFAULT_SCORE_THRESHOLD = 0.4;

/** Escape a literal string for safe inclusion in a RegExp. */
export function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build an alternation of literal terms, longest first so that
 * "Registrerad partner" wins over "Partner". Terms are escaped, so data
 * files may safely contain regex metacharacters (e.g. "Yrke/Titel").
 */
export function alternation(terms: readonly string[]): string {
  const unique = Array.from(new Set(terms.filter((t) => t.length > 0)));
  unique.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return unique.map(escapeRegex).join("|");
}

/**
 * Wrap a pattern in Unicode-aware word boundaries. JavaScript's `\b` is
 * ASCII-only, so terms that start or end with å/ä/ö/é would otherwise
 * match mid-word (or never match at all).
 */
export function wordBounded(pattern: string): string {
  return `(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`;
}

/** Word-bounded alternation of literal terms as a global Unicode RegExp. */
export function termListRegex(
  terms: readonly string[],
  flags: "gu" | "giu" = "giu"
): RegExp {
  return new RegExp(wordBounded(alternation(terms)), flags);
}

export interface RegexDetectorOptions {
  /**
   * Checksum/plausibility validator. Unlike a hard filter it always
   * runs: a pass raises the score to `validScore`, a failure lowers it
   * to `invalidScore` (and drops the match entirely in strict mode).
   */
  validate?: (match: RegExpExecArray) => boolean;
  /** Base confidence for a plain match. Default SCORE.PATTERN. */
  score?: number;
  /** Confidence when `validate` passes. Default SCORE.VALIDATED. */
  validScore?: number;
  /** Confidence when `validate` fails. Default SCORE.FAILED_VALIDATION. */
  invalidScore?: number;
}

/**
 * Create a detector for a single label backed by a regex.
 *
 * The pattern (or pattern factory) is compiled exactly once and reused
 * across runs — list-based alternations can be hundreds of kilobytes,
 * and recompiling them per call dominates detection time. Statefulness
 * is avoided by resetting `lastIndex` before each run (detection always
 * runs the exec loop to completion, so no state leaks between calls).
 */
export function regexDetector(
  label: PiiLabel,
  pattern: RegExp | (() => RegExp),
  options: RegexDetectorOptions = {}
): Detector {
  const {
    validate,
    score = SCORE.PATTERN,
    validScore = SCORE.VALIDATED,
    invalidScore = SCORE.FAILED_VALIDATION,
  } = options;

  let compiled: RegExp | null = null;
  const getRegex = (): RegExp => {
    if (!compiled) {
      compiled = typeof pattern === "function" ? pattern() : pattern;
      if (!compiled.flags.includes("g")) {
        throw new Error(`Detector pattern for ${label} must use the "g" flag`);
      }
    }
    return compiled;
  };
  // Fail fast on a misconfigured non-factory pattern.
  if (typeof pattern !== "function") getRegex();

  return {
    labels: [label],
    detect(text, detectOptions) {
      const regex = getRegex();
      regex.lastIndex = 0;
      const spans: EntitySpan[] = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        if (match[0].length === 0) {
          regex.lastIndex++;
          continue;
        }
        let matchScore = score;
        if (validate) {
          if (validate(match)) {
            matchScore = validScore;
          } else if (detectOptions.strict) {
            continue;
          } else {
            matchScore = invalidScore;
          }
        }
        spans.push({
          label,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          score: matchScore,
        });
      }
      return spans;
    },
  };
}

/**
 * Presidio-style context enhancement: a match near a context cue is
 * boosted to `boostedScore`; a match without one is dimmed to
 * `dimmedScore` (below the default threshold, so it is dropped unless
 * the caller lowers `scoreThreshold`). This is how low-structure
 * patterns — a bank account is just ten digits — avoid flagging every
 * number of the right shape without losing them entirely.
 */
export function contextAware(
  detector: Detector,
  context: {
    before?: RegExp;
    after?: RegExp;
    window?: number;
    boostedScore?: number;
    dimmedScore?: number;
  }
): Detector {
  const window = context.window ?? 40;
  const boostedScore = context.boostedScore ?? SCORE.CONTEXT;
  const dimmedScore = context.dimmedScore ?? SCORE.NO_CONTEXT;

  // `g` and `y` regexes retain `lastIndex` between `test` calls. Context
  // expressions are often literals without either flag, but normalizing
  // their state makes this helper deterministic for every valid RegExp.
  const matchesContext = (regex: RegExp | undefined, value: string) => {
    if (!regex) return false;
    regex.lastIndex = 0;
    const matches = regex.test(value);
    regex.lastIndex = 0;
    return matches;
  };

  return {
    labels: detector.labels,
    detect(text, options) {
      return detector.detect(text, options).map((span) => {
        const beforeText = text.slice(
          Math.max(0, span.start - window),
          span.start
        );
        const afterText = text.slice(span.end, span.end + window);
        const hasContext =
          matchesContext(context.before, beforeText) ||
          matchesContext(context.after, afterText);
        // Context corroborates the *shape* — it must never outweigh a
        // failed checksum. Scores already below SCORE.PATTERN (e.g.
        // FAILED_VALIDATION) are left as-is even with context.
        const boosted =
          span.score < SCORE.PATTERN
            ? span.score
            : Math.max(span.score, boostedScore);
        return {
          ...span,
          score: hasContext ? boosted : Math.min(span.score, dimmedScore),
        };
      });
    },
  };
}
