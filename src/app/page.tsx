"use client";

import { useState, useEffect, useRef } from "react";
import debounce from "@/utils/debounce";
import {
  getFemalePersonnummerRegex,
  getMalePersonnummerRegex,
  getFemaleSamordningsnummerRegex,
  getMaleSamordningsnummerRegex,
} from "@/regex/getIdNumberRegex";
import { getCountyRegex, getMunicipalityRegex, getPostalCodeRegex, getStreetAddressRegex } from "@/regex/getLocationRegex";
import { getDeomographicRegex, getDisabilityRegex, getGeneticSexRegex, getMartialStatusRegex, getPoliticalIdeologiesRegex, getReligionRegex, getSexualOrientationRegex } from "@/regex/getSensitiveAttributesRegex";
import { getEducationOrganizationRegex, getEducationProgramRegex, getOrganizationNumber, getWorkOrganizationRegex, getWorkProfessionRegex } from "@/regex/getWorkEduRegex";
import { getAmexCreditCardRegex, getBankNumberRegex, getBicCodeRegex, getIbanCodeRegex, getMasterCardCreditCardRegex, getVisaCreditCardRegex } from "@/regex/getFinancialRegex";
import { getEmailAddressRegex, getPhoneNumberRegex, getSocialMedia } from "@/regex/getContactRegex";
import { getDateRegex, getIpAddressRegex, getLicensePlateRegex, getMacAddressRegex, getTimeRegex } from "@/regex/getMiscRegex";
import { maskNamesInText } from "@/utils/nameMatch";

interface MaskedData {
  [key: string]: string[];
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
function maskPII(text: string): { maskedText: string; maskedData: MaskedData } {
  let maskedValues: MaskedData = {};

  // Mask names first
  let maskedText = maskNamesInText(text, maskedValues);

  // Then mask all other patterns in order
  for (const [label, regex] of regexPatterns) {
    maskedText = maskedText.replace(regex, (match) => {
      maskedValues[label] = maskedValues[label] || [];
      maskedValues[label].push(match);
      return `<${label}>`;
    });
  }

  return { maskedText, maskedData: maskedValues };
}


export default function Home() {
  const [inputText, setInputText] = useState<string>("");
  const [maskedText, setMaskedText] = useState<string>("");
  const [maskedData, setMaskedData] = useState<MaskedData>({});

  // Debounce with useRef so it's not recreated on every render
  const debouncedMaskPII = useRef(
    debounce((text: string) => {
      const { maskedText, maskedData } = maskPII(text);
      setMaskedText(maskedText);
      setMaskedData(maskedData);
    }, 389)
  ).current;

  useEffect(() => {
    debouncedMaskPII(inputText);
  }, [inputText, debouncedMaskPII]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-16 bg-slate-100">
      <div className="w-full max-w-xl space-y-4">
        <div>
          <h1 className="font-medium text-center text-xl">
            Swedish
            <br />
            Personal Identifiable Information (PII)
            <br />
            Detection & Masking
          </h1>
        </div>
        <div className="!mt-8">
          <label
            htmlFor="editable-input"
            className="block text-sm font-medium text-gray-800"
          >
            Editable Input
          </label>
          <textarea
            id="editable-input"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md h-32"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="masked-output"
            className="block text-sm font-medium text-gray-800"
          >
            Masked Output
          </label>
          <textarea
            id="masked-output"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md h-32 whitespace-pre-wrap text-wrap"
            value={maskedText}
            readOnly
          />
        </div>
        <div>
          <label
            htmlFor="masked-data"
            className="block text-sm font-medium text-gray-800"
          >
            PII Data
          </label>
          <div
            id="masked-data"
            className="p-4 border border-gray-300 rounded-md bg-white"
          >
            <pre>{JSON.stringify(maskedData, null, 2)}</pre>
          </div>
        </div>
      </div>
    </main>
  );
}