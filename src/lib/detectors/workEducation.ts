import educationPrograms from "../../../data/education-programs.json";
import professions from "../../../data/professions.json";
import {
  alternation,
  regexDetector,
  termListRegex,
  wordBounded,
} from "../internal/regex";
import { swedishIdChecksum } from "../validation/luhn";
import type { Detector } from "../types";

/**
 * Company names: one or more capitalized words followed by a company
 * suffix (AB, HB, KB, Inc, Ltd, …), e.g. "Volvo AB", "Acme Group".
 * "." is deliberately not allowed inside a word — it would let a match
 * swallow a sentence boundary ("… H&M. Hennes AB").
 */
export const seWorkOrganization: Detector = regexDetector(
  "SE_WORK_ORGANIZATION",
  /\b(?:[A-ZÅÄÖ][A-Za-zÅÄÖåäöé&-]*\s)+(?:AB|HB|KB|Företag|Bolag|Industries|Group|Gruppen|Firma|Inc|Ltd|Corp|GmbH)\b/g
);

/**
 * Education institutions: capitalized words (plus common lowercase
 * fillers like "tekniska") followed by an institution suffix
 * (Universitet(et), Högskola(n), Gymnasium, Skola(n), Institut(et)).
 * Case-sensitive on purpose: a case-insensitive prefix would greedily
 * swallow entire sentences ending in "universitet".
 */
export const seEducationOrganization: Detector = regexDetector(
  "SE_EDUCATION_ORGANIZATION",
  new RegExp(
    "(?<![\\p{L}\\p{N}])(?:(?:[A-ZÅÄÖ][a-zåäöé]*|tekniska|nya)\\s)*" +
      // Final word: optional compound prefix ("Linné" in
      // "Linnéuniversitetet") followed by the institution suffix.
      "(?:[A-ZÅÄÖ][a-zåäöé]*)?" +
      "(?:[Uu]niversitet(?:et)?|[Hh]ögskolan?|[Gg]ymnasi(?:um|et)|[Ss]kolan?|[Ii]nstitut(?:et)?)" +
      "(?![\\p{L}\\p{N}])",
    "gu"
  )
);

/**
 * Education programs: the SCB SUN 2000 program list, plus generic
 * "…programmet" / "… utbildning" phrases.
 */
export const seEducationProgram: Detector = regexDetector(
  "SE_EDUCATION_PROGRAM",
  () =>
    new RegExp(
      wordBounded(
        `${alternation(educationPrograms)}|\\p{L}{2,}programmet|\\p{L}{2,}\\sutbildning`
      ),
      "giu"
    )
);

/** Job titles from the Arbetsförmedlingen list. */
export const seWorkProfession: Detector = regexDetector(
  "SE_WORK_PROFESSION",
  () => termListRegex(professions)
);

/**
 * Swedish organization number: 10 digits as NNNNNN-NNNN where the third
 * digit is always ≥ 2 (which distinguishes it from a personnummer whose
 * month digits are 01–12), optionally prefixed with century digits 16.
 */
export const seOrganizationNumber: Detector = regexDetector(
  "SE_ORGANIZATION_NUMBER",
  /\b(?:16)?\d{2}[2-9]\d{3}-\d{4}\b/g,
  { validate: (match) => swedishIdChecksum(match[0]) }
);

export const workEducationDetectors: Detector[] = [
  seWorkOrganization,
  seEducationOrganization,
  seEducationProgram,
  seWorkProfession,
  seOrganizationNumber,
];
