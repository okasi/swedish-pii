/**
 * Swedish PII detection & masking.
 *
 * @example
 * ```ts
 * import { maskPII } from "@/lib";
 *
 * const { maskedText, maskedData } = maskPII(
 *   "Anna Andersson bor på Storgatan 12, 114 55 Stockholm."
 * );
 * // maskedText: "<PER_FIRST_1> <PER_LAST_1> bor på <SE_STREET_ADDRESS_1>, <SE_POSTAL_CODE_1> Stockholm."
 * ```
 */
export { detectPII, maskPII, detectors } from "./engine";
export { matchFullName } from "./detectors/names";
export { luhnCheck, swedishIdChecksum } from "./validation/luhn";
export { ibanChecksum } from "./validation/iban";
export { isRealDate, isValidIdentityDate } from "./validation/date";
export { jaroWinkler } from "./matching/jaroWinkler";
export { DEFAULT_SCORE_THRESHOLD, SCORE } from "./internal/regex";
export type {
  DetectOptions,
  Detector,
  EntitySpan,
  MaskResult,
  MaskedData,
  MaskedValue,
  PiiEntity,
  PiiLabel,
} from "./types";
