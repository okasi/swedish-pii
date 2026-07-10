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
} from "@/lib/detectors/idNumbers";
import { emailAddress, phoneNumber, socialMedia } from "@/lib/detectors/contact";
import {
  seKnownStreetAddressMultiWord,
  seKnownStreetAddressSingleWord,
  seStreetAddress,
  sePostalCode,
  seMunicipality,
} from "@/lib/detectors/location";
import {
  seEducationProgram,
  seOrganizationNumber,
  seWorkOrganization,
} from "@/lib/detectors/workEducation";
import { maritalStatus, sexualOrientation } from "@/lib/detectors/sensitiveAttributes";
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

describe("credit card boundaries", () => {
  it("accepts only the real Mastercard BIN ranges", () => {
    // 2-series range is 2221–2720 inclusive
    expect(values(mastercardCreditCard, "2221000000000009")).toHaveLength(1);
    expect(values(mastercardCreditCard, "2720990000000006")).toHaveLength(1);
    expect(values(mastercardCreditCard, "2220000000000000")).toEqual([]);
    expect(values(mastercardCreditCard, "2721000000000000")).toEqual([]);
    // 5-series is 51–55
    expect(values(mastercardCreditCard, "5105105105105100")).toHaveLength(1);
    expect(values(mastercardCreditCard, "5005105105105100")).toEqual([]);
    expect(values(mastercardCreditCard, "5605105105105100")).toEqual([]);
  });

  it("accepts 13-digit but not 12-digit Visa numbers", () => {
    expect(values(visaCreditCard, "4222222222222")).toEqual(["4222222222222"]);
    expect(values(visaCreditCard, "422222222222")).toEqual([]);
  });

  it("accepts only Amex 34/37 prefixes", () => {
    expect(values(amexCreditCard, "3714-496353-98431")).toHaveLength(1);
    expect(values(amexCreditCard, "3814-496353-98431")).toEqual([]);
  });

  it("rejects a card split across mixed separators", () => {
    expect(values(amexCreditCard, "3714 496353-98431")).toEqual([]);
    expect(values(mastercardCreditCard, "5555 4444-3333 1111")).toEqual([]);
  });
});

describe("IBAN / BIC boundaries", () => {
  it("requires uppercase country code", () => {
    expect(values(ibanCode, "se3550000000054910000003")).toEqual([]);
  });

  it("matches 11-character BIC with branch code (given context)", () => {
    expect(values(bicCode, "BIC: ESSESESSXXX")).toEqual(["ESSESESSXXX"]);
    // without a BIC/SWIFT/bank cue nearby, the shape alone is not enough
    expect(values(bicCode, "ESSESESSXXX")).toEqual([]);
  });

  it("does not treat ordinary long uppercase words as BIC", () => {
    // 9 or 10 letters fit neither the 8- nor the 11-char BIC shape
    expect(values(bicCode, "STOCKHOLM")).toEqual([]);
    expect(values(bicCode, "GREENHOUSE")).toEqual([]);
  });
});

describe("identity number boundaries", () => {
  it("rejects month 00, 13 and day 00, 32", () => {
    expect(values(malePersonnummer, "811318-9876")).toEqual([]); // month 13
    expect(values(malePersonnummer, "810018-9876")).toEqual([]); // month 00
    expect(values(malePersonnummer, "811232-9876")).toEqual([]); // day 32
    expect(values(malePersonnummer, "811200-9876")).toEqual([]); // day 00
  });

  it("does not match a bare 10-digit run (ambiguous with phone/bank)", () => {
    expect(values(malePersonnummer, "8112189876")).toEqual([]);
  });

  it("does not match when embedded in a longer digit run", () => {
    expect(values(malePersonnummer, "9811218-98761")).toEqual([]);
  });

  it("rejects future years in strict mode", () => {
    const year = new Date().getFullYear() + 5;
    expect(values(malePersonnummer, `${year}1218-9876`, true)).toEqual([]);
  });

  it("keeps the male/female split mutually exclusive", () => {
    for (const value of ["811218-9876", "811218-9862"]) {
      const male = values(malePersonnummer, value).length;
      const female = values(femalePersonnummer, value).length;
      expect(male + female).toBe(1);
    }
  });
});

describe("contact boundaries", () => {
  it("accepts the 0046 international prefix", () => {
    expect(values(phoneNumber, "0046701234567")).toEqual(["0046701234567"]);
  });

  it("accepts short landline forms", () => {
    expect(values(phoneNumber, "08-12 34 56")).toEqual(["08-12 34 56"]);
  });

  it("rejects numbers that run too long", () => {
    expect(values(phoneNumber, "07012345678901234")).toEqual([]);
  });

  it("does not match inside a longer digit run", () => {
    expect(values(phoneNumber, "9080701234567")).toEqual([]);
  });

  it("accepts emails with plus-tags and subdomains", () => {
    expect(values(emailAddress, "x anna+tag@mail.sub.example.co.uk y")).toEqual([
      "anna+tag@mail.sub.example.co.uk",
    ]);
  });

  it("rejects emails without a TLD", () => {
    expect(values(emailAddress, "anna@localhost")).toEqual([]);
  });

  it("rejects one-character handles but accepts long ones", () => {
    expect(values(socialMedia, "se @a här")).toEqual([]);
    expect(values(socialMedia, "se @a_very_long_handle_here här")).toEqual([
      "@a_very_long_handle_here",
    ]);
  });
});

describe("location boundaries", () => {
  it("matches capitalized suffix-only street names", () => {
    expect(values(seStreetAddress, "bor på Vägen 7 i byn")).toEqual(["Vägen 7"]);
  });

  it("does not match the lowercase common noun", () => {
    expect(values(seStreetAddress, "på vägen hem")).toEqual([]);
  });

  it("includes entrance letters in the address", () => {
    expect(values(seStreetAddress, "Storgatan 12 B och")).toEqual([
      "Storgatan 12 B",
    ]);
  });

  it("matches streets without house numbers", () => {
    expect(values(seStreetAddress, "längs Kungsgatan mot torget")).toEqual([
      "Kungsgatan",
    ]);
  });

  it("does not match postal codes inside longer digit runs", () => {
    expect(values(sePostalCode, "1145567")).toEqual([]);
    expect(values(sePostalCode, "x11455x")).toEqual([]);
  });

  it("matches municipalities case-insensitively", () => {
    expect(values(seMunicipality, "ÅRE KOMMUN")).toEqual(["ÅRE KOMMUN"]);
    expect(values(seMunicipality, "åre kommun")).toEqual(["åre kommun"]);
  });
});

describe("OSM street lookup", () => {
  it("matches suffix-less streets from the OSM list", () => {
    expect(
      values(seKnownStreetAddressSingleWord, "bor på Aftonsången 3 i Lund")
    ).toEqual(["Aftonsången 3"]);
    expect(values(seKnownStreetAddressMultiWord, "vid Akalla By idag")).toEqual([
      "Akalla By",
    ]);
  });

  it("matches multi-word streets with initials and ordinals", () => {
    expect(
      values(seKnownStreetAddressMultiWord, "hos A F Carlssons gata 12 nu")
    ).toEqual(["A F Carlssons gata 12"]);
    expect(values(seKnownStreetAddressMultiWord, "på 2:a Villagatan")).toEqual([
      "2:a Villagatan",
    ]);
  });

  it("keeps the multi/single split disjoint", () => {
    expect(values(seKnownStreetAddressMultiWord, "Aftonsången 3")).toEqual([]);
    expect(values(seKnownStreetAddressSingleWord, "Akalla By")).toEqual([]);
  });

  it("includes house numbers with entrance letters", () => {
    expect(values(seKnownStreetAddressSingleWord, "Aftonsången 3 B och")).toEqual(
      ["Aftonsången 3 B"]
    );
  });

  it("skips short single-word street names that collide with prose", () => {
    // "Al", "By" and "Gata" are real OSM street names but far too risky
    expect(values(seKnownStreetAddressSingleWord, "besökte Al igår")).toEqual([]);
    expect(values(seKnownStreetAddressSingleWord, "en liten By i norr")).toEqual(
      []
    );
  });

  it("requires an uppercase (or digit) start", () => {
    expect(
      values(seKnownStreetAddressSingleWord, "hörde aftonsången i kyrkan")
    ).toEqual([]);
  });

  it("does not match across line breaks", () => {
    expect(values(seKnownStreetAddressMultiWord, "Akalla\nBy")).toEqual([]);
  });

  it("leaves unknown streets to the suffix heuristic", () => {
    expect(values(seKnownStreetAddressSingleWord, "Påhittadgatan 99")).toEqual(
      []
    );
    expect(values(seStreetAddress, "Påhittadgatan 99")).toEqual([
      "Påhittadgatan 99",
    ]);
  });
});

describe("work/education boundaries", () => {
  it("supports ampersands and dots in company names", () => {
    expect(values(seWorkOrganization, "hos H&M. Hennes AB idag")).toEqual([
      "Hennes AB",
    ]);
  });

  it("matches the generic '… utbildning' phrase", () => {
    expect(values(seEducationProgram, "en juridisk utbildning i Lund")).toEqual([
      "juridisk utbildning",
    ]);
  });

  it("accepts century-prefixed organization numbers", () => {
    expect(values(seOrganizationNumber, "16556012-5790")).toEqual([
      "16556012-5790",
    ]);
    expect(values(seOrganizationNumber, "16556012-5790", true)).toEqual([
      "16556012-5790",
    ]);
  });
});

describe("sensitive attribute boundaries", () => {
  it("does not match terms embedded in longer words", () => {
    expect(values(maritalStatus, "giftig svamp")).toEqual([]); // "gift" inside
    expect(values(maritalStatus, "presentation")).toEqual([]);
  });

  it("matches åäö terms at string edges (Unicode boundaries)", () => {
    expect(values(maritalStatus, "Änka")).toEqual(["Änka"]);
    expect(values(maritalStatus, "hon är änka.")).toEqual(["änka"]);
  });

  it("does not overreach the suffix families", () => {
    expect(values(sexualOrientation, "consensual")).toEqual([]);
    expect(values(sexualOrientation, "kontextuell")).toEqual([]);
  });
});

describe("misc boundaries", () => {
  it("rejects lowercase and forbidden-letter plates", () => {
    expect(values(seLicensePlate, "abc 123")).toEqual([]);
    expect(values(seLicensePlate, "AIC 123")).toEqual([]); // I never issued
    expect(values(seLicensePlate, "AQC 123")).toEqual([]); // Q never issued
    expect(values(seLicensePlate, "AVC 123")).toEqual([]); // V never issued
  });

  it("accepts IPv4 range extremes", () => {
    expect(values(ipAddress, "0.0.0.0 och 255.255.255.255")).toEqual([
      "0.0.0.0",
      "255.255.255.255",
    ]);
  });

  it("rejects octets above 255 and zero-padded octets", () => {
    expect(values(ipAddress, "192.168.1.256")).toEqual([]);
    expect(values(ipAddress, "01.2.3.4")).toEqual([]);
  });

  it("accepts lowercase hex MAC addresses", () => {
    expect(values(macAddress, "00:1a:2b:3c:4d:5e")).toEqual([
      "00:1a:2b:3c:4d:5e",
    ]);
  });

  it("validates leap-day dates only in strict mode", () => {
    expect(values(date, "2024-02-29", true)).toEqual(["2024-02-29"]);
    expect(values(date, "2023-02-29", true)).toEqual([]);
    expect(values(date, "1900-02-29", true)).toEqual([]); // 1900 is not a leap year
    expect(values(date, "2000-02-29", true)).toEqual(["2000-02-29"]);
  });

  it("accepts midnight boundaries and rejects 24:00", () => {
    expect(values(time, "00:00 och 23:59:59")).toEqual(["00:00", "23:59:59"]);
    expect(values(time, "24:00")).toEqual([]);
  });

  it("requires two-digit hours", () => {
    expect(values(time, "kl 9:30")).toEqual([]);
  });
});
