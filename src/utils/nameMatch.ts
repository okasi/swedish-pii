import menFirstNames from "../../data/men-first-names.json";
import womenFirstNames from "../../data/women-first-names.json";
import lastNames from "../../data/last-names.json";
import jaroWinkler from "./jaroWinkler";

const firstNamesSet = new Set([...menFirstNames, ...womenFirstNames]);
const lastNamesSet = new Set(lastNames);

export function nameMatch(input: string): string | null {
  // Only normalize for allowed characters, but keep spaces for splitting
  const normalizedInput = input
    .replace(/[^a-zA-ZåäöÅÄÖéÉ\s]+/g, "")
    .toLowerCase()
    .trim();

  const memo = new Map<string, string | null>();

  function findBestMatch(
    input: string,
    namesSet: Set<string>,
    threshold: number
  ): string | null {
    if (memo.has(input)) {
      return memo.get(input) || null;
    }

    let highestScore = 0;
    let bestMatch: string | null = null;

    for (const name of namesSet) {
      // Skip names with length difference > 3
      if (Math.abs(input.length - name.length) > 3) continue;

      // Skip names that shorter than 3 characters
      if (input.length < 3 || name.length < 3) continue;

      const score = jaroWinkler(input, name.toLowerCase());

      if (score > 0.62) {
        console.log(`[JaroWinkler] "${input}" vs "${name}": score = ${score}`);
      }

      if (score > highestScore && score >= threshold) {
        highestScore = score;
        bestMatch = name;
        if (score === 1) break;
      }
    }

    memo.set(input, bestMatch);
    return bestMatch;
  }

  // Only split on whitespace, and only try to match if there are two parts
  const parts = normalizedInput.split(/\s+/);
  if (parts.length === 2) {
    const [firstPart, secondPart] = parts;
    // Only do JaroWinkler if the original input is capitalized for both parts
    const originalParts = input.trim().split(/\s+/);
    if (
      originalParts.length === 2 &&
      /^[A-ZÅÄÖÉ][a-zåäöäöéé]+$/.test(originalParts[0]) &&
      /^[A-ZÅÄÖÉ][a-zåäöäöéé]+$/.test(originalParts[1])
    ) {
      const firstNameMatch = findBestMatch(
        firstPart,
        firstNamesSet,
        0.8833333333333334 // Use specific threshold for first name
      );
      const lastNameMatch = findBestMatch(
        secondPart,
        lastNamesSet,
        0.9428571428571428 // Use specific threshold for last name
      );

      if (firstNameMatch && lastNameMatch) {
        return `${firstNameMatch} ${lastNameMatch}`;
      }
    }
  }

  return null;
}

export function maskNamesInText(
  text: string,
  maskedValues: any,
  idCounters: { [key: string]: number }
): string {
  return text.replace(
    /(?<![("\['’])\b([A-ZÅÄÖÉ][a-zåäöäöéé]+)\b(?:\s+\b([A-ZÅÄÖÉ][a-zåäöäöéé]+)\b)?(?![)"\]'’])/g,
    (match, p1, p2) => {
      if (p2) {
        // Try to match first+last name using nameMatch (will only do JaroWinkler if both capitalized)
        const fullName = `${p1} ${p2}`;
        const matched = nameMatch(fullName);

        if (matched) {
          const [first, last] = matched.split(" ");
          if (first && last) {
            maskedValues["PER_FIRST"] = maskedValues["PER_FIRST"] || [];
            maskedValues["PER_LAST"] = maskedValues["PER_LAST"] || [];
            idCounters["PER_FIRST"] = (idCounters["PER_FIRST"] || 1);
            idCounters["PER_LAST"] = (idCounters["PER_LAST"] || 1);
            const firstId = `PER_FIRST_${idCounters["PER_FIRST"]++}`;
            const lastId = `PER_LAST_${idCounters["PER_LAST"]++}`;
            maskedValues["PER_FIRST"].push({ id: firstId, value: first });
            maskedValues["PER_LAST"].push({ id: lastId, value: last });
            return `<${firstId}> <${lastId}>`;
          }
        }
      }
      // Fallback: check single word as first or last name, only if 1:1 match and capitalized
      if (firstNamesSet.has(p1)) {
        maskedValues["PER_FIRST"] = maskedValues["PER_FIRST"] || [];
        idCounters["PER_FIRST"] = (idCounters["PER_FIRST"] || 1);
        const firstId = `PER_FIRST_${idCounters["PER_FIRST"]++}`;
        maskedValues["PER_FIRST"].push({ id: firstId, value: p1 });
        return `<${firstId}>`;
      }
      if (lastNamesSet.has(p1)) {
        maskedValues["PER_LAST"] = maskedValues["PER_LAST"] || [];
        idCounters["PER_LAST"] = (idCounters["PER_LAST"] || 1);
        const lastId = `PER_LAST_${idCounters["PER_LAST"]++}`;
        maskedValues["PER_LAST"].push({ id: lastId, value: p1 });
        return `<${lastId}>`;
      }
      return match;
    }
  );
}
