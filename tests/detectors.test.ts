import { describe, expect, it } from "vitest";
import type { Detector } from "@/lib/types";
import { DEFAULT_SCORE_THRESHOLD } from "@/lib/internal/regex";
import {
  amexCreditCard,
  mastercardCreditCard,
  visaCreditCard,
  ibanCode,
  bicCode,
  seBankNumber,
} from "@/lib/detectors/financial";
import {
  malePersonnummer,
  femalePersonnummer,
  maleSamordningsnummer,
  femaleSamordningsnummer,
} from "@/lib/detectors/idNumbers";
import { emailAddress, phoneNumber, socialMedia } from "@/lib/detectors/contact";
import {
  seStreetAddress,
  sePostalCode,
  seMunicipality,
  seCounty,
} from "@/lib/detectors/location";
import {
  seWorkOrganization,
  seEducationOrganization,
  seEducationProgram,
  seWorkProfession,
  seOrganizationNumber,
} from "@/lib/detectors/workEducation";
import {
  maritalStatus,
  maritalStatusAmbiguous,
  geneticSex,
  disability,
  religion,
  sexualOrientation,
  demographic,
  politicalIdeologies,
} from "@/lib/detectors/sensitiveAttributes";
import {
  seLicensePlate,
  ipAddress,
  macAddress,
  date,
  time,
} from "@/lib/detectors/misc";

function values(detector: Detector, text: string, strict = false): string[] {
  return detector
    .detect(text, { strict, scoreThreshold: DEFAULT_SCORE_THRESHOLD })
    .filter((s) => s.score >= DEFAULT_SCORE_THRESHOLD)
    .map((s) => s.value);
}

describe("financial detectors", () => {
  it("matches Amex, Mastercard and Visa numbers", () => {
    expect(values(amexCreditCard, "Amex: 3782 822463 10005")).toEqual([
      "3782 822463 10005",
    ]);
    expect(values(mastercardCreditCard, "MC: 5555-4444-3333-1111")).toEqual([
      "5555-4444-3333-1111",
    ]);
    expect(values(mastercardCreditCard, "MC 2-series: 2221000000000009")).toEqual([
      "2221000000000009",
    ]);
    expect(values(visaCreditCard, "Visa: 4111 1111 1111 1111")).toEqual([
      "4111 1111 1111 1111",
    ]);
  });

  it("requires a consistent group separator", () => {
    expect(values(visaCreditCard, "4111 1111-1111 1111")).toEqual([]);
  });

  it("accepts only documented Visa card lengths", () => {
    expect(values(visaCreditCard, "Visa: 4222 2222 2222 2", true)).toEqual([
      "4222 2222 2222 2",
    ]);
    expect(values(visaCreditCard, "4111 1111 1111 12")).toEqual([]);
    expect(values(visaCreditCard, "4111 1111 1111 123")).toEqual([]);
  });

  it("enforces Luhn in strict mode only", () => {
    const invalid = "4111 1111 1111 1112";
    expect(values(visaCreditCard, invalid)).toEqual([invalid]);
    expect(values(visaCreditCard, invalid, true)).toEqual([]);
    expect(values(visaCreditCard, "4111 1111 1111 1111", true)).toEqual([
      "4111 1111 1111 1111",
    ]);
  });

  it("matches IBAN and BIC codes", () => {
    expect(values(ibanCode, "IBAN SE3550000000054910000003.")).toEqual([
      "SE3550000000054910000003",
    ]);
    expect(values(ibanCode, "GB29 NWBK 6016 1331 9268 19 end")).toEqual([
      "GB29 NWBK 6016 1331 9268 19",
    ]);
    expect(values(bicCode, "BIC: ESSESESS")).toEqual(["ESSESESS"]);
    expect(values(bicCode, "BIC: DEUTDEFF500")).toEqual(["DEUTDEFF500"]);
  });

  it("matches Swedish bank account numbers but not phone numbers", () => {
    expect(values(seBankNumber, "Konto 8327-9123456")).toEqual(["8327-9123456"]);
    expect(values(seBankNumber, "Ring 0701234567")).toEqual([]);
  });
});

describe("identity number detectors", () => {
  // 811218-9876 (male, valid Luhn), 811218-9862 (female, valid Luhn)
  it("splits personnummer by sex digit", () => {
    expect(values(malePersonnummer, "pnr 811218-9876")).toEqual([
      "811218-9876",
    ]);
    expect(values(femalePersonnummer, "pnr 811218-9876")).toEqual([]);
    expect(values(femalePersonnummer, "pnr 811218-9862")).toEqual([
      "811218-9862",
    ]);
  });

  it("accepts 12-digit and '+' separated forms", () => {
    expect(values(malePersonnummer, "19811218-9876")).toEqual([
      "19811218-9876",
    ]);
    expect(values(malePersonnummer, "198112189876")).toEqual(["198112189876"]);
    expect(values(malePersonnummer, "811218+9876")).toEqual(["811218+9876"]);
  });

  it("matches coordination numbers (day + 60)", () => {
    expect(values(maleSamordningsnummer, "samnr 811278-9876")).toEqual([
      "811278-9876",
    ]);
    expect(values(femaleSamordningsnummer, "samnr 811278-9862")).toEqual([
      "811278-9862",
    ]);
    expect(values(maleSamordningsnummer, "pnr 811218-9876")).toEqual([]);
  });

  it("enforces checksum and real date in strict mode", () => {
    expect(values(malePersonnummer, "811218-9896", true)).toEqual([]); // bad Luhn
    expect(values(malePersonnummer, "810230-4713", true)).toEqual([]); // Feb 30
    expect(values(malePersonnummer, "811218-9876", true)).toEqual([
      "811218-9876",
    ]);
  });
});

describe("contact detectors", () => {
  it("matches emails", () => {
    expect(values(emailAddress, "mail anna.andersson@email.se!")).toEqual([
      "anna.andersson@email.se",
    ]);
  });

  it("matches Swedish phone formats", () => {
    expect(values(phoneNumber, "Ring +46701234567 idag")).toEqual([
      "+46701234567",
    ]);
    expect(values(phoneNumber, "070-123 45 67")).toEqual(["070-123 45 67"]);
    expect(values(phoneNumber, "08-123 456 78")).toEqual(["08-123 456 78"]);
  });

  it("does not match plain large numbers", () => {
    expect(values(phoneNumber, "belopp 12345678")).toEqual([]);
  });

  it("matches handles and profile URLs", () => {
    expect(values(socialMedia, "Följ @annaandersson på Instagram")).toEqual([
      "@annaandersson",
    ]);
    expect(
      values(socialMedia, "profil: https://instagram.com/annaandersson")
    ).toEqual(["https://instagram.com/annaandersson"]);
  });

  it("does not treat email domains as handles", () => {
    expect(values(socialMedia, "anna@gmail.com")).toEqual([]);
  });
});

describe("location detectors", () => {
  it("matches street addresses with house numbers", () => {
    expect(values(seStreetAddress, "bor på Storgatan 12 i stan")).toEqual([
      "Storgatan 12",
    ]);
    expect(values(seStreetAddress, "Lilla Vägen 7")).toEqual(["Lilla Vägen 7"]);
    expect(values(seStreetAddress, "Kungsgatan 45,")).toEqual(["Kungsgatan 45"]);
  });

  it("matches postal codes with address context or a following place name", () => {
    expect(values(sePostalCode, "114 55 Stockholm")).toEqual(["114 55"]);
    expect(values(sePostalCode, "postnummer 11455")).toEqual(["11455"]);
    expect(values(sePostalCode, "014 55 Stockholm")).toEqual([]); // leading 0
    // a bare five-digit number is NOT a postal code without context
    expect(values(sePostalCode, "11455")).toEqual([]);
  });

  it("matches municipalities and counties, including å/ä/ö edges", () => {
    expect(values(seMunicipality, "bor i Åre kommun sedan 2019")).toEqual([
      "Åre kommun",
    ]);
    expect(values(seCounty, "i Västra Götalands län.")).toEqual([
      "Västra Götalands län",
    ]);
    expect(values(seCounty, "Örebro län")).toEqual(["Örebro län"]);
  });
});

describe("work/education detectors", () => {
  it("matches organizations with company suffixes", () => {
    expect(values(seWorkOrganization, "Jobbar på Volvo AB i Göteborg")).toEqual([
      "Volvo AB",
    ]);
    expect(values(seWorkOrganization, "bara ordet AB ensamt")).toEqual([]);
  });

  it("matches education organizations", () => {
    expect(
      values(seEducationOrganization, "Studerade vid Karolinska Institutet")
    ).toEqual(["Karolinska Institutet"]);
    expect(values(seEducationOrganization, "Lunds universitet")).toEqual([
      "Lunds universitet",
    ]);
  });

  it("matches education programs", () => {
    expect(values(seEducationProgram, "läser Läkarprogrammet nu")).toEqual([
      "Läkarprogrammet",
    ]);
  });

  it("matches professions from the list", () => {
    expect(values(seWorkProfession, "arbetar som advokat i Malmö")).toEqual([
      "advokat",
    ]);
  });

  it("matches organization numbers but not personnummer shapes", () => {
    expect(values(seOrganizationNumber, "org.nr 556012-5790")).toEqual([
      "556012-5790",
    ]);
    expect(values(seOrganizationNumber, "org.nr 202100-2973")).toEqual([
      "202100-2973",
    ]);
    // month digits 01-12 => personnummer, not an org number
    expect(values(seOrganizationNumber, "811218-9876")).toEqual([]);
  });

  it("validates org number Luhn in strict mode", () => {
    expect(values(seOrganizationNumber, "556012-5790", true)).toEqual([
      "556012-5790",
    ]);
    expect(values(seOrganizationNumber, "556012-5791", true)).toEqual([]);
  });
});

describe("sensitive attribute detectors", () => {
  it("matches marital status in both languages (regression: missing '|')", () => {
    expect(values(maritalStatus, "She is married")).toEqual(["married"]);
    expect(values(maritalStatus, "Han är ogift och sambo")).toEqual([
      "ogift",
      "sambo",
    ]);
    expect(values(maritalStatus, "Registered partner since 2020")).toEqual([
      "Registered partner",
    ]);
    // "gift"/"single" live in the ambiguous-terms detector
    expect(values(maritalStatusAmbiguous, "Han är gift")).toEqual(["gift"]);
    expect(values(maritalStatusAmbiguous, "She is single now")).toEqual([
      "single",
    ]);
  });

  it("prefers the longest term", () => {
    expect(values(maritalStatus, "Registrerad partner")).toEqual([
      "Registrerad partner",
    ]);
  });

  it("matches sex, disability, religion", () => {
    expect(values(geneticSex, "identifies as female")).toEqual(["female"]);
    expect(values(disability, "har en synskada och ADHD")).toEqual([
      "synskada",
      "ADHD",
    ]);
    expect(values(religion, "medlem i Svenska kyrkan")).toEqual([
      "Svenska kyrkan",
    ]);
    expect(values(religion, "hon är katolik")).toEqual(["katolik"]);
  });

  it("matches sexual orientation including suffix families", () => {
    expect(values(sexualOrientation, "hon är bisexuell")).toEqual(["bisexuell"]);
    expect(values(sexualOrientation, "he is heterosexual")).toEqual([
      "heterosexual",
    ]);
  });

  it("matches all demographic occurrences (regression: missing 'g' flag)", () => {
    expect(values(demographic, "En svensk och en norsk person")).toEqual([
      "svensk",
      "norsk",
    ]);
    expect(values(demographic, "Österrikisk medborgare")).toEqual([
      "Österrikisk",
    ]);
  });

  it("matches political ideologies", () => {
    expect(values(politicalIdeologies, "hon är socialdemokrat")).toEqual([
      "socialdemokrat",
    ]);
  });
});

describe("misc detectors", () => {
  it("matches Swedish license plates", () => {
    expect(values(seLicensePlate, "bilen ABC 123 är blå")).toEqual(["ABC 123"]);
    expect(values(seLicensePlate, "nya formatet ABC12X")).toEqual(["ABC12X"]);
    // I, Q, V are never issued
    expect(values(seLicensePlate, "QIV 123")).toEqual([]);
  });

  it("matches valid IPv4 addresses only", () => {
    expect(values(ipAddress, "server på 192.168.1.1 svarar")).toEqual([
      "192.168.1.1",
    ]);
    expect(values(ipAddress, "999.999.999.999")).toEqual([]);
    expect(values(ipAddress, "version 1.2.3.4.5")).toEqual([]);
  });

  it("matches MAC addresses with a consistent separator", () => {
    expect(values(macAddress, "MAC 00:1A:2B:3C:4D:5E ok")).toEqual([
      "00:1A:2B:3C:4D:5E",
    ]);
    expect(values(macAddress, "00-1A-2B-3C-4D-5E")).toEqual([
      "00-1A-2B-3C-4D-5E",
    ]);
    expect(values(macAddress, "00:1A-2B:3C-4D:5E")).toEqual([]);
  });

  it("matches ISO dates with a consistent separator", () => {
    expect(values(date, "möte 2024-06-01 kl 14")).toEqual(["2024-06-01"]);
    expect(values(date, "2024/06/01")).toEqual(["2024/06/01"]);
    expect(values(date, "2024-06/01")).toEqual([]);
    expect(values(date, "2024-13-01")).toEqual([]);
  });

  it("rejects impossible dates in strict mode", () => {
    expect(values(date, "2023-02-29")).toEqual(["2023-02-29"]);
    expect(values(date, "2023-02-29", true)).toEqual([]);
  });

  it("matches 24h times only", () => {
    expect(values(time, "kl 14:30 och 09:00:15")).toEqual([
      "14:30",
      "09:00:15",
    ]);
    expect(values(time, "99:99")).toEqual([]);
  });
});
