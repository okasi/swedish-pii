

import { getCountyRegex, getMunicipalityRegex, getPostalCodeRegex, getStreetAddressRegex } from "@/regex/getLocationRegex";
import { getDeomographicRegex, getDisabilityRegex, getGeneticSexRegex, getMartialStatusRegex, getPoliticalIdeologiesRegex, getReligionRegex, getSexualOrientationRegex } from "@/regex/getSensitiveAttributesRegex";
import { getEducationOrganizationRegex, getEducationProgramRegex, getOrganizationNumber, getWorkOrganizationRegex, getWorkProfessionRegex } from "@/regex/getWorkEduRegex";
import { getAmexCreditCardRegex, getBankNumberRegex, getBicCodeRegex, getIbanCodeRegex, getMasterCardCreditCardRegex, getVisaCreditCardRegex } from "@/regex/getFinancialRegex";
import { getEmailAddressRegex, getPhoneNumberRegex, getSocialMedia } from "@/regex/getContactRegex";
import { getDateRegex, getIpAddressRegex, getLicensePlateRegex, getMacAddressRegex, getTimeRegex } from "@/regex/getMiscRegex";
import { maskNamesInText } from "@/utils/nameMatch";
import {
  getFemalePersonnummerRegex,
  getMalePersonnummerRegex,
  getFemaleSamordningsnummerRegex,
  getMaleSamordningsnummerRegex,
} from "@/regex/getIdNumberRegex";

export interface MaskedValue {
  id: string;
  value: string;
}

export interface MaskedData {
  [key: string]: MaskedValue[];
}

// Regex patterns as an ordered array (most specific/longest first)
const regexPatterns: [string, RegExp][] = [
  // Financial
  ["AMEX_CREDIT_CARD", getAmexCreditCardRegex()],
  ["MASTERCARD_CREDIT_CARD", getMasterCardCreditCardRegex()],
  ["VISA_CREDIT_CARD", getVisaCreditCardRegex()],
  ["IBAN_CODE", getIbanCodeRegex()],
  ["BIC_CODE", getBicCodeRegex()],
  ["SE_BANK_NUMBER", getBankNumberRegex()],
  // Identification Numbers
  ["SE_PERSONAL_IDENTITY_NUMBER_MALE", getMalePersonnummerRegex()],
  ["SE_PERSONAL_IDENTITY_NUMBER_FEMALE", getFemalePersonnummerRegex()],
  ["SE_COORDINATION_NUMBER_MALE", getMaleSamordningsnummerRegex()],
  ["SE_COORDINATION_NUMBER_FEMALE", getFemaleSamordningsnummerRegex()],
  // Contact
  ["EMAIL_ADDRESS", getEmailAddressRegex()],
  ["PHONE_NUMBER", getPhoneNumberRegex()],
  ["SOCIAL_MEDIA", getSocialMedia()],
  // Location
  ["SE_STREET_ADDRESS", getStreetAddressRegex()],
  ["SE_POSTAL_CODE", getPostalCodeRegex()],
  ["SE_MUNICIPALITY", getMunicipalityRegex()],
  ["SE_COUNTY", getCountyRegex()],
  // Work / Education
  ["SE_WORK_ORGANIZATION", getWorkOrganizationRegex()],
  ["SE_EDUCATION_ORGANIZATION", getEducationOrganizationRegex()],
  ["SE_EDUCATION_PROGRAM", getEducationProgramRegex()],
  ["SE_WORK_PROFESSION", getWorkProfessionRegex()],
  ["SE_ORGANIZATION_NUMBER", getOrganizationNumber()],
  // Sensitive Attributes
  ["MARITAL_STATUS", getMartialStatusRegex()],
  ["GENETIC_SEX", getGeneticSexRegex()],
  ["DISABILITY", getDisabilityRegex()],
  ["RELIGION", getReligionRegex()],
  ["SEXUAL_ORIENTATION", getSexualOrientationRegex()],
  ["DEMOGRAPHIC", getDeomographicRegex()],
  ["POLITICAL_IDEOLOGIES", getPoliticalIdeologiesRegex()],
  // Misc
  ["SE_LICENSE_PLATE", getLicensePlateRegex()],
  ["IP_ADDRESS", getIpAddressRegex()],
  ["MAC_ADDRESS", getMacAddressRegex()],
  ["DATE", getDateRegex()],
  ["TIME", getTimeRegex()],
];


// Main masking function
export function maskPII(text: string): { maskedText: string; maskedData: MaskedData } {
  let maskedValues: MaskedData = {};
  let idCounters: { [key: string]: number } = {};

  // Mask names first, now passing idCounters
  let maskedText = maskNamesInText(text, maskedValues, idCounters);

  // Then mask all other patterns in order
  for (const [label, regex] of regexPatterns) {
    idCounters[label] = idCounters[label] || 1;
    maskedText = maskedText.replace(regex, (match) => {
      maskedValues[label] = maskedValues[label] || [];
      const id = `${label}_${idCounters[label]++}`;
      maskedValues[label].push({ id, value: match });
      return `<${id}>`;
    });
  }

  return { maskedText, maskedData: maskedValues };
}

