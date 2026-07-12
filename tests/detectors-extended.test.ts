import { describe, expect, it } from "vitest";
import type { Detector } from "@/lib/types";
import { DEFAULT_SCORE_THRESHOLD } from "@/lib/internal/regex";
import { detectPII } from "@/lib";
import {
  cryptoWallet,
  seBankgiro,
  sePlusgiro,
  seVatNumber,
} from "@/lib/detectors/financial";
import { sePassportNumber } from "@/lib/detectors/idNumbers";
import {
  seCity,
  seCoordinate,
  sePropertyDesignation,
} from "@/lib/detectors/location";
import {
  seLaborUnion,
  seLaborUnionAmbiguous,
} from "@/lib/detectors/sensitiveAttributes";
import {
  ageContextual,
  ageExplicit,
  ipv6Address,
  seCaseNumber,
} from "@/lib/detectors/misc";

function values(detector: Detector, text: string, strict = false): string[] {
  return detector
    .detect(text, { strict, scoreThreshold: DEFAULT_SCORE_THRESHOLD })
    .filter((s) => s.score >= DEFAULT_SCORE_THRESHOLD)
    .map((s) => s.value);
}

describe("giro numbers", () => {
  it("matches bankgiro with context (both 3-4 and 4-4 forms)", () => {
    expect(values(seBankgiro, "bankgiro 5050-1055")).toEqual(["5050-1055"]);
    expect(values(seBankgiro, "bg 902-0033")).toEqual(["902-0033"]);
  });

  it("requires bankgiro context", () => {
    expect(values(seBankgiro, "referens 5050-1055")).toEqual([]);
  });

  it("validates the bankgiro Luhn checksum in strict mode", () => {
    expect(values(seBankgiro, "bankgiro 5050-1056", true)).toEqual([]);
    expect(values(seBankgiro, "bankgiro 5050-1055", true)).toEqual([
      "5050-1055",
    ]);
  });

  it("context must not boost a failed checksum (regression)", () => {
    // Luhn-invalid + context: still masked leniently, but at the
    // failed-validation score — context corroborates shape, not sums.
    const [span] = seBankgiro.detect("bankgiro 5050-1056", {
      strict: false,
      scoreThreshold: DEFAULT_SCORE_THRESHOLD,
    });
    expect(span.score).toBe(0.45);
    const [valid] = seBankgiro.detect("bankgiro 5050-1055", {
      strict: false,
      scoreThreshold: DEFAULT_SCORE_THRESHOLD,
    });
    expect(valid.score).toBe(0.95);
  });

  it("matches plusgiro with context and checksum", () => {
    expect(values(sePlusgiro, "plusgiro 902003-3")).toEqual(["902003-3"]);
    expect(values(sePlusgiro, "sidan 902003-3")).toEqual([]);
    expect(values(sePlusgiro, "plusgiro 902003-4", true)).toEqual([]);
  });
});

describe("VAT numbers", () => {
  it("matches Swedish VAT numbers", () => {
    expect(values(seVatNumber, "momsnr SE556012579001")).toEqual([
      "SE556012579001",
    ]);
  });

  it("requires the exact SE…01 shape", () => {
    expect(values(seVatNumber, "SE55601257900")).toEqual([]); // 11 digits
    expect(values(seVatNumber, "SE556012579002")).toEqual([]); // no 01 suffix
  });

  it("validates the embedded org number in strict mode", () => {
    expect(values(seVatNumber, "SE556012579101", true)).toEqual([]);
    expect(values(seVatNumber, "SE556012579001", true)).toEqual([
      "SE556012579001",
    ]);
  });

  it("wins over the IBAN reading in the engine", () => {
    const labels = detectPII("momsnr SE556012579001").map((e) => e.label);
    expect(labels).toEqual(["SE_VAT_NUMBER"]);
  });
});

describe("crypto wallets", () => {
  it("matches Ethereum, bech32 and legacy Bitcoin addresses", () => {
    expect(
      values(cryptoWallet, "0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
    ).toHaveLength(1);
    expect(
      values(cryptoWallet, "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")
    ).toHaveLength(1);
    expect(
      values(cryptoWallet, "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
    ).toHaveLength(1);
  });

  it("does not match plain hex or short strings", () => {
    expect(values(cryptoWallet, "0x1234")).toEqual([]);
    expect(values(cryptoWallet, "deadbeef")).toEqual([]);
  });

  it("does not read long digit-only runs as Bitcoin (regression)", () => {
    expect(values(cryptoWallet, "ref 13456789234567892345678923")).toEqual([]);
  });
});

describe("passport numbers", () => {
  it("matches 8 digits near a passport cue", () => {
    expect(values(sePassportNumber, "pass nr 87654321")).toEqual(["87654321"]);
    expect(values(sePassportNumber, "passport 12345678 utfärdat")).toEqual([
      "12345678",
    ]);
  });

  it("ignores 8-digit runs without a cue", () => {
    expect(values(sePassportNumber, "ordernummer 87654321")).toEqual([]);
  });
});

describe("cities", () => {
  it("matches major Swedish cities case-sensitively", () => {
    expect(values(seCity, "uppvuxen i Östersund")).toEqual(["Östersund"]);
    expect(values(seCity, "tåget mot Umeå")).toEqual(["Umeå"]);
    // "lund" the grove must not match "Lund" the city
    expect(values(seCity, "en skuggig lund")).toEqual([]);
  });

  it("yields to the name reading for name/city homographs", () => {
    // "Lund" is also a registered surname — names outrank cities.
    const labels = detectPII("Anna Lund kom hem").map((e) => e.label);
    expect(labels).toEqual(["PER_FIRST", "PER_LAST"]);
  });
});

describe("property designations", () => {
  it("matches fastighetsbeteckning with context", () => {
    expect(
      values(sePropertyDesignation, "fastigheten Brynäs 4:12 såldes")
    ).toEqual(["Brynäs 4:12"]);
    expect(
      values(sePropertyDesignation, "tomten Åre Mörviken 2:91")
    ).toEqual(["Åre Mörviken 2:91"]);
  });

  it("does not match bible verses or scores without context", () => {
    expect(values(sePropertyDesignation, "läs Johannes 3:16 idag")).toEqual(
      []
    );
  });
});

describe("coordinates", () => {
  it("matches decimal GPS pairs", () => {
    expect(values(seCoordinate, "position 59.3293, 18.0686")).toEqual([
      "59.3293, 18.0686",
    ]);
    expect(values(seCoordinate, "-33.8688,151.2093")).toEqual([
      "-33.8688,151.2093",
    ]);
  });

  it("rejects out-of-range and low-precision pairs", () => {
    expect(values(seCoordinate, "99.1234, 18.0686")).toEqual([]); // lat > 90
    expect(values(seCoordinate, "pris 12.50, 13.99")).toEqual([]); // 2 decimals
  });
});

describe("labor unions", () => {
  it("matches distinctive union names on their own", () => {
    expect(values(seLaborUnion, "medlem i IF Metall")).toEqual(["IF Metall"]);
    expect(values(seLaborUnion, "gick med i Unionen")).toEqual(["Unionen"]);
    expect(values(seLaborUnion, "Vårdförbundet strejkar")).toEqual([
      "Vårdförbundet",
    ]);
  });

  it("requires a union cue for ambiguous names", () => {
    expect(values(seLaborUnionAmbiguous, "Vision för framtiden")).toEqual([]);
    expect(values(seLaborUnionAmbiguous, "medlem i Vision sedan 2019")).toEqual(
      ["Vision"]
    );
    expect(
      values(seLaborUnionAmbiguous, "Kommunal verksamhet i regionen")
    ).toEqual([]);
    expect(
      values(seLaborUnionAmbiguous, "fackförbundet Kommunal kräver")
    ).toEqual(["Kommunal"]);
  });

  it("does not match lowercase homographs", () => {
    expect(values(seLaborUnionAmbiguous, "vision och transport")).toEqual([]);
  });
});

describe("case numbers", () => {
  it("matches dnr, mål nr and ärendenummer forms", () => {
    expect(values(seCaseNumber, "Dnr 2024/1123")).toEqual(["Dnr 2024/1123"]);
    expect(values(seCaseNumber, "mål nr T 1234-20")).toEqual([
      "mål nr T 1234-20",
    ]);
    expect(values(seCaseNumber, "ärendenr 2024-1123 avslutat")).toEqual([
      "ärendenr 2024-1123",
    ]);
  });

  it("wins over the date shape in the engine", () => {
    const labels = detectPII("Dnr 2024/1123").map((e) => e.label);
    expect(labels).toEqual(["SE_CASE_NUMBER"]);
  });

  it("does not read sports scores after 'mål' as case numbers (regression)", () => {
    expect(values(seCaseNumber, "matchens sista mål 3-2 kom sent")).toEqual([]);
    // …while court series letters still work without "nr"
    expect(values(seCaseNumber, "i mål T 1234-20 yrkas")).toEqual([
      "mål T 1234-20",
    ]);
  });
});

describe("age", () => {
  it("matches explicit age phrases in both languages", () => {
    expect(values(ageExplicit, "hon är 34 år gammal")).toEqual([
      "34 år gammal",
    ]);
    expect(values(ageExplicit, "he is 34 years old")).toEqual([
      "34 years old",
    ]);
    expect(values(ageExplicit, "aged 34")).toEqual(["aged 34"]);
    expect(values(ageExplicit, "ålder: 34")).toEqual(["ålder: 34"]);
  });

  it("matches bare 'NN år' only near a verb cue", () => {
    expect(values(ageContextual, "Anna är 34 år.")).toEqual(["34 år"]);
    expect(values(ageContextual, "hon fyller 50 år imorgon")).toEqual([
      "50 år",
    ]);
    // durations are not ages
    expect(values(ageContextual, "för 5 år sedan")).toEqual([]);
    expect(values(ageContextual, "10 års garanti")).toEqual([]);
    expect(values(ageContextual, "bott här i 12 år")).toEqual([]);
  });
});

describe("IPv6", () => {
  it("matches full and compressed forms", () => {
    expect(
      values(ipv6Address, "från 2001:0db8:85a3:0000:0000:8a2e:0370:7334")
    ).toHaveLength(1);
    expect(values(ipv6Address, "via fe80::8a2e:370:7334 idag")).toEqual([
      "fe80::8a2e:370:7334",
    ]);
  });

  it("does not reclaim MAC addresses or times in the engine", () => {
    const labels = detectPII("MAC 00:1A:2B:3C:4D:5E kl 14:30:15").map(
      (e) => e.label
    );
    expect(labels).toEqual(["MAC_ADDRESS", "TIME"]);
  });
});

describe("engine integration for new labels", () => {
  it("keeps clean prose clean", () => {
    for (const text of [
      "Vi har en vision om bättre transport i kommunal regi.",
      "Boken kostar 12.50, rabatten 13.99 kr.",
      "vi läser vers 3:16 och funderar i 10 år",
      "Ordernummer 87654321 skickades igår.",
    ]) {
      expect(detectPII(text), text).toEqual([]);
    }
  });
});
