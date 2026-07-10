#!/usr/bin/env bash
#
# Extract Swedish location datasets from OpenStreetMap into data/raw/.
#
# Usage:
#   scripts/extract-osm-data.sh [all|counties|cities|municipalities|areas|streets]
#
# Requirements: osmium-tool, jq, curl (brew install osmium-tool jq)
#
# The source extract (sweden-latest.osm.pbf, ~700 MB) is downloaded from
# Geofabrik on first run and cached in data/raw/. All intermediate files
# are created in a temp directory and cleaned up on exit; the outputs
# are written atomically so a failed run never corrupts existing data.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAW_DIR="$REPO_ROOT/data/raw"
PBF="$RAW_DIR/sweden-latest.osm.pbf"
PBF_URL="https://download.geofabrik.de/europe/sweden-latest.osm.pbf"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

log() { printf '\033[1;34m[extract]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

require_tools() {
  local missing=()
  for tool in osmium jq curl; do
    command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
  done
  if ((${#missing[@]})); then
    die "missing tools: ${missing[*]} — install with: brew install osmium-tool jq curl"
  fi
}

ensure_pbf() {
  mkdir -p "$RAW_DIR"
  if [[ ! -s "$PBF" ]]; then
    log "downloading $PBF_URL (~700 MB, one-time)"
    curl --fail --location --retry 3 --continue-at - \
      --output "$PBF.partial" "$PBF_URL"
    mv "$PBF.partial" "$PBF"
  fi
  osmium fileinfo "$PBF" >/dev/null || die "$PBF is not a valid OSM file — delete it and re-run"
}

# filter_to_geojson <output.geojson> <osmium tags-filter args...>
filter_to_geojson() {
  local geojson="$1"; shift
  local pbf_tmp="$WORK_DIR/filtered.osm.pbf"
  osmium tags-filter --overwrite "$PBF" "$@" -o "$pbf_tmp"
  osmium export --overwrite "$pbf_tmp" -o "$geojson"
  rm -f "$pbf_tmp"
}

# write_json <target> — reads JSON on stdin, validates it, writes atomically
write_json() {
  local target="$1"
  local tmp="$WORK_DIR/$(basename "$target").tmp"
  cat >"$tmp"
  jq -e 'type == "array" and length > 0' "$tmp" >/dev/null \
    || die "$(basename "$target"): produced empty or invalid output, keeping existing file"
  mv "$tmp" "$target"
  log "wrote $target ($(jq 'length' "$target") entries)"
}

extract_counties() {
  log "extracting counties (admin_level=4, *län)"
  local geojson="$WORK_DIR/counties.geojson"
  filter_to_geojson "$geojson" "nwr/admin_level=4"
  jq '
    [
      .features[]
      | select(
          .properties.admin_level == "4"
          and .properties.name != null
          and (.properties.name | test("län$"))
        )
      | .properties.name
    ]
    | sort | unique
  ' "$geojson" | write_json "$RAW_DIR/counties.json"
}

extract_cities() {
  log "extracting cities (place=city)"
  local geojson="$WORK_DIR/cities.geojson"
  filter_to_geojson "$geojson" "nwr/place=city"
  jq '
    [
      .features[]
      | select(
          .properties.name != null
          and (.properties.name | test("^[0-9]+$") | not)
          and (.properties.name | test("vägen$|kommun$") | not)
        )
      | .properties.name
    ]
    | sort | unique
  ' "$geojson" | write_json "$RAW_DIR/cities.json"
}

extract_municipalities() {
  log "extracting municipalities (admin_level=7)"
  local geojson="$WORK_DIR/municipalities.geojson"
  filter_to_geojson "$geojson" "nwr/boundary=administrative"
  jq '
    .features
    | map(select(
        .properties.admin_level == "7"
        and .properties.name != null
        and .properties.name != "Svartån"
      ))
    | map(.properties.name)
    | map(if endswith(" kommun") or . == "Göteborgs Stad" then . else . + " kommun" end)
    | sort | unique
  ' "$geojson" | write_json "$RAW_DIR/municipalities.json"
}

extract_areas() {
  log "extracting suburbs, neighborhoods and towns"
  local geojson="$WORK_DIR/areas.geojson"
  local merged="$WORK_DIR/areas.osm.pbf"
  local parts=()
  for place in suburb neighborhood town; do
    local part="$WORK_DIR/$place.osm.pbf"
    osmium tags-filter --overwrite "$PBF" "nwr/place=$place" -o "$part"
    parts+=("$part")
  done
  osmium merge --overwrite "${parts[@]}" -o "$merged"
  osmium export --overwrite "$merged" -o "$geojson"
  jq '
    [
      .features[]
      | select(
          .properties.name != null
          and (.properties.name | test("^[0-9]+$") | not)
        )
      | .properties.name
    ]
    | sort | unique
  ' "$geojson" | write_json "$RAW_DIR/areas.json"
}

extract_streets() {
  log "extracting streets and postal codes (this is the big one)"
  local geojson="$WORK_DIR/addresses.geojson"
  filter_to_geojson "$geojson" "addr:street=*" "addr:postcode=*"
  jq '
    .features
    | map(select(
        (.properties["addr:street"] != null) and
        (.properties["addr:postcode"] != null) and
        (.properties["addr:street"] | test("^[0-9]+$") | not)
      ))
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
    | map({
        street: .[0].street,
        postalcodes: (map(.postcode) | unique),
        housenumbers: (map(.housenumber) | add | unique)
      })
    | sort_by(.street)
  ' "$geojson" | write_json "$RAW_DIR/streets_postalcodes.json"

  log "deriving street-name list for the SE_STREET_ADDRESS detector"
  jq '[.[].street | gsub("^\\s+|\\s+$"; "")] | unique' \
    "$RAW_DIR/streets_postalcodes.json" | write_json "$REPO_ROOT/data/streets.json"
}

main() {
  local target="${1:-all}"
  require_tools
  ensure_pbf

  case "$target" in
    counties) extract_counties ;;
    cities) extract_cities ;;
    municipalities) extract_municipalities ;;
    areas) extract_areas ;;
    streets) extract_streets ;;
    all)
      extract_counties
      extract_cities
      extract_municipalities
      extract_areas
      extract_streets
      ;;
    *)
      die "unknown target '$target' — use: all|counties|cities|municipalities|areas|streets"
      ;;
  esac
  log "done"
}

main "$@"
