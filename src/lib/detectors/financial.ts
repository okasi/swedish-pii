import { contextAware, regexDetector } from "../internal/regex";
import { luhnCheck, swedishIdChecksum } from "../validation/luhn";
import { ibanChecksum } from "../validation/iban";
import type { Detector } from "../types";

const luhn = { validate: (match: RegExpExecArray) => luhnCheck(match[0]) };

/**
 * American Express: starts with 34 or 37, 15 digits (4-6-5 grouping),
 * with a consistent separator (space, hyphen or none).
 */
export const amexCreditCard: Detector = regexDetector(
  "AMEX_CREDIT_CARD",
  /\b3[47]\d{2}([-\s]?)\d{6}\1\d{5}\b/g,
  luhn
);

/**
 * Mastercard: 16 digits starting with 51–55 or 2221–2720, with a
 * consistent separator between groups of four.
 */
export const mastercardCreditCard: Detector = regexDetector(
  "MASTERCARD_CREDIT_CARD",
  /\b(?:5[1-5]\d{2}|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)([-\s]?)\d{4}\1\d{4}\1\d{4}\b/g,
  luhn
);

/**
 * Visa: starts with 4, 13 or 16 digits, with a consistent separator
 * between groups of four.
 */
export const visaCreditCard: Detector = regexDetector(
  "VISA_CREDIT_CARD",
  /\b4\d{3}([-\s]?)\d{4}\1\d{4}\1\d{1,4}\b/g,
  luhn
);

/**
 * ISO 3166-1 alpha-2 country codes (plus XK for Kosovo, which occurs in
 * BICs). Baked into the IBAN/BIC patterns as a structural constraint —
 * without it, any 8-letter ALL-CAPS word ("PASSWORD", "SHOUTING") parses
 * as a BIC.
 */
const ISO_COUNTRY = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH " +
  "BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL " +
  "CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET " +
  "FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU " +
  "GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE " +
  "KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC " +
  "MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC " +
  "NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT " +
  "PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR " +
  "SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA " +
  "UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");
const COUNTRY = `(?:${ISO_COUNTRY.join("|")})`;

/**
 * IBAN: valid 2-letter country code, 2 check digits, then 11–30
 * alphanumeric characters in optionally spaced groups of four
 * (e.g. SE35 5000 0000 0549 1000 0003). The mod-97 checksum adjusts
 * the confidence and becomes mandatory in strict mode.
 */
export const ibanCode: Detector = regexDetector(
  "IBAN_CODE",
  new RegExp(
    `\\b${COUNTRY}\\d{2}(?:\\s?[A-Z0-9]{4}){2,7}(?:\\s?[A-Z0-9]{1,3})?\\b`,
    "g"
  ),
  { validate: (match) => ibanChecksum(match[0]) }
);

/**
 * BIC/SWIFT: 4-letter bank code, valid 2-letter country code,
 * 2-character location code, optional 3-character branch code
 * (e.g. ESSESESS, DEUTDEFF500). Context-boosted: even with the country
 * check, ALL-CAPS words like FEEDBACK (BA = Bosnia) fit the shape, so a
 * BIC/SWIFT/IBAN/bank cue nearby raises confidence and its absence
 * drops the match below the default threshold.
 */
export const bicCode: Detector = contextAware(
  regexDetector(
    "BIC_CODE",
    new RegExp(`\\b[A-Z]{4}${COUNTRY}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\\b`, "g")
  ),
  {
    before: /\b(?:BIC|SWIFT|IBAN|bank)\b/i,
    after: /\b(?:BIC|SWIFT)\b/i,
    window: 40,
  }
);

/**
 * Swedish bank account number: 4-digit clearing number (clearing numbers
 * never start with 0, which keeps phone numbers like 0701234567 out)
 * followed by a 6–7 digit account number, optionally separated.
 * Context-boosted: ten digits alone are indistinguishable from invoice
 * or order numbers, so an account/bank/clearing cue nearby raises the
 * confidence and its absence drops the match below the default
 * threshold (recoverable via `scoreThreshold`).
 */
export const seBankNumber: Detector = contextAware(
  regexDetector("SE_BANK_NUMBER", /\b[1-9]\d{3}[-\s]?\d{2}[-\s]?\d{4,5}\b/g),
  {
    before: /konto|bank|clearing|account|acct/i,
    window: 30,
  }
);

/**
 * Bankgiro: 7–8 digits written NNN-NNNN or NNNN-NNNN, Luhn checksum
 * over all digits. Context-boosted — the shape alone matches invoice
 * references, so a bankgiro/bg cue must appear nearby.
 */
export const seBankgiro: Detector = contextAware(
  regexDetector("SE_BANKGIRO", /\b\d{3,4}-\d{4}\b/g, {
    validate: (match) => luhnCheck(match[0]),
  }),
  { before: /bankgiro|\bbg\b/i, window: 30 }
);

/**
 * Plusgiro: 2–8 digits with the final Luhn check digit after a hyphen
 * (e.g. 902003-3). Context-boosted for the same reason as bankgiro.
 */
export const sePlusgiro: Detector = contextAware(
  regexDetector("SE_PLUSGIRO", /\b\d{1,7}-\d\b/g, {
    validate: (match) => luhnCheck(match[0]),
  }),
  { before: /plusgiro|postgiro|\bpg\b/i, window: 30 }
);

/**
 * Swedish VAT number: "SE" + 10-digit organization number + "01"
 * (e.g. SE556012579001). The embedded org number carries a Luhn
 * checksum. Must run before the IBAN detector, whose pattern also
 * matches the SE-prefixed digit run.
 */
export const seVatNumber: Detector = regexDetector(
  "SE_VAT_NUMBER",
  /\bSE\d{10}01\b/g,
  { validate: (match) => swedishIdChecksum(match[0].slice(2, 12)) }
);

/**
 * Cryptocurrency wallet addresses: Ethereum (0x + 40 hex), Bitcoin
 * bech32 (bc1…) and legacy base58 (1…/3…).
 */
export const cryptoWallet: Detector = regexDetector(
  "CRYPTO_WALLET",
  // The legacy-Bitcoin branch requires at least one base58 letter so
  // that a long digit-only run (invoice/reference numbers) never
  // reads as a wallet.
  /\b(?:0x[a-fA-F0-9]{40}|bc1[ac-hj-np-z02-9]{11,71}|[13](?=\d*[A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{25,34})\b/g
);

export const financialDetectors: Detector[] = [
  amexCreditCard,
  mastercardCreditCard,
  visaCreditCard,
  cryptoWallet,
  seVatNumber,
  ibanCode,
  bicCode,
  seBankgiro,
  sePlusgiro,
  seBankNumber,
];
