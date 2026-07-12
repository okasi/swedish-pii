/**
 * Playground example texts. The flagship dossier is crafted to trigger
 * every one of the 36 PII labels with checksum-valid data (Luhn-valid
 * personnummer, coordination numbers, cards and organization numbers;
 * a mod-97-valid IBAN), so the demo shows top confidence scores —
 * tests/examples-coverage.test.ts pins the full coverage.
 */
export interface Example {
  name: string;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    name: "🎯 Komplett akt",
    text: `ÄRENDERAPPORT 2024-06-01 kl 14:30 — handläggare Åsa Öberg.

Utredningen gäller Anna Andersson (personnummer 900312-0046), kvinna, svensk och katolik, samt hennes make Erik Johanson (personnummer 811218-9876). Anna är gift, bisexuell, har dyslexi och beskriver sig som socialdemokrat. Dottern Ecenur går i skolan. En kusin har samordningsnummer 900372-0019 och dennes sambo 850466-0005.

Anna är 34 år gammal, uppvuxen i Östersund och medlem i IF Metall. Hon äger fastigheten Brynäs 4:12 (ärendenr 2024-1123) och har pass nr 87654321.

Familjen bor på Aftonsången 3, 114 55 Stockholm, efter flytten från Åre kommun i Jämtlands län. Anna arbetar som advokat på Volvo AB (org.nr 556012-5790, momsnr SE556012579001) och läste tidigare Läkarprogrammet vid Karolinska Institutet.

Kontakt: 070-123 45 67, anna.andersson@email.se, Instagram @annaandersson.
Ekonomi: bankkonto 8327-9123456, IBAN SE45 5000 0000 0583 9825 7466, BIC ESSESESS, bankgiro 5050-1055, plusgiro 902003-3. Kort: VISA 4111 1111 1111 1111, Mastercard 5555 5555 5555 4444, Amex 3782 822463 10005. Kryptoplånbok 0x71C7656EC7ab88b098defB751B7401B5f6d8976F.

Fordonet ABC 123 är parkerat vid position 59.3293, 18.0686. Uppkoppling sker från 192.168.1.1 (MAC 00:1A:2B:3C:4D:5E).`,
  },
  {
    name: "🇬🇧 English",
    text:
      "Erik Johansson lives at Lilla Vägen 7, 411 22 Gothenburg. He was " +
      "born on 1985-03-22 and his VISA card is 4111 1111 1111 1111. " +
      "Reach him at +46709876543 or erik.johansson@mail.se — Twitter " +
      "@erikjo. He is single, Catholic and works as a researcher.",
  },
  {
    name: "✅ Ingen PII",
    text:
      "Vi ses efter mötet imorgon. Han tar med rapporten och hon " +
      "presenterar planen. Det kostar 10 000 kr i månaden. Fakturanummer " +
      "8123456789 förfaller i mars — men det är inget personligt.",
  },
];
