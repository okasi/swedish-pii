import { describe, expect, it } from "vitest";
import { luhnCheck, swedishIdChecksum } from "@/lib/validation/luhn";
import { ibanChecksum } from "@/lib/validation/iban";
import { isRealDate, isValidIdentityDate } from "@/lib/validation/date";

describe("luhnCheck", () => {
  it("accepts valid card numbers", () => {
    expect(luhnCheck("4111111111111111")).toBe(true); // Visa test number
    expect(luhnCheck("5555555555554444")).toBe(true); // Mastercard test number
    expect(luhnCheck("378282246310005")).toBe(true); // Amex test number
  });

  it("rejects invalid checksums", () => {
    expect(luhnCheck("4111111111111112")).toBe(false);
    expect(luhnCheck("1234567890123456")).toBe(false);
  });

  it("ignores separators", () => {
    expect(luhnCheck("4111 1111 1111 1111")).toBe(true);
    expect(luhnCheck("4111-1111-1111-1111")).toBe(true);
  });

  it("rejects degenerate input", () => {
    expect(luhnCheck("")).toBe(false);
    expect(luhnCheck("0")).toBe(false);
    expect(luhnCheck("abc")).toBe(false);
  });

  it("validates numbers of any supported length", () => {
    expect(luhnCheck("4222222222222")).toBe(true); // 13-digit Visa
    expect(luhnCheck("18")).toBe(true); // minimal two-digit Luhn pair
    expect(luhnCheck("19")).toBe(false);
  });
});

describe("swedishIdChecksum", () => {
  it("accepts a valid personnummer", () => {
    // 811218-9876 is the Skatteverket documentation example
    expect(swedishIdChecksum("811218-9876")).toBe(true);
    expect(swedishIdChecksum("19811218-9876")).toBe(true);
  });

  it("rejects an invalid check digit", () => {
    expect(swedishIdChecksum("811218-9877")).toBe(false);
  });

  it("rejects wrong lengths", () => {
    expect(swedishIdChecksum("811218-987")).toBe(false);
    expect(swedishIdChecksum("")).toBe(false);
  });
});

describe("ibanChecksum", () => {
  it("accepts reference IBANs from several countries", () => {
    expect(ibanChecksum("GB82 WEST 1234 5698 7654 32")).toBe(true);
    expect(ibanChecksum("SE45 5000 0000 0583 9825 7466")).toBe(true);
    expect(ibanChecksum("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(ibanChecksum("SE3550000000054910000003")).toBe(true);
  });

  it("rejects a single flipped digit", () => {
    expect(ibanChecksum("GB82 WEST 1234 5698 7654 33")).toBe(false);
    expect(ibanChecksum("SE46 5000 0000 0583 9825 7466")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(ibanChecksum("")).toBe(false);
    expect(ibanChecksum("SE45")).toBe(false);
    expect(ibanChecksum("1234 5678 9012 3456")).toBe(false);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(ibanChecksum("gb82 west 1234 5698 7654 32")).toBe(true);
    expect(ibanChecksum("GB82WEST12345698765432")).toBe(true);
  });
});

describe("isRealDate", () => {
  it("validates month lengths and leap years", () => {
    expect(isRealDate(2024, 2, 29)).toBe(true);
    expect(isRealDate(2023, 2, 29)).toBe(false);
    expect(isRealDate(2024, 4, 31)).toBe(false);
    expect(isRealDate(2024, 12, 31)).toBe(true);
    expect(isRealDate(2024, 13, 1)).toBe(false);
    expect(isRealDate(2024, 0, 1)).toBe(false);
  });
});

describe("isValidIdentityDate", () => {
  it("validates personnummer dates", () => {
    expect(isValidIdentityDate("811218-9876")).toBe(true);
    expect(isValidIdentityDate("810230-9876")).toBe(false); // Feb 30
  });

  it("accepts 12-digit forms with explicit century", () => {
    expect(isValidIdentityDate("19811218-9876")).toBe(true);
    expect(isValidIdentityDate("20040229-1234")).toBe(true); // 2004 leap day
    expect(isValidIdentityDate("20030229-1234")).toBe(false);
  });

  it("resolves two-digit years to the most recent past century", () => {
    // A two-digit year in the future must resolve to the 1900s
    const futureTwoDigit = String((new Date().getFullYear() + 3) % 100).padStart(2, "0");
    expect(isValidIdentityDate(`${futureTwoDigit}0615-1234`)).toBe(true);
  });

  it("rejects explicit future years", () => {
    const future = new Date().getFullYear() + 2;
    expect(isValidIdentityDate(`${future}0615-1234`)).toBe(false);
  });

  it("rejects lengths other than 10 or 12 digits", () => {
    expect(isValidIdentityDate("811218987")).toBe(false);
    expect(isValidIdentityDate("81121898765")).toBe(false);
  });

  it("applies the +60 day offset for samordningsnummer", () => {
    expect(isValidIdentityDate("811278-9876", 60)).toBe(true); // day 78 -> 18
    expect(isValidIdentityDate("810491-9876", 60)).toBe(false); // day 91 -> Apr 31
    expect(isValidIdentityDate("810290-9876", 60)).toBe(false); // day 90 -> Feb 30
  });
});
