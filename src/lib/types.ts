/** All PII labels this library can detect. */
export type PiiLabel =
  // Names
  | "PER_FIRST"
  | "PER_LAST"
  // Financial
  | "AMEX_CREDIT_CARD"
  | "MASTERCARD_CREDIT_CARD"
  | "VISA_CREDIT_CARD"
  | "IBAN_CODE"
  | "BIC_CODE"
  | "SE_BANK_NUMBER"
  | "SE_BANKGIRO"
  | "SE_PLUSGIRO"
  | "SE_VAT_NUMBER"
  | "CRYPTO_WALLET"
  // Identification numbers
  | "SE_PERSONAL_IDENTITY_NUMBER_MALE"
  | "SE_PERSONAL_IDENTITY_NUMBER_FEMALE"
  | "SE_COORDINATION_NUMBER_MALE"
  | "SE_COORDINATION_NUMBER_FEMALE"
  | "SE_PASSPORT_NUMBER"
  // Contact
  | "EMAIL_ADDRESS"
  | "PHONE_NUMBER"
  | "SOCIAL_MEDIA"
  // Location
  | "SE_STREET_ADDRESS"
  | "SE_POSTAL_CODE"
  | "SE_MUNICIPALITY"
  | "SE_COUNTY"
  | "SE_CITY"
  | "SE_PROPERTY_DESIGNATION"
  | "COORDINATE"
  // Work / education
  | "SE_WORK_ORGANIZATION"
  | "SE_EDUCATION_ORGANIZATION"
  | "SE_EDUCATION_PROGRAM"
  | "SE_WORK_PROFESSION"
  | "SE_ORGANIZATION_NUMBER"
  // Sensitive attributes
  | "MARITAL_STATUS"
  | "GENETIC_SEX"
  | "DISABILITY"
  | "RELIGION"
  | "SEXUAL_ORIENTATION"
  | "DEMOGRAPHIC"
  | "POLITICAL_IDEOLOGIES"
  | "SE_LABOR_UNION"
  // Misc
  | "SE_LICENSE_PLATE"
  | "IP_ADDRESS"
  | "MAC_ADDRESS"
  | "DATE"
  | "TIME"
  | "SE_CASE_NUMBER"
  | "AGE";

/** A single detected PII entity, anchored to the original text. */
export interface PiiEntity {
  /** Unique id within one detection run, e.g. `PHONE_NUMBER_1`. */
  id: string;
  label: PiiLabel;
  /** The matched text exactly as it appears in the input. */
  value: string;
  /** Start offset (inclusive) in the original text. */
  start: number;
  /** End offset (exclusive) in the original text. */
  end: number;
  /**
   * Confidence in (0, 1]. Checksum-validated matches score ~0.95,
   * exact gazetteer hits ~0.85–0.9, plain pattern shapes ~0.6, matches
   * that failed a checksum ~0.45, and context-starved shapes ~0.25
   * (below the default threshold).
   */
  score: number;
}

/** An entity candidate produced by a detector, before ids are assigned. */
export type EntitySpan = Omit<PiiEntity, "id">;

export interface DetectOptions {
  /**
   * When true, matches that carry a checksum (credit cards, personal
   * identity numbers, organization numbers, IBANs) must pass validation,
   * and date-based numbers must encode a real calendar date.
   * Defaults to false so that synthetic/example data is still masked.
   */
  strict?: boolean;
  /**
   * Entities scoring below this are dropped. Defaults to
   * DEFAULT_SCORE_THRESHOLD (0.4): checksum failures (0.45) survive,
   * context-starved shapes (0.25) do not. Lower it to catch e.g. bank
   * account numbers in bare CSV columns with no surrounding words;
   * raise it to keep only high-confidence entities.
   */
  scoreThreshold?: number;
}

/** A detector produces entity spans for one or more labels. */
export interface Detector {
  /** The label(s) this detector can emit — used for documentation/tooling. */
  labels: readonly PiiLabel[];
  detect(text: string, options: Required<DetectOptions>): EntitySpan[];
}

export interface MaskedValue {
  id: string;
  value: string;
}

/** Detected values grouped per label, in order of appearance. */
export type MaskedData = Partial<Record<PiiLabel, MaskedValue[]>>;

export interface MaskResult {
  /** Input text with every detected entity replaced by `<LABEL_n>`. */
  maskedText: string;
  /** Detected values grouped per label. */
  maskedData: MaskedData;
  /** Flat list of detected entities with offsets into the original text. */
  entities: PiiEntity[];
}
