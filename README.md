# Swedish — Personal Identifiable Information (PII) - Detection

## CURRENT version

- RegEx
- Set Lookups from JSON files

## FUTURE version

- Performance optimize / use sets for:
  - counties
  - municipalities
  - educationPrograms
  - professions
- Data for:
  - Postcode
  - Locality
  - City
- Fine-tune Named Entity Recognition (NER) model:
  - <https://huggingface.co/FacebookAI/xlm-roberta-base>

---

## Dataset sources

- Names:
    SCB 2020 First names:
    <https://www.statistikdatabasen.scb.se/pxweb/en/ssd/START__BE__BE0001__BE0001G/BE0001FNamn10/>
    SCB 2020 Last names:
    <https://www.statistikdatabasen.scb.se/pxweb/en/ssd/START__BE__BE0001__BE0001G/BE0001ENamn10/>
    Skatteverket newborn names (you can write "*" to select all):
    <https://www6.skatteverket.se/sense/app/c13f8ffe-f90d-4c38-b426-646ee1226b75/sheet/50b8c57d-23f9-4f74-bd6f-7a18d8096226/state/analysis>
    Skatteverket popular surnames:
    <https://skatteverket.se/privat/folkbokforing/namn/bytaefternamn/sokblanddevanligasteefternamnen.4.515a6be615c637b9aa48e09.html>

- Education Programs:
  - <https://github.com/swedishdata/education-work-social/blob/master/scb-sun-2000.csv>

- Professions:
  - <https://github.com/swedishdata/education-work-social/blob/master/arbetsformedlingen-job-titles.csv>

- Marital Status:
  - <https://github.com/swedishdata/education-work-social/blob/master/scb-family-marital-status-and-consensual-union-terms.csv>

- Sexual Orientation:
  - <https://glaad.org/reference/terms>

- Addresses:
  - Street & Postal (DOESN'T CONTAIN ALL):  
  <https://github.com/beshrkayali/sverige_postnummer>

- Most up-to-date addresses:
  - <https://www.postnummerservice.se/>
  - <https://www.postnord.se/en/our-tools/search-postcode-and-address/>
  - <https://download.geofabrik.de/europe/sweden.html>

## WIP extraction from OpenStreetMap data via Osmium

### To install via Homebrew

```zsh
brew install osmium-tool
brew install jq
```

### Extract all counties

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

### Extract all cities

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

### Extract all municipalities

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

### Extract all suburbs & neighborhoods

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

### Extract all streets & postalcodes

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

## RegEx ideas

- All allowed characters in names:
<https://skatteverket.se/privat/folkbokforing/namn.4.18e1b10334ebe8bc80004083.html#Accordionrubrik>

---

NER:

- <https://github.com/axa-group/nlp.js/blob/master/docs/v4/ner-quickstart.md>

---

## Identifiers & labels

### To-Do

- Labor Unions (LABOR_UNION) <https://webperf.se/category/fackforeningar/>
