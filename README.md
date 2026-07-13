# 🇸🇪 Swedish PII Detection

Detects and masks Personal Identifiable Information (PII) in Swedish text.

**▶ Try it live: <https://okasi.github.io/swedish-pii/>** — everything runs
in your browser; text never leaves the page.

Given free text, the engine finds names, identity numbers, addresses, financial
data, contact details and sensitive attributes, and replaces each occurrence
with a stable placeholder:

```text
Anna Andersson bor på Storgatan 12, 114 55 Stockholm. Pnr 811218-9876.
→
<PER_FIRST_1> <PER_LAST_1> bor på <SE_STREET_ADDRESS_1>, <SE_POSTAL_CODE_1> Stockholm. Pnr <SE_PERSONAL_IDENTITY_NUMBER_MALE_1>.
```

---

## 🚀 Quick Start

```zsh
npm install
npm run dev          # demo UI at http://localhost:3000
npm test             # run the test suite
```

### 📦 Library Usage

The core lives in [`src/lib`](src/lib/index.ts), has no framework
dependencies, and ships as the `swedish-pii` npm package (ESM + CJS +
TypeScript types, datasets bundled in — zero runtime dependencies):

```zsh
npm install swedish-pii
```

```ts
import { maskPII, detectPII } from "swedish-pii"; // or "@/lib" inside this repo

const { maskedText, maskedData, entities } = maskPII(text);
// entities carry exact { start, end } offsets and a confidence `score`

// Presidio-style confidence: checksum-validated matches score ~0.95,
// gazetteer hits ~0.85–0.9, plain shapes ~0.6, failed checksums ~0.45,
// context-starved shapes ~0.25. Tune the cutoff per use case:
maskPII(text, { scoreThreshold: 0.2 }); // recall-first (e.g. raw CSV columns)
maskPII(text, { scoreThreshold: 0.9 }); // precision-first
// scoreThreshold must be a finite number from 0 through 1

// Strict mode drops anything that fails its checksum (Luhn for cards,
// personnummer and org numbers; mod-97 for IBANs) or calendar check:
const strict = maskPII(text, { strict: true });
```

### 🌐 HTTP API

```zsh
curl -X POST localhost:3000/api/mask \
  -H 'Content-Type: application/json' \
  -d '{"text": "Anna bor i Åre kommun", "strict": false, "scoreThreshold": 0.4}'
```

Returns `{ maskedText, maskedData, entities }` (each entity carries a
confidence `score`).

### ⚙️ How It Works

Every detector runs against the **original** text and yields entity spans
with a confidence score (Presidio-style: validators always run and adjust
the score, context cues boost or dim it, and `scoreThreshold` decides what
survives). Overlapping spans are resolved by detector priority (most
specific first — e.g. a personnummer wins over the generic bank-account
pattern), then the masked text is built in a single pass. Detectors never
see each other's placeholders, so masked output can't be corrupted by
later patterns. Patterns — including the large list-based alternations —
are compiled once and reused, so throughput stays in the MB/s range
(~0.1 ms per short text, ~15 ms for a 100 kB document).

Names are matched against the SCB name lists: "First Last" pairs are
fuzzy-matched with Jaro–Winkler (length-bucketed and memoized), single
capitalized words by exact lookup. Compound given names absent from the
list ("Ecenur" = Ece + Nur) are recognized by decomposing them into two
registered same-gender names, using tail-suffixes learned from the name
data itself — guarded by stopword, morpheme and place-name exclusions so
prose words ("Engine", "Semester") never decompose.

---

## 📦 Current Version

### 🔍 What Can Be Detected?

<details>
<summary>💳 Financial</summary>

- American Express credit card numbers  
- Mastercard credit card numbers  
- Visa credit card numbers  
- Swedish IBAN codes  
- Swedish BIC codes  
- Swedish bank account numbers  
- Swedish Bankgiro & Plusgiro numbers (Luhn-validated)  
- Swedish VAT numbers  
- Cryptocurrency wallet addresses (BTC, ETH)  

</details>

<details>
<summary>🆔 Identification Numbers</summary>

- Swedish personal identity numbers (male)  
- Swedish personal identity numbers (female)  
- Swedish coordination numbers (male)  
- Swedish coordination numbers (female)  
- Swedish passport / national ID card numbers  

</details>

<details>
<summary>📞 Contact</summary>

- Email addresses  
- Phone numbers  
- Social media information  

</details>

<details>
<summary>📍 Location</summary>

- Swedish street addresses  
- Swedish postal codes  
- Swedish municipalities  
- Swedish counties  
- Swedish cities  
- Property designations (fastighetsbeteckningar)  
- GPS coordinates  

</details>

<details>
<summary>🏢 Work / Education</summary>

- Swedish work organizations  
- Swedish education organizations  
- Swedish education programs  
- Swedish work professions  
- Swedish organization numbers  

</details>

<details>
<summary>🔒 Sensitive Attributes</summary>

- Marital status information  
- Genetic sex information  
- Disability information  
- Religion information  
- Sexual orientation information  
- Demographic information  
- Political ideologies information  
- Labor union membership (GDPR Art. 9)  

</details>

<details>
<summary>🧩 Misc</summary>

- Swedish license plate information  
- IP addresses (IPv4 & IPv6)  
- MAC addresses  
- Date information  
- Time information  
- Court & authority case numbers (dnr, mål nr)  
- Age information  

</details>

<details>
<summary>👤 Names</summary>

- Top `20,524` male first names with at least 10 bearers in Sweden 1999-2020
- Top `23,347` female first names with at least 10 bearers in Sweden 1999-2020
- Top `107,762` last names with at least 10 bearers in Sweden 1999-2020

</details>

For the exact label emitted per category (e.g. `PER_FIRST`, `SE_BANK_NUMBER`,
`MARITAL_STATUS`), see [Detector Labels](#-detector-labels) below.

## 🛣️ Roadmap

- Patterns for:
  - ~~Passport numbers~~ ✅
  - Residence Permit Number?
  - ~~Bank Account Number (Bankgiro/Plusgiro)~~ ✅
- Set lookups for:
  - Localities 🏘️
  - ~~Cities 🏙️~~ ✅
  - ~~Labor Unions~~ ✅ (`SE_LABOR_UNION`, context-aware for ambiguous names like "Vision")
- Reduce false positives
- Improve performance & simplify
- ~~Comprehensive tests~~ ✅ (`npm test`, 300+ tests across detectors, validators, matching, and the engine)
- ~~Make it to a npm package (library)~~ ✅ (`npm run build:lib`, publish with `npm publish`)
- Make a documentation page (frontend)

---

## 📚 Dataset Sources

- **Names:**
  - SCB 2020 First names:
    <https://www.statistikdatabasen.scb.se/pxweb/en/ssd/START__BE__BE0001__BE0001G/BE0001FNamn10/>
  - SCB 2020 Last names:
    <https://www.statistikdatabasen.scb.se/pxweb/en/ssd/START__BE__BE0001__BE0001G/BE0001ENamn10/>
  - Skatteverket newborn names (you can write "*" to select all):
    <https://www6.skatteverket.se/sense/app/c13f8ffe-f90d-4c38-b426-646ee1226b75/sheet/50b8c57d-23f9-4f74-bd6f-7a18d8096226/state/analysis>
  - Skatteverket popular surnames:
    <https://skatteverket.se/privat/folkbokforing/namn/bytaefternamn/sokblanddevanligasteefternamnen.4.515a6be615c637b9aa48e09.html>

- **Education Programs:**
  - <https://github.com/swedishdata/education-work-social/blob/master/scb-sun-2000.csv>

- **Professions:**
  - <https://github.com/swedishdata/education-work-social/blob/master/arbetsformedlingen-job-titles.csv>

- **Marital Status:**
  - <https://github.com/swedishdata/education-work-social/blob/master/scb-family-marital-status-and-consensual-union-terms.csv>

- **Sexual Orientation:**
  - <https://glaad.org/reference/terms>

- **Addresses:**
  - Street & Postal (partial):  
  <https://github.com/beshrkayali/sverige_postnummer>

- **Most up-to-date addresses:**
  - <https://www.postnummerservice.se/>
  - <https://www.postnord.se/en/our-tools/search-postcode-and-address/>
  - <https://download.geofabrik.de/europe/sweden.html>

---

## 🗺️ Extracting Data from OpenStreetMap via Osmium

All of the commands below are also wrapped in
[`scripts/extract-osm-data.sh`](scripts/extract-osm-data.sh), which downloads
and caches `sweden-latest.osm.pbf` automatically, validates each output
before overwriting the previous file, and cleans up all intermediates:

```zsh
scripts/extract-osm-data.sh              # everything
scripts/extract-osm-data.sh counties     # or one dataset:
                                          # counties | cities | municipalities
                                          # | areas | streets
```

The `streets` target also derives `data/streets.json` (unique street
names), which powers the exact-lookup part of the `SE_STREET_ADDRESS`
detector.

The raw commands it runs are documented here for reference:

### 🛠️ Install Tools via Homebrew

```zsh
brew install osmium-tool
brew install jq
```

### 🏞️ Extract Counties

```zsh
osmium tags-filter sweden-latest.osm.pbf "nwr/admin_level=4" -o counties.osm.pbf && \
osmium export counties.osm.pbf -o counties.geojson && \
jq -r '
  [
    .features[]
    | select(
        .properties.admin_level == "4"
        and .properties.name != null
        and (.properties.name | test("län$"))
      )
    | .properties.name
  ]
  | sort
  | unique
' counties.geojson > counties.json && \
rm counties.osm.pbf counties.geojson
```

### 🏙️ Extract Cities

```zsh
osmium tags-filter sweden-latest.osm.pbf "nwr/place=city" -o cities.osm.pbf && \
osmium export cities.osm.pbf -o cities.geojson && \
jq -r '
  [
    .features[]
    | select(
        .properties.name != null
        and (.properties.name | test("^[0-9]+$") | not)
        and (.properties.name | test("vägen$|kommun$") | not)
      )
    | .properties.name
  ]
  | sort
  | unique
' cities.geojson > cities.json && \
rm cities.osm.pbf cities.geojson
```

### 🏛️ Extract Municipalities

```zsh
osmium tags-filter sweden-latest.osm.pbf nwr/boundary=administrative -o municipalities.osm.pbf && \
osmium export municipalities.osm.pbf -o municipalities.geojson && \
jq -r '
  .features
  | map(select(.properties.admin_level == "7" and .properties.name != null and .properties.name != "Svartån"))
  | map(.properties.name)
  | map(if endswith(" kommun") or . == "Göteborgs Stad" then . else . + " kommun" end)
  | sort
  | unique
' municipalities.geojson > municipalities.json && \
rm municipalities.osm.pbf municipalities.geojson
```

### 🏘️ Extract Suburbs & Neighborhoods

```zsh
osmium tags-filter sweden-latest.osm.pbf "nwr/place=suburb" -o suburbs.osm.pbf && \
osmium tags-filter sweden-latest.osm.pbf "nwr/place=neighborhood" -o neighborhoods.osm.pbf && \
osmium tags-filter sweden-latest.osm.pbf "nwr/place=town" -o towns.osm.pbf && \
osmium merge suburbs.osm.pbf neighborhoods.osm.pbf towns.osm.pbf -o areas.osm.pbf && \
osmium export areas.osm.pbf -o areas.geojson && \
jq -r '
  [
    .features[]
    | select(
        .properties.name != null
        and (.properties.name | test("^[0-9]+$") | not)
      )
    | .properties.name
  ]
  | sort
  | unique
' areas.geojson > areas.json && \
rm suburbs.osm.pbf neighborhoods.osm.pbf towns.osm.pbf areas.osm.pbf areas.geojson
```

### 🚦 Extract Streets & Postalcodes

```zsh
osmium tags-filter sweden-latest.osm.pbf 'addr:street=*' 'addr:postcode=*' -o addresses.osm.pbf && \
osmium export addresses.osm.pbf -o addresses.geojson && \
jq -r '
  .features
  | map(
      select(
        (.properties["addr:street"] != null) and
        (.properties["addr:postcode"] != null) and
        (.properties["addr:street"] | test("^[0-9]+$") | not)
      )
    )
  | map({
      street: .properties["addr:street"],
      postcode: (
        .properties["addr:postcode"]
        | gsub(" "; "")
        | if test("^[0-9]{5}$") then .[:3] + " " + .[3:] else . end
      ),
      housenumber: (
        (.properties["addr:housenumber"] // "") 
        | split(",")
        | map(gsub("^ +| +$"; ""))
      )
    })
  | group_by(.street)
  | map(
      {
        street: .[0].street,
        postalcodes: (map(.postcode) | unique),
        housenumbers: (map(.housenumber) | add | unique)
      }
    )
  | sort_by(.street)
' addresses.geojson > streets_postalcodes.json && \
rm addresses.osm.pbf addresses.geojson
```

---

## 🧪 RegEx Ideas

- All allowed characters in names:
<https://skatteverket.se/privat/folkbokforing/namn.4.18e1b10334ebe8bc80004083.html#Accordionrubrik>

---

## 🏷️ Detector Labels

| Category | Labels |
| --- | --- |
| 👤 Names | `PER_FIRST`, `PER_LAST` |
| 🆔 Identity numbers | `SE_PERSONAL_IDENTITY_NUMBER_MALE/FEMALE`, `SE_COORDINATION_NUMBER_MALE/FEMALE`, `SE_PASSPORT_NUMBER` |
| 💳 Financial | `AMEX_CREDIT_CARD`, `MASTERCARD_CREDIT_CARD`, `VISA_CREDIT_CARD`, `IBAN_CODE`, `BIC_CODE`, `SE_BANK_NUMBER`, `SE_BANKGIRO`, `SE_PLUSGIRO`, `SE_VAT_NUMBER`, `CRYPTO_WALLET` |
| 📞 Contact | `EMAIL_ADDRESS`, `PHONE_NUMBER`, `SOCIAL_MEDIA` |
| 📍 Location | `SE_STREET_ADDRESS`, `SE_POSTAL_CODE`, `SE_MUNICIPALITY`, `SE_COUNTY`, `SE_CITY`, `SE_PROPERTY_DESIGNATION`, `COORDINATE` |
| 🏢 Work / education | `SE_WORK_ORGANIZATION`, `SE_EDUCATION_ORGANIZATION`, `SE_EDUCATION_PROGRAM`, `SE_WORK_PROFESSION`, `SE_ORGANIZATION_NUMBER` |
| 🔒 Sensitive attributes | `MARITAL_STATUS`, `GENETIC_SEX`, `DISABILITY`, `RELIGION`, `SEXUAL_ORIENTATION`, `DEMOGRAPHIC`, `POLITICAL_IDEOLOGIES`, `SE_LABOR_UNION` |
| 🧩 Misc | `SE_LICENSE_PLATE`, `IP_ADDRESS` (v4+v6), `MAC_ADDRESS`, `DATE`, `TIME`, `SE_CASE_NUMBER`, `AGE` |

---

## 🗂️ Project Layout

```
src/lib/            framework-free detection & masking core
  engine.ts         span-based masking engine + detector priority order
  detectors/        one module per category
  validation/       Luhn checksums, calendar-date validation
  matching/         Jaro–Winkler similarity
src/app/            Next.js demo UI + POST /api/mask route
data/               name/profession/program lists (SCB, Arbetsförmedlingen)
data/raw/           location datasets extracted from OpenStreetMap
scripts/            data extraction pipeline
tests/              vitest suite
```

## 🧑‍💻 Development

```zsh
npm run dev          # dev server
npm test             # tests (vitest)
npm run test:watch   # tests in watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build
```

CI runs lint, typecheck, tests and the build on every push and PR
([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## ⚠️ Known Limitations

- Regex + list lookup, not NLP: single capitalized words that happen to be
  registered names are masked even out of name context. Several precision
  mechanisms keep this in check:
  - a stoplist of ~90 function words ("Vi", "Han", "Men" and "The" are
    all registered SCB names);
  - **context gating** — low-structure patterns only fire near a cue:
    bank numbers need "konto"/"bank"/"account" nearby, BICs need
    "BIC"/"SWIFT", postal codes need an address cue or a following
    capitalized place name ("114 55 Stockholm");
  - BIC/IBAN candidates must carry a real ISO 3166 country code;
  - English demonyms match case-sensitively ("Polish" yes, "polish the
    furniture" no) while Swedish ones stay case-insensitive ("svensk");
  - "gift"/"single" skip English determiner and compound contexts
    ("a gift", "single sign-on") but keep the marital sense ("är gift").

  Homographs that are genuinely common names ("Stig", "Bo") stay maskable
  by design. The remaining accepted tradeoffs are pinned in
  [tests/false-positives.test.ts](tests/false-positives.test.ts).
- Default mode favors recall (synthetic/example numbers are masked even with
  invalid checksums); use `strict: true` to favor precision.
- Street addresses combine an exact lookup against the OSM street list
  (~22k names in `data/streets.json`, including suffix-less streets like
  "Aftonsången") with a heuristic fallback (capitalized words ending in
  a street suffix) for streets missing from OSM. Single-word street
  names under 5 characters are ignored — they collide with prose.

## 📄 License

[MIT](LICENSE)
